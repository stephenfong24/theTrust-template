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
            if (paragraph == null)
                return;

            foreach (var placeholder in placeholders)
            {
                ReplacePlaceholderInParagraph(
                    paragraph,
                    placeholder.Key,
                    placeholder.Value ?? "");
            }
        }

        private static void ReplacePlaceholderInParagraph(
            Paragraph paragraph,
            string placeholder,
            string replacement)
        {
            if (string.IsNullOrEmpty(placeholder))
                return;

            /*
             * IMPORTANT:
             *
             * Do not combine the whole paragraph and then put the
             * result into the first Text node.
             *
             * That destroys the existing OpenXML run/text structure,
             * especially inside Word/WPS text boxes.
             */

            while (true)
            {
                var texts =
                    paragraph.Descendants<Text>()
                        .ToList();

                if (texts.Count == 0)
                    return;

                string combinedText =
                    string.Concat(
                        texts.Select(x => x.Text ?? ""));

                int placeholderStart =
                    combinedText.IndexOf(
                        placeholder,
                        StringComparison.Ordinal);

                if (placeholderStart < 0)
                    return;

                int placeholderEnd =
                    placeholderStart +
                    placeholder.Length;

                int currentPosition = 0;

                int startTextIndex = -1;
                int endTextIndex = -1;

                int startOffset = 0;
                int endOffset = 0;

                /*
                 * Find which Text node contains the beginning
                 * and ending of the placeholder.
                 */
                for (int i = 0; i < texts.Count; i++)
                {
                    string text =
                        texts[i].Text ?? "";

                    int textStart =
                        currentPosition;

                    int textEnd =
                        currentPosition +
                        text.Length;

                    if (startTextIndex < 0 &&
                        placeholderStart >= textStart &&
                        placeholderStart < textEnd)
                    {
                        startTextIndex = i;

                        startOffset =
                            placeholderStart -
                            textStart;
                    }

                    if (placeholderEnd > textStart &&
                        placeholderEnd <= textEnd)
                    {
                        endTextIndex = i;

                        endOffset =
                            placeholderEnd -
                            textStart;

                        break;
                    }

                    currentPosition = textEnd;
                }

                if (startTextIndex < 0 ||
                    endTextIndex < 0)
                {
                    return;
                }

                // =============================================
                // Placeholder exists in ONE Text node
                // =============================================

                if (startTextIndex == endTextIndex)
                {
                    Text text =
                        texts[startTextIndex];

                    string original =
                        text.Text ?? "";

                    string before =
                        original.Substring(
                            0,
                            startOffset);

                    string after =
                        original.Substring(
                            endOffset);

                    text.Text =
                        before +
                        replacement +
                        after;

                    text.Space =
                        SpaceProcessingModeValues
                            .Preserve;

                    continue;
                }

                // =============================================
                // Placeholder is split across multiple
                // Text nodes / runs
                // =============================================

                Text startText =
                    texts[startTextIndex];

                Text endText =
                    texts[endTextIndex];

                string startOriginal =
                    startText.Text ?? "";

                string endOriginal =
                    endText.Text ?? "";

                string beforePlaceholder =
                    startOriginal.Substring(
                        0,
                        startOffset);

                string afterPlaceholder =
                    endOriginal.Substring(
                        endOffset);

                /*
                 * Put the replacement only into the Text node
                 * where the placeholder started.
                 *
                 * Keep the existing Run/Paragraph structure.
                 */
                startText.Text =
                    beforePlaceholder +
                    replacement;

                startText.Space =
                    SpaceProcessingModeValues
                        .Preserve;

                /*
                 * Clear only the pieces of the placeholder
                 * between start and end.
                 *
                 * We are NOT clearing unrelated Text nodes
                 * from the paragraph.
                 */
                for (int i =
                    startTextIndex + 1;
                    i < endTextIndex;
                    i++)
                {
                    texts[i].Text =
                        string.Empty;
                }

                /*
                 * Preserve anything that existed after the
                 * placeholder in its final Text node.
                 */
                endText.Text =
                    afterPlaceholder;

                endText.Space =
                    SpaceProcessingModeValues
                        .Preserve;
            }
        }
    }
}