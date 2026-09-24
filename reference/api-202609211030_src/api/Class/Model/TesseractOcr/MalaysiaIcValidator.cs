using System;
using System.Globalization;
using System.Linq;

namespace API_CPX.Class.Helper
{
    public static class MalaysiaIcValidator
    {
        public static bool IsValid(
            string icNumber)
        {
            if (string.IsNullOrWhiteSpace(
                icNumber))
            {
                return false;
            }

            string ic =
                new string(
                    icNumber
                        .Where(char.IsDigit)
                        .ToArray());

            if (ic.Length != 12)
            {
                return false;
            }

            if (!ic.All(char.IsDigit))
            {
                return false;
            }

            int yy;
            int mm;
            int dd;

            if (!int.TryParse(
                ic.Substring(0, 2),
                out yy))
            {
                return false;
            }

            if (!int.TryParse(
                ic.Substring(2, 2),
                out mm))
            {
                return false;
            }

            if (!int.TryParse(
                ic.Substring(4, 2),
                out dd))
            {
                return false;
            }

            int currentYear =
                DateTime.Today.Year;

            int currentTwoDigitYear =
                currentYear % 100;

            int year =
                yy <= currentTwoDigitYear
                    ? 2000 + yy
                    : 1900 + yy;

            DateTime dateOfBirth;

            bool validDate =
                DateTime.TryParseExact(
                    year.ToString("0000") +
                    mm.ToString("00") +
                    dd.ToString("00"),
                    "yyyyMMdd",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out dateOfBirth);

            if (!validDate)
            {
                return false;
            }

            if (dateOfBirth >
                DateTime.Today)
            {
                return false;
            }

            return true;
        }

        public static string Normalize(
            string icNumber)
        {
            if (string.IsNullOrWhiteSpace(
                icNumber))
            {
                return null;
            }

            return new string(
                icNumber
                    .Where(char.IsDigit)
                    .ToArray());
        }
    }
}