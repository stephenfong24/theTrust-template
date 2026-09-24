using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Context;
using System;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Step1
{
    public class TrustApplicationStep1ServiceAsync
    {
        private const string Code = "SAVE-TRUST-APPLICATION-STEP-1";
        private readonly TrustApplicationStep1Validator validator;
        private readonly TrustApplicationCommonService commonService;

        public TrustApplicationStep1ServiceAsync()
        {
            validator = new TrustApplicationStep1Validator();
            commonService = new TrustApplicationCommonService();
        }

        public async Task<TrustApplicationStepResult> SaveAsync(string merchantId, long userId, string roleCode, TrustApplicationStep1Request request)
        {
            if (request == null)
            {
                throw new BusinessException("Invalid request.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction(IsolationLevel.Serializable))
            {
                try
                {
                    tbl_TrustApplication application;

                    bool isNewApplication = !request.TrustID.HasValue || request.TrustID.Value <= 0;

                    // =====================================================
                    // CREATE
                    // =====================================================

                    if (isNewApplication)
                    {
                        if (!commonService.IsAgent(roleCode))
                        {
                            throw new BusinessException("Only Trust Agents are allowed to create a new Trust Application.", Code);
                        }

                        // ProductCode comes from Agent request.
                        validator.Validate(request);

                        await ValidateProductAsync(db, merchantId, request.ProductCode);

                        application = await CreateApplicationAsync(db, merchantId, userId, request);
                    }

                    // =====================================================
                    // UPDATE
                    // =====================================================

                    else
                    {
                        application = await commonService.GetApplicationForStepUpdateAsync(db, merchantId, userId, roleCode, request.TrustID.Value);

                        // =================================================
                        // SA / AD
                        //
                        // ProductCode is read-only after submission.
                        // Always use the stored ProductCode.
                        // =================================================

                        if (commonService.IsAdmin(roleCode))
                        {
                            request.ProductCode = application.ProductCode;
                        }

                        // Validate after ProductCode has been normalized.
                        validator.Validate(request);

                        await ValidateProductAsync(db, merchantId, request.ProductCode);
                    }

                    await SavePersonalDetailAsync(db, application.RowID, userId, request);

                    await SaveSourceOfFundsAsync(db, application.RowID, userId, request);

                    // =====================================================
                    // Only Agent DRAFT may actually modify ProductCode.
                    // =====================================================

                    if (commonService.IsAgent(roleCode))
                    {
                        application.ProductCode = request.ProductCode.Trim();
                    }

                    commonService.CompleteStepSave(application, 1, userId, roleCode);

                    // =====================================================
                    // Application History
                    // =====================================================

                    if (isNewApplication)
                    {
                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "APPLICATION_CREATED",
                            "Application Created",
                            "Trust Application " + application.TrustID.ToString("D4") + " was created.",
                            userId,
                            "APPLICATION",
                            application.RowID);
                    }
                    else
                    {
                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "PERSONAL_DETAILS_UPDATED",
                            "Personal Details Updated",
                            "Personal details were updated.",
                            userId,
                            "PERSONAL_DETAILS",
                            application.RowID);
                    }

                    // =====================================================
                    // Save
                    // =====================================================

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

        private async Task<tbl_TrustApplication> CreateApplicationAsync(Sandbox_BasedEntities db, string merchantId, long userId, TrustApplicationStep1Request request)
        {
            long? latestTrustId = await db.tbl_TrustApplication.Where(x => x.MerchantID == merchantId).OrderByDescending(x => x.TrustID).Select(x => (long?)x.TrustID).FirstOrDefaultAsync();
            long trustId = (latestTrustId ?? 0) + 1;

            var application =
                new tbl_TrustApplication
                {
                    TrustID = trustId,
                    MerchantID = merchantId,
                    ProductCode = request.ProductCode.Trim(),
                    MemberID = userId,
                    ApplicationStatus = "DRAFT",
                    CurrentStep = 1,
                    LastCompletedStep = 0,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId
                };

            db.tbl_TrustApplication.Add(application);
            await db.SaveChangesAsync();

            db.tbl_TrustApplication_StatusHistory.Add(
                new tbl_TrustApplication_StatusHistory
                {
                    TrustApplicationID =application.RowID,
                    PreviousStatus = null,
                    NewStatus = "DRAFT",
                    Remark = "Trust Application created.",
                    ChangedAt = DateTime.Now,
                    ChangedBy = userId
                });
            await db.SaveChangesAsync();

            return application;
        }

        private async Task ValidateProductAsync(Sandbox_BasedEntities db, string merchantId, string productCode)
        {
            string value = productCode.Trim();
            bool exists = await db.tbl_TrustPlan.AnyAsync(x => x.ProductCode == value && x.ProductStatus == "ACTIVE");
            if (!exists)
            {
                throw new BusinessException("Invalid trust product.", Code);
            }
        }

        private async Task SavePersonalDetailAsync(Sandbox_BasedEntities db, long trustApplicationId, long userId, TrustApplicationStep1Request request)
        {
            var detail = await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(x => x.TrustApplicationID == trustApplicationId);
            bool isNew = detail == null;

            if (isNew)
            {
                detail =
                    new tbl_TrustApplication_PersonalDetail
                    {
                        TrustApplicationID = trustApplicationId,
                        CreatedAt = DateTime.Now,
                        CreatedBy = userId
                    };
                db.tbl_TrustApplication_PersonalDetail.Add(detail);
            }

            detail.FullName = request.FullName.Trim();
            detail.IdentityType = request.IdentityType.Trim();
            detail.IdentityNo = request.IdentityNo.Trim();
            detail.Nationality = request.Nationality.Trim();
            detail.Gender = request.Gender.Trim();
            detail.DateOfBirth = request.DateOfBirth;
            detail.Email = request.Email.Trim();
            detail.ContactNo = request.ContactNo.Trim();
            detail.AddressLine1 = request.AddressLine1.Trim();
            detail.AddressLine2 = request.AddressLine2?.Trim();
            detail.Postcode = request.Postcode.Trim();
            detail.City = request.City.Trim();
            detail.State = request.State.Trim();
            detail.Country = request.Country.Trim();
            detail.IsUSTaxPayer = request.IsUSTaxPayer;
            detail.HasOtherTaxResidence = request.HasOtherTaxResidence;

            if (request.HasOtherTaxResidence == true)
            {
                detail.TaxResidenceCountry = request.TaxResidenceCountry?.Trim();
                detail.TaxIdentificationNo = request.TaxIdentificationNo?.Trim();
                detail.TINUnavailableReason = request.TINUnavailableReason?.Trim();
                detail.TINUnavailableExplanation = request.TINUnavailableExplanation?.Trim();
            }
            else
            {
                detail.TaxResidenceCountry = null;
                detail.TaxIdentificationNo = null;
                detail.TINUnavailableReason = null;
                detail.TINUnavailableExplanation = null;
            }

            detail.EmployerName = request.EmployerName?.Trim();
            detail.NatureOfBusiness = request.NatureOfBusiness?.Trim();
            detail.Occupation = request.Occupation?.Trim();
            detail.AnnualIncomeCode = request.AnnualIncomeCode.Trim();
            detail.NetWorthCode = request.NetWorthCode.Trim();
            detail.UpdatedAt = DateTime.Now;
            detail.UpdatedBy = userId;
        }

        private async Task SaveSourceOfFundsAsync(Sandbox_BasedEntities db, long trustApplicationId, long userId, TrustApplicationStep1Request request)
        {
            var existing = await db.tbl_TrustApplication_SourceOfFund.Where(x => x.TrustApplicationID == trustApplicationId).ToListAsync();
            if (existing.Any())
            {
                db.tbl_TrustApplication_SourceOfFund.RemoveRange(existing);
            }

            foreach (var source in request.SourceOfFunds)
            {
                db.tbl_TrustApplication_SourceOfFund.Add(
                    new tbl_TrustApplication_SourceOfFund
                    {
                        TrustApplicationID = trustApplicationId,
                        SourceCode = source.SourceCode.Trim(),
                        OtherDescription = string.Equals(source.SourceCode, "OTHER", StringComparison.OrdinalIgnoreCase) ? source.OtherDescription?.Trim() : null,
                        CreatedAt = DateTime.Now,
                        CreatedBy = userId
                    });
            }
        }
    }
}