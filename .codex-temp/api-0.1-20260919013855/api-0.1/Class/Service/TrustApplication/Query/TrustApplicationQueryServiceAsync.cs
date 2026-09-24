using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Query
{
    public class TrustApplicationQueryServiceAsync
    {
        private readonly TrustApplicationCommonService commonService;


        public TrustApplicationQueryServiceAsync()
        {
            commonService =
                new TrustApplicationCommonService();
        }


        // ============================================================
        // Get Complete Trust Application
        //
        // Used by:
        //
        // AG
        // - populate wizard
        // - go back to previous step
        // - resume existing draft
        // - view submitted application
        //
        // SA / AD
        // - load submitted application for editing
        // ============================================================

        public async Task<TrustApplicationDetailResult> GetAsync(
            string merchantId,
            long userId,
            string roleCode,
            long trustId)
        {
            using (var db =
                new Sandbox_BasedEntities())
            {
                // ====================================================
                // Application + Access
                // ====================================================

                var application =
                    await commonService
                        .GetApplicationForFormReadAsync(
                            db,
                            merchantId,
                            userId,
                            roleCode,
                            trustId);


                // ====================================================
                // Step 1
                // Personal Details
                // ====================================================

                var personal =
                    await db
                        .tbl_TrustApplication_PersonalDetail
                        .FirstOrDefaultAsync(x =>
                            x.TrustApplicationID ==
                                application.RowID);


                var sourceOfFunds =
                    await db
                        .tbl_TrustApplication_SourceOfFund
                        .Where(x =>
                            x.TrustApplicationID ==
                                application.RowID)
                        .OrderBy(x =>
                            x.RowID)
                        .Select(x =>
                            new TrustApplicationSourceOfFundRequest
                            {
                                SourceCode =
                                    x.SourceCode,

                                OtherDescription =
                                    x.OtherDescription
                            })
                        .ToListAsync();


                TrustApplicationStep1Request step1 =
                    null;


                if (personal != null)
                {
                    step1 =
                        new TrustApplicationStep1Request
                        {
                            TrustID =
                                application.TrustID,

                            ProductCode =
                                application.ProductCode,

                            FullName =
                                personal.FullName,

                            IdentityType =
                                personal.IdentityType,

                            IdentityNo =
                                personal.IdentityNo,

                            Nationality =
                                personal.Nationality,

                            Gender =
                                personal.Gender,

                            DateOfBirth =
                                personal.DateOfBirth,

                            Email =
                                personal.Email,

                            ContactNo =
                                personal.ContactNo,

                            AddressLine1 =
                                personal.AddressLine1,

                            AddressLine2 =
                                personal.AddressLine2,

                            Postcode =
                                personal.Postcode,

                            City =
                                personal.City,

                            State =
                                personal.State,

                            Country =
                                personal.Country,

                            IsUSTaxPayer =
                                personal.IsUSTaxPayer,

                            HasOtherTaxResidence =
                                personal.HasOtherTaxResidence,

                            TaxResidenceCountry =
                                personal.TaxResidenceCountry,

                            TaxIdentificationNo =
                                personal.TaxIdentificationNo,

                            TINUnavailableReason =
                                personal.TINUnavailableReason,

                            TINUnavailableExplanation =
                                personal.TINUnavailableExplanation,

                            EmployerName =
                                personal.EmployerName,

                            NatureOfBusiness =
                                personal.NatureOfBusiness,

                            Occupation =
                                personal.Occupation,

                            AnnualIncomeCode =
                                personal.AnnualIncomeCode,

                            NetWorthCode =
                                personal.NetWorthCode,

                            SourceOfFunds =
                                sourceOfFunds
                        };
                }


                // ====================================================
                // Step 2
                // Trust Asset
                // ====================================================

                var trustAsset =
                    await db
                        .tbl_TrustApplication_TrustAsset
                        .FirstOrDefaultAsync(x =>
                            x.TrustApplicationID ==
                                application.RowID);


                TrustApplicationStep2Request step2 =
                    null;


                if (trustAsset != null)
                {
                    step2 =
                        new TrustApplicationStep2Request
                        {
                            TrustID =
                                application.TrustID,

                            TrustAssetAmount =
                                trustAsset.TrustAssetAmount,

                            SettlorBankName =
                                trustAsset.SettlorBankName,

                            SettlorOtherBankName =
                                trustAsset.SettlorOtherBankName,

                            SettlorBankAccountHolder =
                                trustAsset.SettlorBankAccountHolder,

                            SettlorBankAccountNumber =
                                trustAsset.SettlorBankAccountNumber,

                            SettlorSwiftCode =
                                trustAsset.SettlorSwiftCode,

                            SettlorBankAddress =
                                trustAsset.SettlorBankAddress,

                            GuaranteedReturnOption =
                                trustAsset.GuaranteedReturnOption,

                            PaymentSource =
                                trustAsset.PaymentSource,

                            JointAccountHolderName =
                                trustAsset.JointAccountHolderName,

                            ThirdPartyName =
                                trustAsset.ThirdPartyName,

                            ThirdPartyIdentityNo =
                                trustAsset.ThirdPartyIdentityNo,

                            ThirdPartyRelationship =
                                trustAsset.ThirdPartyRelationship,

                            ThirdPartyOtherRelationship =
                                trustAsset.ThirdPartyOtherRelationship,

                            ThirdPartyBankName =
                                trustAsset.ThirdPartyBankName,

                            ThirdPartyOtherBankName =
                                trustAsset.ThirdPartyOtherBankName,

                            ThirdPartyBankAccountHolder =
                                trustAsset.ThirdPartyBankAccountHolder,

                            ThirdPartyBankAccountNumber =
                                trustAsset.ThirdPartyBankAccountNumber
                        };
                }


                // ====================================================
                // Step 3
                // Beneficiaries
                // ====================================================

                var beneficiaries =
                    await db
                        .tbl_TrustApplication_Beneficiary
                        .Where(x =>
                            x.TrustApplicationID ==
                                application.RowID
                            &&
                            x.IsActive)
                        .OrderBy(x =>
                            x.RowID)
                        .Select(x =>
                            new TrustApplicationBeneficiaryRequest
                            {
                                BeneficiaryID =
                                    x.RowID,

                                BeneficiaryClientID = "",

                                FullName =
                                    x.FullName,

                                IdentityType =
                                    x.IdentityType,

                                IdentityNo =
                                    x.IdentityNo,

                                Nationality =
                                    x.Nationality,

                                Gender =
                                    x.Gender,

                                DateOfBirth =
                                    x.DateOfBirth,

                                Email =
                                    x.Email,

                                ContactNo =
                                    x.ContactNo,

                                RelationshipCode =
                                    x.RelationshipCode,

                                OtherRelationship =
                                    x.OtherRelationship,

                                AddressLine1 =
                                    x.AddressLine1,

                                AddressLine2 =
                                    x.AddressLine2,

                                Postcode =
                                    x.Postcode,

                                City =
                                    x.City,

                                State =
                                    x.State,

                                Country =
                                    x.Country,

                                IsUSTaxPayer =
                                    x.IsUSTaxPayer,

                                HasOtherTaxResidence =
                                    x.HasOtherTaxResidence,

                                TaxResidenceCountry =
                                    x.TaxResidenceCountry,

                                TaxIdentificationNo =
                                    x.TaxIdentificationNo,

                                TINUnavailableReason =
                                    x.TINUnavailableReason,

                                TINUnavailableExplanation =
                                    x.TINUnavailableExplanation
                            })
                        .ToListAsync();

                var caretakers =
                    await db
                        .tbl_TrustApplication_Caretaker
                        .Where(x =>
                            x.TrustApplicationID ==
                                application.RowID)
                        .ToListAsync();

                var mainCaretaker =
                    caretakers
                        .FirstOrDefault(x =>
                            x.CaretakerType == "MAIN");

                var substituteCaretaker =
                    caretakers
                        .FirstOrDefault(x =>
                            x.CaretakerType == "SUBSTITUTE");

                TrustApplicationCaretakerDistributionRequest caretakerDistribution =
                    null;

                if (mainCaretaker != null ||
                    substituteCaretaker != null)
                {
                    caretakerDistribution =
                        new TrustApplicationCaretakerDistributionRequest
                        {
                            Enabled = true,

                            Main =
                                mainCaretaker == null ? null
                                    : new TrustApplicationCaretakerRequest
                                    {
                                        Name = mainCaretaker.FullName,
                                        IdentityNo = mainCaretaker.IdentityNo,
                                        ContactNo = mainCaretaker.ContactNo
                                    },

                            Substitute =
                                substituteCaretaker == null ? null
                                    : new TrustApplicationCaretakerRequest
                                    {
                                        Name = substituteCaretaker.FullName,
                                        IdentityNo = substituteCaretaker.IdentityNo,
                                        ContactNo = substituteCaretaker.ContactNo
                                    }
                        };
                }

                var minorDistributionEntity = await db.tbl_TrustApplication_MinorDistribution.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

                TrustApplicationMinorDistributionRequest minorDistribution = null;

                if (minorDistributionEntity != null)
                {
                    minorDistribution =
                        new TrustApplicationMinorDistributionRequest
                        {
                            DistributeToGuardian = minorDistributionEntity.DistributionMethod == "GUARDIAN",
                            HoldByTrusteeCompany = minorDistributionEntity.DistributionMethod == "TRUSTEE_HOLD",
                            ReleaseAge = minorDistributionEntity.ReleaseAge
                        };
                }

                TrustApplicationStep3Request step3 = null;

                if (beneficiaries.Any() || caretakerDistribution != null || minorDistribution != null || application.LastCompletedStep >= 3)
                {
                    step3 =
                        new TrustApplicationStep3Request
                        {
                            TrustID = application.TrustID,
                            CaretakerDistribution = caretakerDistribution,
                            MinorDistribution = minorDistribution,
                            Beneficiaries = beneficiaries
                        };
                }

                // ====================================================
                // Step 4
                // Beneficiary Allocation
                // ====================================================

                var allocation =
                    await db
                        .tbl_TrustApplication_BeneficiaryAllocation
                        .FirstOrDefaultAsync(x =>
                            x.TrustApplicationID ==
                                application.RowID);


                TrustApplicationStep4Request step4 = null;

                if (allocation != null)
                {
                    var allocationDetails =
                        await db.tbl_TrustApplication_BeneficiaryAllocationDetail
                            .Where(x => x.AllocationID == allocation.RowID)
                            .OrderBy(x => x.RowID)
                            .ToListAsync();

                    // =================================================
                    // Trustee-company rows are system-generated by
                    // Step 4 according to AllocationType.
                    //
                    // React only needs beneficiary rows.
                    // =================================================

                    var mainBeneficiaries =
                        allocationDetails
                            .Where(x => !x.IsTrusteeCompany && x.RoleType == "MAIN" && x.BeneficiaryID.HasValue)
                            .Select(x =>
                                new TrustApplicationAllocationBeneficiaryRequest
                                {
                                    BeneficiaryID = x.BeneficiaryID.Value,
                                    AllocationPercentage = x.AllocationPercentage
                                })
                            .ToList();

                    var substituteBeneficiaries =
                        allocationDetails
                            .Where(x => !x.IsTrusteeCompany && x.RoleType == "SUBSTITUTE" && x.BeneficiaryID.HasValue)
                            .Select(x =>
                                new TrustApplicationAllocationBeneficiaryRequest
                                {
                                    BeneficiaryID = x.BeneficiaryID.Value,
                                    AllocationPercentage = x.AllocationPercentage
                                })
                            .ToList();

                    step4 =
                        new TrustApplicationStep4Request
                        {
                            TrustID = application.TrustID,
                            AllocationType = allocation.AllocationType,
                            MainBeneficiaries = mainBeneficiaries,
                            SubstituteBeneficiaries = substituteBeneficiaries
                        };
                }

                // ====================================================
                // Step 5
                // Trust Deed Execution
                // ====================================================

                var execution = await db.tbl_TrustApplication_TrustDeedExecution.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

                TrustApplicationStep5Request step5 = null;

                if (execution != null)
                {
                    step5 =
                        new TrustApplicationStep5Request
                        {
                            TrustID = application.TrustID,
                            SigningMethod = execution.SigningMethod,
                            SpecialCircumstance = execution.SpecialCircumstance,
                            ReadOverBy = execution.ReadOverBy,
                            ReadOverIdentityNo = execution.ReadOverIdentityNo,
                            LanguageOrDialect = execution.LanguageOrDialect,
                            RelationshipWithSettlor = execution.RelationshipWithSettlor,
                            OtherRelationshipWithSettlor = execution.OtherRelationshipWithSettlor
                        };
                }

                // ====================================================
                // Step 6
                // Supporting Documents
                // ====================================================

                var supportingDocuments =
                    await db.tbl_TrustApplication_SupportingDocument
                        .Where(x => x.TrustApplicationID == application.RowID)
                        .OrderBy(x => x.CreatedAt)
                        .Select(x =>
                            new TrustApplicationSupportingDocumentReview
                            {
                                SupportingDocumentID = x.RowID,
                                OriginalFileName = x.OriginalFileName,
                                FileExtension = x.FileExtension,
                                FileSize = x.FileSize,
                                FileUrl = x.FileUrl,
                                SHA256 = x.SHA256,
                                CreatedAt = x.CreatedAt
                            })
                        .ToListAsync();

                var step6 =
                    new TrustApplicationStep6Detail
                    {
                        TrustID = application.TrustID,
                        SupportingDocuments = supportingDocuments
                    };

                // ====================================================
                // Step 7
                // Co-Broker
                // ====================================================

                var coBrokers =
                    await db.tbl_TrustApplication_CoBroker
                        .Where(x => x.TrustApplicationID == application.RowID)
                        .OrderBy(x => x.RowID)
                        .Select(x =>
                            new TrustApplicationCoBrokerRequest
                            {
                                Email = x.Email,
                                AllocationPercentage = x.AllocationPercentage
                            })
                        .ToListAsync();

                var step7 =
                    new TrustApplicationStep7Request
                    {
                        TrustID = application.TrustID,
                        CoBrokers = coBrokers
                    };

                // ====================================================
                // Result
                // ====================================================

                return new TrustApplicationDetailResult
                {
                    // =================================================
                    // Header
                    // =================================================

                    TrustApplicationID = application.RowID,
                    TrustID = application.TrustID,
                    TrustNo = application.TrustID.ToString("D4"),
                    ProductCode = application.ProductCode,
                    MemberID = application.MemberID,
                    ApplicationStatus = application.ApplicationStatus,
                    CurrentStep = application.CurrentStep,
                    LastCompletedStep = application.LastCompletedStep,

                    // =================================================
                    // Audit
                    // =================================================

                    CreatedAt = application.CreatedAt,
                    CreatedBy = application.CreatedBy,
                    UpdatedAt = application.UpdatedAt,
                    UpdatedBy = application.UpdatedBy,
                    SubmittedAt = application.SubmittedAt,
                    SubmittedBy = application.SubmittedBy,

                    // =================================================
                    // Step Status
                    // =================================================

                    StepStatus =
                        new TrustApplicationStepStatus
                        {
                            Step1Completed = application.LastCompletedStep >= 1,
                            Step2Completed = application.LastCompletedStep >= 2,
                            Step3Completed = application.LastCompletedStep >= 3,
                            Step4Completed = application.LastCompletedStep >= 4,
                            Step5Completed = application.LastCompletedStep >= 5,
                            Step6Completed = application.LastCompletedStep >= 6,
                            Step7Completed = application.LastCompletedStep >= 7
                        },

                    // =================================================
                    // Steps
                    // =================================================

                    Step1 = step1,
                    Step2 = step2,
                    Step3 = step3,
                    Step4 = step4,
                    Step5 = step5,
                    Step6 = step6,
                    Step7 = step7
                };
            }
        }
    }
}