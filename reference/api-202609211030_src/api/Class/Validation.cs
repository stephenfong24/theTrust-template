using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using Util;

namespace API_CPX.Class
{
    public class Validation
    {
        public static bool IsValidIP(string strIn)
        {
            return System.Text.RegularExpressions.Regex.IsMatch(strIn, @"^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$");
        }

        public static bool IsValidEmail(string strIn)
        {
            return System.Text.RegularExpressions.Regex.IsMatch(strIn, @"^[\w-]+(\.[\w-]+)*@([a-z0-9-]+(\.[a-z0-9-]+)*?\.[a-z]{2,6}|(\d{1,3}\.){3}\d{1,3})(:\d{4})?$");
        }

        public static bool IsValidPhone(string strIn)
        {
            Regex objRegex = new Regex("^[0-9]+$", RegexOptions.IgnoreCase);

            if (!objRegex.IsMatch(strIn))
            {
                return false;
            }
            else
            {
                return true;
            }
        }

        public static bool IsValidMalayisaPhone(string strIn)
        {
            if (strIn.Length < 11 || strIn.Length > 12)
            {
                return false;
            }
            else
            {
                return System.Text.RegularExpressions.Regex.IsMatch(strIn, @"^(6?01)[0-46-9]*[0-9]{7,8}$");
            }
        }

        public static bool isValidIC(string strIC)
        {
            strIC = strIC.Trim();
            Regex objRegex = new Regex("^[A-Za-z0-9]+$", RegexOptions.IgnoreCase);

            if (!objRegex.IsMatch(strIC))
            {
                return false;
            }
            else
            {
                return true;
            }
        }

        public static bool isDateTime(string input, string oldFormat, string newFormat, out string result)
        {
            try
            {
                result = DateTime.ParseExact(input, oldFormat, new CultureInfo("en-US")).ToString(newFormat, new CultureInfo("en-US"));
                return true;
            }
            catch
            {
                result = "";
                return false;
            }
        }
    }
}