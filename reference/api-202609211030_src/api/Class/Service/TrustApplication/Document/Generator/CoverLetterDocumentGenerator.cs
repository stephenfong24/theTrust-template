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
    public class CoverLetterDocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-COVER-LETTER";

        public bool CanHandle(string documentCode)
        {
            return string.Equals(documentCode, "COVER_LETTER", StringComparison.OrdinalIgnoreCase);
        }

        public async Task<GeneratedPdfResult> GenerateAsync(
            Sandbox_BasedEntities db,
            tbl_TrustApplication application,
            tbl_TrustDocument document,
            tbl_TrustDocumentTemplate template,
            long userId)
        {
            if (db == null) throw new ArgumentNullException(nameof(db));
            if (application == null) throw new ArgumentNullException(nameof(application));
            if (document == null) throw new ArgumentNullException(nameof(document));
            if (template == null) throw new ArgumentNullException(nameof(template));

            var personal = await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (personal == null)
                throw new BusinessException("Trust Application personal details not found.", Code);

            var placeholders = new Dictionary<string, string>
            {
                { "{{SETTLOR_FULL_NAME}}", personal.FullName ?? "" },
                { "{{SETTLOR_IDENTITY_ID}}", personal.IdentityNo ?? "" },
                { "{{TRUST_NAME}}", application.TrustName ?? "" },
                { "{{TRUST_ID}}", application.TrustID.ToString("D4") },
                { "{{YEAR}}", DateTime.Now.ToString("yyyy") }
            };

            string relativePath = template.TemplatePath;

            if (string.IsNullOrWhiteSpace(relativePath))
                throw new BusinessException("Document template path is not configured.", Code);

            relativePath = relativePath.Replace("\\", "/").TrimStart('/');
            string templatePath = HttpContext.Current.Server.MapPath("~/" + relativePath);

            if (!File.Exists(templatePath))
                throw new BusinessException("Document template file not found.", Code);

            byte[] populatedDocx = DocxPlaceholderHelper.ReplacePlaceholders(templatePath, placeholders);

            byte[] pdf = LibreOfficePdfConverter.ConvertDocxToPdf(populatedDocx);

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
