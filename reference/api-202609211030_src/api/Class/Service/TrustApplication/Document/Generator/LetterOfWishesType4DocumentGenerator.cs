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
    public class LetterOfWishesType4DocumentGenerator
        : ITrustDocumentGenerator
    {
        private const string Code =
            "GENERATE-LETTER-OF-WISHES-TYPE-4";

        private const string DocumentCode =
            "LETTER_WISHES_4";

        // =========================================================
        // Can Handle
        // =========================================================

        public bool CanHandle(string documentCode)
        {
            return string.Equals(
                documentCode,
                DocumentCode,
                StringComparison.OrdinalIgnoreCase);
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
            // YEAR must use tbl_TrustApplication.PaymentApprovedAt
            // =====================================================

            if (!application.PaymentApprovedAt.HasValue)
            {
                throw new BusinessException(
                    "Trust Application payment approved date is not available.",
                    Code);
            }

            // =====================================================
            // 2. Personal Detail
            // =====================================================

            var personal =
                await db.tbl_TrustApplication_PersonalDetail
                    .FirstOrDefaultAsync(
                        x =>
                            x.TrustApplicationID ==
                            application.RowID);

            if (personal == null)
            {
                throw new BusinessException(
                    "Trust Application personal details not found.",
                    Code);
            }

            // =====================================================
            // 3. Beneficiary Allocation
            // =====================================================

            var allocation =
                await db.tbl_TrustApplication_BeneficiaryAllocation
                    .FirstOrDefaultAsync(
                        x =>
                            x.TrustApplicationID ==
                            application.RowID);

            if (allocation == null)
            {
                throw new BusinessException(
                    "Beneficiary allocation information not found.",
                    Code);
            }

            if (allocation.AllocationType != 4)
            {
                throw new BusinessException(
                    "Letter of Wishes Type 4 requires Allocation Type 4.",
                    Code);
            }

            // =====================================================
            // 4. Allocation Detail
            //
            // Type 4:
            // - one MAIN beneficiary
            // - no substitute beneficiary
            // - no beneficiary repeating section
            // =====================================================

            var allocationDetails =
                await db
                    .tbl_TrustApplication_BeneficiaryAllocationDetail
                    .Where(
                        x =>
                            x.AllocationID ==
                            allocation.RowID)
                    .OrderBy(x => x.RowID)
                    .ToListAsync();

            var mainAllocations =
                allocationDetails
                    .Where(
                        x =>
                            string.Equals(
                                x.RoleType,
                                "MAIN",
                                StringComparison.OrdinalIgnoreCase)
                            &&
                            x.BeneficiaryID.HasValue
                            &&
                            !x.IsTrusteeCompany)
                    .ToList();

            if (mainAllocations.Count != 1)
            {
                throw new BusinessException(
                    "Letter of Wishes Type 4 requires exactly one Main Beneficiary.",
                    Code);
            }

            var mainAllocation =
                mainAllocations[0];

            // =====================================================
            // 5. Main Beneficiary
            // =====================================================

            var mainBeneficiary =
                await db.tbl_TrustApplication_Beneficiary
                    .FirstOrDefaultAsync(
                        x =>
                            x.TrustApplicationID ==
                            application.RowID
                            &&
                            x.RowID ==
                            mainAllocation.BeneficiaryID.Value
                            &&
                            x.IsActive);

            if (mainBeneficiary == null)
            {
                throw new BusinessException(
                    "Main Beneficiary record was not found.",
                    Code);
            }

            // =====================================================
            // 6. Relationship
            // =====================================================

            string mainRelationship;

            if (string.Equals(
                mainBeneficiary.RelationshipCode,
                "OTHER",
                StringComparison.OrdinalIgnoreCase))
            {
                mainRelationship =
                    mainBeneficiary.OtherRelationship
                    ?? "";
            }
            else
            {
                var relationship =
                    await db.tbl_Relationship
                        .FirstOrDefaultAsync(
                            x =>
                                x.Relationship_Code ==
                                mainBeneficiary.RelationshipCode
                                &&
                                x.Status == 0);

                mainRelationship =
                    relationship != null
                        ? relationship.Relationship_Name ?? ""
                        : mainBeneficiary.RelationshipCode ?? "";
            }

            // =====================================================
            // 7. Resolve Trust Plan
            //
            // COMPLETED / EARLY_WITHDRAWN / MATURED
            //     => frozen snapshot
            //
            // Other statuses
            //     => current Trust Plan
            //
            // ReferencePrefix and ProductName must come from
            // the SAME resolved plan source.
            // =====================================================

            TrustPlanDetailsResponse planDetails;

            if (IsSnapshotStatus(
                application.ApplicationStatus))
            {
                var snapshotService =
                    new TrustApplicationPlanSnapshotServiceAsync();

                planDetails =
                    await snapshotService
                        .GetSnapshotConfigurationAsync(
                            db,
                            application.RowID);

                if (planDetails == null ||
                    planDetails.Steps == null ||
                    planDetails.Steps.Step1BasicInformation == null)
                {
                    throw new BusinessException(
                        "Trust Application Plan Snapshot configuration is invalid.",
                        Code);
                }
            }
            else
            {
                var trustPlanService =
                    new TrustPlanServiceAsync();

                planDetails =
                    await trustPlanService
                        .GetTrustProductDetailsAsync(
                            application.ProductCode,
                            application.MerchantID);

                if (planDetails == null ||
                    planDetails.Steps == null ||
                    planDetails.Steps.Step1BasicInformation == null)
                {
                    throw new BusinessException(
                        "Trust Product configuration not found.",
                        Code);
                }
            }

            var basic =
                planDetails.Steps.Step1BasicInformation;

            // =====================================================
            // 8. Settlor Address
            //
            // Address 2 is optional.
            // =====================================================

            string settlorAddress =
                BuildSettlorAddress(
                    personal.AddressLine1,
                    personal.AddressLine2);

            // =====================================================
            // 9. After My Lifetime
            // =====================================================

            string afterLifetime =
                BuildAfterLifetimeText(
                    application);

            // =====================================================
            // 10. Placeholder Mapping
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    // ---------------------------------------------
                    // Reference
                    // ---------------------------------------------

                    {
                        "{{REFERENCE_PREFIX}}",
                        basic.ReferencePrefix ?? ""
                    },

                    {
                        "{{TRUST_NO}}",
                        application.TrustID.ToString("D4")
                    },

                    {
                        "{{YEAR}}",
                        application.PaymentApprovedAt.Value
                            .Year
                            .ToString(
                                CultureInfo.InvariantCulture)
                    },

                    // ---------------------------------------------
                    // Settlor
                    // ---------------------------------------------

                    {
                        "{{SETTLOR_FULL_NAME}}",
                        personal.FullName ?? ""
                    },

                    {
                        "{{SETTLOR_IDENTITY_ID}}",
                        personal.IdentityNo ?? ""
                    },

                    {
                        "{{SETTLOR_ADDRESS}}",
                        settlorAddress
                    },

                    {
                        "{{CITY}}",
                        personal.City ?? ""
                    },

                    {
                        "{{POSTCODE}}",
                        personal.Postcode ?? ""
                    },

                    {
                        "{{STATE}}",
                        personal.State ?? ""
                    },

                    {
                        "{{COUNTRY}}",
                        personal.Country ?? ""
                    },

                    // ---------------------------------------------
                    // Trust Plan
                    // ---------------------------------------------

                    {
                        "{{TRUST_PLAN_NAME}}",
                        basic.ProductName ?? ""
                    },

                    // ---------------------------------------------
                    // After Lifetime
                    // ---------------------------------------------

                    {
                        "{{AFTER_LIFETIME}}",
                        afterLifetime
                    },

                    // ---------------------------------------------
                    // Main Beneficiary
                    // ---------------------------------------------

                    {
                        "{{MAIN_BENEFICIAR_RELATIONSHIP}}",
                        mainRelationship
                    },

                    {
                        "{{MAIN_BENEFICIAR_NAME}}",
                        mainBeneficiary.FullName ?? ""
                    },

                    {
                        "{{MAIN_BENEFICIAR_IDENTITY_ID}}",
                        mainBeneficiary.IdentityNo ?? ""
                    }
                };

            // =====================================================
            // 11. Resolve Template
            // =====================================================

            string templatePath =
                ResolveTemplatePath(
                    template.TemplatePath);

            // =====================================================
            // 12. Replace placeholders
            //
            // Type 4 has NO repeating beneficiary paragraph.
            // Existing standard helper is sufficient.
            // =====================================================

            byte[] populatedDocx =
                DocxPlaceholderHelper.ReplacePlaceholders(
                    templatePath,
                    placeholders);

            // =====================================================
            // 13. DOCX -> PDF
            // =====================================================

            byte[] pdf =
                LibreOfficePdfConverter
                    .ConvertDocxToPdf(
                        populatedDocx);

            // =====================================================
            // 14. Result
            // =====================================================

            return new GeneratedPdfResult
            {
                Content =
                    pdf,

                ContentType =
                    "application/pdf",

                DocumentCode =
                    document.DocumentCode,

                FileName =
                    DocumentFileNameHelper.Build(
                        template.OutputFileNameFormat,
                        application.TrustID,
                        document.DocumentCode)
            };
        }

        // =========================================================
        // Settlor Address
        // =========================================================

        private static string BuildSettlorAddress(
            string addressLine1,
            string addressLine2)
        {
            string address1 =
                (addressLine1 ?? "").Trim();

            string address2 =
                (addressLine2 ?? "").Trim();

            if (string.IsNullOrWhiteSpace(address2))
            {
                return address1;
            }

            if (string.IsNullOrWhiteSpace(address1))
            {
                return address2;
            }

            return
                address1.TrimEnd(',')
                + ","
                + Environment.NewLine
                + address2;
        }

        // =========================================================
        // After My Lifetime
        // =========================================================

        private static string BuildAfterLifetimeText(
            tbl_TrustApplication application)
        {
            var items =
                new List<string>();

            if (application.AfterLifetimeLivingMaintenance)
            {
                items.Add(
                    "living maintenance");
            }

            if (application.AfterLifetimeEducationExpenses)
            {
                items.Add(
                    "education expenses");
            }

            if (application.AfterLifetimeMedicalHealthcareExpenses)
            {
                items.Add(
                    "medical and healthcare expenses");
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
                return
                    items[0]
                    + " and "
                    + items[1];
            }

            return
                string.Join(
                    ", ",
                    items.Take(items.Count - 1))
                + " and "
                + items.Last();
        }

        // =========================================================
        // Snapshot Status
        // =========================================================

        private static bool IsSnapshotStatus(
            string applicationStatus)
        {
            string status =
                (applicationStatus ?? "")
                    .Trim()
                    .ToUpperInvariant();

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

        private static string ResolveTemplatePath(
            string relativePath)
        {
            if (string.IsNullOrWhiteSpace(
                relativePath))
            {
                throw new BusinessException(
                    "Document template path is not configured.",
                    Code);
            }

            relativePath =
                relativePath
                    .Replace("\\", "/")
                    .TrimStart('/');

            string physicalPath =
                HttpContext.Current.Server.MapPath(
                    "~/" + relativePath);

            if (!File.Exists(physicalPath))
            {
                throw new BusinessException(
                    "Document template file not found.",
                    Code);
            }

            return physicalPath;
        }
    }
}