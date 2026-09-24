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
    public class BookingFormDocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code =
            "GENERATE-BOOKING-FORM";

        public bool CanHandle(string documentCode)
        {
            return string.Equals(
                documentCode,
                "BOOKING_FORM",
                StringComparison.OrdinalIgnoreCase);
        }

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
            // 2. Agent
            // =====================================================

            var agent =
                await db.tbl_MemberInfo
                    .FirstOrDefaultAsync(
                        x =>
                            x.RowID ==
                            application.MemberID);

            if (agent == null)
            {
                throw new BusinessException(
                    "Trust Representative information not found.",
                    Code);
            }

            // =====================================================
            // 3. Product
            // =====================================================

            var plan =
                await db.tbl_TrustPlan
                    .FirstOrDefaultAsync(
                        x => x.ProductCode == application.ProductCode);

            if (plan == null)
            {
                throw new BusinessException(
                    "Trust Product configuration not found.",
                    Code);
            }

            // =====================================================
            // 4. Placement Amount
            // =====================================================
            //
            // IMPORTANT:
            // Change this to your actual Step 2 placement source.
            // =====================================================

            decimal placementAmount = 0M;

            var trustAsset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);
            if (trustAsset != null)
            {
                placementAmount = trustAsset.TrustAssetAmount;
            }

            // =====================================================
            // 5. Build Model
            // =====================================================

            var model =
                new BookingFormDocumentModel
                {
                    TrustID =
                        application.TrustID,

                    FullName =
                        personal.FullName ?? "",

                    IdentityNo =
                        personal.IdentityNo ?? "",

                    Email =
                        personal.Email ?? "",

                    ContactNo =
                        personal.ContactNo ?? "",

                    ProductName =
                        plan.ProductName ?? "",

                    PlacementAmount =
                        placementAmount,

                    BookingDate =
                        application.CreatedAt,

                    AgentName =
                        agent.Fullname ?? ""
                };

            // =====================================================
            // 6. Placeholder Dictionary
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    {
                        "{{SETTLOR_FULL_NAME}}",
                        model.FullName ?? ""
                    },
                    {
                        "{{SETTLOR_IDENTITY_ID}}",
                        model.IdentityNo ?? ""
                    },
                    {
                        "{{SETTLOR_EMAIL}}",
                        model.Email ?? ""
                    },
                    {
                        "{{SETTLOR_CONTACT_NO}}",
                        model.ContactNo ?? ""
                    },
                    {
                        "{{TRUST_NO}}",
                        model.TrustID.ToString("D4")
                    },
                    {
                        "{{PLACEMENT_AMOUNT}}",
                        model.PlacementAmount.ToString("N2")
                    },

                    {
                        "{{BOOKING_DATE}}",
                        model.BookingDate.ToString(
                            "dd/MM/yyyy")
                    },

                    {
                        "{{AGENT_FULL_NAME}}",
                        model.AgentName ?? ""
                    }
                };

            // =====================================================
            // 7. Template
            // =====================================================

            string templatePath =
                ResolveTemplatePath(
                    template.TemplatePath);

            // =====================================================
            // 8. Replace DOCX placeholders
            // =====================================================

            byte[] populatedDocx =
                DocxPlaceholderHelper
                    .ReplacePlaceholders(
                        templatePath,
                        placeholders);

            // =====================================================
            // 9. Convert DOCX -> PDF using LibreOffice
            // =====================================================

            byte[] pdf =
                LibreOfficePdfConverter
                    .ConvertDocxToPdf(
                        populatedDocx);

            // =====================================================
            // 10. Return
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
        // Resolve template path
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


        // =========================================================
        // Address
        // =========================================================

        private static string BuildAddress(
            tbl_TrustApplication_PersonalDetail personal)
        {
            var values =
                new[]
                {
                    personal.AddressLine1,
                    personal.AddressLine2,
                    personal.Postcode,
                    personal.City,
                    personal.State,
                    personal.Country
                };

            return string.Join(
                ", ",
                Array.FindAll(
                    values,
                    x =>
                        !string.IsNullOrWhiteSpace(x)));
        }
    }
}