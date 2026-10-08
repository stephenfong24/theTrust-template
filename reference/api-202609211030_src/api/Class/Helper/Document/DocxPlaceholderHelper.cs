using API_CPX.Class.Model.DTO.Document;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;

namespace API_CPX.Class.Helper.Document
{
    public static class DocxPlaceholderHelper
    {
        public static byte[] ReplacePlaceholders(string templatePath, IDictionary<string, string> placeholders)
        {
            if (string.IsNullOrWhiteSpace(templatePath))
            {
                throw new ArgumentException("Template path is required.", nameof(templatePath));
            }

            if (!File.Exists(templatePath))
            {
                throw new FileNotFoundException("DOCX template was not found.", templatePath);
            }

            if (placeholders == null)
            {
                throw new ArgumentNullException(nameof(placeholders));
            }

            byte[] documentBytes = File.ReadAllBytes(templatePath);

            using (var stream = new MemoryStream())
            {
                stream.Write(documentBytes, 0, documentBytes.Length);
                stream.Position = 0;

                using (var document = WordprocessingDocument.Open(stream, true))
                {
                    ReplaceInPart(document.MainDocumentPart, placeholders);

                    foreach (var headerPart in document.MainDocumentPart.HeaderParts)
                    {
                        ReplaceInPart(headerPart, placeholders);
                    }

                    foreach (var footerPart in document.MainDocumentPart.FooterParts)
                    {
                        ReplaceInPart(footerPart, placeholders);
                    }

                    document.MainDocumentPart.Document.Save();
                }

                return stream.ToArray();
            }
        }

        private static void ReplaceInPart(OpenXmlPart part, IDictionary<string, string> placeholders)
        {
            if (part == null)
                return;

            OpenXmlElement root = null;

            var mainPart = part as MainDocumentPart;

            if (mainPart != null)
            {
                root = mainPart.Document;
            }

            var headerPart = part as HeaderPart;

            if (headerPart != null)
            {
                root = headerPart.Header;
            }

            var footerPart = part as FooterPart;

            if (footerPart != null)
            {
                root = footerPart.Footer;
            }

            if (root == null)
                return;

            var paragraphs = root.Descendants<Paragraph>().ToList();

            foreach (var paragraph in paragraphs)
            {
                ReplaceInParagraph(paragraph, placeholders);
            }
        }

        private static void ReplaceInParagraph(Paragraph paragraph, IDictionary<string, string> placeholders)
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

        private static void ReplacePlaceholderInParagraph(Paragraph paragraph, string placeholder, string replacement)
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
                var texts = paragraph.Descendants<Text>().ToList();

                if (texts.Count == 0)
                    return;

                string combinedText = string.Concat(texts.Select(x => x.Text ?? ""));

                int placeholderStart = combinedText.IndexOf(placeholder, StringComparison.Ordinal);

                if (placeholderStart < 0)
                    return;

                int placeholderEnd = placeholderStart + placeholder.Length;
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
                    string text = texts[i].Text ?? "";

                    int textStart = currentPosition;
                    int textEnd = currentPosition + text.Length;

                    if (startTextIndex < 0 && placeholderStart >= textStart && placeholderStart < textEnd)
                    {
                        startTextIndex = i;
                        startOffset = placeholderStart - textStart;
                    }

                    if (placeholderEnd > textStart && placeholderEnd <= textEnd)
                    {
                        endTextIndex = i;
                        endOffset = placeholderEnd - textStart;
                        break;
                    }

                    currentPosition = textEnd;
                }

                if (startTextIndex < 0 || endTextIndex < 0)
                {
                    return;
                }

                // =============================================
                // Placeholder exists in ONE Text node
                // =============================================

                if (startTextIndex == endTextIndex)
                {
                    Text text = texts[startTextIndex];

                    string original = text.Text ?? "";
                    string before = original.Substring(0, startOffset);
                    string after = original.Substring(endOffset);

                    text.Text = before + replacement + after;
                    text.Space = SpaceProcessingModeValues.Preserve;
                    continue;
                }

                // =============================================
                // Placeholder is split across multiple
                // Text nodes / runs
                // =============================================

                Text startText = texts[startTextIndex];
                Text endText = texts[endTextIndex];

                string startOriginal = startText.Text ?? "";
                string endOriginal = endText.Text ?? "";
                string beforePlaceholder = startOriginal.Substring(0, startOffset);
                string afterPlaceholder = endOriginal.Substring(endOffset);

                /*
                 * Put the replacement only into the Text node
                 * where the placeholder started.
                 *
                 * Keep the existing Run/Paragraph structure.
                 */
                startText.Text = beforePlaceholder + replacement;
                startText.Space = SpaceProcessingModeValues.Preserve;

                /*
                 * Clear only the pieces of the placeholder
                 * between start and end.
                 *
                 * We are NOT clearing unrelated Text nodes
                 * from the paragraph.
                 */
                for (int i = startTextIndex + 1; i < endTextIndex; i++)
                {
                    texts[i].Text = string.Empty;
                }

                /*
                 * Preserve anything that existed after the
                 * placeholder in its final Text node.
                 */
                endText.Text = afterPlaceholder;
                endText.Space = SpaceProcessingModeValues.Preserve;
            }
        }

        public static byte[] ReplacePlaceholdersWithBeneficiaries(string templatePath, IDictionary<string, string> placeholders, IList<TrustDeedBeneficiaryDocumentModel> beneficiaries)
        {
            if (string.IsNullOrWhiteSpace(templatePath))
            {
                throw new ArgumentException("Template path is required.", nameof(templatePath));
            }

            if (!File.Exists(templatePath))
            {
                throw new FileNotFoundException("DOCX template was not found.", templatePath);
            }

            if (placeholders == null)
            {
                throw new ArgumentNullException(nameof(placeholders));
            }

            byte[] documentBytes = File.ReadAllBytes(templatePath);

            using (var stream = new MemoryStream())
            {
                stream.Write(documentBytes, 0, documentBytes.Length);
                stream.Position = 0;

                using (var document = WordprocessingDocument.Open(stream, true))
                {
                    // ---------------------------------------------
                    // Normal placeholders
                    // ---------------------------------------------

                    ReplaceInPart(document.MainDocumentPart, placeholders);

                    foreach (var headerPart in document.MainDocumentPart.HeaderParts)
                    {
                        ReplaceInPart(headerPart, placeholders);
                    }

                    foreach (var footerPart in document.MainDocumentPart.FooterParts)
                    {
                        ReplaceInPart(footerPart, placeholders);
                    }

                    // ---------------------------------------------
                    // Schedule 3 beneficiary repeating rows
                    // ---------------------------------------------

                    ReplaceBeneficiaryRows(document.MainDocumentPart, beneficiaries);
                    document.MainDocumentPart.Document.Save();
                }

                return stream.ToArray();
            }
        }

        private static void ReplaceBeneficiaryRows(MainDocumentPart mainPart, IList<TrustDeedBeneficiaryDocumentModel> beneficiaries)
        {
            if (mainPart == null)
                return;

            if (beneficiaries == null)
                beneficiaries = new List<TrustDeedBeneficiaryDocumentModel>();

            var rows = mainPart.Document.Body.Descendants<TableRow>().ToList();

            TableRow templateRow = null;

            foreach (var row in rows)
            {
                string rowText = string.Concat(row.Descendants<Text>().Select(x => x.Text));

                if (rowText.Contains("{{NO}}"))
                {
                    templateRow = row;
                    break;
                }
            }

            if (templateRow == null)
            {
                throw new InvalidOperationException("Beneficiary template row was not found in the Trust Deed template.");
            }

            foreach (var beneficiary in beneficiaries)
            {
                var newRow = (TableRow)templateRow.CloneNode(true);

                var rowPlaceholders =
                    new Dictionary<string, string>
                    {
                        {
                            "{{NO}}", beneficiary.No.ToString()
                        },
                        {
                            "{{BENEFICIARY_NAME}}", beneficiary.Name ?? ""
                        },
                        {
                            "{{BENEFICIARY_ID}}", beneficiary.IdentityNo ?? ""
                        },
                        {
                            "{{BENEFICIARY_ADDRESS}}", beneficiary.Address ?? ""
                        },
                        {
                            "{{BENEFICIARY_RELATIONSHIP}}", beneficiary.Relationship ?? ""
                        }
                    };

                ReplaceInRow(newRow, rowPlaceholders);
                templateRow.InsertBeforeSelf(newRow);
            }

            templateRow.Remove();
        }

        private static void ReplaceInRow(TableRow row, IDictionary<string, string> placeholders)
        {
            var paragraphs = row.Descendants<Paragraph>().ToList();

            foreach (var paragraph in paragraphs)
            {
                ReplaceInParagraph(paragraph, placeholders);
            }
        }

        public static byte[] ReplacePlaceholdersWithSubBeneficiaries(
            string templatePath,
            IDictionary<string, string> placeholders,
            IList<LetterOfWishesType3BeneficiaryDocumentModel> beneficiaries)
        {
            if (string.IsNullOrWhiteSpace(templatePath))
            {
                throw new ArgumentException("Template path is required.", nameof(templatePath));
            }

            if (!File.Exists(templatePath))
            {
                throw new FileNotFoundException("DOCX template was not found.", templatePath);
            }

            if (placeholders == null)
            {
                throw new ArgumentNullException(nameof(placeholders));
            }

            if (beneficiaries == null)
            {
                beneficiaries = new List<LetterOfWishesType3BeneficiaryDocumentModel>();
            }

            byte[] documentBytes = File.ReadAllBytes(templatePath);

            using (var stream = new MemoryStream())
            {
                stream.Write(documentBytes, 0, documentBytes.Length);
                stream.Position = 0;

                using (var document = WordprocessingDocument.Open(stream, true))
                {
                    // =====================================================
                    // Normal placeholders
                    // =====================================================

                    ReplaceInPart(document.MainDocumentPart, placeholders);

                    foreach (var headerPart in document.MainDocumentPart.HeaderParts)
                    {
                        ReplaceInPart(headerPart, placeholders);
                    }

                    foreach (var footerPart in document.MainDocumentPart.FooterParts)
                    {
                        ReplaceInPart(footerPart, placeholders);
                    }

                    // =====================================================
                    // Repeat substitute beneficiary paragraph
                    // =====================================================

                    ReplaceSubBeneficiaryParagraphs(document.MainDocumentPart, beneficiaries);
                    document.MainDocumentPart.Document.Save();
                }

                return stream.ToArray();
            }
        }

        private static void ReplaceSubBeneficiaryParagraphs(MainDocumentPart mainPart, IList<LetterOfWishesType3BeneficiaryDocumentModel> beneficiaries)
        {
            if (mainPart == null)
                return;

            if (beneficiaries == null)
            {
                beneficiaries = new List<LetterOfWishesType3BeneficiaryDocumentModel>();
            }

            var paragraphs = mainPart.Document.Body.Descendants<Paragraph>().ToList();
            Paragraph templateParagraph = null;

            foreach (var paragraph in paragraphs)
            {
                string paragraphText = string.Concat(paragraph.Descendants<Text>().Select(x => x.Text));

                if (paragraphText.Contains("{{SUB_BENEFICIAR_NAME}}"))
                {
                    templateParagraph = paragraph;
                    break;
                }
            }

            if (templateParagraph == null)
            {
                throw new InvalidOperationException("Substitute Beneficiary template paragraph was not found in the Letter of Wishes Type 3 template.");
            }

            foreach (var beneficiary in beneficiaries)
            {
                var newParagraph = (Paragraph)templateParagraph.CloneNode(true);

                var beneficiaryPlaceholders =
                    new Dictionary<string, string>
                    {
                        {
                            "{{SUB_BENEFICIAR_RELATIONSHIP}}", beneficiary.Relationship ?? ""
                        },
                        {
                            "{{SUB_BENEFICIAR_NAME}}", beneficiary.Name ?? ""
                        },
                        {
                            "{{SUB_BENEFICIAR_IDENTITY_ID}}", beneficiary.IdentityNo ?? ""
                        },
                        {
                            "{{SUB_BENEFICIAR_SHARE_ALLOCATED}}", FormatAllocationPercentage(beneficiary.AllocationPercentage)
                        }
                    };

                var newParagraphs = new List<Paragraph> { newParagraph };

                foreach (var paragraph in newParagraphs)
                {
                    ReplaceInParagraph(paragraph, beneficiaryPlaceholders);
                }

                templateParagraph.InsertBeforeSelf(newParagraph);
            }

            // Remove original template paragraph containing placeholders
            templateParagraph.Remove();
        }

        public static byte[] ReplacePlaceholdersWithType5Beneficiaries(string templatePath, IDictionary<string, string> placeholders, IList<LetterOfWishesType5BeneficiaryDocumentModel> beneficiaries)
        {
            if (string.IsNullOrWhiteSpace(templatePath))
            {
                throw new ArgumentException("Template path is required.", nameof(templatePath));
            }

            if (!File.Exists(templatePath))
            {
                throw new FileNotFoundException("DOCX template was not found.", templatePath);
            }

            if (placeholders == null)
            {
                throw new ArgumentNullException(nameof(placeholders));
            }

            beneficiaries = beneficiaries ?? new List<LetterOfWishesType5BeneficiaryDocumentModel>();
            byte[] documentBytes = File.ReadAllBytes(templatePath);

            using (var stream = new MemoryStream())
            {
                stream.Write(documentBytes, 0, documentBytes.Length);
                stream.Position = 0;

                using (var document = WordprocessingDocument.Open(stream, true))
                {
                    // Normal placeholders
                    ReplaceInPart(document.MainDocumentPart, placeholders);

                    foreach (var headerPart in document.MainDocumentPart.HeaderParts)
                    {
                        ReplaceInPart(headerPart, placeholders);
                    }

                    foreach (var footerPart in document.MainDocumentPart.FooterParts)
                    {
                        ReplaceInPart(footerPart, placeholders);
                    }

                    // Repeat Type 5 beneficiary paragraph
                    ReplaceType5BeneficiaryParagraphs(document.MainDocumentPart, beneficiaries);
                    document.MainDocumentPart.Document.Save();
                }

                return stream.ToArray();
            }
        }

        private static void ReplaceType5BeneficiaryParagraphs(MainDocumentPart mainPart, IList<LetterOfWishesType5BeneficiaryDocumentModel> beneficiaries)
        {
            if (mainPart == null || mainPart.Document == null || mainPart.Document.Body == null)
            {
                return;
            }

            var paragraphs = mainPart.Document.Body.Descendants<Paragraph>().ToList();

            Paragraph templateParagraph =
                paragraphs.FirstOrDefault(
                    paragraph =>
                    {
                        string text = string.Concat(paragraph.Descendants<Text>().Select(x => x.Text ?? ""));
                        return text.Contains("{{SUB_BENEFICIAR_NAME}}");
                    });

            if (templateParagraph == null)
            {
                throw new InvalidOperationException("Type 5 beneficiary template paragraph was not found.");
            }

            foreach (var beneficiary in beneficiaries)
            {
                var newParagraph = (Paragraph)templateParagraph.CloneNode(true);

                var beneficiaryPlaceholders =
                    new Dictionary<string, string>
                    {
                        {
                            "{{SUB_BENEFICIAR_RELATIONSHIP}}", beneficiary.Relationship ?? ""
                        },
                        {
                            "{{SUB_BENEFICIAR_NAME}}", beneficiary.Name ?? ""
                        },
                        {
                            "{{SUB_BENEFICIAR_IDENTITY_ID}}", beneficiary.IdentityNo ?? ""
                        }
                    };

                ReplaceInParagraph(newParagraph, beneficiaryPlaceholders);
                templateParagraph.InsertBeforeSelf(newParagraph);
            }

            // Remove original placeholder paragraph.
            templateParagraph.Remove();
        }

        public static byte[] ReplacePlaceholdersWithType2SubBeneficiaries(
            string templatePath,
            IDictionary<string, string> placeholders,
            IList<LetterOfWishesType2BeneficiaryDocumentModel> beneficiaries)
        {
            if (string.IsNullOrWhiteSpace(templatePath))
            {
                throw new ArgumentException("Template path is required.", nameof(templatePath));
            }

            if (!File.Exists(templatePath))
            {
                throw new FileNotFoundException("DOCX template was not found.", templatePath);
            }

            if (placeholders == null)
            {
                throw new ArgumentNullException(nameof(placeholders));
            }

            beneficiaries = beneficiaries ?? new List<LetterOfWishesType2BeneficiaryDocumentModel>();

            byte[] documentBytes = File.ReadAllBytes(templatePath);

            using (var stream = new MemoryStream())
            {
                stream.Write(documentBytes, 0, documentBytes.Length);
                stream.Position = 0;

                using (var document = WordprocessingDocument.Open(stream, true))
                {
                    // =====================================================
                    // IMPORTANT:
                    // Repeat the SUB paragraph BEFORE normal replacement.
                    //
                    // Otherwise normal replacement may alter/remove the
                    // SUB placeholder paragraph before we can find it.
                    // =====================================================

                    ReplaceType2SubBeneficiaryParagraphs(document.MainDocumentPart, beneficiaries);

                    // =====================================================
                    // Normal placeholders
                    // =====================================================

                    ReplaceInPart(document.MainDocumentPart, placeholders);

                    foreach (var headerPart in document.MainDocumentPart.HeaderParts)
                    {
                        ReplaceInPart(headerPart, placeholders);
                    }

                    foreach (var footerPart in document.MainDocumentPart.FooterParts)
                    {
                        ReplaceInPart(footerPart, placeholders);
                    }

                    document.MainDocumentPart.Document.Save();
                }

                return stream.ToArray();
            }
        }

        private static void ReplaceType2SubBeneficiaryParagraphs(MainDocumentPart mainPart, IList<LetterOfWishesType2BeneficiaryDocumentModel> beneficiaries)
        {
            if (mainPart == null || mainPart.Document == null || mainPart.Document.Body == null)
            {
                return;
            }

            var paragraphs = mainPart.Document.Body.Descendants<Paragraph>().ToList();

            Paragraph templateParagraph =
                paragraphs.FirstOrDefault(
                    paragraph =>
                    {
                        string paragraphText = string.Concat(paragraph.Descendants<Text>().Select(x => x.Text ?? ""));
                        return paragraphText.Contains("{{SUB_BENEFICIAR_NAME}}");
                    });

            if (templateParagraph == null)
            {
                throw new InvalidOperationException("Type 2 Substitute Beneficiary template paragraph was not found.");
            }

            // ============================================================
            // Clone one paragraph for every substitute beneficiary
            // ============================================================

            foreach (var beneficiary in beneficiaries)
            {
                var newParagraph = (Paragraph)templateParagraph.CloneNode(true);

                var beneficiaryPlaceholders =
                    new Dictionary<string, string>
                    {
                        {
                            "{{SUB_BENEFICIAR_RELATIONSHIP}}", beneficiary.Relationship ?? ""
                        },
                        {
                            "{{SUB_BENEFICIAR_NAME}}", beneficiary.Name ?? ""
                        },
                        {
                            "{{SUB_BENEFICIAR_IDENTITY_ID}}", beneficiary.IdentityNo ?? ""
                        }
                    };

                ReplaceInParagraph(newParagraph, beneficiaryPlaceholders);
                templateParagraph.InsertBeforeSelf(newParagraph);
            }

            // Remove the original placeholder paragraph.
            templateParagraph.Remove();
        }

        public static byte[] ReplacePlaceholdersWithType6Beneficiaries(string templatePath, IDictionary<string, string> placeholders, IList<LetterOfWishesType6BeneficiaryDocumentModel> beneficiaries)
        {
            if (string.IsNullOrWhiteSpace(templatePath))
            {
                throw new ArgumentException("Template path is required.", nameof(templatePath));
            }

            if (!File.Exists(templatePath))
            {
                throw new FileNotFoundException("DOCX template was not found.", templatePath);
            }

            if (placeholders == null)
            {
                throw new ArgumentNullException(nameof(placeholders));
            }

            beneficiaries = beneficiaries ?? new List<LetterOfWishesType6BeneficiaryDocumentModel>();

            byte[] documentBytes = File.ReadAllBytes(templatePath);

            using (var stream = new MemoryStream())
            {
                stream.Write(documentBytes, 0, documentBytes.Length);
                stream.Position = 0;

                using (var document = WordprocessingDocument.Open(stream, true))
                {
                    // Repeat first.
                    ReplaceType6BeneficiaryParagraphs(document.MainDocumentPart, beneficiaries);

                    // Then normal placeholders.
                    ReplaceInPart(document.MainDocumentPart, placeholders);

                    foreach (var headerPart in document.MainDocumentPart.HeaderParts)
                    {
                        ReplaceInPart(headerPart, placeholders);
                    }

                    foreach (var footerPart in document.MainDocumentPart.FooterParts)
                    {
                        ReplaceInPart(footerPart, placeholders);
                    }

                    document.MainDocumentPart.Document.Save();
                }

                return stream.ToArray();
            }
        }

        private static void ReplaceType6BeneficiaryParagraphs(MainDocumentPart mainPart, IList<LetterOfWishesType6BeneficiaryDocumentModel> beneficiaries)
        {
            if (mainPart == null || mainPart.Document == null || mainPart.Document.Body == null)
            {
                return;
            }

            var paragraphs = mainPart.Document.Body.Descendants<Paragraph>().ToList();

            Paragraph templateParagraph =
                paragraphs.FirstOrDefault(
                    paragraph =>
                    {
                        string paragraphText = string.Concat(paragraph.Descendants<Text>().Select(x => x.Text ?? ""));

                        return
                            paragraphText.Contains("{{SUB_BENEFICIAR_NAME}}") && paragraphText.Contains("{{SUB_BENEFICIAR_SHARE_ALLOCATED}}");
                    });

            if (templateParagraph == null)
            {
                throw new InvalidOperationException("Type 6 beneficiary template paragraph was not found.");
            }

            foreach (var beneficiary in beneficiaries)
            {
                var newParagraph = (Paragraph)templateParagraph.CloneNode(true);

                var beneficiaryPlaceholders =
                    new Dictionary<string, string>
                    {
                        {
                            "{{SUB_BENEFICIAR_RELATIONSHIP}}", beneficiary.Relationship ?? ""
                        },
                        {
                            "{{SUB_BENEFICIAR_NAME}}", beneficiary.Name ?? ""
                        },
                        {
                            "{{SUB_BENEFICIAR_IDENTITY_ID}}", beneficiary.IdentityNo ?? ""
                        },
                        {
                            "{{SUB_BENEFICIAR_SHARE_ALLOCATED}}", FormatPercentage(beneficiary.AllocationPercentage)
                        }
                    };

                ReplaceInParagraph(newParagraph, beneficiaryPlaceholders);
                templateParagraph.InsertBeforeSelf(newParagraph);
            }

            templateParagraph.Remove();
        }

        private static string FormatPercentage(decimal percentage)
        {
            return percentage.ToString("0.##", CultureInfo.InvariantCulture);
        }

        private static string FormatAllocationPercentage(decimal? percentage)
        {
            if (!percentage.HasValue)
            {
                return "";
            }

            return percentage.Value.ToString("0.####", System.Globalization.CultureInfo.InvariantCulture);
        }

        public static byte[] ReplaceIntroductionForm(
            string templatePath,
            IDictionary<string, string> placeholders,
            IList<InstructionFormBeneficiaryDocumentModel> beneficiaries,
            IList<InstructionFormAllocationDocumentModel> allocations)
        {
            if (string.IsNullOrWhiteSpace(templatePath))
            {
                throw new ArgumentException("Template path is required.", nameof(templatePath));
            }

            if (!File.Exists(templatePath))
            {
                throw new FileNotFoundException("DOCX template was not found.", templatePath);
            }

            if (placeholders == null)
            {
                throw new ArgumentNullException(nameof(placeholders));
            }

            beneficiaries = beneficiaries ?? new List<InstructionFormBeneficiaryDocumentModel>();
            allocations = allocations ?? new List<InstructionFormAllocationDocumentModel>();

            byte[] bytes = File.ReadAllBytes(templatePath);

            using (var stream = new MemoryStream())
            {
                stream.Write(bytes, 0, bytes.Length);
                stream.Position = 0;

                using (var document = WordprocessingDocument.Open(stream, true))
                {
                    // =================================================
                    // IMPORTANT:
                    // Do repeating sections BEFORE normal placeholders.
                    //
                    // Otherwise template placeholders required to
                    // identify repeating rows/blocks may already have
                    // been replaced.
                    // =================================================

                    ReplaceIntroductionBeneficiaryBlocks(document.MainDocumentPart, beneficiaries);
                    ReplaceIntroductionAllocationRows(document.MainDocumentPart, allocations);

                    // =================================================
                    // Normal placeholders
                    // =================================================

                    ReplaceInPart(document.MainDocumentPart, placeholders);

                    foreach (var header in document.MainDocumentPart.HeaderParts)
                    {
                        ReplaceInPart(header, placeholders);
                    }

                    foreach (var footer in document.MainDocumentPart.FooterParts)
                    {
                        ReplaceInPart(footer, placeholders);
                    }

                    document.MainDocumentPart.Document.Save();
                }

                return stream.ToArray();
            }
        }

        private static void ReplaceIntroductionBeneficiaryBlocks(MainDocumentPart mainPart, IList<InstructionFormBeneficiaryDocumentModel> beneficiaries)
        {
            if (mainPart == null || mainPart.Document == null || mainPart.Document.Body == null)
            {
                return;
            }

            var body = mainPart.Document.Body;

            // =========================================================
            // Actual IntroductionForm(2).docx structure:
            //
            // Paragraph:
            //   BENEFICIARY {{BENEFICIARY_NO}}
            //
            // Table 1:
            //   beneficiary general information
            //
            // Table 2:
            //   tax residence / TIN information
            //
            // Therefore the repeatable beneficiary block consists of
            // THREE OpenXML elements, not one table.
            // =========================================================

            var beneficiaryHeader = body.Elements<Paragraph>().FirstOrDefault(x => GetElementText(x).Contains("{{BENEFICIARY_NO}}"));

            if (beneficiaryHeader == null)
            {
                throw new InvalidOperationException("Introduction Form Section B beneficiary header was not found.");
            }

            // =========================================================
            // Find the first table after the beneficiary heading.
            // =========================================================

            var beneficiaryDetailTable = FindNextSibling<Table>(beneficiaryHeader);

            if (beneficiaryDetailTable == null)
            {
                throw new InvalidOperationException("Introduction Form Section B beneficiary detail table was not found.");
            }

            // =========================================================
            // Find the tax table immediately following the detail table.
            // =========================================================

            var beneficiaryTaxTable = FindNextSibling<Table>(beneficiaryDetailTable);

            if (beneficiaryTaxTable == null)
            {
                throw new InvalidOperationException("Introduction Form Section B beneficiary tax table was not found.");
            }

            // =========================================================
            // Use the original header as the insertion anchor.
            //
            // Every beneficiary receives:
            //
            // BENEFICIARY 1
            // [detail table]
            // [tax table]
            //
            // BENEFICIARY 2
            // [detail table]
            // [tax table]
            //
            // etc.
            // =========================================================

            OpenXmlElement insertionPoint = beneficiaryHeader;

            foreach (var beneficiary in beneficiaries)
            {
                var headerClone = (Paragraph)beneficiaryHeader.CloneNode(true);

                // =====================================================
                // Beneficiary 2 onwards:
                // - force new page
                // - add a real blank line before BENEFICIARY heading
                // =====================================================
                if (beneficiary.No > 1)
                {
                    // Find the first Run that contains the BENEFICIARY heading.
                    var firstRun = headerClone.Elements<Run>().FirstOrDefault();

                    if (firstRun != null)
                    {
                        // Insert page break + blank line BEFORE existing heading text.
                        var prefixRun = new Run(
                            new Break
                            {
                                Type = BreakValues.Page
                            },
                            new Break());

                        firstRun.InsertBeforeSelf(prefixRun);
                    }
                }

                var detailTableClone = (Table)beneficiaryDetailTable.CloneNode(true);
                var taxTableClone = (Table)beneficiaryTaxTable.CloneNode(true);
                var values = BuildIntroductionBeneficiaryPlaceholders(beneficiary);

                ReplaceInElement(headerClone, values);
                ReplaceInElement(detailTableClone, values);
                ReplaceInElement(taxTableClone, values);

                // ---------------------------------------------
                // Insert header
                // ---------------------------------------------

                insertionPoint.InsertAfterSelf(headerClone);
                insertionPoint = headerClone;

                // ---------------------------------------------
                // Insert beneficiary detail table
                // ---------------------------------------------

                insertionPoint.InsertAfterSelf(detailTableClone);
                insertionPoint = detailTableClone;

                // ---------------------------------------------
                // Insert tax table
                // ---------------------------------------------

                insertionPoint.InsertAfterSelf(taxTableClone);
                insertionPoint = taxTableClone;
            }

            // =========================================================
            // Remove original template elements.
            // =========================================================

            beneficiaryHeader.Remove();
            beneficiaryDetailTable.Remove();
            beneficiaryTaxTable.Remove();
        }

        private static IDictionary<string, string> BuildIntroductionBeneficiaryPlaceholders(InstructionFormBeneficiaryDocumentModel beneficiary)
        {
            if (beneficiary == null)
            {
                throw new ArgumentNullException(nameof(beneficiary));
            }

            return new Dictionary<string, string>
            {
                // =====================================================
                // Beneficiary number
                // =====================================================

                {
                    "{{BENEFICIARY_NO}}", beneficiary.No.ToString(CultureInfo.InvariantCulture)
                },

                // =====================================================
                // Beneficiary particulars
                // =====================================================

                {
                    "{{BENEFICIAR_NAME}}", beneficiary.FullName ?? ""
                },
                {
                    "{{BENEFICIAR_IDENTITY_TYPE}}", beneficiary.IdentityType ?? ""
                },
                {
                    "{{BENEFICIAR_IDENTITY_ID}}", beneficiary.IdentityNo ?? ""
                },
                {
                    "{{BENEFICIAR_NATIONALITY}}", beneficiary.Nationality ?? ""
                },
                {
                    "{{BENEFICIAR_GENDER}}", beneficiary.Gender ?? ""
                },
                {
                    "{{BENEFICIAR_DOB}}", beneficiary.DateOfBirth ?? ""
                },
                {
                    "{{BENEFICIAR_ADDRESS_1}}", beneficiary.AddressLine1 ?? ""
                },
                {
                    "{{BENEFICIAR_ADDRESS_2}}", beneficiary.AddressLine2 ?? ""
                },
                {
                    "{{BENEFICIAR_POSTCODE}}", beneficiary.Postcode ?? ""
                },
                {
                    "{{BENEFICIAR_STATE}}", beneficiary.State ?? ""
                },
                {
                    "{{BENEFICIAR_COUNTRY}}", beneficiary.Country ?? ""
                },
                {
                    "{{BENEFICIAR_EMAIL}}", beneficiary.Email ?? ""
                },
                {
                    "{{BENEFICIAR_CONTACT_NO}}", beneficiary.ContactNo ?? ""
                },
                {
                    "{{BENEFICIAR_RELATIONSHIP}}", beneficiary.Relationship ?? ""
                },

                // =====================================================
                // Beneficiary tax
                // =====================================================

                {
                    "{{B_US_YES}}",
                    CheckboxText(beneficiary.IsUSTaxPayer)
                },
                {
                    "{{B_US_NO}}",
                    CheckboxText(!beneficiary.IsUSTaxPayer)
                },
                {
                    "{{B_FOREIGN_YES}}",
                    CheckboxText(beneficiary.HasOtherTaxResidence)
                },
                {
                    "{{B_FOREIGN_NO}}",
                    CheckboxText(!beneficiary.HasOtherTaxResidence)
                },
                {
                    "{{B_TAX_RES_CRTY}}", beneficiary.TaxResidenceCountry ?? ""
                },
                {
                    "{{B_TAX_RE_TIN}}", beneficiary.TaxIdentificationNo ?? ""
                },
                {
                    "{{B_TAX_RES_TIN_REASON}}", beneficiary.TINUnavailableReason ?? ""
                }
            };
        }

        private static T FindNextSibling<T>(OpenXmlElement element) where T : OpenXmlElement
        {
            if (element == null)
                return null;

            var current = element.NextSibling();

            while (current != null)
            {
                var target = current as T;

                if (target != null)
                    return target;

                current = current.NextSibling();
            }

            return null;
        }

        private static string YesNoCheckbox(bool value)
        {
            string checked_checkbox = "☑";
            return value
                ? $"{checked_checkbox} Yes    ☐ No"
                : $"☐ Yes    {checked_checkbox} No";
        }

        private static string GetElementText(OpenXmlElement element)
        {
            return string.Concat(element.Descendants<Text>().Select(x => x.Text ?? ""));
        }

        private static void ReplaceInElement(OpenXmlElement element, IDictionary<string, string> placeholders)
        {
            if (element == null || placeholders == null)
            {
                return;
            }

            // =========================================================
            // IMPORTANT:
            //
            // If the element itself is a Paragraph, process it directly.
            //
            // Descendants<Paragraph>() does NOT include the element
            // itself, which caused:
            //
            // BENEFICIARY {{BENEFICIARY_NO}}
            //
            // to remain unreplaced.
            // =========================================================

            var paragraph = element as Paragraph;

            if (paragraph != null)
            {
                ReplaceInParagraph(paragraph, placeholders);
                return;
            }

            // =========================================================
            // For Table / TableCell / TableRow / other containers,
            // process all paragraphs contained inside.
            // =========================================================

            foreach (var childParagraph in element.Descendants<Paragraph>())
            {
                ReplaceInParagraph(childParagraph, placeholders);
            }
        }

        private static void ReplaceCheckboxPlaceholder(
            OpenXmlElement element,
            string placeholder,
            string replacement)
        {
            if (element == null)
                return;

            foreach (var paragraph in element.Descendants<Paragraph>().ToList())
            {
                string paragraphText =
                    string.Concat(
                        paragraph.Descendants<Text>()
                            .Select(x => x.Text ?? ""));

                if (!paragraphText.Contains(placeholder))
                    continue;

                var texts = paragraph.Descendants<Text>().ToList();

                var involvedRuns = texts
                    .Select(x => x.Parent as Run)
                    .Where(x => x != null)
                    .Distinct()
                    .ToList();

                if (involvedRuns.Count == 0)
                    continue;

                Run firstRun = involvedRuns[0];

                // Preserve the formatting of the original first run.
                RunProperties runProperties =
                    firstRun.RunProperties != null
                        ? (RunProperties)firstRun.RunProperties.CloneNode(true)
                        : null;

                var newRun = new Run();

                if (runProperties != null)
                {
                    newRun.Append(runProperties);
                }

                newRun.Append(
                    new Text(replacement)
                    {
                        Space = SpaceProcessingModeValues.Preserve
                    });

                firstRun.InsertBeforeSelf(newRun);

                foreach (Run run in involvedRuns)
                {
                    run.Remove();
                }
            }
        }

        private static string CheckboxText(bool selected)
        {
            return selected ? "☑" : "☐";
        }

        private static void ReplaceIntroductionAllocationRows(MainDocumentPart mainPart, IList<InstructionFormAllocationDocumentModel> allocations)
        {
            if (mainPart == null || mainPart.Document == null || mainPart.Document.Body == null)
            {
                return;
            }

            allocations = allocations ?? new List<InstructionFormAllocationDocumentModel>();

            var body = mainPart.Document.Body;

            // =========================================================
            // Find Section C allocation template row.
            //
            // Expected row:
            //
            // {{NO}}
            // {{MAIN_B_NAME}}
            // {{MAIN_B_SHARE}}
            // {{NO}}
            // {{SUB_B_NAME}}
            // {{SUB_B_SHARE}}
            //
            // Do NOT depend on exactly 6 physical Word cells.
            // Merged cells / gridSpan can make Word's OpenXML structure
            // different from what is visually displayed.
            // =========================================================

            TableRow templateRow =
                body.Descendants<TableRow>()
                    .FirstOrDefault(
                        row =>
                        {
                            string text = NormalizeIntroductionPlaceholderText(GetElementText(row));

                            return
                                text.Contains("{{MAIN_B_NAME}}")
                                && text.Contains("{{MAIN_B_SHR}}")
                                && text.Contains("{{SUB_B_NAME}}")
                                && text.Contains("{{SUB_B_SHR}}")
                                && text.Contains("{{NO}}");
                        });

            if (templateRow == null)
            {
                throw new InvalidOperationException("Introduction Form Section C allocation template row was not found.");
            }

            // =========================================================
            // Main / Substitute
            // =========================================================

            var mains =
                allocations
                    .Where(x => string.Equals(x.RoleType, "MAIN", StringComparison.OrdinalIgnoreCase))
                    .ToList();

            var substitutes =
                allocations
                    .Where(x => string.Equals(x.RoleType, "SUBSTITUTE", StringComparison.OrdinalIgnoreCase))
                    .ToList();

            int rowCount = Math.Max(mains.Count, substitutes.Count);

            // =========================================================
            // No user beneficiary rows
            // =========================================================

            if (rowCount == 0)
            {
                ReplaceIntroductionAllocationRow(templateRow, "", "", "", "", "", "");
                return;
            }

            // =========================================================
            // Generate rows
            // =========================================================

            for (int i = 0; i < rowCount; i++)
            {
                InstructionFormAllocationDocumentModel main = i < mains.Count ? mains[i] : null;
                InstructionFormAllocationDocumentModel substitute = i < substitutes.Count ? substitutes[i] : null;

                var newRow = (TableRow)templateRow.CloneNode(true);

                string mainNo = main != null ? (i + 1).ToString(CultureInfo.InvariantCulture) + "." : "";
                string substituteNo = substitute != null ? (i + 1).ToString(CultureInfo.InvariantCulture) + "." : "";
                string mainName = main != null ? main.BeneficiaryName ?? "" : "";
                string mainShare = main != null ? FormatIntroductionPercentage(main.Percentage) : "";
                string substituteName = substitute != null ? substitute.BeneficiaryName ?? "" : "";
                string substituteShare = substitute != null ? FormatIntroductionPercentage(substitute.Percentage) : "";

                ReplaceIntroductionAllocationRow(newRow, mainNo, mainName, mainShare, substituteNo, substituteName, substituteShare);
                templateRow.InsertBeforeSelf(newRow);
            }

            templateRow.Remove();
        }

        private static void ReplaceIntroductionAllocationRow(TableRow row, string mainNo, string mainName, string mainShare, string substituteNo, string substituteName, string substituteShare)
        {
            if (row == null)
                return;

            var cells = row.Elements<TableCell>().ToList();

            if (cells.Count >= 6)
            {
                ReplaceInElement(
                    cells[0],
                    new Dictionary<string, string>
                    {
                        {
                            "{{NO}}", mainNo ?? ""
                        }
                    });

                ReplaceInElement(
                    cells[1],
                    new Dictionary<string, string>
                    {
                        {
                            "{{MAIN_B_NAME}}", mainName ?? ""
                        }
                    });

                ReplaceInElement(
                    cells[2],
                    new Dictionary<string, string>
                    {
                        {
                            "{{MAIN_B_SHR}}", mainShare ?? ""
                        }
                    });

                ReplaceInElement(
                    cells[3],
                    new Dictionary<string, string>
                    {
                        {
                            "{{NO}}", substituteNo ?? ""
                        }
                    });

                ReplaceInElement(
                    cells[4],
                    new Dictionary<string, string>
                    {
                        {
                            "{{SUB_B_NAME}}", substituteName ?? ""
                        }
                    });

                ReplaceInElement(
                    cells[5],
                    new Dictionary<string, string>
                    {
                        {
                            "{{SUB_B_SHR}}", substituteShare ?? ""
                        }
                    });

                return;
            }

            // =========================================================
            // Fallback:
            // If Word's table structure is merged/grid-spanned and does
            // not expose six physical cells, replace the unique values
            // first.
            // =========================================================

            var common =
                new Dictionary<string, string>
                {
                    {
                        "{{MAIN_B_NAME}}", mainName ?? ""
                    },
                    {
                        "{{MAIN_B_SHARE}}", mainShare ?? ""
                    },
                    {
                        "{{SUB_B_NAME}}", substituteName ?? ""
                    },
                    {
                        "{{SUB_B_SHARE}}", substituteShare ?? ""
                    }
                };

            ReplaceInElement(row, common);

            // {{NO}} cannot safely be replaced twice with different
            // values at row level. Locate paragraphs containing each
            // beneficiary placeholder and replace the nearest NO.
            var paragraphs = row.Descendants<Paragraph>().ToList();

            foreach (var paragraph in paragraphs)
            {
                string text = NormalizeIntroductionPlaceholderText(GetElementText(paragraph));

                if (text.Contains("{{MAIN_B_NAME}}"))
                {
                    ReplaceInParagraph(
                        paragraph,
                        new Dictionary<string, string>
                        {
                            {
                                "{{NO}}", mainNo ?? ""
                            }
                        });
                }
                else if (text.Contains("{{SUB_B_NAME}}"))
                {
                    ReplaceInParagraph(
                        paragraph,
                        new Dictionary<string, string>
                        {
                            {
                                "{{NO}}", substituteNo ?? ""
                            }
                        });
                }
            }
        }

        private static string NormalizeIntroductionPlaceholderText(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return "";

            return value.Replace("\r", "").Replace("\n", "").Replace("\t", "").Replace(" ", "").Trim();
        }

        private static string FormatIntroductionPercentage(decimal percentage)
        {
            return percentage.ToString("0.##", CultureInfo.InvariantCulture) + "%";
        }
    }
}