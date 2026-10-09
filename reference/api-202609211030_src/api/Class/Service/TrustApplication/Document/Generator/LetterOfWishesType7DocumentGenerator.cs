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
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Service.TrustApplication.Document.Generator
{
    public class LetterOfWishesType7DocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-LETTER-OF-WISHES-TYPE-7";

        private const string DocumentCode = "LETTER_WISHES_7";

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
            // 1. Validate Allocation Type
            //
            // Type 7 = 100% held/administered by Trustee.
            // No individual beneficiary is printed in the LOW.
            // =====================================================

            var allocation = await db.tbl_TrustApplication_BeneficiaryAllocation.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (allocation == null)
            {
                throw new BusinessException("Beneficiary allocation information not found.", Code);
            }

            if (allocation.AllocationType != 7)
            {
                throw new BusinessException("Letter of Wishes Type 7 requires Allocation Type 7.", Code);
            }

            // =====================================================
            // 2. Payment Approved Date
            //
            // Reference YEAR must use:
            // tbl_TrustApplication.PaymentApprovedAt
            // =====================================================

            if (!application.PaymentApprovedAt.HasValue)
            {
                throw new BusinessException("Trust Application payment approved date is not available.", Code);
            }

            // =====================================================
            // 3. Personal Detail
            // =====================================================

            var personal =
                await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (personal == null)
            {
                throw new BusinessException("Trust Application personal details not found.", Code);
            }

            // =====================================================
            // 4. Resolve Trust Plan
            //
            // COMPLETED
            // EARLY_WITHDRAWN
            // MATURED
            //
            // => frozen Trust Plan snapshot
            //
            // Other statuses
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
            // 5. Settlor Address
            //
            // AddressLine2 is optional.
            //
            // City/Postcode/State/Country are NOT included because
            // the DOCX already has separate placeholders.
            // =====================================================

            string settlorAddress = BuildSettlorAddress(personal.AddressLine1, personal.AddressLine2);

            // =====================================================
            // 6. After Lifetime
            // =====================================================

            string afterLifetime = BuildAfterLifetimeText(application);

            // =====================================================
            // 7. Placeholder Mapping
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
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
                    }
                };

            // =====================================================
            // 8. Resolve Template
            // =====================================================

            string templatePath = ResolveTemplatePath(template.TemplatePath);

            // =====================================================
            // 9. Replace Placeholders
            //
            // Type 7 has no repeating beneficiary block.
            // =====================================================

            byte[] populatedDocx = DocxPlaceholderHelper.ReplacePlaceholders(templatePath, placeholders);

            // =====================================================
            // 10. DOCX -> PDF
            // =====================================================

            byte[] pdf = LibreOfficePdfConverter.ConvertDocxToPdf(populatedDocx);

            // =====================================================
            // 11. Result
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
        // Settlor Address
        //
        // Address 1:
        //   10, Jalan ABC
        //
        // Address 2:
        //   Taman ABC
        //
        // Result:
        //   10, Jalan ABC,
        //   Taman ABC
        //
        // If Address 2 empty:
        //   10, Jalan ABC
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

            return string.Join(", ", items.GetRange(0, items.Count - 1)) + " and " + items[items.Count - 1];
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