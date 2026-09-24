using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.DTO.TrustApplication;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Model.TrustPlan;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Class.Service.TrustApplication.History;
using API_CPX.Class.Service.TrustApplication.Payment;
using API_CPX.Class.Service.TrustApplication.Snapshot;
using API_CPX.Context;
using API_CPX.Services.TrustPlan;
using System;
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
            commonService = new TrustApplicationCommonService();
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

        public async Task<TrustApplicationDetailResult> GetAsync(string merchantId, long userId, string roleCode, long trustId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                // ====================================================
                // Application + Access
                // ====================================================

                var application = await commonService.GetApplicationForFormReadAsync(db, merchantId, userId, roleCode, trustId);

                // ============================================================
                // Trust Plan
                //
                // COMPLETED:
                // Use frozen Plan Snapshot.
                //
                // Not COMPLETED:
                // Use current Trust Plan.
                // ============================================================

                var trustPlan = await GetTrustPlanAsync(db, application, merchantId);

                // ====================================================
                // Step 1
                // Personal Details
                // ====================================================

                var personal = await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

                var sourceOfFunds =
                    await db.tbl_TrustApplication_SourceOfFund
                        .Where(x => x.TrustApplicationID == application.RowID)
                        .OrderBy(x => x.RowID)
                        .Select(x =>
                            new TrustApplicationSourceOfFundRequest
                            {
                                SourceCode = x.SourceCode,
                                OtherDescription = x.OtherDescription
                            })
                        .ToListAsync();

                TrustApplicationStep1Request step1 = null;

                if (personal != null)
                {
                    step1 =
                        new TrustApplicationStep1Request
                        {
                            TrustID = application.TrustID,
                            ProductCode = application.ProductCode,
                            FullName = personal.FullName,
                            IdentityType = personal.IdentityType,
                            IdentityNo = personal.IdentityNo,
                            Nationality = personal.Nationality,
                            Gender = personal.Gender,
                            DateOfBirth = personal.DateOfBirth,
                            Email = personal.Email,
                            ContactNo = personal.ContactNo,
                            AddressLine1 = personal.AddressLine1,
                            AddressLine2 = personal.AddressLine2,
                            Postcode = personal.Postcode,
                            City = personal.City,
                            State = personal.State,
                            Country = personal.Country,
                            IsUSTaxPayer = personal.IsUSTaxPayer,
                            HasOtherTaxResidence = personal.HasOtherTaxResidence,
                            TaxResidenceCountry = personal.TaxResidenceCountry,
                            TaxIdentificationNo = personal.TaxIdentificationNo,
                            TINUnavailableReason = personal.TINUnavailableReason,
                            TINUnavailableExplanation = personal.TINUnavailableExplanation,
                            EmployerName = personal.EmployerName,
                            NatureOfBusiness = personal.NatureOfBusiness,
                            Occupation = personal.Occupation,
                            AnnualIncomeCode = personal.AnnualIncomeCode,
                            NetWorthCode = personal.NetWorthCode,
                            SourceOfFunds = sourceOfFunds
                        };
                }

                // ====================================================
                // Step 2
                // Trust Asset
                // ====================================================

                var trustAsset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

                TrustApplicationStep2Request step2 = null;

                if (trustAsset != null)
                {
                    step2 =
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
                // Step 3
                // Beneficiaries
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

                var caretakers = await db.tbl_TrustApplication_Caretaker.Where(x => x.TrustApplicationID == application.RowID).ToListAsync();
                var mainCaretaker = caretakers.FirstOrDefault(x => x.CaretakerType == "MAIN");
                var substituteCaretaker = caretakers.FirstOrDefault(x => x.CaretakerType == "SUBSTITUTE");

                TrustApplicationCaretakerDistributionRequest caretakerDistribution = null;

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
                        .Where(x => x.TrustApplicationID == application.RowID && x.IsActive)
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
                // Application History
                // ====================================================

                var historyService =
                    new TrustApplicationHistoryServiceAsync();

                var history =
                    await historyService.GetHistoryAsync(
                        db,
                        application.RowID);

                // ====================================================
                // Application Status Flow
                // ====================================================

                var statusFlow =
                    await GetStatusFlowAsync(
                        db,
                        application);

                // ====================================================
                // Application Status Flow History
                // ====================================================

                var statusFlowHistory =
                    await GetStatusFlowHistoryAsync(
                        db,
                        application.RowID);

                // ====================================================
                // Payment Information
                // ====================================================

                var paymentService =
                    new TrustApplicationPaymentServiceAsync();

                var payment =
                    await paymentService.GetAsync(
                        db,
                        application);

                // ====================================================
                // Generated Documents
                // ====================================================

                var documents =
                    await GetGeneratedDocumentsAsync(
                        db,
                        application.RowID);

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
                    TrustPlan = trustPlan,
                    MemberID = application.MemberID,
                    ApplicationStatus = application.ApplicationStatus,
                    CurrentStep = application.CurrentStep,
                    LastCompletedStep = application.LastCompletedStep,
                    CommencementDate = application.CommencementDate,
                    MaturityDate = application.MaturityDate,
                    RejectedAt = application.RejectedAt,
                    RejectedBy = application.RejectedBy,
                    EarlyWithdrawnAt = application.EarlyWithdrawnAt,
                    EarlyWithdrawnBy = application.EarlyWithdrawnBy,
                    StatusFlow = statusFlow,
                    StatusFlowHistory = statusFlowHistory,
                    Payment = payment,
                    History = history,
                    Documents = documents,

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

        // ============================================================
        // Build Trust Application Status Flow
        // ============================================================

        private async Task<List<TrustApplicationStatusFlowResult>> GetStatusFlowAsync(Sandbox_BasedEntities db, tbl_TrustApplication application)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            if (application == null)
            {
                throw new ArgumentNullException(nameof(application));
            }

            // ========================================================
            // Main Trust Application Workflow
            //
            // Must follow TrustApplicationStatusHelper transitions.
            // ========================================================

            var flow =
                new List<TrustApplicationStatusFlowResult>
                {
                    new TrustApplicationStatusFlowResult
                    {
                        StatusCode = "DRAFT",
                        StatusName = "Draft",
                        Sequence = 1
                    },

                    new TrustApplicationStatusFlowResult
                    {
                        StatusCode = "PENDING_PAYMENT_APPROVAL",
                        StatusName = "Pending Payment",
                        Sequence = 2
                    },

                    new TrustApplicationStatusFlowResult
                    {
                        StatusCode = "PAYMENT_APPROVED",
                        StatusName = "Payment Approved",
                        Sequence = 3
                    },

                    new TrustApplicationStatusFlowResult
                    {
                        StatusCode = "PENDING_ADMIN_APPROVAL",
                        StatusName = "Pending Admin Approval",
                        Sequence = 4
                    },

                    new TrustApplicationStatusFlowResult
                    {
                        StatusCode = "SENT_OUT",
                        StatusName = "Sent Out",
                        Sequence = 5
                    },

                    new TrustApplicationStatusFlowResult
                    {
                        StatusCode = "STAMPING",
                        StatusName = "Stamping",
                        Sequence = 6
                    },

                    new TrustApplicationStatusFlowResult
                    {
                        StatusCode = "COMPLETED",
                        StatusName = "Completed",
                        Sequence = 7
                    }
                };

            // ========================================================
            // Get Actual Status Transition History
            // ========================================================

            var statusHistories =
                await (
                    from h in db.tbl_TrustApplication_StatusHistory
                    join m in db.tbl_MemberInfo on h.ChangedBy equals m.RowID into memberJoin
                    from m in memberJoin.DefaultIfEmpty()
                    where h.TrustApplicationID == application.RowID
                    orderby h.ChangedAt ascending, h.RowID ascending
                    select new
                    {
                        h.NewStatus,
                        h.ChangedAt,
                        h.ChangedBy,
                        ChangedByName = m != null ? m.Fullname : null
                    })
                    .ToListAsync();

            // ========================================================
            // Find Current Status
            // ========================================================

            var currentFlow =
                flow.FirstOrDefault(x => string.Equals(x.StatusCode, application.ApplicationStatus, StringComparison.OrdinalIgnoreCase));

            // ========================================================
            // Populate Flow
            // ========================================================

            foreach (var item in flow)
            {
                // ----------------------------------------------------
                // DRAFT
                //
                // Application creation itself represents DRAFT.
                // ----------------------------------------------------

                if (string.Equals(item.StatusCode, "DRAFT", StringComparison.OrdinalIgnoreCase))
                {
                    item.ReachedAt = application.CreatedAt;
                    item.ReachedBy = application.CreatedBy;

                    if (application.CreatedBy.HasValue)
                    {
                        var createdByName =
                            await db.tbl_MemberInfo
                                .Where(x => x.RowID == application.CreatedBy.Value)
                                .Select(x => x.Fullname)
                                .FirstOrDefaultAsync();

                        item.ReachedByName = createdByName;
                    }
                }
                else
                {
                    // ------------------------------------------------
                    // Other statuses are obtained from StatusHistory.
                    // ------------------------------------------------

                    var statusHistory =
                        statusHistories.FirstOrDefault(x => string.Equals(x.NewStatus, item.StatusCode, StringComparison.OrdinalIgnoreCase));

                    if (statusHistory != null)
                    {
                        item.ReachedAt = statusHistory.ChangedAt;
                        item.ReachedBy = statusHistory.ChangedBy;
                        item.ReachedByName = statusHistory.ChangedByName;
                    }
                }

                item.IsReached = item.ReachedAt.HasValue;

                // ----------------------------------------------------
                // State
                // ----------------------------------------------------

                if (currentFlow == null)
                {
                    item.State = item.IsReached ? "COMPLETED" : "PENDING";
                    continue;
                }

                if (item.Sequence < currentFlow.Sequence)
                {
                    item.State = "COMPLETED";
                }
                else if (item.Sequence == currentFlow.Sequence)
                {
                    item.State = string.Equals(item.StatusCode, "COMPLETED", StringComparison.OrdinalIgnoreCase) ? "COMPLETED" : "CURRENT";
                }
                else
                {
                    item.State = "PENDING";
                }
            }

            return flow;
        }

        // ============================================================
        // Get Trust Plan Information
        //
        // COMPLETED:
        // - Read frozen Trust Plan from Plan Snapshot.
        //
        // NOT COMPLETED:
        // - Read current Trust Plan configuration.
        //
        // IMPORTANT:
        // A completed Trust Application must always use the frozen
        // snapshot because the master Trust Plan may be changed later.
        // ============================================================

        private async Task<TrustApplicationPlanDetail> GetTrustPlanAsync(Sandbox_BasedEntities db, tbl_TrustApplication application, string merchantId)
        {
            const string code = "GET-TRUST-APPLICATION";

            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            if (application == null)
            {
                throw new ArgumentNullException(nameof(application));
            }

            TrustPlanDetailsResponse planDetails;

            // ========================================================
            // COMPLETED
            // Use frozen Trust Plan Snapshot
            // ========================================================

            bool useSnapshot =
                string.Equals(application.ApplicationStatus, "COMPLETED", StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(application.ApplicationStatus, "EARLY_WITHDRAWN", StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(application.ApplicationStatus, "MATURED", StringComparison.OrdinalIgnoreCase);
            //useSnapshot = false;
            if (useSnapshot)
            {
                var snapshotService = new TrustApplicationPlanSnapshotServiceAsync();
                planDetails = await snapshotService.GetSnapshotConfigurationAsync(db, application.RowID);
            }

            // ========================================================
            // NOT COMPLETED
            // Use current Trust Plan
            // ========================================================

            else
            {
                var trustPlanService = new TrustPlanServiceAsync();
                planDetails = await trustPlanService.GetTrustProductDetailsAsync(application.ProductCode, merchantId);
            }

            // ========================================================
            // Validate Plan
            // ========================================================

            if (planDetails == null)
            {
                throw new BusinessException("Unable to retrieve Trust Plan configuration.", code);
            }

            if (planDetails.Steps == null)
            {
                throw new BusinessException("Trust Plan steps configuration is missing.", code);
            }

            if (planDetails.Steps.Step1BasicInformation == null)
            {
                throw new BusinessException("Trust Plan basic information is missing.", code);
            }

            // ========================================================
            // Basic Information
            // ========================================================

            var basic = planDetails.Steps.Step1BasicInformation;

            // ========================================================
            // Build Result
            // ========================================================

            return new TrustApplicationPlanDetail
            {
                ProductCode = planDetails.ProductCode,
                ProductName = basic.ProductName,
                ProductCategory = basic.ProductCategory,
                ProductDescription = basic.ProductDescription,
                MinimumPlacement = basic.MinimumPlacement,
                MaximumPlacement = basic.MaximumPlacement,
                FundManagementPeriod = basic.FundManagementPeriod,
                FundManagementPeriodUnit = basic.FundManagementPeriodUnit
            };
        }

        // ============================================================
        // Get Generated Documents
        // ============================================================

        private async Task<List<TrustApplicationGeneratedDocumentResult>> GetGeneratedDocumentsAsync(Sandbox_BasedEntities db, long trustApplicationId)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            var documents =
                await (
                    from d in db.tbl_TrustApplication_GeneratedDocument
                    join document in db.tbl_TrustDocument on d.TrustDocumentID equals document.RowID
                    join member in db.tbl_MemberInfo on d.GeneratedBy equals member.RowID into memberJoin
                    from member in memberJoin.DefaultIfEmpty()
                    where d.TrustApplicationID == trustApplicationId && d.IsActive
                    orderby d.GeneratedAt descending, d.RowID descending
                    select new TrustApplicationGeneratedDocumentResult
                    {
                        RowID = d.RowID,
                        TrustDocumentID = d.TrustDocumentID,
                        DocumentCode = document.DocumentCode,
                        DocumentName = document.DocumentName,
                        Description = document.Description,
                        TrustDocumentTemplateID = d.TrustDocumentTemplateID,
                        GenerationStatus = d.GenerationStatus,
                        OriginalFileName = d.OriginalFileName,
                        FileExtension = d.FileExtension,
                        FileSize = d.FileSize,
                        FileUrl = d.FileUrl,
                        GeneratedFile = d.GeneratedFile,
                        SHA256 = d.SHA256,
                        GeneratedAt = d.GeneratedAt,
                        GeneratedBy = d.GeneratedBy,
                        GeneratedByName = member != null ? member.Fullname : null,
                        ErrorMessage = d.ErrorMessage,
                        RetryCount = d.RetryCount,
                        CreatedAt = d.CreatedAt
                    })
                    .ToListAsync();

            return documents;
        }

        // ============================================================
        // Get Trust Application Status Flow History
        // ============================================================

        private async Task<List<TrustApplicationStatusFlowHistoryResult>> GetStatusFlowHistoryAsync(Sandbox_BasedEntities db, long trustApplicationId)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            var result =
                await (
                    from h in db.tbl_TrustApplication_StatusHistory
                    join m in db.tbl_MemberInfo on h.ChangedBy equals m.RowID into memberJoin
                    from m in memberJoin.DefaultIfEmpty()
                    where h.TrustApplicationID == trustApplicationId
                    orderby h.ChangedAt ascending, h.RowID ascending
                    select new TrustApplicationStatusFlowHistoryResult
                    {
                        RowID = h.RowID,
                        PreviousStatus = h.PreviousStatus,
                        NewStatus = h.NewStatus,
                        ChangedAt = h.ChangedAt,
                        ChangedBy = h.ChangedBy,
                        ChangedByName = m != null ? m.Fullname : null
                    })
                    .ToListAsync();

            return result;
        }
    }
}