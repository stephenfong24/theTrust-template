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
    public class CourierLetterDocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-COURIER-LETTER";

        // =========================================================
        // Can Handle
        // =========================================================

        public bool CanHandle(string documentCode)
        {
            return string.Equals(documentCode, "COURIER_LETTER", StringComparison.OrdinalIgnoreCase);
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

            var personal = await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (personal == null)
            {
                throw new BusinessException("Trust Application personal details not found.", Code);
            }

            // =====================================================
            // 2. Trust Plan
            // =====================================================

            var plan = await db.tbl_TrustPlan.FirstOrDefaultAsync(x => x.ProductCode == application.ProductCode);

            if (plan == null)
            {
                throw new BusinessException("Trust Product configuration not found.", Code);
            }

            // =====================================================
            // 3. Settlor Address
            //
            // Requirement:
            //
            // AddressLine1 only:
            // LOT 45 NO 244
            //
            // AddressLine1 + AddressLine2:
            // LOT 45 NO 244, JALAN WOO SAIK HONG
            //
            // Do NOT include City/Postcode/State/Country here.
            // They have their own placeholders in the DOCX.
            // =====================================================

            string settlorAddress = BuildSettlorAddress(personal.AddressLine1, personal.AddressLine2);

            // =====================================================
            // 4. Placeholder Dictionary
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    {
                        "{{TRUST_NO}}", application.TrustID.ToString("D4")
                    },
                    {
                        "{{SETTLOR_FULL_NAME}}", personal.FullName ?? ""
                    },
                    {
                        "{{SETTLOR_IDENTITY_ID}}", personal.IdentityNo ?? ""
                    },

                    // =================================================
                    // Existing Courier.docx currently contains a typo:
                    //
                    // {{SETTLOR_IDENDITY_NO}}
                    //
                    // Keep this temporarily so the current DOCX still
                    // works. It can be removed after the template has
                    // been corrected to SETTLOR_IDENTITY_ID.
                    // =================================================

                    {
                        "{{SETTLOR_IDENDITY_NO}}", personal.IdentityNo ?? ""
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
                        "{{TRUST_PLAN_NAME}}", plan.ProductName ?? ""
                    }
                };

            // =====================================================
            // 5. Template Path
            // =====================================================

            string templatePath = ResolveTemplatePath(template.TemplatePath);

            // =====================================================
            // 6. Replace DOCX Placeholders
            // =====================================================

            byte[] populatedDocx = DocxPlaceholderHelper.ReplacePlaceholders(templatePath, placeholders);

            // =====================================================
            // 7. Convert DOCX -> PDF
            // =====================================================

            byte[] pdf = LibreOfficePdfConverter.ConvertDocxToPdf(populatedDocx);

            // =====================================================
            // 8. Return
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
        // Build Settlor Address
        // =========================================================
        //
        // AddressLine2 is optional.
        //
        // Examples:
        //
        // AddressLine1:
        // LOT 45 NO 244
        //
        // AddressLine2:
        // JALAN WOO SAIK HONG
        //
        // Result:
        // LOT 45 NO 244, JALAN WOO SAIK HONG
        //
        // If AddressLine2 is empty:
        // LOT 45 NO 244
        //
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

            return address1 + ", " + address2;
        }

        // =========================================================
        // Resolve Template Path
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