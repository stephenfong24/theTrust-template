using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace API_CPX.Class.Helper.Document
{
    public static class XlsxPlaceholderHelper
    {
        public static byte[] ReplacePlaceholders(string templatePath, IDictionary<string, string> placeholders)
        {
            if (string.IsNullOrWhiteSpace(templatePath))
                throw new ArgumentException("Template path is required.", nameof(templatePath));

            if (!File.Exists(templatePath))
                throw new FileNotFoundException("Excel template not found.", templatePath);

            byte[] bytes = File.ReadAllBytes(templatePath);

            using (var stream = new MemoryStream())
            {
                stream.Write(bytes, 0, bytes.Length);
                stream.Position = 0;

                using (var document = SpreadsheetDocument.Open(stream, true))
                {
                    ReplaceSharedStrings(document, placeholders);
                    ReplaceInlineStrings(document, placeholders);
                    document.WorkbookPart.Workbook.Save();
                }

                return stream.ToArray();
            }
        }

        private static void ReplaceSharedStrings(SpreadsheetDocument document, IDictionary<string, string> placeholders)
        {
            var part = document.WorkbookPart.SharedStringTablePart;

            if (part == null || part.SharedStringTable == null)
            {
                return;
            }

            foreach (var text in part.SharedStringTable.Descendants<Text>())
            {
                text.Text = Replace(text.Text, placeholders);
            }

            part.SharedStringTable.Save();
        }

        private static void ReplaceInlineStrings(SpreadsheetDocument document, IDictionary<string, string> placeholders)
        {
            foreach (var worksheetPart in document.WorkbookPart.WorksheetParts)
            {
                foreach (var text in worksheetPart.Worksheet.Descendants<Text>())
                {
                    text.Text = Replace(text.Text, placeholders);
                }

                worksheetPart.Worksheet.Save();
            }
        }

        private static string Replace(string value, IDictionary<string, string> placeholders)
        {
            if (string.IsNullOrEmpty(value))
                return value;

            foreach (var item in placeholders)
            {
                value =
                    value.Replace(item.Key,  item.Value ?? "");
            }

            return value;
        }
    }
}