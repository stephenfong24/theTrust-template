using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper.Document;
using API_CPX.Class.Model.DTO.Document;
using API_CPX.Class.Model.TrustPlan;
using API_CPX.Class.Service.TrustApplication.Snapshot;
using API_CPX.Context;
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
    public class LetterOfWishesType5DocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-LETTER-OF-WISHES-TYPE-5";
        private const string DocumentCode = "LETTER_WISHES_5";

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
                throw new ArgumentNullException(nameof(db));

            if (application == null)
                throw new ArgumentNullException(nameof(application));

            if (document == null)
                throw new ArgumentNullException(nameof(document));

            if (template == null)
                throw new ArgumentNullException(nameof(template));

            // =====================================================
            // 1. Validate Payment Approved Date
            //
            // Reference YEAR must use PaymentApprovedAt.
            // =====================================================

            if (!application.PaymentApprovedAt.HasValue)
            {
                throw new BusinessException("Trust Application payment approved date is not available.", Code);
            }

            // =====================================================
            // 2. Personal Detail
            // =====================================================

            var personal =
                await db.tbl_TrustApplication_PersonalDetail
                    .FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (personal == null)
            {
                throw new BusinessException("Trust Application personal details not found.", Code);
            }

            // =====================================================
            // 3. Type 5 Allocation
            // =====================================================

            var allocation =
                await db.tbl_TrustApplication_BeneficiaryAllocation
                    .FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (allocation == null)
            {
                throw new BusinessException("Beneficiary allocation information not found.", Code);
            }

            if (allocation.AllocationType != 5)
            {
                throw new BusinessException("Letter of Wishes Type 5 requires Allocation Type 5.", Code);
            }

            // =====================================================
            // 4. Type 5 Allocation Details
            //
            // IMPORTANT:
            //
            // Type 5:
            // - multiple MAIN beneficiaries
            // - equal shares
            // - no SUBSTITUTE
            // - no percentage
            //
            // Although DOCX uses SUB_BENEFICIAR_* placeholders,
            // these placeholders represent the Type 5 MAIN
            // beneficiaries.
            // =====================================================

            var allocationDetails =
                await db
                    .tbl_TrustApplication_BeneficiaryAllocationDetail
                    .Where(x => x.AllocationID == allocation.RowID)
                    .OrderBy(x => x.RowID)
                    .ToListAsync();

            var beneficiaryAllocations =
                allocationDetails
                    .Where(x => string.Equals(x.RoleType, "MAIN", StringComparison.OrdinalIgnoreCase) && x.BeneficiaryID.HasValue && !x.IsTrusteeCompany)
                    .ToList();

            if (!beneficiaryAllocations.Any())
            {
                throw new BusinessException("Allocation Type 5 beneficiary information not found.", Code);
            }

            // =====================================================
            // 5. Beneficiary Records
            // =====================================================

            var beneficiaryIds =
                beneficiaryAllocations
                    .Select(x => x.BeneficiaryID.Value)
                    .Distinct()
                    .ToList();

            var beneficiaries =
                await db.tbl_TrustApplication_Beneficiary
                    .Where(x => x.TrustApplicationID == application.RowID && x.IsActive && beneficiaryIds.Contains(x.RowID))
                    .ToListAsync();

            if (beneficiaries.Count != beneficiaryIds.Count)
            {
                throw new BusinessException("One or more Allocation Type 5 beneficiaries could not be found.", Code);
            }

            // =====================================================
            // 6. Relationship Master
            // =====================================================

            var relationshipCodes =
                beneficiaries
                    .Where(x => !string.IsNullOrWhiteSpace(x.RelationshipCode))
                    .Select(x => x.RelationshipCode)
                    .Distinct()
                    .ToList();

            var relationships =
                await db.tbl_Relationship
                    .Where(x => relationshipCodes.Contains(x.Relationship_Code) && x.Status == 0)
                    .ToListAsync();

            // =====================================================
            // 7. Build Beneficiary Models
            //
            // Preserve allocation detail order.
            // =====================================================

            var beneficiaryModels = new List<LetterOfWishesType5BeneficiaryDocumentModel>();

            foreach (var detail in beneficiaryAllocations)
            {
                var beneficiary = beneficiaries.FirstOrDefault(x => x.RowID == detail.BeneficiaryID.Value);

                if (beneficiary == null)
                {
                    throw new BusinessException("Allocation Type 5 beneficiary information not found.", Code);
                }

                beneficiaryModels.Add(
                    new LetterOfWishesType5BeneficiaryDocumentModel
                    {
                        BeneficiaryID = beneficiary.RowID,
                        Relationship = ResolveRelationship(beneficiary, relationships),
                        Name = beneficiary.FullName ?? "",
                        IdentityNo = beneficiary.IdentityNo ?? ""
                    });
            }

            // =====================================================
            // 8. Resolve Trust Plan
            //
            // COMPLETED / EARLY_WITHDRAWN / MATURED:
            //     use frozen snapshot.
            //
            // Other statuses:
            //     use current Trust Plan.
            //
            // ReferencePrefix and ProductName must come from
            // this SAME resolved plan source.
            // =====================================================

            TrustPlanDetailsResponse planDetails;

            if (IsSnapshotStatus(application.ApplicationStatus))
            {
                var snapshotService = new TrustApplicationPlanSnapshotServiceAsync();
                planDetails = await snapshotService.GetSnapshotConfigurationAsync(db, application.RowID);

                if (planDetails == null || planDetails.Steps == null)
                {
                    throw new BusinessException("Trust Application Plan Snapshot configuration is invalid.", Code);
                }
            }
            else
            {
                var trustPlanService = new API_CPX.Services.TrustPlan.TrustPlanServiceAsync();
                planDetails = await trustPlanService.GetTrustProductDetailsAsync(application.ProductCode, application.MerchantID);

                if (planDetails == null || planDetails.Steps == null)
                {
                    throw new BusinessException("Trust Product configuration not found.", Code);
                }
            }

            var basic = planDetails.Steps.Step1BasicInformation;

            if (basic == null)
            {
                throw new BusinessException("Trust Plan basic configuration is not available.", Code);
            }

            // =====================================================
            // 9. Settlor Address
            // =====================================================

            string settlorAddress = BuildSettlorAddress(personal.AddressLine1, personal.AddressLine2);

            // =====================================================
            // 10. After My Lifetime
            // =====================================================

            string afterLifetime = BuildAfterLifetimeText(application);

            // =====================================================
            // 11. Normal Placeholders
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    {
                        "{{REFERENCE_PREFIX}}", basic.ReferencePrefix ?? ""
                    },
                    {
                        "{{TRUST_NO}}", application.TrustID.ToString("D4")
                    },
                    {
                        "{{YEAR}}", application.PaymentApprovedAt.Value.Year.ToString(CultureInfo.InvariantCulture)
                    },
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
                    {
                        "{{TRUST_PLAN_NAME}}", basic.ProductName ?? ""
                    },
                    {
                        "{{AFTER_LIFETIME}}", afterLifetime
                    }
                };

            // =====================================================
            // 12. Resolve Template
            // =====================================================

            string templatePath = ResolveTemplatePath(template.TemplatePath);

            // =====================================================
            // 13. Replace normal placeholders +
            //     repeat beneficiary paragraph
            // =====================================================

            byte[] populatedDocx = DocxPlaceholderHelper.ReplacePlaceholdersWithType5Beneficiaries(templatePath, placeholders, beneficiaryModels);

            // =====================================================
            // 14. Convert DOCX -> PDF
            // =====================================================

            byte[] pdf = LibreOfficePdfConverter.ConvertDocxToPdf(populatedDocx);

            // =====================================================
            // 15. Result
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
                return "";

            if (string.Equals(beneficiary.RelationshipCode, "OTHER", StringComparison.OrdinalIgnoreCase))
            {
                return beneficiary.OtherRelationship ?? "";
            }

            var relationship =
                relationships.FirstOrDefault(x => string.Equals(x.Relationship_Code, beneficiary.RelationshipCode, StringComparison.OrdinalIgnoreCase));

            return relationship != null ? relationship.Relationship_Name ?? "" : beneficiary.RelationshipCode ?? "";
        }

        // =========================================================
        // After My Lifetime
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

            return string.Join(", ", items.Take(items.Count - 1)) + " and " + items.Last();
        }

        // =========================================================
        // Settlor Address
        //
        // AddressLine2 is optional.
        //
        // Do not include City/Postcode/State/Country because the
        // DOCX already has separate placeholders for them.
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

            // Follow the existing document generator formatting.
            return address1.TrimEnd(',') + "," + Environment.NewLine + address2;
        }

        // =========================================================
        // Snapshot statuses
        // =========================================================

        private static bool IsSnapshotStatus(string applicationStatus)
        {
            string status = (applicationStatus ?? "").Trim().ToUpperInvariant();
            return status == "COMPLETED" || status == "EARLY_WITHDRAWN" || status == "MATURED";
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