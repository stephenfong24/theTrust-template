using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Step8
{
    public class TrustApplicationSubmitServiceAsync
    {
        private const string Code = "SUBMIT-TRUST-APPLICATION";
        private readonly TrustApplicationCommonService commonService;
        private readonly TrustApplicationSubmitValidator validator;

        public TrustApplicationSubmitServiceAsync()
        {
            commonService = new TrustApplicationCommonService();
            validator = new TrustApplicationSubmitValidator();
        }

        // =============================================================
        // Submit Trust Application
        // =============================================================

        public async Task<TrustApplicationStepResult> SubmitAsync(string merchantId, long userId, string roleCode, SubmitTrustApplicationRequest request)
        {
            if (!commonService.IsAgent(roleCode))
            {
                throw new BusinessException(
                    "Only Trust Agents are allowed to submit a new Trust Application.",
                    Code);
            }

            // =========================================================
            // 1. Request Validation
            // =========================================================

            validator.Validate(request);

            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction())
            {
                try
                {
                    // =================================================
                    // 2. Get Application
                    // =================================================

                    var application = await commonService.GetDraftApplicationForAgentUpdateAsync(db, merchantId, userId, roleCode, request.TrustID);

                    // =================================================
                    // 3. Validate Step Access
                    //
                    // Step 8 requires Step 7 to have been completed.
                    //
                    // IMPORTANT:
                    // roleCode remains as parameter based on the latest
                    // ValidateStepAccess implementation.
                    // =================================================

                    commonService.ValidateStepAccess(application, 8, roleCode);

                    // =================================================
                    // 4. Validate Progress
                    // =================================================

                    if (application.LastCompletedStep < 7)
                    {
                        throw new BusinessException("Please complete all previous steps before submitting the Trust Application.", Code);
                    }

                    // =================================================
                    // 5. Final Physical Data Validation
                    //
                    // Do not rely only on LastCompletedStep.
                    //
                    // Re-check the actual records because an application
                    // may have been edited after progressing through the
                    // wizard.
                    // =================================================

                    await ValidateStep1Async(db, application.RowID);

                    await ValidateStep2Async(db, application.RowID);

                    await ValidateStep3Async(
                        db,
                        application.RowID);

                    await ValidateStep4Async(
                        db,
                        application.RowID);

                    await ValidateStep5Async(
                        db,
                        application.RowID);

                    // =================================================
                    // Step 6 - Supporting Documents
                    //
                    // OPTIONAL.
                    //
                    // No supporting document record is required.
                    //
                    // LastCompletedStep >= 7 already proves that the
                    // user visited Step 6 and clicked Save & Next.
                    // =================================================

                    // =================================================
                    // Step 7 - Co-Broker
                    //
                    // OPTIONAL.
                    //
                    // No co-broker record is required.
                    //
                    // LastCompletedStep >= 7 proves that Step 7 was
                    // confirmed using Save & Next.
                    // =================================================

                    // =================================================
                    // 6. Activate Application
                    // =================================================

                    DateTime now =
                        DateTime.Now;

                    application.ApplicationStatus =
                        "ACTIVE";

                    application.CurrentStep =
                        8;

                    application.LastCompletedStep =
                        8;

                    application.SubmittedAt =
                        now;

                    application.SubmittedBy =
                        userId;

                    application.UpdatedAt =
                        now;

                    application.UpdatedBy =
                        userId;

                    // =================================================
                    // 7. Save
                    // =================================================

                    await db.SaveChangesAsync();

                    transaction.Commit();

                    // =================================================
                    // 8. Result
                    // =================================================

                    return commonService.ToResult(
                        application);
                }
                catch
                {
                    transaction.Rollback();

                    throw;
                }
            }
        }

        // =============================================================
        // Step 1
        // Personal Details + Source Of Fund
        // =============================================================

        private async Task ValidateStep1Async(
            Sandbox_BasedEntities db,
            long trustApplicationId)
        {
            // =========================================================
            // Personal Detail
            // =========================================================

            var personalDetail =
                await db
                    .tbl_TrustApplication_PersonalDetail
                    .FirstOrDefaultAsync(a =>
                        a.TrustApplicationID ==
                            trustApplicationId);

            if (personalDetail == null)
            {
                throw new BusinessException(
                    "Step 1 Personal Details are incomplete.",
                    Code);
            }

            // =========================================================
            // Important Personal Fields
            // =========================================================

            if (string.IsNullOrWhiteSpace(
                personalDetail.FullName))
            {
                throw new BusinessException(
                    "Step 1 Full Name is required.",
                    Code);
            }

            if (string.IsNullOrWhiteSpace(
                personalDetail.IdentityType))
            {
                throw new BusinessException(
                    "Step 1 Identity Type is required.",
                    Code);
            }

            if (string.IsNullOrWhiteSpace(
                personalDetail.IdentityNo))
            {
                throw new BusinessException(
                    "Step 1 Identity Number is required.",
                    Code);
            }

            if (string.IsNullOrWhiteSpace(
                personalDetail.Nationality))
            {
                throw new BusinessException(
                    "Step 1 Nationality is required.",
                    Code);
            }

            if (string.IsNullOrWhiteSpace(
                personalDetail.Email))
            {
                throw new BusinessException(
                    "Step 1 Email is required.",
                    Code);
            }

            if (string.IsNullOrWhiteSpace(
                personalDetail.ContactNo))
            {
                throw new BusinessException(
                    "Step 1 Contact Number is required.",
                    Code);
            }

            // =========================================================
            // Source Of Fund
            // =========================================================

            bool hasSourceOfFund =
                await db
                    .tbl_TrustApplication_SourceOfFund
                    .AnyAsync(a =>
                        a.TrustApplicationID ==
                            trustApplicationId);

            if (!hasSourceOfFund)
            {
                throw new BusinessException(
                    "Step 1 Source of Fund is required.",
                    Code);
            }
        }

        // =============================================================
        // Step 2
        // Trust Asset
        // =============================================================

        private async Task ValidateStep2Async(
            Sandbox_BasedEntities db,
            long trustApplicationId)
        {
            var trustAsset =
                await db
                    .tbl_TrustApplication_TrustAsset
                    .FirstOrDefaultAsync(a =>
                        a.TrustApplicationID ==
                            trustApplicationId);

            if (trustAsset == null)
            {
                throw new BusinessException(
                    "Step 2 Trust Asset is incomplete.",
                    Code);
            }

            // =========================================================
            // Trust Asset Amount
            // =========================================================

            if (trustAsset.TrustAssetAmount <= 0)
            {
                throw new BusinessException(
                    "Step 2 Trust Asset Amount must be greater than 0.",
                    Code);
            }

            // =========================================================
            // Settlor Bank
            // =========================================================

            if (string.IsNullOrWhiteSpace(
                trustAsset.SettlorBankName))
            {
                throw new BusinessException(
                    "Step 2 Settlor Bank Name is required.",
                    Code);
            }

            if (string.IsNullOrWhiteSpace(
                trustAsset.SettlorBankAccountHolder))
            {
                throw new BusinessException(
                    "Step 2 Settlor Bank Account Holder is required.",
                    Code);
            }

            if (string.IsNullOrWhiteSpace(
                trustAsset.SettlorBankAccountNumber))
            {
                throw new BusinessException(
                    "Step 2 Settlor Bank Account Number is required.",
                    Code);
            }

            // =========================================================
            // Guaranteed Return
            // =========================================================

            if (string.IsNullOrWhiteSpace(
                trustAsset.GuaranteedReturnOption))
            {
                throw new BusinessException(
                    "Step 2 Guaranteed Return Option is required.",
                    Code);
            }

            // =========================================================
            // Payment Source
            // =========================================================

            if (string.IsNullOrWhiteSpace(
                trustAsset.PaymentSource))
            {
                throw new BusinessException(
                    "Step 2 Payment Source is required.",
                    Code);
            }

            string paymentSource =
                trustAsset.PaymentSource
                    .Trim()
                    .ToUpperInvariant();

            // =========================================================
            // Joint Account
            // =========================================================

            if (paymentSource == "JOINT")
            {
                if (string.IsNullOrWhiteSpace(
                    trustAsset.JointAccountHolderName))
                {
                    throw new BusinessException(
                        "Step 2 Joint Account Holder Name is required.",
                        Code);
                }
            }

            // =========================================================
            // Third Party
            // =========================================================

            if (paymentSource == "THIRD_PARTY")
            {
                if (string.IsNullOrWhiteSpace(
                    trustAsset.ThirdPartyName))
                {
                    throw new BusinessException(
                        "Step 2 Third Party Name is required.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    trustAsset.ThirdPartyIdentityNo))
                {
                    throw new BusinessException(
                        "Step 2 Third Party Identity Number is required.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    trustAsset.ThirdPartyRelationship))
                {
                    throw new BusinessException(
                        "Step 2 Third Party Relationship is required.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    trustAsset.ThirdPartyBankName))
                {
                    throw new BusinessException(
                        "Step 2 Third Party Bank Name is required.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    trustAsset.ThirdPartyBankAccountHolder))
                {
                    throw new BusinessException(
                        "Step 2 Third Party Bank Account Holder is required.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    trustAsset.ThirdPartyBankAccountNumber))
                {
                    throw new BusinessException(
                        "Step 2 Third Party Bank Account Number is required.",
                        Code);
                }
            }
        }

        // =============================================================
        // Step 3
        // Beneficiaries
        // =============================================================

        private async Task ValidateStep3Async(
            Sandbox_BasedEntities db,
            long trustApplicationId)
        {
            var beneficiaries =
                await db
                    .tbl_TrustApplication_Beneficiary
                    .Where(a =>
                        a.TrustApplicationID ==
                            trustApplicationId
                        &&
                        a.IsActive)
                    .ToListAsync();

            // =========================================================
            // At Least One Active Beneficiary
            // =========================================================

            if (!beneficiaries.Any())
            {
                throw new BusinessException(
                    "Step 3 requires at least one active beneficiary.",
                    Code);
            }

            // =========================================================
            // Re-check Important Beneficiary Fields
            // =========================================================

            foreach (var beneficiary in beneficiaries)
            {
                if (string.IsNullOrWhiteSpace(
                    beneficiary.FullName))
                {
                    throw new BusinessException(
                        "Step 3 contains a beneficiary without a Full Name.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    beneficiary.IdentityType))
                {
                    throw new BusinessException(
                        "Step 3 contains a beneficiary without an Identity Type.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    beneficiary.IdentityNo))
                {
                    throw new BusinessException(
                        "Step 3 contains a beneficiary without an Identity Number.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    beneficiary.Nationality))
                {
                    throw new BusinessException(
                        "Step 3 contains a beneficiary without Nationality.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    beneficiary.RelationshipCode))
                {
                    throw new BusinessException(
                        "Step 3 contains a beneficiary without a Relationship.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    beneficiary.AddressLine1))
                {
                    throw new BusinessException(
                        "Step 3 contains a beneficiary without an Address.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    beneficiary.Postcode))
                {
                    throw new BusinessException(
                        "Step 3 contains a beneficiary without a Postcode.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    beneficiary.City))
                {
                    throw new BusinessException(
                        "Step 3 contains a beneficiary without a City.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    beneficiary.State))
                {
                    throw new BusinessException(
                        "Step 3 contains a beneficiary without a State.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    beneficiary.Country))
                {
                    throw new BusinessException(
                        "Step 3 contains a beneficiary without a Country.",
                        Code);
                }
            }
        }

        // =============================================================
        // Step 4
        // Beneficiary Allocation
        // =============================================================

        private async Task ValidateStep4Async(
            Sandbox_BasedEntities db,
            long trustApplicationId)
        {
            // =========================================================
            // Allocation Header
            // =========================================================

            var allocation =
                await db
                    .tbl_TrustApplication_BeneficiaryAllocation
                    .FirstOrDefaultAsync(a =>
                        a.TrustApplicationID ==
                            trustApplicationId);

            if (allocation == null)
            {
                throw new BusinessException(
                    "Step 4 Beneficiary Allocation is incomplete.",
                    Code);
            }

            // =========================================================
            // Valid Allocation Type
            //
            // 1 = One main + one substitute
            // 2 = One main + equal multiple substitutes
            // 3 = One main + percentage multiple substitutes
            // 4 = One main + Trustee Company substitute
            // 5 = Equal multiple main beneficiaries
            // 6 = Percentage multiple main beneficiaries
            // 7 = 100% Trustee Company
            // =========================================================

            if (allocation.AllocationType < 1 ||
                allocation.AllocationType > 7)
            {
                throw new BusinessException(
                    "Step 4 contains an invalid Allocation Type.",
                    Code);
            }

            // =========================================================
            // Allocation Details
            // =========================================================

            var details =
                await db
                    .tbl_TrustApplication_BeneficiaryAllocationDetail
                    .Where(a =>
                        a.AllocationID ==
                            allocation.RowID)
                    .ToListAsync();

            if (!details.Any())
            {
                throw new BusinessException(
                    "Step 4 Beneficiary Allocation Details are incomplete.",
                    Code);
            }

            // =========================================================
            // Active Beneficiaries
            //
            // Important:
            // A beneficiary may have been removed after Step 4 was
            // previously completed.
            // =========================================================

            var activeBeneficiaryIds =
                await db
                    .tbl_TrustApplication_Beneficiary
                    .Where(a =>
                        a.TrustApplicationID ==
                            trustApplicationId
                        &&
                        a.IsActive)
                    .Select(a =>
                        a.RowID)
                    .ToListAsync();

            // =========================================================
            // Validate Every Beneficiary Reference
            // =========================================================

            foreach (var detail in details)
            {
                // Trustee Company does not require BeneficiaryID.
                if (detail.IsTrusteeCompany)
                {
                    continue;
                }

                if (!detail.BeneficiaryID.HasValue)
                {
                    throw new BusinessException(
                        "Step 4 contains an invalid beneficiary allocation.",
                        Code);
                }

                if (!activeBeneficiaryIds.Contains(
                    detail.BeneficiaryID.Value))
                {
                    throw new BusinessException(
                        "Step 4 references a beneficiary that is no longer active. Please review the Beneficiary Allocation.",
                        Code);
                }
            }

            // =========================================================
            // Validate According To Allocation Type
            // =========================================================

            switch (allocation.AllocationType)
            {
                case 1:

                    ValidateAllocationType1(
                        details);

                    break;


                case 2:

                    ValidateAllocationType2(
                        details);

                    break;


                case 3:

                    ValidateAllocationType3(
                        details);

                    break;


                case 4:

                    ValidateAllocationType4(
                        details);

                    break;


                case 5:

                    ValidateAllocationType5(
                        details);

                    break;


                case 6:

                    ValidateAllocationType6(
                        details);

                    break;


                case 7:

                    ValidateAllocationType7(
                        details);

                    break;
            }
        }

        // =============================================================
        // Allocation Type 1
        //
        // 100% one main beneficiary
        // +
        // one substitute beneficiary
        // =============================================================

        private void ValidateAllocationType1(
            List<tbl_TrustApplication_BeneficiaryAllocationDetail> details)
        {
            var mainBeneficiaries =
                details
                    .Where(a =>
                        IsRole(
                            a.RoleType,
                            "MAIN"))
                    .ToList();

            var substitutes =
                details
                    .Where(a =>
                        IsRole(
                            a.RoleType,
                            "SUBSTITUTE"))
                    .ToList();

            if (mainBeneficiaries.Count != 1)
            {
                throw new BusinessException(
                    "Allocation Type 1 requires exactly one main beneficiary.",
                    Code);
            }

            if (substitutes.Count != 1)
            {
                throw new BusinessException(
                    "Allocation Type 1 requires exactly one substitute beneficiary.",
                    Code);
            }

            if (mainBeneficiaries[0].IsTrusteeCompany ||
                !mainBeneficiaries[0].BeneficiaryID.HasValue)
            {
                throw new BusinessException(
                    "Allocation Type 1 main beneficiary is invalid.",
                    Code);
            }

            if (substitutes[0].IsTrusteeCompany ||
                !substitutes[0].BeneficiaryID.HasValue)
            {
                throw new BusinessException(
                    "Allocation Type 1 substitute beneficiary is invalid.",
                    Code);
            }

            ValidateOneHundredPercent(
                mainBeneficiaries[0],
                "Allocation Type 1 main beneficiary must be allocated 100%.");
        }

        // =============================================================
        // Allocation Type 2
        //
        // 100% one main beneficiary
        // +
        // equal shares multiple substitutes
        // =============================================================

        private void ValidateAllocationType2(
            List<tbl_TrustApplication_BeneficiaryAllocationDetail> details)
        {
            var mains =
                details
                    .Where(a =>
                        IsRole(
                            a.RoleType,
                            "MAIN"))
                    .ToList();

            var substitutes =
                details
                    .Where(a =>
                        IsRole(
                            a.RoleType,
                            "SUBSTITUTE"))
                    .ToList();

            if (mains.Count != 1)
            {
                throw new BusinessException(
                    "Allocation Type 2 requires exactly one main beneficiary.",
                    Code);
            }

            if (substitutes.Count < 1)
            {
                throw new BusinessException(
                    "Allocation Type 2 requires at least one substitute beneficiary.",
                    Code);
            }

            ValidateOneHundredPercent(
                mains[0],
                "Allocation Type 2 main beneficiary must be allocated 100%.");

            ValidateNoTrusteeCompany(
                substitutes,
                "Allocation Type 2 substitute beneficiary is invalid.");
        }

        // =============================================================
        // Allocation Type 3
        //
        // 100% one main beneficiary
        // +
        // specific percentage substitutes total 100%
        // =============================================================

        private void ValidateAllocationType3(
            List<tbl_TrustApplication_BeneficiaryAllocationDetail> details)
        {
            var mains =
                details
                    .Where(a =>
                        IsRole(
                            a.RoleType,
                            "MAIN"))
                    .ToList();

            var substitutes =
                details
                    .Where(a =>
                        IsRole(
                            a.RoleType,
                            "SUBSTITUTE"))
                    .ToList();

            if (mains.Count != 1)
            {
                throw new BusinessException(
                    "Allocation Type 3 requires exactly one main beneficiary.",
                    Code);
            }

            if (substitutes.Count < 1)
            {
                throw new BusinessException(
                    "Allocation Type 3 requires at least one substitute beneficiary.",
                    Code);
            }

            ValidateOneHundredPercent(
                mains[0],
                "Allocation Type 3 main beneficiary must be allocated 100%.");

            ValidateNoTrusteeCompany(
                substitutes,
                "Allocation Type 3 substitute beneficiary is invalid.");

            ValidatePercentageTotal(
                substitutes,
                "Allocation Type 3 substitute beneficiary allocation must total 100%.");
        }

        // =============================================================
        // Allocation Type 4
        //
        // 100% one main beneficiary
        // +
        // Trustee Company substitute
        // =============================================================

        private void ValidateAllocationType4(
            List<tbl_TrustApplication_BeneficiaryAllocationDetail> details)
        {
            var mains =
                details
                    .Where(a =>
                        IsRole(
                            a.RoleType,
                            "MAIN"))
                    .ToList();

            var substitutes =
                details
                    .Where(a =>
                        IsRole(
                            a.RoleType,
                            "SUBSTITUTE"))
                    .ToList();

            if (mains.Count != 1)
            {
                throw new BusinessException(
                    "Allocation Type 4 requires exactly one main beneficiary.",
                    Code);
            }

            if (substitutes.Count != 1)
            {
                throw new BusinessException(
                    "Allocation Type 4 requires exactly one Trustee Company substitute.",
                    Code);
            }

            if (mains[0].IsTrusteeCompany ||
                !mains[0].BeneficiaryID.HasValue)
            {
                throw new BusinessException(
                    "Allocation Type 4 main beneficiary is invalid.",
                    Code);
            }

            if (!substitutes[0].IsTrusteeCompany)
            {
                throw new BusinessException(
                    "Allocation Type 4 substitute must be the Trustee Company.",
                    Code);
            }

            ValidateOneHundredPercent(
                mains[0],
                "Allocation Type 4 main beneficiary must be allocated 100%.");
        }

        // =============================================================
        // Allocation Type 5
        //
        // Equal shares multiple main beneficiaries
        // =============================================================

        private void ValidateAllocationType5(
            List<tbl_TrustApplication_BeneficiaryAllocationDetail> details)
        {
            var mains =
                details
                    .Where(a =>
                        IsRole(
                            a.RoleType,
                            "MAIN"))
                    .ToList();

            if (mains.Count < 1)
            {
                throw new BusinessException(
                    "Allocation Type 5 requires at least one main beneficiary.",
                    Code);
            }

            ValidateNoTrusteeCompany(
                mains,
                "Allocation Type 5 main beneficiary is invalid.");
        }

        // =============================================================
        // Allocation Type 6
        //
        // Specific percentage main beneficiaries
        // Total = 100%
        // =============================================================

        private void ValidateAllocationType6(
            List<tbl_TrustApplication_BeneficiaryAllocationDetail> details)
        {
            var mains =
                details
                    .Where(a =>
                        IsRole(
                            a.RoleType,
                            "MAIN"))
                    .ToList();

            if (mains.Count < 1)
            {
                throw new BusinessException(
                    "Allocation Type 6 requires at least one main beneficiary.",
                    Code);
            }

            ValidateNoTrusteeCompany(
                mains,
                "Allocation Type 6 main beneficiary is invalid.");

            ValidatePercentageTotal(
                mains,
                "Allocation Type 6 beneficiary allocation must total 100%.");
        }

        // =============================================================
        // Allocation Type 7
        //
        // 100% Trustee Company
        // =============================================================

        private void ValidateAllocationType7(
            List<tbl_TrustApplication_BeneficiaryAllocationDetail> details)
        {
            if (details.Count != 1)
            {
                throw new BusinessException(
                    "Allocation Type 7 requires exactly one Trustee Company allocation.",
                    Code);
            }

            var trustee =
                details[0];

            if (!trustee.IsTrusteeCompany)
            {
                throw new BusinessException(
                    "Allocation Type 7 must allocate to the Trustee Company.",
                    Code);
            }

            ValidateOneHundredPercent(
                trustee,
                "Allocation Type 7 Trustee Company allocation must be 100%.");
        }

        // =============================================================
        // Step 5
        // Execution Of Trust Deed
        // =============================================================

        private async Task ValidateStep5Async(
            Sandbox_BasedEntities db,
            long trustApplicationId)
        {
            var execution =
                await db
                    .tbl_TrustApplication_TrustDeedExecution
                    .FirstOrDefaultAsync(a =>
                        a.TrustApplicationID ==
                            trustApplicationId);

            if (execution == null)
            {
                throw new BusinessException(
                    "Step 5 Execution of Trust Deed is incomplete.",
                    Code);
            }

            // =========================================================
            // Signing Method
            // =========================================================

            if (string.IsNullOrWhiteSpace(
                execution.SigningMethod))
            {
                throw new BusinessException(
                    "Step 5 Signing Method is required.",
                    Code);
            }

            // =========================================================
            // Special Circumstance
            // =========================================================

            if (string.IsNullOrWhiteSpace(
                execution.SpecialCircumstance))
            {
                throw new BusinessException(
                    "Step 5 Special Circumstance is required.",
                    Code);
            }

            string specialCircumstance =
                execution.SpecialCircumstance
                    .Trim()
                    .ToUpperInvariant();

            // =========================================================
            // NONE requires no read-over information.
            //
            // All other special circumstances require the read-over
            // details.
            // =========================================================

            if (specialCircumstance != "NONE")
            {
                if (string.IsNullOrWhiteSpace(
                    execution.ReadOverBy))
                {
                    throw new BusinessException(
                        "Step 5 Read Over By is required for the selected special circumstance.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    execution.ReadOverIdentityNo))
                {
                    throw new BusinessException(
                        "Step 5 Read Over Identity Number is required for the selected special circumstance.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    execution.LanguageOrDialect))
                {
                    throw new BusinessException(
                        "Step 5 Language or Dialect is required for the selected special circumstance.",
                        Code);
                }

                if (string.IsNullOrWhiteSpace(
                    execution.RelationshipWithSettlor))
                {
                    throw new BusinessException(
                        "Step 5 Relationship With Settlor is required for the selected special circumstance.",
                        Code);
                }

                if (string.Equals(
                    execution.RelationshipWithSettlor,
                    "OTHER",
                    StringComparison.OrdinalIgnoreCase)
                    &&
                    string.IsNullOrWhiteSpace(
                        execution.OtherRelationshipWithSettlor))
                {
                    throw new BusinessException(
                        "Step 5 Other Relationship With Settlor is required.",
                        Code);
                }
            }
        }

        // =============================================================
        // Allocation Helper
        // =============================================================

        private bool IsRole(
            string roleType,
            string expectedRole)
        {
            return string.Equals(
                roleType,
                expectedRole,
                StringComparison.OrdinalIgnoreCase);
        }

        // =============================================================
        // Ensure Detail Is 100%
        // =============================================================

        private void ValidateOneHundredPercent(
            tbl_TrustApplication_BeneficiaryAllocationDetail detail,
            string errorMessage)
        {
            if (!detail.AllocationPercentage.HasValue ||
                detail.AllocationPercentage.Value != 100m)
            {
                throw new BusinessException(
                    errorMessage,
                    Code);
            }
        }

        // =============================================================
        // Ensure No Trustee Company In Beneficiary List
        // =============================================================

        private void ValidateNoTrusteeCompany(
            List<tbl_TrustApplication_BeneficiaryAllocationDetail> details,
            string errorMessage)
        {
            foreach (var detail in details)
            {
                if (detail.IsTrusteeCompany ||
                    !detail.BeneficiaryID.HasValue)
                {
                    throw new BusinessException(
                        errorMessage,
                        Code);
                }
            }
        }

        // =============================================================
        // Validate Specific Percentage Total
        // =============================================================

        private void ValidatePercentageTotal(
            List<tbl_TrustApplication_BeneficiaryAllocationDetail> details,
            string errorMessage)
        {
            foreach (var detail in details)
            {
                if (!detail.AllocationPercentage.HasValue)
                {
                    throw new BusinessException(
                        errorMessage,
                        Code);
                }

                if (detail.AllocationPercentage.Value <= 0 ||
                    detail.AllocationPercentage.Value > 100)
                {
                    throw new BusinessException(
                        errorMessage,
                        Code);
                }
            }

            decimal total =
                details.Sum(a =>
                    a.AllocationPercentage ?? 0m);

            if (total != 100m)
            {
                throw new BusinessException(
                    errorMessage,
                    Code);
            }
        }
    }
}