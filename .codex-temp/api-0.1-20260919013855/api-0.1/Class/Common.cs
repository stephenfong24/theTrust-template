using API_CPX.Context;
using System;
using System.Collections;
using System.Configuration;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Resources;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using Util;
using System.Net.Mail;
using System.Data;
using System.Net;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using System.Web;
using API_CPX.Model;
using System.Text.RegularExpressions;

namespace API_CPX.Class
{
    public static class CommonUtil
    {
        static public string EncodeTo64(string toEncode)

        {
            var textBytes = System.Text.Encoding.UTF8.GetBytes(toEncode);
            return System.Convert.ToBase64String(textBytes);
        }

        public static string GetSmsLanguage(string MerchantID)
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            tbl_Merchant merchant = dbR.tbl_Merchant.Where(a => a.MerchantID == MerchantID && a.Status == 0).FirstOrDefault();
            if (merchant != null)
            {
                return merchant.Sms_Lang;
            }
            else
            {
                return "en";
            }
        }

        public static string GetSmsEngine(string MerchantID)
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            string serviceName = string.Empty;

            tbl_Merchant_Sms smsOwnActived = dbR.tbl_Merchant_Sms.Where(a => a.MerchantID == MerchantID && a.IsMaster == 9 && a.Status == 0).FirstOrDefault();
            if (smsOwnActived != null)
            {
                serviceName = smsOwnActived.ServiceName;
            }
            else
            {
                tbl_Merchant_Sms smsActived = dbR.tbl_Merchant_Sms.Where(a => a.MerchantID == MerchantID && a.IsMaster == 0 && a.Status == 0).FirstOrDefault();
                if (smsActived == null)
                {
                    return "Err : Merchant SMS configuration not found!";
                }

                tbl_Config_Sms configSms = dbR.tbl_Config_Sms.Where(a => a.ServiceName == smsActived.ServiceName && a.Status == 0).FirstOrDefault();
                if (configSms == null)
                {
                    return "Err : System SMS configuration not found!";
                }

                serviceName = configSms.ServiceName;
            }
            return serviceName;
        }

        public static string GetSmsShortName(string MerchantID)
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            string shortname = string.Empty;

            tbl_Merchant_Sms smsOwnActived = dbR.tbl_Merchant_Sms.Where(a => a.MerchantID == MerchantID && a.IsMaster == 9 && a.Status == 0).FirstOrDefault();
            if (smsOwnActived != null)
            {
                shortname = smsOwnActived.ShortName;
            }
            else
            {
                tbl_Merchant_Sms smsActived = dbR.tbl_Merchant_Sms.Where(a => a.MerchantID == MerchantID && a.IsMaster == 0 && a.Status == 0).FirstOrDefault();
                if (smsActived != null)
                {
                    shortname = smsActived.ShortName;
                }
            }
            return shortname;
        }

        public static string GetIP()
        {
            return HttpContext.Current.Request.ServerVariables["REMOTE_ADDR"].ToString();
        }

        public static bool isAlphaNumeric(string value)
        {
            return System.Text.RegularExpressions.Regex.IsMatch(value, "^[a-zA-Z0-9]+$");
        }

        public static decimal TruncateDecimal(decimal value, long decimalPlaces)
        {
            decimal integralValue = Math.Truncate(value);
            decimal fraction = value - integralValue;
            decimal factor = (decimal)Math.Pow(10, decimalPlaces);
            decimal truncatedFraction = Math.Truncate(fraction * factor) / factor;
            decimal result = 0;
            if (fraction == 0)
            {
                Decimal DisplayAmount = integralValue + truncatedFraction;
                String TrailZeroAmount = DisplayAmount.ToString() + GenerateTrailZero((int)decimalPlaces);
                result = Convert.ToDecimal(TrailZeroAmount);
            }
            else
            {
                result = integralValue + truncatedFraction;
            }
            return result;
        }

        private static String GenerateTrailZero(int DecimalPlace)
        {
            int ConditionI = DecimalPlace;
            String TrailZero = ".";
            while (ConditionI > 0)
            {
                TrailZero += "0";
                ConditionI = ConditionI - 1;
            }
            return TrailZero;
        }

        public static double DateTimeToUnixTimestamp(DateTime dateTime)
        {
            return (TimeZoneInfo.ConvertTimeToUtc(dateTime.AddHours(8)) - new DateTime(1970, 1, 1, 0, 0, 0, 0, System.DateTimeKind.Utc)).TotalSeconds;
        }

        public static DateTime UnixTimeStampToDateTime(double unixTimeStamp)
        {
            System.DateTime dtDateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, System.DateTimeKind.Utc);
            dtDateTime = dtDateTime.AddSeconds(unixTimeStamp).ToLocalTime();
            return dtDateTime;
        }

        public static string FormatSystemDateTime(string SystemDateTime)
        {
            if (!string.IsNullOrEmpty(SystemDateTime))
            {
                return Convert.ToDateTime(SystemDateTime).ToString(ProjectProperties.DateTime_Format);
            }
            else
            {
                return "-";
            }
        }

        public static string FormatStatementCurrency(string Currency, decimal Val)
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            string decimalCode = "F2";

            tbl_Country country = dbR.tbl_Country.Where(a => a.Currency_Code == Currency).FirstOrDefault();
            if (country != null)
            {
                decimalCode = country.Currency_DB_Format;
            }

            return Convert.ToDecimal(Val).ToString(decimalCode);
        }

        private static decimal TruncateDecimal(decimal value, int decimalPlaces)
        {
            decimal integralValue = Math.Truncate(value);
            decimal fraction = value - integralValue;
            decimal factor = (decimal)Math.Pow(10, decimalPlaces);
            decimal truncatedFraction = Math.Truncate(fraction * factor) / factor;
            decimal result = integralValue + truncatedFraction;
            return result;
        }

        public static decimal RoundDown(decimal i, double decimalPlaces)
        {
            var power = Convert.ToDecimal(Math.Pow(10, decimalPlaces));
            return Math.Floor(i * power) / power;
        }

        public static string getRandomPassword(int length)
        {
            char[] charArr = "0123456789abcdefghijklmnopqrstuvwxyz".ToCharArray();
            StringBuilder password = new StringBuilder();

            Random random = new Random();

            for (int i = 0; i < length; i++)
            {
                int pos = random.Next(0, charArr.Length);
                password.Append(charArr[pos]);
            }

            return password.ToString();
        }

        public static string GetRandomNumber(int length)
        {
            char[] charArr = "0123456789".ToCharArray();
            string strrandom = string.Empty;
            Random objran = new Random(DateTime.UtcNow.Millisecond);
            for (int i = 0; i < length; i++)
            {
                //It will not allow Repetation of Characters
                int pos = objran.Next(1, charArr.Length);
                if (!strrandom.Contains(charArr.GetValue(pos).ToString()))
                    strrandom += charArr.GetValue(pos);
                else
                    i--;
            }
            return strrandom;
        }

        public static bool isValidAlphaPwd(string password)
        {
            bool isMatch1 = password.Length >= 8 &&
                      (password.Where(char.IsUpper).Count() >= 1 ||
                      password.Where(char.IsLower).Count() >= 1) &&
                        password.Where(char.IsDigit).Count() >= 1;
            return isMatch1;
        }

        public static string Right(string param, int length)
        {
            string result = param.Substring(param.Trim().Length - length, length);
            return result;
        }

        public static string TrimMediaPath(string MediaPath)
        {
            MediaPath = MediaPath.ToLower();
            return MediaPath.Replace("/fileupload", "");
        }

        public static string FormatIdentityID(string IC)
        {
            if (IC.Length == 12)
            {
                return IC.Substring(0, 6) + "-" + IC.Substring(6, 2) + "-" + IC.Substring(8, 4);
            }
            else
            {
                return IC;
            }
        }

        public static string getHashSha256(string text)
        {
            byte[] bytes = Encoding.Unicode.GetBytes(text);
            SHA256Managed hashstring = new SHA256Managed();
            byte[] hash = hashstring.ComputeHash(bytes);
            string hashString = string.Empty;
            foreach (byte x in hash)
            {
                hashString += String.Format("{0:x2}", x);
            }
            return hashString;
        }

        public static string CleanSql(string sql)
        {
            return Regex.Replace(sql, @"^\s+", "", RegexOptions.Multiline).Trim();
        }

        public static string GetHashSha256(string text)
        {
            text = text.Normalize(NormalizationForm.FormC);
            text = text.Trim().Replace("\0", string.Empty);
            byte[] bytes = Encoding.UTF8.GetBytes(text);
            using (SHA256 sha = SHA256.Create())
            {
                byte[] hash = sha.ComputeHash(bytes);
                StringBuilder sb = new StringBuilder(hash.Length * 2);
                foreach (byte b in hash)
                {
                    sb.AppendFormat("{0:x2}", b);
                }
                return sb.ToString();
            }
        }

        public static string GetResourcesValueByCultureInfo(string resxFilename, string KeyVal, string Culture)
        {
            try
            {
                string ResxVal = string.Empty;

                if (string.IsNullOrEmpty(Culture))
                {
                    ResxVal = (string)HttpContext.GetGlobalResourceObject(resxFilename, KeyVal);
                }
                else
                {
                    ResxVal = (string)HttpContext.GetGlobalResourceObject(resxFilename, KeyVal, CultureInfo.GetCultureInfo(Culture));
                }

                if (!string.IsNullOrEmpty(ResxVal))
                {
                    return ResxVal;
                }
                else
                {
                    return KeyVal;
                }
            }
            catch (Exception)
            {
                return KeyVal;
            }
        }
    }
}