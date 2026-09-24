using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Class.Service.TrustApplication.Document;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Step2
{
    public class TrustApplicationStep2ServiceAsync
    {
        private readonly TrustApplicationStep2Validator validator;
        private readonly TrustApplicationCommonService commonService;

        public TrustApplicationStep2ServiceAsync()
        {
            validator = new TrustApplicationStep2Validator();
            commonService = new TrustApplicationCommonService();
        }

        public async Task<TrustApplicationStepResult> SaveAsync(string merchantId, long userId, string roleCode, TrustApplicationStep2Request request)
        {
            validator.Validate(request);

            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction())
            {
                try
                {
                    // ====================================================
                    // Get application
                    // ====================================================

                    var application = await commonService.GetApplicationForStepUpdateAsync(db, merchantId, userId, roleCode, request.TrustID);

                    // ====================================================
                    // Must have completed Step 1
                    // ====================================================

                    if (commonService.IsAgent(roleCode))
                    {
                        commonService.ValidateStepAccess(application, 2, roleCode);
                    }

                    // ====================================================
                    // Validate Amount Against Trust Plan
                    // ====================================================

                    await ValidateTrustAssetAmountAsync(db, application.ProductCode, request.TrustAssetAmount.Value);

                    // ====================================================
                    // Save Step 2
                    // ====================================================

                    await SaveTrustAssetAsync(db, application.RowID, userId, request);

                    // ====================================================
                    // Update Progress
                    // ====================================================

                    commonService.CompleteStepSave(application, 2, userId, roleCode);

                    // ====================================================
                    // Create Automatic Step 2 Documents
                    // ====================================================

                    var documentService = new TrustApplicationDocumentServiceAsync();
                    var generatedDocumentIds = await documentService.CreateAutomaticDocumentsAsync(db, application, "STEP_2", userId);

                    // ====================================================
                    // Application History
                    // ====================================================

                    TrustApplicationHistoryHelper.Add(
                        db,
                        application.RowID,
                        "STEP_2_UPDATED",
                        "Step 2 Updated",
                        "Trust asset, payment source and bank information was updated.",
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

        private async Task SaveTrustAssetAsync(Sandbox_BasedEntities db, long trustApplicationId, long userId, TrustApplicationStep2Request request)
        {
            var record = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == trustApplicationId);
            bool isNew = record == null;

            if (isNew)
            {
                record =
                    new tbl_TrustApplication_TrustAsset
                    {
                        TrustApplicationID = trustApplicationId,
                        CreatedAt = DateTime.Now,
                        CreatedBy = userId
                    };

                db.tbl_TrustApplication_TrustAsset.Add(record);
            }

            // ========================================================
            // Trust Asset
            // ========================================================

            record.TrustAssetAmount = request.TrustAssetAmount.Value;

            // ========================================================
            // Settlor Bank
            // ========================================================

            record.SettlorBankName = Clean(request.SettlorBankName);
            record.SettlorOtherBankName = IsOther(request.SettlorBankName) ? Clean(request.SettlorOtherBankName) : null;
            record.SettlorBankAccountHolder = Clean(request.SettlorBankAccountHolder);
            record.SettlorBankAccountNumber = Clean(request.SettlorBankAccountNumber);
            record.SettlorSwiftCode = Clean(request.SettlorSwiftCode);
            record.SettlorBankAddress = Clean(request.SettlorBankAddress);

            // ========================================================
            // Guaranteed Returns
            // ========================================================

            record.GuaranteedReturnOption = Clean(request.GuaranteedReturnOption);

            // ========================================================
            // Payment Source
            // ========================================================

            record.PaymentSource = Clean(request.PaymentSource);
            string paymentSource = request.PaymentSource.Trim().ToUpperInvariant();

            // ========================================================
            // Clear all conditional fields first
            // ========================================================

            record.JointAccountHolderName = null;
            record.ThirdPartyName = null;
            record.ThirdPartyIdentityNo = null;
            record.ThirdPartyRelationship = null;
            record.ThirdPartyOtherRelationship = null;
            record.ThirdPartyBankName = null;
            record.ThirdPartyOtherBankName = null;
            record.ThirdPartyBankAccountHolder = null;
            record.ThirdPartyBankAccountNumber = null;

            // ========================================================
            // Joint Account
            // ========================================================

            if (paymentSource == "JOINT_ACCOUNT")
            {
                record.JointAccountHolderName = Clean(request.JointAccountHolderName);
            }

            // ========================================================
            // Third Party
            // ========================================================

            if (paymentSource == "THIRD_PARTY")
            {
                record.ThirdPartyName = Clean(request.ThirdPartyName);
                record.ThirdPartyIdentityNo = Clean(request.ThirdPartyIdentityNo);
                record.ThirdPartyRelationship = Clean(request.ThirdPartyRelationship);
                record.ThirdPartyOtherRelationship = IsOther(request.ThirdPartyRelationship) ? Clean(request.ThirdPartyOtherRelationship) : null;
                record.ThirdPartyBankName = Clean(request.ThirdPartyBankName);
                record.ThirdPartyOtherBankName = IsOther(request.ThirdPartyBankName) ? Clean(request.ThirdPartyOtherBankName) : null;
                record.ThirdPartyBankAccountHolder = Clean(request.ThirdPartyBankAccountHolder);
                record.ThirdPartyBankAccountNumber = Clean(request.ThirdPartyBankAccountNumber);
            }

            if (!isNew)
            {
                record.UpdatedAt = DateTime.Now;
                record.UpdatedBy = userId;
            }
        }

        private async Task ValidateTrustAssetAmountAsync(Sandbox_BasedEntities db, string productCode, decimal trustAssetAmount)
        {
            const string code = "SAVE-TRUST-APPLICATION-STEP-2";
            var plan = await db.tbl_TrustPlan.FirstOrDefaultAsync(x => x.ProductCode == productCode);

            if (plan == null)
            {
                throw new BusinessException("Trust Product not found.", code);
            }

            if (trustAssetAmount < plan.MinimumPlacement)
            {
                throw new BusinessException("Trust Asset Amount must be at least RM " + plan.MinimumPlacement.ToString("N2") + ".", code);
            }

            if (plan.MaximumPlacement.HasValue && trustAssetAmount > plan.MaximumPlacement.Value)
            {
                throw new BusinessException("Trust Asset Amount cannot exceed RM " + plan.MaximumPlacement.Value.ToString("N2") + ".", code);
            }
        }

        private string Clean(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private bool IsOther(string value)
        {
            return string.Equals(value, "OTHER", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "OTHERS", StringComparison.OrdinalIgnoreCase);
        }
    }
}