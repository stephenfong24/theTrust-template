using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace API_CPX.Class.Helper.Document
{
    public static class DocxPlaceholderHelper
    {
        public static byte[] ReplacePlaceholders(
            string templatePath,
            IDictionary<string, string> placeholders)
        {
            if (string.IsNullOrWhiteSpace(templatePath))
            {
                throw new ArgumentException(
                    "Template path is required.",
                    nameof(templatePath));
            }

            if (!File.Exists(templatePath))
            {
                throw new FileNotFoundException(
                    "DOCX template was not found.",
                    templatePath);
            }

            if (placeholders == null)
            {
                throw new ArgumentNullException(
                    nameof(placeholders));
            }

            byte[] documentBytes =
                File.ReadAllBytes(templatePath);

            using (var stream = new MemoryStream())
            {
                stream.Write(
                    documentBytes,
                    0,
                    documentBytes.Length);

                stream.Position = 0;

                using (var document =
                    WordprocessingDocument.Open(
                        stream,
                        true))
                {
                    ReplaceInPart(
                        document.MainDocumentPart,
                        placeholders);

                    foreach (var headerPart
                        in document.MainDocumentPart.HeaderParts)
                    {
                        ReplaceInPart(
                            headerPart,
                            placeholders);
                    }

                    foreach (var footerPart
                        in document.MainDocumentPart.FooterParts)
                    {
                        ReplaceInPart(
                            footerPart,
                            placeholders);
                    }

                    document.MainDocumentPart
                        .Document
                        .Save();
                }

                return stream.ToArray();
            }
        }

        private static void ReplaceInPart(
            OpenXmlPart part,
            IDictionary<string, string> placeholders)
        {
            if (part == null)
                return;

            OpenXmlElement root = null;

            var mainPart =
                part as MainDocumentPart;

            if (mainPart != null)
            {
                root = mainPart.Document;
            }

            var headerPart =
                part as HeaderPart;

            if (headerPart != null)
            {
                root = headerPart.Header;
            }

            var footerPart =
                part as FooterPart;

            if (footerPart != null)
            {
                root = footerPart.Footer;
            }

            if (root == null)
                return;

            var paragraphs =
                root.Descendants<Paragraph>()
                    .ToList();

            foreach (var paragraph in paragraphs)
            {
                ReplaceInParagraph(
                    paragraph,
                    placeholders);
            }
        }

        private static void ReplaceInParagraph(
            Paragraph paragraph,
            IDictionary<string, string> placeholders)
        {
            var texts =
                paragraph.Descendants<Text>()
                    .ToList();

            if (texts.Count == 0)
                return;

            string combinedText =
                string.Concat(
                    texts.Select(x => x.Text));

            if (string.IsNullOrEmpty(combinedText))
                return;

            string replacedText =
                combinedText;

            bool changed = false;

            foreach (var placeholder in placeholders)
            {
                if (replacedText.Contains(
                    placeholder.Key))
                {
                    replacedText =
                        replacedText.Replace(
                            placeholder.Key,
                            placeholder.Value ?? "");

                    changed = true;
                }
            }

            if (!changed)
                return;

            /*
             * Preserve the formatting of the first run.
             *
             * The text may originally be split across several
             * Word runs. We put the final text into the first
             * Text node and clear the remaining Text nodes.
             */

            texts[0].Text = replacedText;

            texts[0].Space =
                DocumentFormat.OpenXml.SpaceProcessingModeValues
                    .Preserve;

            for (int i = 1; i < texts.Count; i++)
            {
                texts[i].Text = string.Empty;
            }
        }
    }
}