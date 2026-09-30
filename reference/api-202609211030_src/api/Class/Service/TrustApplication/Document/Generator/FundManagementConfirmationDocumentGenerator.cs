using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper.Document;
using API_CPX.Class.Model.DTO.Document;
using API_CPX.Class.Model.TrustPlan;
using API_CPX.Class.Service.TrustApplication.Snapshot;
using API_CPX.Context;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Service.TrustApplication.Document.Generator
{
    public class FundManagementConfirmationDocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-FUND-MANAGEMENT-CONFIRMATION";

        // =========================================================
        // Can Handle
        // =========================================================

        public bool CanHandle(string documentCode)
        {
            return string.Equals(documentCode, "FUND_MANAGEMENT_CONFIRMATION", StringComparison.OrdinalIgnoreCase);
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
            // 1. Personal Detail
            // =====================================================

            var personal = await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (personal == null)
            {
                throw new BusinessException("Trust Application personal details not found.", Code);
            }

            // =====================================================
            // 2. Trust Asset
            //
            // Placement amount belongs to the Trust Application,
            // not the Trust Plan.
            // =====================================================

            var trustAsset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (trustAsset == null)
            {
                throw new BusinessException("Trust Application asset details not found.", Code);
            }

            decimal placementAmount = trustAsset.TrustAssetAmount;

            // =====================================================
            // 3. Validate Commencement Date
            // =====================================================

            if (!application.CommencementDate.HasValue)
            {
                throw new BusinessException("Trust Application commencement date is not available.", Code);
            }

            // =====================================================
            // 4. Validate Maturity Date
            // =====================================================

            if (!application.MaturityDate.HasValue)
            {
                throw new BusinessException("Trust Application maturity date is not available.", Code);
            }

            // =====================================================
            // 5. Determine Trust Plan Source
            //
            // Historical / finalized applications MUST use the
            // immutable Trust Plan Snapshot.
            //
            // COMPLETED
            // MATURED
            // EARLY_WITHDRAWN
            //
            // Other statuses may use the current Trust Plan.
            // =====================================================

            bool useSnapshot = IsSnapshotStatus(application.ApplicationStatus);

            TrustPlanDetailsResponse planDetails;

            if (useSnapshot)
            {
                // =================================================
                // Historical Trust Plan
                //
                // IMPORTANT:
                // Never fall back to current tbl_TrustPlan here.
                // =================================================

                var snapshotService = new TrustApplicationPlanSnapshotServiceAsync();

                planDetails = await snapshotService.GetSnapshotConfigurationAsync(db, application.RowID);

                if (planDetails == null || planDetails.Steps == null)
                {
                    throw new BusinessException("Trust Application Plan Snapshot configuration is invalid.", Code);
                }
            }
            else
            {
                // =================================================
                // Current Trust Plan
                //
                // Reuse TrustPlanServiceAsync instead of manually
                // reading each Trust Plan configuration table.
                // =================================================

                var trustPlanService = new API_CPX.Services.TrustPlan.TrustPlanServiceAsync();

                planDetails = await trustPlanService.GetTrustProductDetailsAsync(application.ProductCode, application.MerchantID);

                if (planDetails == null || planDetails.Steps == null)
                {
                    throw new BusinessException("Trust Product configuration not found.", Code);
                }
            }

            // =====================================================
            // 6. Validate Required Plan Steps
            // =====================================================

            var basic = planDetails.Steps.Step1BasicInformation;

            if (basic == null)
            {
                throw new BusinessException("Trust Plan basic configuration is not available.", Code);
            }

            var withdrawal = planDetails.Steps.Step3TenureAndWithdrawal;
            var dividendReturn = planDetails.Steps.Step4DividendReturn;
            var dividendPayout = planDetails.Steps.Step5DividendPayout;

            // =====================================================
            // 7. Resolve Dividend Configuration
            // =====================================================

            decimal? year1Rate = null;
            decimal? year2Rate = null;

            if (dividendReturn != null && string.Equals(dividendReturn.Method, "INVESTMENT_PERIOD_TIER_RATE", StringComparison.OrdinalIgnoreCase))
            {
                var configuration = ConvertDividendConfiguration(dividendReturn.Configuration);

                if (configuration != null && configuration.Tiers != null)
                {
                    var tier =
                        configuration.Tiers
                            .Where(
                                x => placementAmount >= x.MinimumPlacement &&
                                    (
                                        !x.MaximumPlacement.HasValue || placementAmount <= x.MaximumPlacement.Value
                                    ))
                            .OrderBy(x => x.MinimumPlacement)
                            .FirstOrDefault();

                    if (tier != null && tier.YearlyRates != null)
                    {
                        year1Rate = GetYearlyRate(tier.YearlyRates, 1);
                        year2Rate = GetYearlyRate(tier.YearlyRates, 2);
                    }
                }
            }

            // =====================================================
            // 8. Build Settlor Address
            // =====================================================

            string settlorAddress = BuildSettlorAddress(personal.AddressLine1, personal.AddressLine2);

            // =====================================================
            // 9. Format Trust Plan Values
            // =====================================================

            string fundManagementPeriod = FormatPeriod(basic.FundManagementPeriod, basic.FundManagementPeriodUnit);
            string lockInPeriod = withdrawal == null ? "" : FormatPeriod(withdrawal.LockInPeriod, withdrawal.LockInPeriodUnit);
            string earlyWithdrawalFee = FormatEarlyWithdrawalFee(withdrawal);
            string payoutFrequency = dividendPayout == null ? "" : FormatDisplayText(dividendPayout.PayoutFrequency);

            // =====================================================
            // 10. Placeholder Dictionary
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    {
                        "{{TRUST_NO}}", application.TrustID.ToString("D4")
                    },

                    // =============================================
                    // Letter view / generation date
                    // =============================================

                    {
                        "{{FM_LETTER_DATE}}", DateTime.Now.ToString("dd/MM/yyyy")
                    },
                    {
                        "{{SETTLOR_FULL_NAME}}", personal.FullName ?? ""
                    },
                    {
                        "{{SETTLOR_ADDRESS}}", settlorAddress
                    },
                    {
                        "{{CITY}}", personal.City ?? ""
                    },
                    {
                        "{{POSTCODE}}", personal.Postcode ?? ""
                    },
                    {
                        "{{STATE}}", personal.State ?? ""
                    },
                    {
                        "{{COUNTRY}}", personal.Country ?? ""
                    },
                    {
                        "{{TRUST_PLAN_NAME}}", basic.ProductName ?? ""
                    },

                    // =============================================
                    // Example:
                    // RM 20,000
                    // =============================================

                    {
                        "{{TRUST_PLACEMENT_AMOUNT}}", FormatRinggit(placementAmount)
                    },

                    // =============================================
                    // Example:
                    // 2 Years
                    // =============================================

                    {
                        "{{FUND_MANAGEMENT_PERIOD}}", fundManagementPeriod
                    },
                    {
                        "{{COMMENCE_DATE}}", application.CommencementDate.Value.ToString("dd/MM/yyyy")
                    },
                    {
                        "{{MATURITY_DATE}}", application.MaturityDate.Value.ToString("dd/MM/yyyy")
                    },
                    {
                        "{{LOCKIN_PERIOD}}", lockInPeriod
                    },
                    {
                        "{{YEAR_1_DIVIDEND_PERCENTAGE}}", FormatPercentage(year1Rate)
                    },
                    {
                        "{{YEAR_2_DIVIDEND_PERCENTAGE}}", FormatPercentage(year2Rate)
                    },
                    {
                        "{{EARLY_WITHDRAWAL_FEE_PERCENTAGE}}", earlyWithdrawalFee
                    },
                    {
                        "{{PAYOUT_FREQUENCY}}", payoutFrequency
                    }
                };

            // =====================================================
            // 11. Resolve Template
            // =====================================================

            string templatePath = ResolveTemplatePath(template.TemplatePath);

            // =====================================================
            // 12. Replace DOCX Placeholders
            // =====================================================

            byte[] populatedDocx = DocxPlaceholderHelper.ReplacePlaceholders(templatePath, placeholders);

            // =====================================================
            // 13. Convert DOCX -> PDF
            // =====================================================

            byte[] pdf = LibreOfficePdfConverter.ConvertDocxToPdf(populatedDocx);

            // =====================================================
            // 14. Return PDF
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
        // Snapshot Status
        // =========================================================

        private static bool IsSnapshotStatus(string applicationStatus)
        {
            string status = (applicationStatus ?? "").Trim().ToUpperInvariant();

            return
                status == "COMPLETED" ||
                status == "MATURED" ||
                status == "EARLY_WITHDRAWN";
        }

        // =========================================================
        // Convert Dividend Configuration
        //
        // TrustPlanDetailsResponse.Step4DividendReturn.Configuration
        // is object.
        //
        // After snapshot JSON deserialization it normally becomes
        // JObject.
        //
        // This follows the same conversion pattern already used by
        // InvestmentPeriodTierRateDividendProvider.
        // =========================================================

        private static InvestmentPeriodTierRateConfiguration ConvertDividendConfiguration(object configuration)
        {
            if (configuration == null)
            {
                return null;
            }

            var typedConfiguration = configuration as InvestmentPeriodTierRateConfiguration;

            if (typedConfiguration != null)
            {
                return typedConfiguration;
            }

            var jObject = configuration as JObject;

            if (jObject != null)
            {
                return jObject.ToObject<InvestmentPeriodTierRateConfiguration>();
            }

            return JObject.FromObject(configuration).ToObject<InvestmentPeriodTierRateConfiguration>();
        }

        // =========================================================
        // Get Yearly Rate
        //
        // Current structure:
        //
        // YearlyRates:
        // {
        //     "1": 6.0000,
        //     "2": 8.0000
        // }
        // =========================================================

        private static decimal? GetYearlyRate(Dictionary<string, decimal> yearlyRates, int year)
        {
            if (yearlyRates == null)
            {
                return null;
            }

            decimal rate;

            if (yearlyRates.TryGetValue(year.ToString(CultureInfo.InvariantCulture), out rate))
            {
                return rate;
            }

            return null;
        }

        // =========================================================
        // Build Settlor Address
        // =========================================================

        private static string BuildSettlorAddress(string addressLine1, string addressLine2)
        {
            string address1 = (addressLine1 ?? "").Trim();
            string address2 = (addressLine2 ?? "").Trim();

            if (string.IsNullOrWhiteSpace(address2))
            {
                return address1;
            }

            if (string.IsNullOrWhiteSpace(address1))
            {
                return address2;
            }

            return address1.TrimEnd(',') + "," + Environment.NewLine + address2;
        }

        // =========================================================
        // Format Period
        //
        // 1 YEAR   -> 1 Year
        // 2 YEAR   -> 2 Years
        // 6 MONTH  -> 6 Months
        // =========================================================

        private static string FormatPeriod(int value, string unit)
        {
            string normalized = (unit ?? "").Trim().ToUpperInvariant();
            string displayUnit;

            switch (normalized)
            {
                case "YEAR":
                case "YEARS":

                    displayUnit = value == 1 ? "Year" : "Years";
                    break;

                case "MONTH":
                case "MONTHS":

                    displayUnit = value == 1 ? "Month" : "Months";
                    break;

                case "DAY":
                case "DAYS":

                    displayUnit = value == 1 ? "Day" : "Days";
                    break;

                default:

                    displayUnit = FormatDisplayText(normalized);

                    if (value != 1 && !string.IsNullOrWhiteSpace(displayUnit) && !displayUnit.EndsWith("s", StringComparison.OrdinalIgnoreCase))
                    {
                        displayUnit += "s";
                    }
                    break;
            }

            return value.ToString(CultureInfo.InvariantCulture) + " " + displayUnit;
        }

        // =========================================================
        // Format Ringgit
        //
        // 20000.00 -> RM 20,000
        // 20500.50 -> RM 20,500.50
        // =========================================================

        private static string FormatRinggit(decimal amount)
        {
            string formatted =
                amount % 1M == 0M
                    ? amount.ToString(
                        "#,##0",
                        CultureInfo.InvariantCulture)
                    : amount.ToString(
                        "#,##0.00",
                        CultureInfo.InvariantCulture);

            return "RM " + formatted;
        }

        // =========================================================
        // Format Percentage
        //
        // 6.0000 -> 6%
        // 6.5000 -> 6.5%
        // =========================================================

        private static string FormatPercentage(decimal? value)
        {
            if (!value.HasValue)
            {
                return "";
            }

            return value.Value.ToString("0.####", CultureInfo.InvariantCulture) + "%";
        }

        // =========================================================
        // Early Withdrawal Fee
        // =========================================================

        private static string FormatEarlyWithdrawalFee(Step3TenureAndWithdrawal withdrawal)
        {
            if (withdrawal == null || !withdrawal.AllowEarlyWithdrawal || !withdrawal.EarlyWithdrawalFeeValue.HasValue)
            {
                return "";
            }

            decimal value = withdrawal.EarlyWithdrawalFeeValue.Value;

            string feeType = (withdrawal.EarlyWithdrawalFeeType ?? "").Trim().ToUpperInvariant();

            if (feeType == "PERCENTAGE")
            {
                return FormatPercentage(value);
            }

            if (feeType == "FIXED" || feeType == "AMOUNT")
            {
                return FormatRinggit(value);
            }

            return value.ToString("0.####", CultureInfo.InvariantCulture);
        }

        // =========================================================
        // Display Text
        //
        // YEARLY       -> Yearly
        // HALF_YEARLY  -> Half Yearly
        // QUARTERLY    -> Quarterly
        // =========================================================

        private static string FormatDisplayText(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "";
            }

            string text = value.Trim().Replace("_", " ").ToLowerInvariant();

            return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(text);
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