using System;
using System.Text.RegularExpressions;

namespace API_CPX.Class.Helper.Document
{
    public static class IdentityDocumentFormatHelper
    {
        public static string Format(string identityType, string identityNo)
        {
            if (string.IsNullOrWhiteSpace(identityNo))
                return identityNo ?? "";

            string original = identityNo.Trim();

            string digits = Regex.Replace(original, @"[\s-]", "");

            // Format when:
            // 1. Identity type is NRIC; OR
            // 2. Identity type is not provided.
            bool isNric = string.Equals(
                identityType?.Trim(),
                "NRIC",
                StringComparison.OrdinalIgnoreCase);

            bool identityTypeMissing = string.IsNullOrWhiteSpace(identityType);

            if (!isNric && !identityTypeMissing)
                return original;

            // Malaysian NRIC must contain exactly 12 digits.
            if (!Regex.IsMatch(digits, @"^\d{12}$"))
                return original;

            return digits.Substring(0, 6) + "-" +
                   digits.Substring(6, 2) + "-" +
                   digits.Substring(8, 4);
        }
    }
}