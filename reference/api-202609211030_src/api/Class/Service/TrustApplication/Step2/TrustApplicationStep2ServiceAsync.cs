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
                    // Get application payment approved
                    // ====================================================

                    var record =
                        await db.tbl_TrustApplication_TrustAsset
                            .FirstOrDefaultAsync(
                                x => x.TrustApplicationID == application.RowID);

                    bool hasPaymentAllocation =
                        await db.tbl_TrustApplication_Payment
                            .AnyAsync(x =>
                                x.TrustApplicationID == application.RowID &&
                                x.IsActive &&
                                (
                                    x.PaymentStatus == "WAITING_PAYMENT" ||
                                    x.PaymentStatus == "PENDING_APPROVAL" ||
                                    x.PaymentStatus == "PAYMENT_APPROVED"
                                ));

                    bool hasApprovedPayment =
                        await db.tbl_TrustApplication_Payment
                            .AnyAsync(x =>
                                x.TrustApplicationID == application.RowID &&
                                x.IsActive &&
                                x.PaymentStatus == "PAYMENT_APPROVED");

                    // ====================================================
                    // Protect Trust Asset Amount
                    // Once payment allocation exists, amount cannot change.
                    // ====================================================

                    if (hasPaymentAllocation && record != null && record.TrustAssetAmount != request.TrustAssetAmount.Value)
                    {
                        throw new BusinessException("Trust Asset Amount cannot be changed after payment allocation has been created.", "SAVE-TRUST-APPLICATION-STEP-2");
                    }

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


                    await ValidateGuaranteedReturnAsync(
                        db,
                        application.ProductCode,
                        request.GuaranteedReturnOption);

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

        private static void ValidateApprovedPaymentFields(tbl_TrustApplication_TrustAsset existing, TrustApplicationStep2Request request)
        {
            if (existing == null)
            {
                return;
            }

            const string code = "SAVE-TRUST-APPLICATION-STEP-2";

            bool changed =
                !StringEquals(
                    existing.PaymentSource,
                    request.PaymentSource) ||

                !StringEquals(
                    existing.SettlorBankName,
                    request.SettlorBankName) ||

                !StringEquals(
                    existing.SettlorOtherBankName,
                    request.SettlorOtherBankName) ||

                !StringEquals(
                    existing.SettlorBankAccountNumber,
                    request.SettlorBankAccountNumber) ||

                !StringEquals(
                    existing.ThirdPartyBankName,
                    request.ThirdPartyBankName) ||

                !StringEquals(
                    existing.ThirdPartyOtherBankName,
                    request.ThirdPartyOtherBankName) ||

                !StringEquals(
                    existing.ThirdPartyBankAccountNumber,
                    request.ThirdPartyBankAccountNumber);

            if (changed)
            {
                throw new BusinessException("Payment source and bank details cannot be changed after a payment has been approved.", code);
            }
        }

        private async Task ValidateGuaranteedReturnAsync(
            Sandbox_BasedEntities db,
            string productCode,
            string guaranteedReturnOption)
        {
            const string code =
                "SAVE-TRUST-APPLICATION-STEP-2";

            // ========================================================
            // Only redeposit requires Trust Plan validation
            // ========================================================

            string option =
                (guaranteedReturnOption ?? "")
                    .Trim()
                    .ToUpperInvariant();

            if (option != "REDEPOSIT_AS_TRUST_ASSET")
            {
                return;
            }

            // ========================================================
            // Get Trust Plan
            // ========================================================

            var plan =
                await db.tbl_TrustPlan
                    .FirstOrDefaultAsync(
                        x => x.ProductCode == productCode);

            if (plan == null)
            {
                throw new BusinessException(
                    "Trust Product not found.",
                    code);
            }

            // ========================================================
            // Get Dividend Payout Configuration
            // ========================================================

            var dividendPayout =
                await db.tbl_TrustPlanDividendPayout
                    .FirstOrDefaultAsync(
                        x => x.TrustPlanID == plan.RowID);

            if (dividendPayout == null)
            {
                throw new BusinessException(
                    "Trust Plan dividend payout configuration was not found.",
                    code);
            }

            // ========================================================
            // Validate Dividend Redeposit
            // ========================================================

            if (!dividendPayout.AllowDividendRedeposit)
            {
                throw new BusinessException(
                    "Dividend redeposit is not allowed for the selected Trust Plan.",
                    code);
            }
        }

        private static bool StringEquals(
            string value1,
            string value2)
        {
            return string.Equals(
                (value1 ?? "").Trim(),
                (value2 ?? "").Trim(),
                StringComparison.OrdinalIgnoreCase);
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