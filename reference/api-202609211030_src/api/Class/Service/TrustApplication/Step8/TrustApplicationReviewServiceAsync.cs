using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Step8
{
    public class TrustApplicationReviewServiceAsync
    {
        private readonly TrustApplicationCommonService commonService;

        public TrustApplicationReviewServiceAsync()
        {
            commonService = new TrustApplicationCommonService();
        }

        public async Task<TrustApplicationStep8ReviewResult> GetAsync(string merchantId, long userId, string roleCode, long trustId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                // ====================================================
                // Application
                // ====================================================

                var application = await commonService.GetDraftApplicationForAgentReadAsync(db, merchantId, userId, roleCode, trustId);

                // ====================================================
                // Must Reach Step 8
                // ====================================================

                commonService.ValidateStepAccess(application, 8, roleCode);

                // ====================================================
                // Step 1
                // ====================================================

                var personal = await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(a => a.TrustApplicationID == application.RowID);

                // ====================================================
                // Step 2 - Trust Asset
                // ====================================================

                var trustAsset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

                TrustApplicationStep2Request trustAssetDetails = null;

                if (trustAsset != null)
                {
                    trustAssetDetails =
                        new TrustApplicationStep2Request
                        {
                            TrustID = application.TrustID,
                            TrustAssetAmount = trustAsset.TrustAssetAmount,
                            SettlorBankName = trustAsset.SettlorBankName,
                            SettlorOtherBankName = trustAsset.SettlorOtherBankName,
                            SettlorBankAccountHolder = trustAsset.SettlorBankAccountHolder,
                            SettlorBankAccountNumber = trustAsset.SettlorBankAccountNumber,
                            SettlorSwiftCode = trustAsset.SettlorSwiftCode,
                            SettlorBankAddress = trustAsset.SettlorBankAddress,
                            GuaranteedReturnOption = trustAsset.GuaranteedReturnOption,
                            PaymentSource = trustAsset.PaymentSource,
                            JointAccountHolderName = trustAsset.JointAccountHolderName,
                            ThirdPartyName = trustAsset.ThirdPartyName,
                            ThirdPartyIdentityNo = trustAsset.ThirdPartyIdentityNo,
                            ThirdPartyRelationship = trustAsset.ThirdPartyRelationship,
                            ThirdPartyOtherRelationship = trustAsset.ThirdPartyOtherRelationship,
                            ThirdPartyBankName = trustAsset.ThirdPartyBankName,
                            ThirdPartyOtherBankName = trustAsset.ThirdPartyOtherBankName,
                            ThirdPartyBankAccountHolder = trustAsset.ThirdPartyBankAccountHolder,
                            ThirdPartyBankAccountNumber = trustAsset.ThirdPartyBankAccountNumber
                        };
                }

                // ====================================================
                // Step 3 - Beneficiaries
                // ====================================================

                var beneficiaries =
                    await db.tbl_TrustApplication_Beneficiary
                        .Where(x => x.TrustApplicationID == application.RowID && x.IsActive)
                        .OrderBy(x => x.RowID)
                        .Select(x =>
                            new TrustApplicationBeneficiaryRequest
                            {
                                BeneficiaryID = x.RowID,
                                BeneficiaryClientID = null,
                                FullName = x.FullName,
                                IdentityType = x.IdentityType,
                                IdentityNo = x.IdentityNo,
                                Nationality = x.Nationality,
                                Gender = x.Gender,
                                DateOfBirth = x.DateOfBirth,
                                Email = x.Email,
                                ContactNo = x.ContactNo,
                                RelationshipCode = x.RelationshipCode,
                                OtherRelationship = x.OtherRelationship,
                                AddressLine1 = x.AddressLine1,
                                AddressLine2 = x.AddressLine2,
                                Postcode = x.Postcode,
                                City = x.City,
                                State = x.State,
                                Country = x.Country,
                                IsUSTaxPayer = x.IsUSTaxPayer,
                                HasOtherTaxResidence = x.HasOtherTaxResidence,
                                TaxResidenceCountry = x.TaxResidenceCountry,
                                TaxIdentificationNo = x.TaxIdentificationNo,
                                TINUnavailableReason = x.TINUnavailableReason,
                                TINUnavailableExplanation = x.TINUnavailableExplanation
                            })
                        .ToListAsync();

                // ====================================================
                // Step 3 - Caretaker Distribution
                // ====================================================

                var caretakers = await db.tbl_TrustApplication_Caretaker.Where(x => x.TrustApplicationID == application.RowID).ToListAsync();
                var mainCaretaker = caretakers.FirstOrDefault(x => x.CaretakerType == "MAIN");
                var substituteCaretaker = caretakers.FirstOrDefault(x => x.CaretakerType == "SUBSTITUTE");

                TrustApplicationCaretakerDistributionRequest caretakerDistribution = null;

                if (mainCaretaker != null || substituteCaretaker != null)
                {
                    caretakerDistribution =
                        new TrustApplicationCaretakerDistributionRequest
                        {
                            Enabled = true,

                            Main =
                                mainCaretaker == null
                                    ? null
                                    : new TrustApplicationCaretakerRequest
                                    {
                                        Name = mainCaretaker.FullName,
                                        IdentityNo = mainCaretaker.IdentityNo,
                                        ContactNo = mainCaretaker.ContactNo
                                    },

                            Substitute =
                                substituteCaretaker == null
                                    ? null
                                    : new TrustApplicationCaretakerRequest
                                    {
                                        Name = substituteCaretaker.FullName,
                                        IdentityNo = substituteCaretaker.IdentityNo,
                                        ContactNo = substituteCaretaker.ContactNo
                                    }
                        };
                }

                // ====================================================
                // Step 3 - Minor Distribution
                // ====================================================

                var minorDistributionEntity = await db.tbl_TrustApplication_MinorDistribution.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

                TrustApplicationMinorDistributionRequest minorDistribution = null;

                if (minorDistributionEntity != null)
                {
                    minorDistribution =
                        new TrustApplicationMinorDistributionRequest
                        {
                            DistributeToGuardian = string.Equals(minorDistributionEntity.DistributionMethod, "GUARDIAN", StringComparison.OrdinalIgnoreCase),
                            HoldByTrusteeCompany = string.Equals(minorDistributionEntity.DistributionMethod, "TRUSTEE_HOLD", StringComparison.OrdinalIgnoreCase),
                            ReleaseAge = minorDistributionEntity.ReleaseAge
                        };
                }

                // ====================================================
                // Step 3 - Complete Result
                // ====================================================

                TrustApplicationStep3Request beneficiaryDetails = null;

                if (beneficiaries.Any() || caretakerDistribution != null || minorDistribution != null || application.LastCompletedStep >= 3)
                {
                    beneficiaryDetails =
                        new TrustApplicationStep3Request
                        {
                            TrustID = application.TrustID,
                            CaretakerDistribution = caretakerDistribution,
                            MinorDistribution = minorDistribution,
                            Beneficiaries = beneficiaries
                        };
                }

                // ====================================================
                // Step 4 - Beneficiary Allocation
                // ====================================================

                var allocation = await db.tbl_TrustApplication_BeneficiaryAllocation.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

                TrustApplicationStep4Request beneficiaryAllocation = null;

                if (allocation != null)
                {
                    var allocationDetails =
                        await db.tbl_TrustApplication_BeneficiaryAllocationDetail
                            .Where(x => x.AllocationID == allocation.RowID)
                            .OrderBy(x => x.RowID)
                            .ToListAsync();

                    // =================================================
                    // Trustee Company rows are generated internally.
                    //
                    // Only beneficiary rows need to be returned
                    // to React.
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

                    beneficiaryAllocation =
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
                // ====================================================

                var execution = await db.tbl_TrustApplication_TrustDeedExecution.FirstOrDefaultAsync(a => a.TrustApplicationID == application.RowID);

                // ====================================================
                // Step 6
                // ====================================================

                var documents =
                    await db.tbl_TrustApplication_SupportingDocument
                        .Where(a => a.TrustApplicationID == application.RowID)
                        .OrderBy(a => a.CreatedAt)
                        .Select(a =>
                            new TrustApplicationSupportingDocumentReview
                            {
                                SupportingDocumentID = a.RowID,
                                OriginalFileName = a.OriginalFileName,
                                FileExtension = a.FileExtension,
                                FileSize = a.FileSize,
                                FileUrl = a.FileUrl,
                                SHA256 = a.SHA256,
                                CreatedAt = a.CreatedAt
                            })
                        .ToListAsync();

                // ====================================================
                // Step 7
                // ====================================================

                var coBrokers =
                    await db.tbl_TrustApplication_CoBroker
                        .Where(a => a.TrustApplicationID == application.RowID)
                        .OrderBy(a => a.RowID)
                        .Select(a =>
                            new TrustApplicationCoBrokerReview
                            {
                                MemberID = a.MemberID,
                                Email = a.Email,
                                AllocationPercentage = a.AllocationPercentage
                            })
                        .ToListAsync();

                // ====================================================
                // Result
                // ====================================================

                return new TrustApplicationStep8ReviewResult
                {
                    TrustApplicationID = application.RowID,
                    TrustID = application.TrustID,
                    TrustNo = application.TrustID.ToString("D4"),
                    ProductCode = application.ProductCode,
                    ApplicationStatus = application.ApplicationStatus,
                    CurrentStep = application.CurrentStep,
                    LastCompletedStep = application.LastCompletedStep,
                    // Step 1
                    PersonalDetails = personal,
                    // Step 2
                    TrustAsset = trustAssetDetails,
                    // Step 3
                    BeneficiaryDetails = beneficiaryDetails,
                    // Step 4
                    BeneficiaryAllocation = beneficiaryAllocation,
                    // Step 5
                    TrustDeedExecution = execution,
                    // Step 6
                    SupportingDocuments = documents,
                    // Step 7
                    CoBrokers = coBrokers
                };
            }
        }
    }
}