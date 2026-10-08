using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper.Document;
using API_CPX.Class.Model.DTO.Document;
using API_CPX.Class.Model.TrustPlan;
using API_CPX.Class.Service.TrustApplication.Snapshot;
using API_CPX.Context;
using API_CPX.Services.TrustPlan;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Service.TrustApplication.Document.Generator
{
    public class InstructionFormDocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-INSTRUCTION-FORM";
        private const string DocumentCode = "INSTRUCTION_FORM";
        private const string Checked = "☑";
        private const string Unchecked = "☐";

        public bool CanHandle(string documentCode)
        {
            return string.Equals(documentCode, DocumentCode, StringComparison.OrdinalIgnoreCase);
        }

        public async Task<GeneratedPdfResult> GenerateAsync(
            Sandbox_BasedEntities db,
            tbl_TrustApplication application,
            tbl_TrustDocument document,
            tbl_TrustDocumentTemplate template,
            long userId)
        {
            if (db == null)
                throw new ArgumentNullException(nameof(db));

            if (application == null)
                throw new ArgumentNullException(nameof(application));

            if (document == null)
                throw new ArgumentNullException(nameof(document));

            if (template == null)
                throw new ArgumentNullException(nameof(template));

            // =====================================================
            // 1. Required application records
            // =====================================================

            var personal = await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (personal == null)
            {
                throw new BusinessException("Trust Application personal details not found.", Code);
            }

            var trustAsset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (trustAsset == null)
            {
                throw new BusinessException("Trust Application asset details not found.", Code);
            }

            var execution = await db.tbl_TrustApplication_TrustDeedExecution.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (execution == null)
            {
                throw new BusinessException("Trust Deed execution information not found.", Code);
            }

            if (!application.SubmittedAt.HasValue)
            {
                throw new BusinessException("Trust Application submitted date is not available.", Code);
            }

            // =====================================================
            // 2. Beneficiaries - Section B
            // =====================================================

            var beneficiaries =
                await db.tbl_TrustApplication_Beneficiary
                    .Where(x => x.TrustApplicationID == application.RowID && x.IsActive)
                    .OrderBy(x => x.RowID)
                    .ToListAsync();

            var relationshipCodes =
                beneficiaries
                    .Where(x => !string.IsNullOrWhiteSpace(x.RelationshipCode) && !string.Equals(x.RelationshipCode, "OTHER", StringComparison.OrdinalIgnoreCase))
                    .Select(x => x.RelationshipCode)
                    .Distinct()
                    .ToList();

            if (!string.IsNullOrWhiteSpace(execution.RelationshipWithSettlor) && !string.Equals(execution.RelationshipWithSettlor, "OTHER", StringComparison.OrdinalIgnoreCase))
            {
                relationshipCodes.Add(execution.RelationshipWithSettlor);
            }

            relationshipCodes = relationshipCodes.Distinct().ToList();

            var relationships =
                await db.tbl_Relationship.Where(x => relationshipCodes.Contains(x.Relationship_Code) && x.Status == 0).ToListAsync();

            var beneficiaryModels =
                beneficiaries
                    .Select(
                        (beneficiary, index) =>
                            new InstructionFormBeneficiaryDocumentModel
                            {
                                No = index + 1,
                                FullName = beneficiary.FullName ?? "",
                                IdentityType = beneficiary.IdentityType ?? "",
                                IdentityNo = beneficiary.IdentityNo ?? "",
                                Nationality = beneficiary.Nationality ?? "",
                                Gender = beneficiary.Gender ?? "",
                                DateOfBirth = beneficiary.DateOfBirth.HasValue ? beneficiary.DateOfBirth.Value.ToString("dd/MM/yyyy") : "",
                                Relationship = ResolveRelationship(beneficiary.RelationshipCode, beneficiary.OtherRelationship, relationships),
                                AddressLine1 = beneficiary.AddressLine1 ?? "",
                                AddressLine2 = beneficiary.AddressLine2 ?? "",
                                Postcode = beneficiary.Postcode ?? "",
                                State = beneficiary.State ?? "",
                                Country = beneficiary.Country ?? "",
                                Email = beneficiary.Email ?? "",
                                ContactNo = beneficiary.ContactNo ?? "",
                                IsUSTaxPayer = beneficiary.IsUSTaxPayer,
                                HasOtherTaxResidence = beneficiary.HasOtherTaxResidence,
                                TaxResidenceCountry = beneficiary.TaxResidenceCountry ?? "",
                                TaxIdentificationNo = beneficiary.TaxIdentificationNo ?? "",
                                TINUnavailableReason = BuildTinReason(beneficiary.TINUnavailableReason, beneficiary.TINUnavailableExplanation)
                            })
                    .ToList();

            // =====================================================
            // 3. Section C - Caretaker Distribution
            // =====================================================

            var caretakers =
                await db.tbl_TrustApplication_Caretaker
                    .Where(x => x.TrustApplicationID == application.RowID && x.IsActive)
                    .OrderBy(x => x.RowID)
                    .ToListAsync();

            var mainCaretaker =
                caretakers.FirstOrDefault(x => string.Equals(x.CaretakerType, "MAIN", StringComparison.OrdinalIgnoreCase));

            var substituteCaretaker =
                caretakers.FirstOrDefault(x => string.Equals(x.CaretakerType, "SUBSTITUTE", StringComparison.OrdinalIgnoreCase));

            bool hasCaretakerDistribution = application.HasCaretakerDistribution && mainCaretaker != null;

            // =====================================================
            // Section D - Minor Distribution
            // =====================================================

            var minorDistribution = await db.tbl_TrustApplication_MinorDistribution.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            string minorDistributionMethod = minorDistribution != null ? (minorDistribution.DistributionMethod ?? "").Trim().ToUpperInvariant() : "";

            bool isGuardianDistribution = minorDistributionMethod == "GUARDIAN";

            bool isTrusteeHoldDistribution = minorDistributionMethod == "TRUSTEE_HOLD";

            // =====================================================
            // 3. Section C allocation
            // =====================================================

            var allocation = await db.tbl_TrustApplication_BeneficiaryAllocation.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (allocation == null)
            {
                throw new BusinessException("Beneficiary allocation information not found.", Code);
            }

            var allocationDetails =
                await db.tbl_TrustApplication_BeneficiaryAllocationDetail.Where(x => x.AllocationID == allocation.RowID).OrderBy(x => x.RowID).ToListAsync();

            var allocationModels = BuildAllocationModels(allocation.AllocationType, allocationDetails, beneficiaries);

            // =====================================================
            // 4. Agent / Trust Representative
            // =====================================================

            var agent = await db.tbl_MemberInfo.FirstOrDefaultAsync(x => x.RowID == application.MemberID && !x.IsDeleted);

            if (agent == null)
            {
                throw new BusinessException("Trust Representative information not found.", Code);
            }

            var reference =
                await db.tbl_Reference
                    .FirstOrDefaultAsync(x => x.MemberID == application.MemberID && x.MerchantID == application.MerchantID && x.Type == "V" && x.Status == 0);

            // =====================================================
            // 5. Submitted date
            // =====================================================

            DateTime submittedAt = application.SubmittedAt.Value;

            // =====================================================
            // 6. Checkbox values
            // =====================================================

            string paymentSource = (trustAsset.PaymentSource ?? "").Trim().ToUpperInvariant();
            bool isPersonalAccount = paymentSource == "PERSONAL_ACCOUNT";
            bool isJointAccount = paymentSource == "JOINT_ACCOUNT";
            bool isPersonalOrJoint = isPersonalAccount || isJointAccount;
            bool isThirdParty = paymentSource == "THIRD_PARTY";
            string personalOrJoint = "";

            if (isPersonalAccount)
            {
                personalOrJoint = "Personal Account";
            }
            else if (isJointAccount)
            {
                personalOrJoint = "Joint Account";
            }

            string jointAccountName = isJointAccount ? (trustAsset.JointAccountHolderName ?? "") : "";

            string thirdPartyRelationship = "";

            if (isThirdParty)
            {
                thirdPartyRelationship =
                    string.Equals(
                        trustAsset.ThirdPartyRelationship,
                        "OTHER",
                        StringComparison.OrdinalIgnoreCase)
                        ? (trustAsset.ThirdPartyOtherRelationship ?? "")
                        : (trustAsset.ThirdPartyRelationship ?? "");
            }

            string thirdPartyBankName = "";

            if (isThirdParty)
            {
                thirdPartyBankName =
                    string.Equals(
                        trustAsset.ThirdPartyBankName,
                        "OTHER",
                        StringComparison.OrdinalIgnoreCase)
                        ? (trustAsset.ThirdPartyOtherBankName ?? "")
                        : (trustAsset.ThirdPartyBankName ?? "");
            }

            string signingMethod =
                (execution.SigningMethod ?? "")
                    .Trim()
                    .ToUpperInvariant();

            string circumstance =
                (execution.SpecialCircumstance ?? "")
                    .Trim()
                    .ToUpperInvariant();

            // =====================================================
            // 5. Trust Plan
            // =====================================================

            bool usePlanSnapshot =
                string.Equals(
                    application.ApplicationStatus,
                    "COMPLETED",
                    StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(
                    application.ApplicationStatus,
                    "EARLY_WITHDRAWN",
                    StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(
                    application.ApplicationStatus,
                    "MATURED",
                    StringComparison.OrdinalIgnoreCase);

            TrustPlanDetailsResponse planDetails;

            if (usePlanSnapshot)
            {
                // Historical/finalised application:
                // always use the frozen Trust Plan snapshot.
                var snapshotService =
                    new TrustApplicationPlanSnapshotServiceAsync();

                planDetails =
                    await snapshotService
                        .GetSnapshotConfigurationAsync(
                            db,
                            application.RowID);
            }
            else
            {
                // Application is not finalised:
                // use the current Trust Plan configuration.
                var trustPlanService =
                    new TrustPlanServiceAsync();

                planDetails =
                    await trustPlanService
                        .GetTrustProductDetailsAsync(
                            application.ProductCode,
                            application.MerchantID);
            }

            if (planDetails == null
                || planDetails.Steps == null
                || planDetails.Steps.Step1BasicInformation == null)
            {
                throw new BusinessException(
                    usePlanSnapshot
                        ? "Trust Application Plan Snapshot configuration is invalid."
                        : "Trust Product configuration not found.",
                    Code);
            }

            string trustPlanName =
                planDetails.Steps.Step1BasicInformation.ProductName ?? "";

            // =====================================================
            // 6A. Resolve Settlor Bank Display Name
            // =====================================================

            string settlorBankName =
                ResolveBankName(
                    trustAsset.SettlorBankName,
                    trustAsset.SettlorOtherBankName);

            if (string.IsNullOrWhiteSpace(
                    trustAsset.SettlorOtherBankName)
                &&
                !string.IsNullOrWhiteSpace(
                    trustAsset.SettlorBankName))
            {
                string bankCode =
                    trustAsset.SettlorBankName.Trim();

                var bank =
                    await db.tbl_Master_BankList
                        .FirstOrDefaultAsync(
                            x =>
                                x.BankName == bankCode
                                && x.ShowOption == "Bank"
                                && x.Status == 0);

                if (bank != null
                    && !string.IsNullOrWhiteSpace(
                        bank.BankNameDetail))
                {
                    settlorBankName =
                        bank.BankNameDetail.Trim();
                }
            }

            // =====================================================
            // 7. Normal placeholders
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    // =====================================================
                    // Section A - Settlor
                    // =====================================================

                    {
                        "{{SETTLOR_FULL_NAME}}",
                        personal.FullName ?? ""
                    },

                    {
                        "{{SETTLOR_IDENTITY_TYPE}}",
                        personal.IdentityType ?? ""
                    },

                    {
                        "{{SETTLOR_IDENTITY_ID}}",
                        personal.IdentityNo ?? ""
                    },

                    {
                        "{{SETTLOR_NATIONALITY}}",
                        personal.Nationality ?? ""
                    },

                    {
                        "{{SETTLOR_GENDER}}",
                        personal.Gender ?? ""
                    },

                    {
                        "{{SETTLOR_DOB}}",
                        personal.DateOfBirth.HasValue
                            ? personal.DateOfBirth.Value
                                .ToString("dd/MM/yyyy")
                            : ""
                    },
                    {
                        "{{SETTLOR_ADDRESS_1}}", personal.AddressLine1 ?? ""
                    },
                    {
                        "{{SETTLOR_ADDRESS_2}}", personal.AddressLine2 ?? ""
                    },
                    {
                        "{{SETTLOR_POSTCODE}}", personal.Postcode ?? ""
                    },
                    {
                        "{{SETTLOR_CITY}}", personal.City ?? ""
                    },
                    {
                        "{{SETTLOR_STATE}}", personal.State ?? ""
                    },
                    {
                        "{{SETTLOR_COUNTRY}}", personal.Country ?? ""
                    },
                    {
                        "{{SETTLOR_CONTACT_NO}}", personal.ContactNo ?? ""
                    },
                    {
                        "{{SETTLOR_EMAIL}}", personal.Email ?? ""
                    },
                    {
                        "{{SETTLOR_EMPLOYER}}", personal.EmployerName ?? ""
                    },
                    {
                        "{{SETTLOR_TYPE_OF_BUSINESS}}", personal.NatureOfBusiness ?? ""
                    },
                    {
                        "{{SETTLOR_OCCUPATION}}", personal.Occupation ?? ""
                    },
                    {
                        "{{TRUST_PLAN_NAME}}", trustPlanName.ToUpper()
                    },

                    // =====================================================
                    // Section A - Tax
                    // =====================================================

                    {
                        "{{SETTLOR_FILES_US_TAX_RETURN}}", YesNoCheckbox(personal.IsUSTaxPayer == true)
                    },
                    {
                        "{{SETTLOR_FOREIGN_TAX_RESIDENT}}", YesNoCheckbox(personal.HasOtherTaxResidence == true)
                    },
                    {
                        "{{S_TAX_RES_CRTY}}", personal.TaxResidenceCountry ?? ""
                    },
                    {
                        "{{S_TAX_RE_TIN}}", personal.TaxIdentificationNo ?? ""
                    },
                    {
                        "{{S_TAX_RES_TIN_REASON}}", BuildTinReason(personal.TINUnavailableReason, personal.TINUnavailableExplanation)
                    },

                    // =====================================================
                    // Section C - During My Lifetime
                    // =====================================================

                    // Always checked based on your Introduction Form rule.
                    {
                        "{{USE_TRUST_FUND_SELF_CHK}}", Checked
                    },

                    // Checked only when Step 3 Caretaker Distribution
                    // was selected.
                    {
                        "{{DISTRIBUTE_TO_CARETAKER_CHK}}", Checkbox(hasCaretakerDistribution)
                    },

                    // =====================================================
                    // Main Caretaker
                    // =====================================================

                    {
                        "{{CARE_NAME}}", mainCaretaker != null ? mainCaretaker.FullName ?? "" : ""
                    },
                    {
                        "{{CARE_IDENTITY_NO}}", mainCaretaker != null ? mainCaretaker.IdentityNo ?? "" : ""
                    },
                    {
                        "{{CARE_CONTACT}}", mainCaretaker != null ? mainCaretaker.ContactNo ?? "" : ""
                    },

                    // =====================================================
                    // Substitute Caretaker
                    // =====================================================

                    {
                        "{{SUB_CARE_NAME}}", substituteCaretaker != null ? substituteCaretaker.FullName ?? "" : ""
                    },
                    {
                        "{{SUB_CARE_IDENTITY_NO}}", substituteCaretaker != null ? substituteCaretaker.IdentityNo ?? "" : ""
                    },
                    {
                        "{{SUB_CARE_CONTACT}}", substituteCaretaker != null ? substituteCaretaker.ContactNo ?? "" : ""
                    },

                    // =====================================================
                    // Section C - After Lifetime
                    // =====================================================

                    {
                        "{{LIVING_MAINTENANCE_CHK}}", Checkbox(application.AfterLifetimeLivingMaintenance)
                    },
                    {
                        "{{EDUCATION_EXPENSES_CHK}}", Checkbox(application.AfterLifetimeEducationExpenses)
                    },
                    {
                        "{{MEDICAL_HEALTHCARE_CHK}}", Checkbox(application.AfterLifetimeMedicalHealthcareExpenses)
                    },

                    // =====================================================
                    // Section C - Distribution Type
                    // =====================================================

                    {
                        "{{DISTRIBUTION_TYPE_1_CHK}}", Checkbox(allocation.AllocationType == 1)
                    },
                    {
                        "{{DISTRIBUTION_TYPE_2_CHK}}", Checkbox(allocation.AllocationType == 2)
                    },
                    {
                        "{{DISTRIBUTION_TYPE_3_CHK}}", Checkbox(allocation.AllocationType == 3)
                    },
                    {
                        "{{DISTRIBUTION_TYPE_4_CHK}}", Checkbox(allocation.AllocationType == 4)
                    },
                    {
                        "{{DISTRIBUTION_TYPE_5_CHK}}", Checkbox(allocation.AllocationType == 5)
                    },
                    {
                        "{{DISTRIBUTION_TYPE_6_CHK}}", Checkbox(allocation.AllocationType == 6)
                    },
                    {
                        "{{DISTRIBUTION_TYPE_7_CHK}}", Checkbox(allocation.AllocationType == 7)
                    },

                    // =====================================================
                    // Section D - Minor Beneficiary
                    // =====================================================

                    {
                        "{{GURDIAN_CHK}}", Checkbox(isGuardianDistribution)
                    },
                    {
                        "{{HOLD_MINOR_CHK}}", Checkbox(isTrusteeHoldDistribution)
                    },
                    {
                        "{{RELEASE_AGE}}",
                        isTrusteeHoldDistribution
                            && minorDistribution != null
                            && minorDistribution.ReleaseAge.HasValue
                                ? minorDistribution.ReleaseAge.Value
                                    .ToString(CultureInfo.InvariantCulture)
                                : ""
                    },

                    // =============================================
                    // Section E/F - Payment / Trust proceeds
                    // =============================================

                    // =========================================================
                    // Payment Source
                    // =========================================================

                    {
                        "{{CK1}}", Checkbox(isPersonalOrJoint)
                    },
                    {
                        "{{PERSONAL_OR_JOINT}}", isPersonalOrJoint ? personalOrJoint : "-"
                    },
                    {
                        "{{JOINT_ACCOUNT_NAME}}", isJointAccount ? jointAccountName : "-"
                    },
                    {
                        "{{CK2}}", Checkbox(isThirdParty)
                    },
                    {
                        "{{THIRD_PARTY_NAME}}", isThirdParty ? (trustAsset.ThirdPartyName ?? "-") : "-"
                    },
                    {
                        "{{THIRD_PARTY_IDENTITY_ID}}", isThirdParty ? (trustAsset.ThirdPartyIdentityNo ?? "-") : "-"
                    },
                    {
                        "{{THIRD_PARTY_RELATIONSHIP}}", isThirdParty ? (!string.IsNullOrWhiteSpace(thirdPartyRelationship) ? thirdPartyRelationship : "-") : "-"
                    },
                    {
                        "{{THIRD_PARTY_BANK_NAME}}", isThirdParty ? (!string.IsNullOrWhiteSpace(thirdPartyBankName) ? thirdPartyBankName : "-") : "-"
                    },
                    {
                        "{{THIRD_PARTY_BANK_ACCOUNT_NO}}", isThirdParty ? (trustAsset.ThirdPartyBankAccountNumber ?? "-") : "-"
                    },
                    {
                        "{{THIRD_PART_BANK_HOLDER_NAME}}", isThirdParty ? (trustAsset.ThirdPartyBankAccountHolder ?? "-") : "-"
                    },
                    {
                        "{{INVEST_CHK}}", Unchecked
                    },

                    // IMPORTANT:
                    // map these two to the actual Step 2 Trust
                    // Proceeds property names in your entity.
                    //
                    // Example below assumes GuaranteedReturnOption
                    // carries the saved Step 2 proceeds selection.
                    {
                        "{{WITHDRAW_CHK}}", Checkbox(IsWithdrawOption(trustAsset.GuaranteedReturnOption))
                    },
                    {
                        "{{REDEPOSIT_CHK}}", Checkbox(IsRedepositOption(trustAsset.GuaranteedReturnOption))
                    },
                    {
                        "{{TRUST_PLACEMENT}}", trustAsset.TrustAssetAmount.ToString("N2", CultureInfo.InvariantCulture)
                    },
                    {
                        "{{SETTLOR_BANK_NAME}}", settlorBankName
                    },
                    {
                        "{{SETTLOR_BANK_ACCOUNT_HOLDER}}", trustAsset.SettlorBankAccountHolder ?? ""
                    },
                    {
                        "{{SETTLOR_BANK_ACCOUNT_NO}}", trustAsset.SettlorBankAccountNumber ?? ""
                    },
                    {
                        "{{SETTLOR_BANK_ADDRESS}}", trustAsset.SettlorBankAddress ?? ""
                    },
                    {
                        "{{SETTLOR_BANK_SWIFTCODE}}", trustAsset.SettlorSwiftCode ?? ""
                    },

                    // =====================================================
                    // Section G - Agent / Trust Representative
                    // =====================================================

                    {
                        "{{AGENT_FULL_NAME}}", agent.Fullname ?? ""
                    },
                    {
                        "{{AGENT_REFERAL_CODE}}", reference != null ? reference.ReferralCode ?? "" : ""
                    },
                    {
                        "{{AGENT_EMAIL}}", agent.Email ?? ""
                    },
                    {
                        "{{AGENT_CONTACT_NO}}", BuildAgentContact(agent.CountryMobileCode, agent.Mobile)
                    },

                    // =============================================
                    // Section H - Execution
                    // =============================================

                    {
                        "{{SIGNATURE_CHK}}", Checkbox(signingMethod == "SIGNATURE")
                    },
                    {
                        "{{THUMBPRINT_CHK}}", Checkbox(signingMethod == "THUMBPRINT")
                    },
                    {
                        "{{LILLITERATE_CHK}}", Checkbox(circumstance == "ILLITERATE")
                    },
                    {
                        "{{BLIND_CHK}}", Checkbox(circumstance == "BLIND")
                    },
                    {
                        "{{LANGUAGE_CHK}}", Checkbox(IsLanguageCircumstance(circumstance))
                    },
                    {
                        "{{INTERPRETER_NAME}}", execution.ReadOverBy ?? ""
                    },
                    {
                        "{{INTERPRETER_IDENTITY_ID}}", execution.ReadOverIdentityNo ?? ""
                    },
                    {
                        "{{INTERPRETER_LANGUAGE}}", execution.LanguageOrDialect ?? ""
                    },
                    {
                        "{{INTERPRETER_RELATIONSHIP}}", ResolveRelationship(execution.RelationshipWithSettlor, execution.OtherRelationshipWithSettlor, relationships)
                    },

                    // =============================================
                    // Submitted date
                    // =============================================

                    {
                        "{{SUBMIT_DAY}}", submittedAt.Day.ToString("00")
                    },
                    {
                        "{{SUBMIT_MONTH}}", submittedAt.Month.ToString("00")
                    },
                    {
                        "{{SUBMIT_YEAR}}", submittedAt.Year.ToString(CultureInfo.InvariantCulture)
                    },
                    {
                        "{{SUBMIT_DATE}}", submittedAt.ToString("dd/MM/yyyy")
                    }
                };

            // =====================================================
            // 8. Resolve template
            // =====================================================

            string templatePath = ResolveTemplatePath(template.TemplatePath);

            // =====================================================
            // 9. Populate DOCX
            // =====================================================

            byte[] populatedDocx = DocxPlaceholderHelper.ReplaceIntroductionForm(templatePath, placeholders, beneficiaryModels, allocationModels);

            // =====================================================
            // 10. DOCX -> PDF
            // =====================================================

            byte[] pdf = LibreOfficePdfConverter.ConvertDocxToPdf(populatedDocx);

            return new GeneratedPdfResult
            {
                Content = pdf,
                ContentType = "application/pdf",
                DocumentCode = document.DocumentCode,
                FileName = DocumentFileNameHelper.Build(template.OutputFileNameFormat, application.TrustID, document.DocumentCode)
            };
        }

        // =========================================================
        // Allocation
        // =========================================================

        private static List<InstructionFormAllocationDocumentModel> BuildAllocationModels(int allocationType, IList<tbl_TrustApplication_BeneficiaryAllocationDetail> details, IList<tbl_TrustApplication_Beneficiary> beneficiaries)
        {
            var result = new List<InstructionFormAllocationDocumentModel>();

            var normalDetails =
                details.Where(x => !x.IsTrusteeCompany && x.BeneficiaryID.HasValue).ToList();

            // User confirmed trustee-company rows are NOT displayed.
            if (!normalDetails.Any())
                return result;

            int mainCount = normalDetails.Count(x => IsRole(x.RoleType, "MAIN"));
            int substituteCount = normalDetails.Count(x => IsRole(x.RoleType, "SUBSTITUTE"));

            foreach (var detail in normalDetails)
            {
                var beneficiary = beneficiaries.FirstOrDefault(x => x.RowID == detail.BeneficiaryID.Value);
                if (beneficiary == null)
                    continue;

                decimal percentage = ResolveAllocationPercentage(allocationType, detail, mainCount, substituteCount);

                result.Add(
                    new InstructionFormAllocationDocumentModel
                    {
                        RoleType = IsRole(detail.RoleType, "MAIN") ? "Main" : "Substitute",
                        BeneficiaryName = beneficiary.FullName ?? "",
                        Percentage = percentage
                    });
            }

            return result;
        }

        private static decimal ResolveAllocationPercentage(
            int allocationType,
            tbl_TrustApplication_BeneficiaryAllocationDetail detail,
            int mainCount,
            int substituteCount)
        {
            // Type 1:
            // one Main 100%, one Substitute 100%
            if (allocationType == 1)
                return 100M;

            // Type 2:
            // Main = 100%
            // Substitute = equal shares
            if (allocationType == 2)
            {
                if (IsRole(detail.RoleType, "MAIN"))
                    return 100M;

                return substituteCount > 0 ? 100M / substituteCount : 0M;
            }

            // Type 5:
            // multiple Main = equal shares
            if (allocationType == 5)
            {
                return mainCount > 0 ? 100M / mainCount : 0M;
            }

            // Types 3 / 6 use stored percentages.
            return detail.AllocationPercentage ?? 0M;
        }

        private static bool IsRole(string role, string expected)
        {
            return string.Equals(role, expected, StringComparison.OrdinalIgnoreCase);
        }

        // =========================================================
        // Helpers
        // =========================================================

        private static string Checkbox(bool selected)
        {
            return selected ? Checked : Unchecked;
        }

        private static string ResolveRelationship(string relationshipCode, string otherRelationship, IList<tbl_Relationship> relationships)
        {
            if (string.IsNullOrWhiteSpace(relationshipCode))
                return "";

            if (string.Equals(relationshipCode, "OTHER", StringComparison.OrdinalIgnoreCase))
            {
                return otherRelationship ?? "";
            }

            var relationship =
                relationships.FirstOrDefault(x => string.Equals(x.Relationship_Code, relationshipCode, StringComparison.OrdinalIgnoreCase));

            return relationship != null ? relationship.Relationship_Name ?? "" : relationshipCode;
        }

        private static string BuildTinReason(string reason, string explanation)
        {
            if (string.IsNullOrWhiteSpace(reason))
                return "";

            string normalized = reason.Trim().ToUpperInvariant();

            switch (normalized)
            {
                case "TIN_NOT_ISSUED":
                    return "[A]";

                case "UNABLE_TO_PROVIDE":
                    return string.IsNullOrWhiteSpace(explanation) ? "[B]" : "[B] " + explanation.Trim();

                case "TIN_NOT_REQUIRED":
                    return "[C]";

                default:
                    return string.IsNullOrWhiteSpace(explanation) ? reason : reason + " - " + explanation;
            }
        }

        private static string BuildAgentContact(string countryCode, string mobile)
        {
            string code = (countryCode ?? "").Trim();
            string number = (mobile ?? "").Trim();

            if (string.IsNullOrWhiteSpace(code))
                return number;

            if (string.IsNullOrWhiteSpace(number))
                return code;

            return code + number;
        }

        private static string ResolveBankName(string bankName, string otherBankName)
        {
            if (!string.IsNullOrWhiteSpace(otherBankName))
                return otherBankName.Trim();

            return (bankName ?? "").Trim();
        }

        private static bool IsLanguageCircumstance(string value)
        {
            return value == "LESS_PROFICIENT_IN_ENGLISH"
                || value == "LESS_PROFICIENT_ENGLISH"
                || value == "LANGUAGE";
        }

        private static bool IsWithdrawOption(string value)
        {
            return string.Equals((value ?? "").Trim(), "TRANSFER_TO_BANK", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsRedepositOption(string value)
        {
            return string.Equals((value ?? "").Trim(), "REDEPOSIT_AS_TRUST_ASSET", StringComparison.OrdinalIgnoreCase);
        }

        private static string ResolveTemplatePath(string relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                throw new BusinessException("Document template path is not configured.", Code);
            }

            relativePath = relativePath.Replace("\\", "/").TrimStart('/');
            string physicalPath = HttpContext.Current.Server.MapPath("~/" + relativePath);

            if (!File.Exists(physicalPath))
            {
                throw new BusinessException("Document template file not found.", Code);
            }

            return physicalPath;
        }

        private static string YesNoCheckbox(bool value)
        {
            string checked_checkbox = "☑";
            return value
                ? $"{checked_checkbox} Yes    ☐ No"
                : $"☐ Yes    {checked_checkbox} No";
        }
    }
}