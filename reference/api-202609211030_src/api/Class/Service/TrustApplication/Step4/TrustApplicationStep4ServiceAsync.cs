using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Step4
{
    public class TrustApplicationStep4ServiceAsync
    {
        private readonly TrustApplicationStep4Validator validator;
        private readonly TrustApplicationCommonService commonService;
        private const string Code = "SAVE-TRUST-APPLICATION-STEP-4";

        public TrustApplicationStep4ServiceAsync()
        {
            validator = new TrustApplicationStep4Validator();
            commonService = new TrustApplicationCommonService();
        }

        public async Task<TrustApplicationStepResult> SaveAsync(string merchantId, long userId, string roleCode, TrustApplicationStep4Request request)
        {
            validator.Validate(request);

            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction())
            {
                try
                {
                    // ====================================================
                    // Get Application
                    // ====================================================

                    var application = await commonService.GetApplicationForStepUpdateAsync(db, merchantId, userId, roleCode, request.TrustID);

                    // ====================================================
                    // Step 3 must already be completed
                    // ====================================================

                    if (commonService.IsAgent(roleCode))
                    {
                        commonService.ValidateStepAccess(application, 4, roleCode);
                    }

                    // ====================================================
                    // Validate selected Beneficiary IDs
                    // ====================================================

                    await ValidateBeneficiaryIdsAsync(db, application.RowID, request);

                    // ====================================================
                    // Save Allocation
                    // ====================================================

                    await SaveAllocationAsync(db, application.RowID, userId, request);

                    // ====================================================
                    // Progress
                    // ====================================================

                    commonService.CompleteStepSave(application, 4, userId, roleCode);

                    // ====================================================
                    // Trust Application History
                    // ====================================================

                    TrustApplicationHistoryHelper.Add(
                        db,
                        application.RowID,
                        "STEP_4_UPDATED",
                        "Step 4 Updated",
                        "Beneficiary allocation information was updated.",
                        userId,
                        "APPLICATION",
                        application.RowID);

                    // ====================================================
                    // Save
                    // ====================================================

                    await db.SaveChangesAsync();

                    transaction.Commit();

                    return commonService.ToResult(application);
                }
                catch
                {
                    transaction.Rollback();
                    throw;
                }
            }
        }

        // ============================================================
        // Validate Beneficiary belongs to this application
        // and is active
        // ============================================================

        private async Task ValidateBeneficiaryIdsAsync(Sandbox_BasedEntities db, long trustApplicationId, TrustApplicationStep4Request request)
        {
            var requestedIds =
                (request.MainBeneficiaries ?? new List<TrustApplicationAllocationBeneficiaryRequest>())
                .Concat(request.SubstituteBeneficiaries ?? new List<TrustApplicationAllocationBeneficiaryRequest>())
                .Select(x => x.BeneficiaryID)
                .Distinct()
                .ToList();

            if (!requestedIds.Any())
            {
                return;
            }

            var validIds =
                await db.tbl_TrustApplication_Beneficiary
                    .Where(x => x.TrustApplicationID == trustApplicationId && x.IsActive && requestedIds.Contains(x.RowID))
                    .Select(x => x.RowID)
                    .ToListAsync();

            var invalidIds = requestedIds.Where(x => !validIds.Contains(x)).ToList();

            if (invalidIds.Any())
            {
                throw new BusinessException("One or more selected beneficiaries are invalid.", Code);
            }
        }

        private async Task SaveAllocationAsync(Sandbox_BasedEntities db, long trustApplicationId, long userId, TrustApplicationStep4Request request)
        {
            var allocation = await db.tbl_TrustApplication_BeneficiaryAllocation.FirstOrDefaultAsync(x => x.TrustApplicationID == trustApplicationId);
            bool isNew = allocation == null;

            if (isNew)
            {
                allocation =
                    new tbl_TrustApplication_BeneficiaryAllocation
                    {
                        TrustApplicationID = trustApplicationId,
                        CreatedAt = DateTime.Now,
                        CreatedBy = userId
                    };

                db.tbl_TrustApplication_BeneficiaryAllocation.Add(allocation);

                // Need RowID before inserting details
                await db.SaveChangesAsync();
            }
            else
            {
                allocation.UpdatedAt = DateTime.Now;
                allocation.UpdatedBy = userId;
            }

            allocation.AllocationType = request.AllocationType;

            // ========================================================
            // Remove old allocation details
            // ========================================================

            var oldDetails = await db.tbl_TrustApplication_BeneficiaryAllocationDetail.Where(x => x.AllocationID == allocation.RowID).ToListAsync();
            
            if (oldDetails.Any())
            {
                db.tbl_TrustApplication_BeneficiaryAllocationDetail.RemoveRange(oldDetails);
            }

            // ========================================================
            // Main Beneficiaries
            // ========================================================

            var mains = request.MainBeneficiaries ?? new List<TrustApplicationAllocationBeneficiaryRequest>();

            foreach (var main in mains)
            {
                AddDetail(db, allocation.RowID, userId, main.BeneficiaryID, "MAIN", main.AllocationPercentage, false);
            }

            // ========================================================
            // Substitute Beneficiaries
            // ========================================================

            var substitutes = request.SubstituteBeneficiaries ?? new List<TrustApplicationAllocationBeneficiaryRequest>();

            foreach (var substitute in substitutes)
            {
                AddDetail(db, allocation.RowID, userId, substitute.BeneficiaryID, "SUBSTITUTE", substitute.AllocationPercentage, false);
            }

            // ========================================================
            // Type 4
            // Trustee Company = Substitute
            // ========================================================

            if (request.AllocationType == 4)
            {
                AddDetail(db, allocation.RowID, userId, null, "SUBSTITUTE", 100m, true);
            }

            // ========================================================
            // Type 7
            // Trustee Company receives 100%
            // ========================================================

            if (request.AllocationType == 7)
            {
                AddDetail(db, allocation.RowID, userId, null, "MAIN", 100m, true);
            }
        }

        private void AddDetail(Sandbox_BasedEntities db, long allocationId, long userId, long? beneficiaryId, string roleType, decimal? percentage, bool isTrusteeCompany)
        {
            var detail =
                new tbl_TrustApplication_BeneficiaryAllocationDetail
                {
                    AllocationID = allocationId,
                    BeneficiaryID = beneficiaryId,
                    RoleType = roleType,
                    AllocationPercentage = percentage,
                    IsTrusteeCompany = isTrusteeCompany,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId
                };

            db.tbl_TrustApplication_BeneficiaryAllocationDetail.Add(detail);
        }
    }
}