using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper.Document;
using API_CPX.Class.Model.DTO.Document;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Service.TrustApplication.Document.Generator
{
    public class KycFormDocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-KYC-FORM";

        public bool CanHandle(string documentCode)
        {
            return string.Equals(documentCode, "KYC_FORM", StringComparison.OrdinalIgnoreCase);
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
            // 1. Personal Details
            // =====================================================

            var personal =
                await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (personal == null)
            {
                throw new BusinessException("Trust Application personal details not found.", Code);
            }

            // =====================================================
            // 2. Trust Asset
            // =====================================================

            var trustAsset =
                await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (trustAsset == null)
            {
                throw new BusinessException("Trust Application asset details not found.", Code);
            }

            // =====================================================
            // 3. Source Of Funds
            // =====================================================

            var sourceOfFunds =
                await db.tbl_TrustApplication_SourceOfFund
                    .Where(x => x.TrustApplicationID == application.RowID)
                    .OrderBy(x => x.RowID)
                    .ToListAsync();

            // =====================================================
            // 4. Build Display Values
            // =====================================================

            string address = BuildAddress(personal.AddressLine1, personal.AddressLine2, personal.City);

            string sourceOfFundText = BuildSourceOfFunds(sourceOfFunds);

            string annualIncomeText = TrustApplicationDisplayValueMapper.AnnualIncome(personal.AnnualIncomeCode);

            string netWorthText = TrustApplicationDisplayValueMapper.NetWorth(personal.NetWorthCode);

            string paymentMethodText = TrustApplicationDisplayValueMapper.PaymentSource(trustAsset.PaymentSource);

            string submittedDate = application.SubmittedAt.HasValue ? application.SubmittedAt.Value.ToString("dd/MM/yyyy") : "";

            // =====================================================
            // 5. Placeholder Dictionary
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    {
                        "{{SETTLOR_FULL_NAME}}", personal.FullName ?? ""
                    },
                    {
                        "{{SETTLOR_IDENTITY_ID}}", personal.IdentityNo ?? ""
                    },
                    {
                        "{{SETTLOR_NATIONALITY}}", personal.Nationality ?? ""
                    },
                    {
                        "{{SETTLOR_DOB}}", personal.DateOfBirth.HasValue ? personal.DateOfBirth.Value.ToString("dd/MM/yyyy") : ""
                    },
                    {
                        "{{SETTLOR_CONTACT_NO}}", personal.ContactNo ?? ""
                    },
                    {
                        "{{SETTLOR_EMAIL}}", personal.Email ?? ""
                    },
                    {
                        "{{SETTLOR_ADDRESS}}", address
                    },
                    {
                        "{{SETTLOR_POSTCODE}}", personal.Postcode ?? ""
                    },
                    {
                        "{{SETTLOR_STATE}}", personal.State ?? ""
                    },
                    {
                        "{{SETTLOR_COUNTRY}}", personal.Country ?? ""
                    },
                    {
                        "{{SETTLOR_OCCUPATION}}", personal.Occupation ?? ""
                    },
                    {
                        "{{NAME_OF_EMPLOYEE}}", personal.EmployerName ?? ""
                    },
                    {
                        "{{NATURE_OF_BUSINESS}}", personal.NatureOfBusiness ?? ""
                    },

                    // =============================================
                    // Mapped Display Values
                    // =============================================

                    {
                        "{{ANNUAL_INCOME}}", annualIncomeText
                    },
                    {
                        "{{TOTAL_NET_WORTH}}", netWorthText
                    },
                    {
                        "{{TRANSACTION_VALUE}}", trustAsset.TrustAssetAmount.ToString("N2")
                    },
                    {
                        "{{PAYMENT_METHOD}}", paymentMethodText
                    },
                    {
                        "{{SOURCE_OF_FUNDS}}", sourceOfFundText
                    },
                    {
                        "{{SUBMITTED_DATE}}", submittedDate
                    }
                };

            // =====================================================
            // 6. Resolve XLSX Template
            // =====================================================

            string templatePath = ResolveTemplatePath(template.TemplatePath);

            // =====================================================
            // 7. Replace XLSX Placeholders
            // =====================================================

            byte[] populatedXlsx = XlsxPlaceholderHelper.ReplacePlaceholders(templatePath, placeholders);

            // =====================================================
            // 8. Convert XLSX -> PDF
            // =====================================================

            byte[] pdf = LibreOfficePdfConverter.ConvertXlsxToPdf(populatedXlsx);

            // =====================================================
            // 9. Return PDF
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
        // Build Address
        // =========================================================

        private static string BuildAddress(string address1, string address2, string city)
        {
            var parts =
                new[]
                {
                    address1,
                    address2,
                    city
                }
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim());

            return string.Join(", ", parts);
        }

        // =========================================================
        // Build Source Of Funds
        // =========================================================

        private static string BuildSourceOfFunds(IEnumerable<tbl_TrustApplication_SourceOfFund> sources)
        {
            if (sources == null)
            {
                return "";
            }

            var values =
                sources
                    .Select(x => TrustApplicationDisplayValueMapper.SourceOfFund(x.SourceCode, x.OtherDescription))
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

            return string.Join(", ", values);
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