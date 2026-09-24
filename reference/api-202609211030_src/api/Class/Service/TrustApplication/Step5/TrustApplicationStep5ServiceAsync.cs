using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Step5
{
    public class TrustApplicationStep5ServiceAsync
    {
        private readonly TrustApplicationStep5Validator validator;
        private readonly TrustApplicationCommonService commonService;

        public TrustApplicationStep5ServiceAsync()
        {
            validator = new TrustApplicationStep5Validator();
            commonService = new TrustApplicationCommonService();
        }

        public async Task<TrustApplicationStepResult> SaveAsync(string merchantId, long userId, string roleCode, TrustApplicationStep5Request request)
        {
            validator.Validate(request);

            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction())
            {
                try
                {
                    // ====================================================
                    // Get Trust Application
                    // ====================================================

                    var application = await commonService.GetApplicationForStepUpdateAsync(db, merchantId, userId, roleCode, request.TrustID);

                    // ====================================================
                    // Must Complete Step 4
                    // ====================================================

                    if (commonService.IsAgent(roleCode))
                    {
                        commonService.ValidateStepAccess(application, 5, roleCode);
                    }

                    // ====================================================
                    // Save Step 5
                    // ====================================================

                    await SaveExecutionAsync(db, application.RowID, userId, request);

                    // ====================================================
                    // Update Progress
                    // ====================================================

                    commonService.CompleteStepSave(application, 5, userId, roleCode);

                    // ====================================================
                    // Trust Application History
                    // ====================================================

                    TrustApplicationHistoryHelper.Add(
                        db,
                        application.RowID,
                        "STEP_5_UPDATED",
                        "Step 5 Updated",
                        "Trust deed execution information was updated.",
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

        private async Task SaveExecutionAsync(Sandbox_BasedEntities db, long trustApplicationId, long userId, TrustApplicationStep5Request request)
        {
            var record = await db.tbl_TrustApplication_TrustDeedExecution.FirstOrDefaultAsync(x => x.TrustApplicationID == trustApplicationId);
            bool isNew = record == null;

            if (isNew)
            {
                record =
                    new tbl_TrustApplication_TrustDeedExecution
                    {
                        TrustApplicationID = trustApplicationId,
                        CreatedAt = DateTime.Now,
                        CreatedBy = userId
                    };

                db.tbl_TrustApplication_TrustDeedExecution.Add(record);
            }

            // ========================================================
            // Signing Method
            // ========================================================

            record.SigningMethod = CleanUpper(request.SigningMethod);

            // ========================================================
            // Special Circumstance
            // ========================================================

            record.SpecialCircumstance = CleanUpper(request.SpecialCircumstance);

            // ========================================================
            // Clear conditional fields first
            // ========================================================

            record.ReadOverBy = null;
            record.ReadOverIdentityNo = null;
            record.LanguageOrDialect = null;
            record.RelationshipWithSettlor = null;
            record.OtherRelationshipWithSettlor = null;

            // ========================================================
            // Special circumstance requires read-over/interpreter
            // ========================================================

            if (!string.Equals(request.SpecialCircumstance, "NONE", StringComparison.OrdinalIgnoreCase))
            {
                record.ReadOverBy = Clean(request.ReadOverBy);
                record.ReadOverIdentityNo = Clean(request.ReadOverIdentityNo);
                record.LanguageOrDialect = Clean(request.LanguageOrDialect);
                record.RelationshipWithSettlor = CleanUpper(request.RelationshipWithSettlor);
                record.OtherRelationshipWithSettlor = IsOther(request.RelationshipWithSettlor) ? Clean(request.OtherRelationshipWithSettlor) : null;
            }

            if (!isNew)
            {
                record.UpdatedAt = DateTime.Now;
                record.UpdatedBy = userId;
            }
        }

        private string Clean(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private string CleanUpper(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();
        }

        private bool IsOther(string value)
        {
            return string.Equals(value, "OTHER", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "OTHERS", StringComparison.OrdinalIgnoreCase);
        }
    }
}