using System;
using System.IO;

namespace API_CPX.Class.Helper.Document
{
    public static class DocumentFileNameHelper
    {
        public static string Build(
            string format,
            long trustId,
            string documentCode)
        {
            string fileName = format;

            if (string.IsNullOrWhiteSpace(fileName))
            {
                fileName =
                    documentCode +
                    "_" +
                    trustId.ToString("D4") +
                    ".pdf";
            }

            fileName =
                fileName
                    .Replace(
                        "{{TRUST_ID}}",
                        trustId.ToString("D4"))
                    .Replace(
                        "{TrustID}",
                        trustId.ToString("D4"))
                    .Replace(
                        "{TRUST_ID}",
                        trustId.ToString("D4"))
                    .Replace(
                        "{{TRUST_NO}}",
                        trustId.ToString("D4"))
                    .Replace(
                        "{TrustNo}",
                        trustId.ToString("D4"))
                    .Replace(
                        "{TRUST_NO}",
                        trustId.ToString("D4"))
                    .Replace(
                        "{{DOCUMENT_CODE}}",
                        documentCode ?? "");

            if (!fileName.EndsWith(
                    ".pdf",
                    StringComparison.OrdinalIgnoreCase))
            {
                fileName += ".pdf";
            }

            // Remove characters that Windows does not allow
            // in a file name.
            foreach (char c in Path.GetInvalidFileNameChars())
            {
                fileName =
                    fileName.Replace(c, '_');
            }

            return fileName;
        }
    }
}