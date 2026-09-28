using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Common
{
    public static class TrustApplicationDisplayValueMapper
    {
        // ============================================================
        // Step 1 - Identity Type
        // ============================================================

        public static string IdentityType(string value)
        {
            return Map(
                value,
                new Dictionary<string, string>
                {
                    { "NRIC", "NRIC" },
                    { "PASSPORT", "Passport" },
                    { "COMPANY_ID", "Company ID" }
                });
        }

        // ============================================================
        // Step 1 / Step 3 - Gender
        // ============================================================

        public static string Gender(string value)
        {
            return Map(
                value,
                new Dictionary<string, string>
                {
                    { "MALE", "Male" },
                    { "FEMALE", "Female" }
                });
        }

        // ============================================================
        // Step 1 - Annual Income
        // ============================================================

        public static string AnnualIncome(string value)
        {
            return Map(
                value,
                new Dictionary<string, string>
                {
                    { "UP_TO_RM100_000", "Up to RM100,000" },
                    { "RM100_001_RM300_000", "RM100,001 - RM300,000" },
                    { "RM300_001_RM500_000", "RM300,001 - RM500,000" },
                    { "RM500_001_RM1_000_000", "RM500,001 - RM1,000,000" },
                    { "ABOVE_RM1_000_000", "Above RM1,000,000" }
                });
        }

        // ============================================================
        // Step 1 - Net Worth
        // ============================================================

        public static string NetWorth(string value)
        {
            return Map(
                value,
                new Dictionary<string, string>
                {
                    { "UP_TO_RM500_000", "Up to RM500,000" },
                    { "RM500_001_RM1_000_000", "RM500,001 - RM1,000,000" },
                    { "RM1_000_001_RM2_000_000", "RM1,000,001 - RM2,000,000" },
                    { "RM2_000_001_RM5_000_000", "RM2,000,001 - RM5,000,000" },
                    { "ABOVE_RM5_000_000", "Above RM5,000,000" }
                });
        }

        // ============================================================
        // Step 1 - Source of Funds
        // ============================================================

        public static string SourceOfFund(
            string value,
            string otherDescription = null)
        {
            string code = Normalize(value);

            if (code == "OTHER" || code == "OTHERS")
            {
                return string.IsNullOrWhiteSpace(otherDescription)
                    ? "Others"
                    : otherDescription.Trim();
            }

            return Map(
                value,
                new Dictionary<string, string>
                {
                    { "CURRENT_INCOME", "Current Income" },
                    { "SAVINGS", "Savings" },
                    { "INHERITANCE", "Inheritance" },
                    { "SALES_OF_ASSETS", "Sales of Assets" },
                    { "INVESTMENT_INCOME", "Investment Income" },
                    { "BUSINESS_INCOME", "Business Income" }
                });
        }

        // ============================================================
        // Step 1 / Step 3 - TIN unavailable reason
        // ============================================================

        public static string TinUnavailableReason(string value)
        {
            return Map(
                value,
                new Dictionary<string, string>
                {
                    { "TIN_NOT_ISSUED", "TIN Not Issued" },
                    { "TIN_NOT_REQUIRED", "TIN Not Required" },
                    { "UNABLE_TO_PROVIDE", "Unable to Provide" }
                });
        }

        // ============================================================
        // Step 2 - Payment Source
        // ============================================================

        public static string PaymentSource(string value)
        {
            return Map(
                value,
                new Dictionary<string, string>
                {
                    { "PERSONAL_ACCOUNT", "Personal Account" },
                    { "JOINT_ACCOUNT", "Joint Account" },
                    { "THIRD_PARTY", "Third Party" }
                });
        }

        // ============================================================
        // Step 2 - Guaranteed Return Option
        // ============================================================

        public static string GuaranteedReturnOption(string value)
        {
            return Map(
                value,
                new Dictionary<string, string>
                {
                    { "TRANSFER_TO_BANK", "Transfer to Bank Account" },
                    { "REDEPOSIT_AS_TRUST_ASSET", "Redeposit as Trust Asset" }
                });
        }

        // ============================================================
        // Step 3 - Minor Distribution
        // ============================================================

        public static string MinorDistribution(string value)
        {
            return Map(
                value,
                new Dictionary<string, string>
                {
                    { "GUARDIAN", "Distribute to Guardian" },
                    { "TRUSTEE_HOLD", "Hold by Trustee Company" }
                });
        }

        // ============================================================
        // Step 5 - Signing Method
        // ============================================================

        public static string SigningMethod(string value)
        {
            return Map(
                value,
                new Dictionary<string, string>
                {
                    { "SIGNATURE", "Signature" },
                    { "THUMBPRINT", "Thumbprint" }
                });
        }

        // ============================================================
        // Step 5 - Special Circumstance
        // ============================================================

        public static string SpecialCircumstance(
            string value,
            string otherDescription = null)
        {
            string code = Normalize(value);

            if (code == "OTHER" || code == "OTHERS")
            {
                return string.IsNullOrWhiteSpace(otherDescription)
                    ? "Others"
                    : otherDescription.Trim();
            }

            return Map(
                value,
                new Dictionary<string, string>
                {
                    { "NONE", "None" },
                    { "BLIND", "Blind" },
                    { "ILLITERATE", "Illiterate" },
                    { "LESS_PROFICIENT_IN_ENGLISH", "Less Proficient in English" }
                });
        }

        // ============================================================
        // Common Yes / No
        // ============================================================

        public static string YesNo(bool? value)
        {
            if (!value.HasValue)
            {
                return "";
            }

            return value.Value ? "Yes" : "No";
        }

        // ============================================================
        // Generic helper
        // ============================================================

        private static string Map(
            string value,
            IDictionary<string, string> values)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "";
            }

            string code = Normalize(value);

            string display;

            if (values.TryGetValue(code, out display))
            {
                return display;
            }

            // IMPORTANT:
            // Do not throw because an old/new database value should
            // not prevent document generation.
            return ToReadableText(value);
        }

        private static string Normalize(string value)
        {
            return (value ?? "")
                .Trim()
                .ToUpperInvariant();
        }

        private static string ToReadableText(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "";
            }

            string text = value.Trim().Replace("_", " ").ToLowerInvariant();

            return string.Join(
                " ",
                text.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(x =>
                        char.ToUpperInvariant(x[0]) +
                        (x.Length > 1 ? x.Substring(1) : "")));
        }

        public static async Task<string> RelationshipAsync(
            Sandbox_BasedEntities db,
            string relationshipCode,
            string otherRelationship)
        {
            if (string.IsNullOrWhiteSpace(relationshipCode))
            {
                return "";
            }

            string code = relationshipCode.Trim().ToUpperInvariant();

            if (code == "OTHER" || code == "OTHERS")
            {
                return string.IsNullOrWhiteSpace(otherRelationship)
                    ? "Others"
                    : otherRelationship.Trim();
            }

            var relationship =
                await db.tbl_Relationship
                    .FirstOrDefaultAsync(x =>
                        x.Relationship_Code == code &&
                        x.Status == 0);

            return relationship == null
                ? ToReadableText(relationshipCode)
                : relationship.Relationship_Name;
        }
    }
}