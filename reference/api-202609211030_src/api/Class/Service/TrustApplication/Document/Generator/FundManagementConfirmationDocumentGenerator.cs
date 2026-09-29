using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper.Document;
using API_CPX.Class.Model.DTO.Document;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.IO;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Service.TrustApplication.Document.Generator
{
    public class FundManagementConfirmationDocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-FUND-MANAGEMENT-CONFIRMATION";

        // =========================================================
        // Can Handle
        // =========================================================

        public bool CanHandle(string documentCode)
        {
            return string.Equals(documentCode, "FUND_MANAGEMENT_CONFIRMATION", StringComparison.OrdinalIgnoreCase);
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
            // 1. Personal Detail
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
            // 2. Trust Plan
            // =====================================================

            var plan =
                await db.tbl_TrustPlan
                    .FirstOrDefaultAsync(
                        x =>
                            x.ProductCode ==
                            application.ProductCode);

            if (plan == null)
            {
                throw new BusinessException(
                    "Trust Product configuration not found.",
                    Code);
            }

            // =====================================================
            // 3. Validate Commencement Date
            // =====================================================

            if (!application.CommencementDate.HasValue)
            {
                throw new BusinessException(
                    "Trust Application commencement date is not available.",
                    Code);
            }

            // =====================================================
            // 4. Validate Maturity Date
            // =====================================================

            if (!application.MaturityDate.HasValue)
            {
                throw new BusinessException(
                    "Trust Application maturity date is not available.",
                    Code);
            }

            // =====================================================
            // 5. Build Settlor Address
            // =====================================================
            //
            // Requirement:
            //
            // AddressLine1 = required/main address
            // AddressLine2 = optional
            //
            // AddressLine2 empty:
            //   LOT 45 NO 244, JALAN WOO SAIK HONG
            //
            // AddressLine2 exists:
            //   LOT 45 NO 244, JALAN WOO SAIK HONG,
            //   TELUK INTAN
            //
            // The DOCX has one {{SETTLOR_ADDRESS}} placeholder,
            // therefore we return the combined value.
            // =====================================================

            string settlorAddress =
                BuildSettlorAddress(
                    personal.AddressLine1,
                    personal.AddressLine2);

            // =====================================================
            // 6. Placeholder Dictionary
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    {
                        "{{TRUST_NO}}",
                        application.TrustID.ToString("D4")
                    },

                    {
                        "{{COMMENCE_DATE}}",
                        application.CommencementDate.Value
                            .ToString("dd/MM/yyyy")
                    },

                    {
                        "{{SETTLOR_FULL_NAME}}",
                        personal.FullName ?? ""
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

                    {
                        "{{TRUST_PLAN_NAME}}",
                        plan.ProductName ?? ""
                    },

                    {
                        "{{MATURITY_DATE}}",
                        application.MaturityDate.Value
                            .ToString("dd/MM/yyyy")
                    }
                };

            // =====================================================
            // 7. Resolve Template
            // =====================================================

            string templatePath =
                ResolveTemplatePath(
                    template.TemplatePath);

            // =====================================================
            // 8. Replace DOCX Placeholders
            // =====================================================

            byte[] populatedDocx =
                DocxPlaceholderHelper
                    .ReplacePlaceholders(
                        templatePath,
                        placeholders);

            // =====================================================
            // 9. Convert DOCX -> PDF
            // =====================================================

            byte[] pdf =
                LibreOfficePdfConverter
                    .ConvertDocxToPdf(
                        populatedDocx);

            // =====================================================
            // 10. Return PDF
            // =====================================================

            return new GeneratedPdfResult
            {
                Content = pdf,

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
        // Build Settlor Address
        // =========================================================

        private static string BuildSettlorAddress(
            string addressLine1,
            string addressLine2)
        {
            string address1 =
                (addressLine1 ?? "").Trim();

            string address2 =
                (addressLine2 ?? "").Trim();

            // Address 2 does not exist.
            // Do NOT append comma or line break.
            if (string.IsNullOrWhiteSpace(address2))
            {
                return address1;
            }

            // Address 2 exists.
            // Add comma after Address 1 and put Address 2
            // on the next line.
            if (string.IsNullOrWhiteSpace(address1))
            {
                return address2;
            }

            return address1.TrimEnd(',') +
                   "," +
                   Environment.NewLine +
                   address2;
        }

        // =========================================================
        // Resolve Template Path
        // =========================================================

        private static string ResolveTemplatePath(
            string relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
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