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
    public class LetterOfWishesType1DocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-LETTER-OF-WISHES-TYPE-1";

        private const string DocumentCode = "LETTER_WISHES_1";

        // =========================================================
        // Can Handle
        // =========================================================

        public bool CanHandle(string documentCode)
        {
            return string.Equals(documentCode, DocumentCode, StringComparison.OrdinalIgnoreCase);
        }

        // =========================================================
        // Generate
        // =========================================================

        public async Task<GeneratedPdfResult> GenerateAsync(
            Sandbox_BasedEntities db,
            tbl_TrustApplication application,
            tbl_TrustDocument document,
            tbl_TrustDocumentTemplate template,
            long userId)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            if (application == null)
            {
                throw new ArgumentNullException(nameof(application));
            }

            if (document == null)
            {
                throw new ArgumentNullException(nameof(document));
            }

            if (template == null)
            {
                throw new ArgumentNullException(nameof(template));
            }

            // =====================================================
            // 1. Payment Approved Date
            //
            // YEAR in:
            // REFERENCE_PREFIX / TRUST_NO / YEAR
            //
            // must use PaymentApprovedAt.
            // =====================================================

            if (!application.PaymentApprovedAt.HasValue)
            {
                throw new BusinessException("Trust Application payment approved date is not available.", Code);
            }

            // =====================================================
            // 2. Personal Detail
            // =====================================================

            var personal =
                await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(x => x.TrustApplicationID ==  application.RowID);

            if (personal == null)
            {
                throw new BusinessException("Trust Application personal details not found.", Code);
            }

            // =====================================================
            // 3. Beneficiary Allocation
            // =====================================================

            var allocation =
                await db.tbl_TrustApplication_BeneficiaryAllocation.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (allocation == null)
            {
                throw new BusinessException("Beneficiary allocation information not found.", Code);
            }

            if (allocation.AllocationType != 1)
            {
                throw new BusinessException("Letter of Wishes Type 1 requires Allocation Type 1.", Code);
            }

            // =====================================================
            // 4. Allocation Details
            //
            // Type 1:
            // - one MAIN
            // - one SUBSTITUTE
            // =====================================================

            var allocationDetails =
                await db.tbl_TrustApplication_BeneficiaryAllocationDetail.Where(x => x.AllocationID == allocation.RowID)
                    .ToListAsync();

            var mainAllocation =
                allocationDetails.FirstOrDefault(
                    x => string.Equals(x.RoleType, "MAIN", StringComparison.OrdinalIgnoreCase) && x.BeneficiaryID.HasValue && !x.IsTrusteeCompany);

            if (mainAllocation == null)
            {
                throw new BusinessException("Main Beneficiary information is not available for Letter of Wishes Type 1.", Code);
            }

            var substituteAllocation =
                allocationDetails.FirstOrDefault(
                    x => string.Equals(x.RoleType, "SUBSTITUTE", StringComparison.OrdinalIgnoreCase) 
                    && x.BeneficiaryID.HasValue && !x.IsTrusteeCompany);

            // =====================================================
            // 5. Load Main + Substitute Beneficiaries
            // =====================================================

            long mainBeneficiaryId = mainAllocation.BeneficiaryID.Value;

            long? substituteBeneficiaryId = substituteAllocation != null ? substituteAllocation.BeneficiaryID : null;

            var beneficiaries =
                await db.tbl_TrustApplication_Beneficiary
                    .Where(x => x.TrustApplicationID == application.RowID && x.IsActive && (x.RowID == mainBeneficiaryId || x.RowID == substituteBeneficiaryId))
                    .ToListAsync();

            var mainBeneficiary = beneficiaries.FirstOrDefault(x => x.RowID == mainBeneficiaryId);

            if (mainBeneficiary == null)
            {
                throw new BusinessException("Main Beneficiary record was not found.", Code);
            }

            var substituteBeneficiary =
                substituteBeneficiaryId.HasValue ? beneficiaries.FirstOrDefault(x => x.RowID == substituteBeneficiaryId.Value) : null;

            if (substituteBeneficiaryId.HasValue && substituteBeneficiary == null)
            {
                throw new BusinessException("Substitute Beneficiary record was not found.", Code);
            }

            // =====================================================
            // 6. Resolve Relationships
            // =====================================================

            var relationshipCodes =
                new[]
                {
                    mainBeneficiary.RelationshipCode, substituteBeneficiary != null ? substituteBeneficiary.RelationshipCode : null
                }
                .Where(x => !string.IsNullOrWhiteSpace(x) && !string.Equals(x, "OTHER", StringComparison.OrdinalIgnoreCase))
                .Distinct()
                .ToList();

            var relationships =
                await db.tbl_Relationship
                    .Where(x => relationshipCodes.Contains(x.Relationship_Code) && x.Status == 0)
                    .ToListAsync();

            string mainRelationship = ResolveRelationship(mainBeneficiary, relationships);
            string substituteRelationship = ResolveRelationship(substituteBeneficiary, relationships);

            // =====================================================
            // Letter of Wishes Type 1 - Point 3(b)
            // =====================================================

            string beneficiaryDistributionClause =
                "The Trustee shall distribute one hundred percent (100%) " +
                "of the Trust Fund to my " +
                mainRelationship + ", " +
                (mainBeneficiary.FullName ?? "") +
                " (NRIC No. " +
                (mainBeneficiary.IdentityNo ?? "") +
                ") (\"Main Beneficiary\").";

            if (substituteBeneficiary != null)
            {
                beneficiaryDistributionClause +=
                    " If the Main Beneficiary does not survive as at " +
                    "the date of my demise, the Trustee shall distribute " +
                    "the Trust Fund to my " +
                    substituteRelationship + ", " +
                    (substituteBeneficiary.FullName ?? "") +
                    " (NRIC No. " +
                    (substituteBeneficiary.IdentityNo ?? "") +
                    ").";
            }

            // =====================================================
            // 7. Resolve Trust Plan
            //
            // COMPLETED / EARLY_WITHDRAWN / MATURED
            // => frozen snapshot
            //
            // Other status
            // => current Trust Plan
            // =====================================================

            TrustPlanDetailsResponse planDetails;

            if (IsSnapshotStatus(application.ApplicationStatus))
            {
                var snapshotService = new TrustApplicationPlanSnapshotServiceAsync();

                planDetails = await snapshotService.GetSnapshotConfigurationAsync(db, application.RowID);

                if (planDetails == null || planDetails.Steps == null || planDetails.Steps.Step1BasicInformation == null)
                {
                    throw new BusinessException("Trust Application Plan Snapshot configuration is invalid.", Code);
                }
            }
            else
            {
                var trustPlanService = new TrustPlanServiceAsync();
                planDetails = await trustPlanService.GetTrustProductDetailsAsync(application.ProductCode, application.MerchantID);

                if (planDetails == null || planDetails.Steps == null || planDetails.Steps.Step1BasicInformation == null)
                {
                    throw new BusinessException("Trust Product configuration not found.", Code);
                }
            }

            var basic = planDetails.Steps.Step1BasicInformation;

            // =====================================================
            // 8. Settlor Address
            // =====================================================

            string settlorAddress = BuildSettlorAddress(personal.AddressLine1, personal.AddressLine2);

            // =====================================================
            // 9. After My Lifetime
            // =====================================================

            string afterLifetime = BuildAfterLifetimeText(application);

            // =====================================================
            // 10. Placeholder Mapping
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    // ---------------------------------------------
                    // Letter of Wishes Type 1 - Point 3(b)
                    // ---------------------------------------------

                    {
                        "{{BENEFICIARY_DISTRIBUTION_CLAUSE}}", beneficiaryDistributionClause
                    },

                    // ---------------------------------------------
                    // Reference
                    // ---------------------------------------------

                    {
                        "{{REFERENCE_PREFIX}}", basic.ReferencePrefix ?? ""
                    },
                    {
                        "{{TRUST_NO}}", application.TrustID.ToString("D4")
                    },
                    {
                        "{{YEAR}}", application.PaymentApprovedAt.Value.Year.ToString(CultureInfo.InvariantCulture)
                    },

                    // ---------------------------------------------
                    // Settlor
                    // ---------------------------------------------

                    {
                        "{{SETTLOR_FULL_NAME}}", personal.FullName ?? ""
                    },
                    {
                        "{{SETTLOR_IDENTITY_ID}}", personal.IdentityNo ?? ""
                    },
                    {
                        "{{SETTLOR_ADDRESS}}", settlorAddress
                    },
                    {
                        "{{CITY}}", personal.City ?? ""
                    },
                    {
                        "{{POSTCODE}}", personal.Postcode ?? ""
                    },
                    {
                        "{{STATE}}", personal.State ?? ""
                    },
                    {
                        "{{COUNTRY}}", personal.Country ?? ""
                    },

                    // ---------------------------------------------
                    // Trust Plan
                    // ---------------------------------------------

                    {
                        "{{TRUST_PLAN_NAME}}", basic.ProductName ?? ""
                    },

                    // ---------------------------------------------
                    // After Lifetime
                    // ---------------------------------------------

                    {
                        "{{AFTER_LIFETIME}}", afterLifetime
                    },

                    // ---------------------------------------------
                    // Main Beneficiary
                    // ---------------------------------------------

                    {
                        "{{MAIN_BENEFICIAR_RELATIONSHIP}}", mainRelationship
                    },
                    {
                        "{{MAIN_BENEFICIAR_NAME}}", mainBeneficiary.FullName ?? ""
                    },
                    {
                        "{{MAIN_BENEFICIAR_IDENTITY_ID}}", mainBeneficiary.IdentityNo ?? ""
                    },

                    // ---------------------------------------------
                    // Substitute Beneficiary
                    // ---------------------------------------------

                    {
                        "{{SUB_BENEFICIAR_RELATIONSHIP}}", substituteRelationship
                    },
                    {
                        "{{SUB_BENEFICIAR_NAME}}", substituteBeneficiary != null ? substituteBeneficiary.FullName ?? "" : ""
                    },
                    {
                        "{{SUB_BENEFICIAR_IDENTITY_ID}}", substituteBeneficiary != null ? substituteBeneficiary.IdentityNo ?? "" : ""
                    }
                };

            // =====================================================
            // 11. Template
            // =====================================================

            string templatePath = ResolveTemplatePath(template.TemplatePath);

            // =====================================================
            // 12. Replace
            //
            // No repeating section is required for Type 1.
            // =====================================================

            byte[] populatedDocx = DocxPlaceholderHelper.ReplacePlaceholders(templatePath, placeholders);

            // =====================================================
            // 13. PDF
            // =====================================================

            byte[] pdf = LibreOfficePdfConverter.ConvertDocxToPdf(populatedDocx);

            // =====================================================
            // 14. Result
            // =====================================================

            return new GeneratedPdfResult
            {
                Content = pdf,
                ContentType = "application/pdf",
                DocumentCode = document.DocumentCode,
                FileName = DocumentFileNameHelper.Build(template.OutputFileNameFormat, application.TrustID, document.DocumentCode)
            };
        }

        // =========================================================
        // Relationship
        // =========================================================

        private static string ResolveRelationship(tbl_TrustApplication_Beneficiary beneficiary, IList<tbl_Relationship> relationships)
        {
            if (beneficiary == null)
            {
                return "";
            }

            if (string.Equals(beneficiary.RelationshipCode, "OTHER", StringComparison.OrdinalIgnoreCase))
            {
                return beneficiary.OtherRelationship ?? "";
            }

            var relationship =
                relationships.FirstOrDefault(x => string.Equals(x.Relationship_Code, beneficiary.RelationshipCode, StringComparison.OrdinalIgnoreCase));

            if (relationship != null)
            {
                return relationship.Relationship_Name ?? "";
            }

            return beneficiary.RelationshipCode ?? "";
        }

        // =========================================================
        // Settlor Address
        // =========================================================

        private static string BuildSettlorAddress(string addressLine1, string addressLine2)
        {
            string address1 = (addressLine1 ?? "").Trim();
            string address2 = (addressLine2 ?? "").Trim();

            if (string.IsNullOrWhiteSpace(address2))
            {
                return address1;
            }

            if (string.IsNullOrWhiteSpace(address1))
            {
                return address2;
            }

            return address1.TrimEnd(',') + "," + Environment.NewLine + address2;
        }

        // =========================================================
        // After Lifetime
        // =========================================================

        private static string BuildAfterLifetimeText(tbl_TrustApplication application)
        {
            var items = new List<string>();

            if (application.AfterLifetimeLivingMaintenance)
            {
                items.Add("living maintenance");
            }

            if (application.AfterLifetimeEducationExpenses)
            {
                items.Add("education expenses");
            }

            if (application.AfterLifetimeMedicalHealthcareExpenses)
            {
                items.Add("medical and healthcare expenses");
            }

            if (items.Count == 0)
            {
                return "";
            }

            if (items.Count == 1)
            {
                return items[0];
            }

            if (items.Count == 2)
            {
                return items[0] + " and " + items[1];
            }

            return
                string.Join(", ", items.Take(items.Count - 1)) + " and " + items.Last();
        }

        // =========================================================
        // Snapshot Status
        // =========================================================

        private static bool IsSnapshotStatus(string applicationStatus)
        {
            string status = (applicationStatus ?? "").Trim().ToUpperInvariant();

            return
                status == "COMPLETED"
                ||
                status == "EARLY_WITHDRAWN"
                ||
                status == "MATURED";
        }

        // =========================================================
        // Template Path
        // =========================================================

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
    }
}