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
    public class OfficialReceiptDocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-OFFICIAL-RECEIPT";

        public bool CanHandle(string documentCode)
        {
            return string.Equals(documentCode, "OFFICIAL_RECEIPT", StringComparison.OrdinalIgnoreCase);
        }

        public async Task<GeneratedPdfResult> GenerateAsync(Sandbox_BasedEntities db, tbl_TrustApplication application, tbl_TrustDocument document, tbl_TrustDocumentTemplate template, long userId)
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
                    .FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (personal == null)
            {
                throw new BusinessException("Trust Application personal details not found.", Code);
            }

            // =====================================================
            // 2. Trust Asset / Step 2
            // =====================================================

            var trustAsset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (trustAsset == null)
            {
                throw new BusinessException("Trust Application asset information not found.", Code);
            }

            // =====================================================
            // 3. Trust Plan
            // =====================================================

            var plan = await db.tbl_TrustPlan.FirstOrDefaultAsync(x => x.ProductCode == application.ProductCode);

            if (plan == null)
            {
                throw new BusinessException("Trust Product configuration not found.", Code);
            }

            // =====================================================
            // 4. General Configuration / SST
            // =====================================================

            var config = await db.tbl_Config_General.FirstOrDefaultAsync(x => x.MerchantID == application.MerchantID);

            if (config == null)
            {
                throw new BusinessException("General configuration not found.", Code);
            }

            // =====================================================
            // 5. Last approved payment
            //
            // This is used for the date that completed the payment.
            // =====================================================

            var payment =
                await db.tbl_TrustApplication_Payment
                    .FirstOrDefaultAsync(
                        x =>
                            x.TrustApplicationID == application.RowID && x.IsActive &&
                            x.PaymentStatus == "PAYMENT_APPROVED" && x.ApprovedAt != null);

            if (payment == null)
            {
                throw new BusinessException("Approved payment not found.", Code);
            }

            // =====================================================
            // 6. Receipt Bank
            // =====================================================

            string receiptBank = string.Empty;
            string receiptBankAccNo = ResolveReceiptBankAccountNo(trustAsset);
            string receiptBankName = ResolveReceiptBank(trustAsset);

            var bank = await db.tbl_Master_BankList.FirstOrDefaultAsync(a => a.BankName == receiptBankName);
            if (bank != null)
            {
                receiptBank = bank.BankNameDetail;
            }

            // =====================================================
            // 7. Amount
            // =====================================================

            decimal receiptAmount = trustAsset.TrustAssetAmount;
            decimal sstPercentage = config.SST;
            decimal sstAmount = Math.Round(receiptAmount * sstPercentage / 100M, 2, MidpointRounding.AwayFromZero);
            decimal finalAmount = receiptAmount + sstAmount;

            // =====================================================
            // 8. Receipt No
            //
            // Temporary until business confirms format.
            // =====================================================

            if (string.IsNullOrWhiteSpace(application.ReceiptNo))
            {
                throw new BusinessException("Official Receipt number has not been generated.", Code);
            }

            string receiptNo = "CNB/OR" + application.PaymentApprovedAt.Value.ToString("yyMM") + "/" + application.ReceiptNo.PadLeft(3, '0');

            // =====================================================
            // 9. Receipt Date
            // =====================================================

            DateTime receiptDate = (DateTime)application.PaymentApprovedAt;

            // =====================================================
            // 10. Placeholder
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    {
                        "{{RECEIPT_RECEIVED_FROM}}", personal.FullName ?? ""
                    },
                    {
                        "{{RECEIPT_NO}}",
                        receiptNo
                    },
                    {
                        "{{RECEIPT_DATE}}", receiptDate.ToString("dd/MM/yyyy")
                    },
                    {
                        "{{RECEIPT_BANK}}", receiptBank.ToUpper() ?? ""
                    },
                    {
                        "{{BANK_ACC_NO}}", receiptBankAccNo ?? ""
                    },
                    {
                        "{{RECEIPT_DESCRIPTION}}", plan.ProductName ?? ""
                    },
                    {
                        "{{RECEIPT_AMOUNT}}", receiptAmount.ToString("N2")
                    },
                    {
                        "{{FINAL_AMOUNT}}", receiptAmount.ToString("N2")
                    },
                    {
                        "{{RECEIPT_AMOUNT_WORDS}}", MalaysiaCurrencyWordsHelper.ToWords(receiptAmount)
                    }
                };

            // =====================================================
            // 11. Template
            // =====================================================

            string templatePath = ResolveTemplatePath(template.TemplatePath);

            // =====================================================
            // 12. Replace XLSX placeholders
            // =====================================================

            byte[] populatedXlsx = XlsxPlaceholderHelper.ReplacePlaceholders(templatePath, placeholders);

            // =====================================================
            // 13. XLSX -> PDF
            // =====================================================

            byte[] pdf = LibreOfficePdfConverter.ConvertXlsxToPdf(populatedXlsx);

            // =====================================================
            // 14. Return
            // =====================================================

            return new GeneratedPdfResult
            {
                Content = pdf,
                ContentType = "application/pdf",
                DocumentCode = document.DocumentCode,
                FileName = DocumentFileNameHelper.Build(template.OutputFileNameFormat, application.TrustID, document.DocumentCode)
            };
        }

        private static string ResolveReceiptBank(tbl_TrustApplication_TrustAsset asset)
        {
            string source = (asset.PaymentSource ?? "").Trim().ToUpperInvariant();

            if (source == "THIRD_PARTY")
            {
                if (IsOther(asset.ThirdPartyBankName))
                {
                    return asset.ThirdPartyOtherBankName ?? "";
                }
                return asset.ThirdPartyBankName ?? "";
            }

            if (IsOther(asset.SettlorBankName))
            {
                return asset.SettlorOtherBankName ?? "";
            }
            return asset.SettlorBankName ?? "";
        }

        private static string ResolveReceiptBankAccountNo(tbl_TrustApplication_TrustAsset asset)
        {
            string source = (asset.PaymentSource ?? "").Trim().ToUpperInvariant();

            if (source == "THIRD_PARTY")
            {
                return asset.ThirdPartyBankAccountNumber ?? "";
            }

            return asset.SettlorBankAccountNumber ?? "";
        }

        private static bool IsOther(string value)
        {
            return
                string.Equals(
                    value,
                    "OTHER",
                    StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(
                    value,
                    "OTHERS",
                    StringComparison.OrdinalIgnoreCase);
        }

        private static string ResolveTemplatePath(string relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                throw new BusinessException(
                    "Document template path is not configured.",
                    Code);
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