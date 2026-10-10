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

            if (!string.Equals(identityType?.Trim(), "NRIC", StringComparison.OrdinalIgnoreCase))
            {
                return original;
            }

            string digits = Regex.Replace(original, @"[\s-]", "");

            if (digits.Length != 12 || !Regex.IsMatch(digits, @"^\d{12}$"))
            {
                return original;
            }

            return digits.Substring(0, 6) + "-" +
                   digits.Substring(6, 2) + "-" +
                   digits.Substring(8, 4);
        }
    }
}