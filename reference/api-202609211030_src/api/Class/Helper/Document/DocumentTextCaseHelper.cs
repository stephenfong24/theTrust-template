using System;
using System.Globalization;
using System.Text.RegularExpressions;

namespace API_CPX.Class.Helper.Document
{
    public static class DocumentTextCaseHelper
    {
        public static string ToTitleCase(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return value ?? "";

            string text = Regex.Replace(
                value.Trim(),
                @"\s+",
                " ");

            text = text.ToLowerInvariant();

            return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(text);
        }
    }
}