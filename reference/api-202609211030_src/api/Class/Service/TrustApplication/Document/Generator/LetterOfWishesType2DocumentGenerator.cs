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
    public class LetterOfWishesType2DocumentGenerator
        : ITrustDocumentGenerator
    {
        private const string Code =
            "GENERATE-LETTER-OF-WISHES-TYPE-2";

        private const string DocumentCode =
            "LETTER_WISHES_2";

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
            // Reference YEAR must use PaymentApprovedAt.
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

            if (allocation.AllocationType != 2)
            {
                throw new BusinessException(
                    "Letter of Wishes Type 2 requires Allocation Type 2.",
                    Code);
            }

            // =====================================================
            // 4. Allocation Details
            //
            // Type 2:
            // - exactly one MAIN
            // - one or more SUBSTITUTE
            // - substitute distribution is equal share
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
                    "Letter of Wishes Type 2 requires exactly one Main Beneficiary.",
                    Code);
            }

            var mainAllocation =
                mainAllocations[0];

            var substituteAllocations =
                allocationDetails
                    .Where(
                        x =>
                            string.Equals(
                                x.RoleType,
                                "SUBSTITUTE",
                                StringComparison.OrdinalIgnoreCase)
                            &&
                            x.BeneficiaryID.HasValue
                            &&
                            !x.IsTrusteeCompany)
                    .ToList();

            if (!substituteAllocations.Any())
            {
                throw new BusinessException(
                    "Letter of Wishes Type 2 requires at least one Substitute Beneficiary.",
                    Code);
            }

            // =====================================================
            // 5. Load beneficiary records
            // =====================================================

            var beneficiaryIds =
                allocationDetails
                    .Where(
                        x =>
                            x.BeneficiaryID.HasValue)
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

            var mainBeneficiary =
                beneficiaries.FirstOrDefault(
                    x =>
                        x.RowID ==
                        mainAllocation.BeneficiaryID.Value);

            if (mainBeneficiary == null)
            {
                throw new BusinessException(
                    "Main Beneficiary record was not found.",
                    Code);
            }

            // =====================================================
            // 6. Relationships
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
            // 7. Main Beneficiary
            // =====================================================

            var mainModel =
                new LetterOfWishesType2BeneficiaryDocumentModel
                {
                    BeneficiaryID =
                        mainBeneficiary.RowID,

                    Relationship =
                        ResolveRelationship(
                            mainBeneficiary,
                            relationships),

                    Name =
                        mainBeneficiary.FullName ?? "",

                    IdentityNo =
                        mainBeneficiary.IdentityNo ?? ""
                };

            // =====================================================
            // 8. Substitute Beneficiaries
            //
            // Preserve allocation-detail order.
            // =====================================================

            var substituteModels =
                new List<
                    LetterOfWishesType2BeneficiaryDocumentModel>();

            foreach (var detail in substituteAllocations)
            {
                var beneficiary =
                    beneficiaries.FirstOrDefault(
                        x =>
                            x.RowID ==
                            detail.BeneficiaryID.Value);

                if (beneficiary == null)
                {
                    throw new BusinessException(
                        "Substitute Beneficiary record was not found.",
                        Code);
                }

                substituteModels.Add(
                    new LetterOfWishesType2BeneficiaryDocumentModel
                    {
                        BeneficiaryID =
                            beneficiary.RowID,

                        Relationship =
                            ResolveRelationship(
                                beneficiary,
                                relationships),

                        Name =
                            beneficiary.FullName ?? "",

                        IdentityNo =
                            beneficiary.IdentityNo ?? ""
                    });
            }

            // =====================================================
            // 9. Resolve Trust Plan
            //
            // COMPLETED / EARLY_WITHDRAWN / MATURED:
            // use snapshot.
            //
            // Other statuses:
            // use current tbl_TrustPlan.
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
            // 10. Build model
            // =====================================================

            var model =
                new LetterOfWishesType2DocumentModel
                {
                    ReferencePrefix =
                        basic.ReferencePrefix ?? "",

                    TrustNo =
                        application.TrustID.ToString("D4"),

                    // YEAR = payment approved year
                    Year =
                        application.PaymentApprovedAt.Value
                            .Year
                            .ToString(
                                CultureInfo.InvariantCulture),

                    SettlorFullName =
                        personal.FullName ?? "",

                    SettlorIdentityNo =
                        personal.IdentityNo ?? "",

                    SettlorAddress =
                        BuildSettlorAddress(
                            personal.AddressLine1,
                            personal.AddressLine2),

                    City =
                        personal.City ?? "",

                    Postcode =
                        personal.Postcode ?? "",

                    State =
                        personal.State ?? "",

                    Country =
                        personal.Country ?? "",

                    TrustPlanName =
                        basic.ProductName ?? "",

                    AfterLifetime =
                        BuildAfterLifetimeText(
                            application),

                    MainBeneficiary =
                        mainModel,

                    SubstituteBeneficiaries =
                        substituteModels
                };

            // =====================================================
            // 11. Normal placeholders
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    {
                        "{{REFERENCE_PREFIX}}",
                        model.ReferencePrefix
                    },
                    {
                        "{{TRUST_NO}}",
                        model.TrustNo
                    },
                    {
                        "{{YEAR}}",
                        model.Year
                    },

                    {
                        "{{SETTLOR_FULL_NAME}}",
                        model.SettlorFullName
                    },
                    {
                        "{{SETTLOR_IDENTITY_ID}}",
                        model.SettlorIdentityNo
                    },
                    {
                        "{{SETTLOR_ADDRESS}}",
                        model.SettlorAddress
                    },
                    {
                        "{{CITY}}",
                        model.City
                    },
                    {
                        "{{POSTCODE}}",
                        model.Postcode
                    },
                    {
                        "{{STATE}}",
                        model.State
                    },
                    {
                        "{{COUNTRY}}",
                        model.Country
                    },

                    {
                        "{{TRUST_PLAN_NAME}}",
                        model.TrustPlanName
                    },

                    {
                        "{{AFTER_LIFETIME}}",
                        model.AfterLifetime
                    },

                    {
                        "{{MAIN_BENEFICIAR_RELATIONSHIP}}",
                        model.MainBeneficiary.Relationship
                    },
                    {
                        "{{MAIN_BENEFICIAR_NAME}}",
                        model.MainBeneficiary.Name
                    },
                    {
                        "{{MAIN_BENEFICIAR_IDENTITY_ID}}",
                        model.MainBeneficiary.IdentityNo
                    }
                };

            // =====================================================
            // 12. Template
            // =====================================================

            string templatePath =
                ResolveTemplatePath(
                    template.TemplatePath);

            // =====================================================
            // 13. Replace +
            //     repeat substitute-beneficiary paragraph
            // =====================================================

            byte[] populatedDocx =
                DocxPlaceholderHelper
                    .ReplacePlaceholdersWithType2SubBeneficiaries(
                        templatePath,
                        placeholders,
                        model.SubstituteBeneficiaries);

            // =====================================================
            // 14. PDF
            // =====================================================

            byte[] pdf =
                LibreOfficePdfConverter
                    .ConvertDocxToPdf(
                        populatedDocx);

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
            {
                return "";
            }

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
        // Address 1 + optional Address 2
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