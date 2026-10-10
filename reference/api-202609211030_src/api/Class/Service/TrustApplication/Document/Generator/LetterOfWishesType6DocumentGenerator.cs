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
    public class LetterOfWishesType6DocumentGenerator
        : ITrustDocumentGenerator
    {
        private const string Code =
            "GENERATE-LETTER-OF-WISHES-TYPE-6";

        private const string DocumentCode =
            "LETTER_WISHES_6";

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
                throw new ArgumentNullException(nameof(db));

            if (application == null)
                throw new ArgumentNullException(nameof(application));

            if (document == null)
                throw new ArgumentNullException(nameof(document));

            if (template == null)
                throw new ArgumentNullException(nameof(template));

            // =====================================================
            // 1. Payment Approved Date
            //
            // YEAR in Reference No. uses PaymentApprovedAt.
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
            // 3. Allocation
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

            if (allocation.AllocationType != 6)
            {
                throw new BusinessException(
                    "Letter of Wishes Type 6 requires Allocation Type 6.",
                    Code);
            }

            // =====================================================
            // 4. Allocation Details
            //
            // Type 6:
            // - multiple beneficiaries
            // - each beneficiary has AllocationPercentage
            // - no MAIN beneficiary paragraph in the DOCX
            //
            // The DOCX uses SUB_BENEFICIAR_* as the repeating
            // placeholder names.
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

            var beneficiaryAllocations =
                allocationDetails
                    .Where(
                        x =>
                            x.BeneficiaryID.HasValue
                            &&
                            !x.IsTrusteeCompany)
                    .ToList();

            if (!beneficiaryAllocations.Any())
            {
                throw new BusinessException(
                    "Allocation Type 6 beneficiary information not found.",
                    Code);
            }

            // =====================================================
            // 5. Validate percentages
            // =====================================================

            if (beneficiaryAllocations.Any(
                x => !x.AllocationPercentage.HasValue))
            {
                throw new BusinessException(
                    "Allocation Type 6 requires an allocation percentage for every beneficiary.",
                    Code);
            }

            decimal totalPercentage =
                beneficiaryAllocations.Sum(
                    x => x.AllocationPercentage.Value);

            if (totalPercentage != 100M)
            {
                throw new BusinessException(
                    "Allocation Type 6 beneficiary percentages must total 100%.",
                    Code);
            }

            // =====================================================
            // 6. Load beneficiaries
            // =====================================================

            var beneficiaryIds =
                beneficiaryAllocations
                    .Select(
                        x => x.BeneficiaryID.Value)
                    .Distinct()
                    .ToList();

            var beneficiaries =
                await db.tbl_TrustApplication_Beneficiary
                    .Where(
                        x =>
                            x.TrustApplicationID ==
                            application.RowID
                            &&
                            x.IsActive
                            &&
                            beneficiaryIds.Contains(
                                x.RowID))
                    .ToListAsync();

            if (beneficiaries.Count != beneficiaryIds.Count)
            {
                throw new BusinessException(
                    "One or more Allocation Type 6 beneficiaries could not be found.",
                    Code);
            }

            // =====================================================
            // 7. Relationship master
            // =====================================================

            var relationshipCodes =
                beneficiaries
                    .Where(
                        x =>
                            !string.IsNullOrWhiteSpace(
                                x.RelationshipCode)
                            &&
                            !string.Equals(
                                x.RelationshipCode,
                                "OTHER",
                                StringComparison.OrdinalIgnoreCase))
                    .Select(
                        x => x.RelationshipCode)
                    .Distinct()
                    .ToList();

            var relationships =
                await db.tbl_Relationship
                    .Where(
                        x =>
                            relationshipCodes.Contains(
                                x.Relationship_Code)
                            &&
                            x.Status == 0)
                    .ToListAsync();

            // =====================================================
            // 8. Build Type 6 beneficiary list
            //
            // Preserve Step 4 allocation-detail order.
            // =====================================================

            var beneficiaryModels =
                new List<
                    LetterOfWishesType6BeneficiaryDocumentModel>();

            foreach (var detail in beneficiaryAllocations)
            {
                var beneficiary =
                    beneficiaries.FirstOrDefault(
                        x =>
                            x.RowID ==
                            detail.BeneficiaryID.Value);

                if (beneficiary == null)
                {
                    throw new BusinessException(
                        "Allocation Type 6 beneficiary record was not found.",
                        Code);
                }

                beneficiaryModels.Add(
                    new LetterOfWishesType6BeneficiaryDocumentModel
                    {
                        BeneficiaryID =
                            beneficiary.RowID,

                        Relationship =
                            ResolveRelationship(
                                beneficiary,
                                relationships),

                        Name =
                            beneficiary.FullName ?? "",

                        IdentityNo = IdentityDocumentFormatHelper.Format(beneficiary.IdentityType, beneficiary.IdentityNo),

                        AllocationPercentage =
                            detail.AllocationPercentage.Value
                    });
            }

            // =====================================================
            // 9. Resolve Trust Plan
            //
            // COMPLETED / EARLY_WITHDRAWN / MATURED
            // => snapshot
            //
            // Other statuses
            // => current plan
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
            // 10. Normal placeholders
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
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

                    {
                        "{{SETTLOR_FULL_NAME}}",
                        personal.FullName ?? ""
                    },

                    {
                        "{{SETTLOR_IDENTITY_ID}}", IdentityDocumentFormatHelper.Format(personal.IdentityType, personal.IdentityNo)
                    },

                    {
                        "{{SETTLOR_ADDRESS}}",
                        BuildSettlorAddress(
                            personal.AddressLine1,
                            personal.AddressLine2)
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

                    {
                        "{{TRUST_PLAN_NAME}}",
                        basic.ProductName ?? ""
                    },

                    {
                        "{{AFTER_LIFETIME}}",
                        BuildAfterLifetimeText(
                            application)
                    }
                };

            // =====================================================
            // 11. Resolve Template
            // =====================================================

            string templatePath =
                ResolveTemplatePath(
                    template.TemplatePath);

            // =====================================================
            // 12. Replace normal placeholders +
            //     repeat beneficiary paragraph
            // =====================================================

            byte[] populatedDocx =
                DocxPlaceholderHelper
                    .ReplacePlaceholdersWithType6Beneficiaries(
                        templatePath,
                        placeholders,
                        beneficiaryModels);

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
        // Relationship
        // =========================================================

        private static string ResolveRelationship(
            tbl_TrustApplication_Beneficiary beneficiary,
            IList<tbl_Relationship> relationships)
        {
            if (beneficiary == null)
                return "";

            if (string.Equals(
                beneficiary.RelationshipCode,
                "OTHER",
                StringComparison.OrdinalIgnoreCase))
            {
                return
                    beneficiary.OtherRelationship
                    ?? "";
            }

            var relationship =
                relationships.FirstOrDefault(
                    x =>
                        string.Equals(
                            x.Relationship_Code,
                            beneficiary.RelationshipCode,
                            StringComparison.OrdinalIgnoreCase));

            return relationship != null
                ? relationship.Relationship_Name ?? ""
                : beneficiary.RelationshipCode ?? "";
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