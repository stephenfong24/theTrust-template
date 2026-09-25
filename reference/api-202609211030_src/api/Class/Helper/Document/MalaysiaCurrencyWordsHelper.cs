using System;
using System.Collections.Generic;

namespace API_CPX.Class.Helper.Document
{
    public static class MalaysiaCurrencyWordsHelper
    {
        private static readonly string[] Ones =
        {
            "",
            "ONE",
            "TWO",
            "THREE",
            "FOUR",
            "FIVE",
            "SIX",
            "SEVEN",
            "EIGHT",
            "NINE",
            "TEN",
            "ELEVEN",
            "TWELVE",
            "THIRTEEN",
            "FOURTEEN",
            "FIFTEEN",
            "SIXTEEN",
            "SEVENTEEN",
            "EIGHTEEN",
            "NINETEEN"
        };

        private static readonly string[] Tens =
        {
            "",
            "",
            "TWENTY",
            "THIRTY",
            "FORTY",
            "FIFTY",
            "SIXTY",
            "SEVENTY",
            "EIGHTY",
            "NINETY"
        };

        /// <summary>
        /// Convert a Malaysian Ringgit amount into words.
        ///
        /// Examples:
        /// 50000.00
        /// -> FIFTY THOUSAND RINGGIT ONLY
        ///
        /// 50000.50
        /// -> FIFTY THOUSAND RINGGIT AND FIFTY SEN ONLY
        /// </summary>
        public static string ToWords(decimal amount)
        {
            if (amount < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(amount), "Amount cannot be negative.");
            }

            // =====================================================
            // Round to Malaysian currency precision
            // =====================================================

            amount = Math.Round(amount, 2, MidpointRounding.AwayFromZero);

            // =====================================================
            // Separate Ringgit and Sen
            // =====================================================

            long ringgit = decimal.ToInt64(decimal.Truncate(amount));
            int sen = decimal.ToInt32((amount - ringgit) * 100M);

            // =====================================================
            // Build wording
            // =====================================================

            string ringgitWords = ringgit == 0 ? "ZERO" : ConvertWholeNumber(ringgit);

            if (sen == 0)
            {
                return ringgitWords + " RINGGIT ONLY";
            }

            string senWords = ConvertWholeNumber(sen);

            return ringgitWords + " RINGGIT AND " + senWords + " SEN ONLY";
        }

        // =========================================================
        // Convert whole number
        // =========================================================

        private static string ConvertWholeNumber(long number)
        {
            if (number == 0)
            {
                return "ZERO";
            }

            if (number < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(number), "Number cannot be negative.");
            }

            var parts = new List<string>();

            // =====================================================
            // Trillion
            // =====================================================

            if (number >= 1000000000000L)
            {
                long trillion = number / 1000000000000L;
                parts.Add(ConvertWholeNumber(trillion) + " TRILLION");
                number %= 1000000000000L;
            }

            // =====================================================
            // Billion
            // =====================================================

            if (number >= 1000000000L)
            {
                long billion = number / 1000000000L;
                parts.Add(ConvertWholeNumber(billion) + " BILLION");
                number %= 1000000000L;
            }

            // =====================================================
            // Million
            // =====================================================

            if (number >= 1000000L)
            {
                long million = number / 1000000L;
                parts.Add(ConvertWholeNumber(million) + " MILLION");
                number %= 1000000L;
            }

            // =====================================================
            // Thousand
            // =====================================================

            if (number >= 1000L)
            {
                long thousand = number / 1000L;
                parts.Add(ConvertWholeNumber(thousand) + " THOUSAND");
                number %= 1000L;
            }

            // =====================================================
            // Remaining 0 - 999
            // =====================================================

            if (number > 0)
            {
                parts.Add(ConvertBelowOneThousand((int)number));
            }

            return string.Join(" ", parts);
        }

        // =========================================================
        // Convert number from 1 - 999
        // =========================================================

        private static string ConvertBelowOneThousand(int number)
        {
            var parts = new List<string>();

            // =====================================================
            // Hundred
            // =====================================================

            if (number >= 100)
            {
                int hundreds = number / 100;
                parts.Add(Ones[hundreds] + " HUNDRED");
                number %= 100;
            }

            // =====================================================
            // 1 - 99
            // =====================================================

            if (number > 0)
            {
                if (number < 20)
                {
                    parts.Add(Ones[number]);
                }
                else
                {
                    int tens = number / 10;
                    int ones = number % 10;
                    string value = Tens[tens];

                    if (ones > 0)
                    {
                        value += " " + Ones[ones];
                    }

                    parts.Add(value);
                }
            }

            return string.Join(" ", parts);
        }
    }
}