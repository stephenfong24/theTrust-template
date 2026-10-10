
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
    public class LetterOfConfirmationAndDisclaimerDocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-LETTER-OF-CONFIRMATION-AND-DISCLAIMER";

        private const string DocumentCode = "LETTER_OF_CONFIRMATION_AND_DISCLAIMER";

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
            // 1. Get Personal Details
            // =====================================================

            var personal = await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (personal == null)
            {
                throw new BusinessException("Trust Application personal details not found.", Code);
            }

            // =====================================================
            // 2. Build Settlor Address
            // =====================================================

            string settlorAddress = DocumentAddressHelper.BuildSettlorAddress(personal.AddressLine1, personal.AddressLine2);

            // =====================================================
            // 3. Placeholder Dictionary
            // =====================================================

            var placeholders = new Dictionary<string, string>
            {
                {
                    "{{SETTLOR_FULL_NAME}}", personal.FullName ?? ""
                },
                {
                    "{{SETTLOR_IDENTITY_ID}}", IdentityDocumentFormatHelper.Format(personal.IdentityType, personal.IdentityNo)
                },
                {
                    "{{SETTLOR_ADDRESS}}", settlorAddress
                },
                {
                    "{{POSTCODE}}", personal.Postcode ?? ""
                },
                {
                    "{{CITY}}", personal.City ?? ""
                },
                {
                    "{{STATE}}", personal.State ?? ""
                },
                {
                    "{{COUNTRY}}", personal.Country ?? ""
                }
            };

            // =====================================================
            // 4. Resolve Template Path
            // =====================================================

            if (string.IsNullOrWhiteSpace(template.TemplatePath))
            {
                throw new BusinessException("Document template path is not configured.", Code);
            }

            string relativePath = template.TemplatePath.Replace("\\", "/").TrimStart('/');

            var httpContext = HttpContext.Current;

            if (httpContext == null)
            {
                throw new BusinessException("HTTP context is not available for document generation.", Code);
            }

            string templatePath = httpContext.Server.MapPath("~/" + relativePath);

            if (!File.Exists(templatePath))
            {
                throw new BusinessException("Document template file not found.", Code);
            }

            // =====================================================
            // 5. Replace DOCX Placeholders
            // =====================================================

            byte[] populatedDocx;

            try
            {
                populatedDocx = DocxPlaceholderHelper.ReplacePlaceholders(templatePath, placeholders);
            }
            catch (Exception ex)
            {
                throw new BusinessException("Letter of Confirmation and Disclaimer " + "placeholder replacement failed. " + ex.Message, Code);
            }

            // =====================================================
            // 6. Convert DOCX to PDF
            // =====================================================

            byte[] pdf;

            try
            {
                pdf = LibreOfficePdfConverter.ConvertDocxToPdf(populatedDocx);
            }
            catch (Exception ex)
            {
                throw new BusinessException("Letter of Confirmation and Disclaimer " + "PDF conversion failed. " + ex.Message, Code);
            }

            if (pdf == null || pdf.Length == 0)
            {
                throw new BusinessException("Generated PDF is empty.", Code);
            }

            // =====================================================
            // 7. Return PDF
            // =====================================================

            return new GeneratedPdfResult
            {
                Content = pdf,
                ContentType = "application/pdf",
                DocumentCode = document.DocumentCode,
                FileName = DocumentFileNameHelper.Build(template.OutputFileNameFormat, application.TrustID, document.DocumentCode)
            };
        }
    }
}
