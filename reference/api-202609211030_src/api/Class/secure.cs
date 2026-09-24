namespace Util
{
    using System;
    using System.Configuration;
    using System.Globalization;
    using System.Security.Cryptography;
    using System.Text;

    public class secure
    {
        public static string Decrypt(string cipherString, bool useHashing)
        {
            byte[] buffer;
            byte[] inputBuffer = Convert.FromBase64String(cipherString);
            AppSettingsReader reader = new AppSettingsReader();
            string s = (string)reader.GetValue("BrỄakĄway☼", typeof(string));
            if (useHashing)
            {
                MD5CryptoServiceProvider provider = new MD5CryptoServiceProvider();
                buffer = provider.ComputeHash(Encoding.ASCII.GetBytes(s));
                provider.Clear();
            }
            else
            {
                buffer = Encoding.ASCII.GetBytes(s);
            }
            TripleDESCryptoServiceProvider provider2 = new TripleDESCryptoServiceProvider();
            provider2.Key = buffer;
            provider2.Mode = CipherMode.ECB;
            provider2.Padding = PaddingMode.PKCS7;
            byte[] bytes = provider2.CreateDecryptor().TransformFinalBlock(inputBuffer, 0, inputBuffer.Length);
            provider2.Clear();
            return Encoding.ASCII.GetString(bytes);
        }

        public static string Encrypt(string toEncrypt, bool useHashing)
        {
            byte[] buffer;
            byte[] bytes = Encoding.ASCII.GetBytes(toEncrypt);
            AppSettingsReader reader = new AppSettingsReader();
            string s = (string)reader.GetValue("BrỄakĄway☼", typeof(string));
            if (useHashing)
            {
                MD5CryptoServiceProvider provider = new MD5CryptoServiceProvider();
                buffer = provider.ComputeHash(Encoding.ASCII.GetBytes(s));
                provider.Clear();
            }
            else
            {
                buffer = Encoding.ASCII.GetBytes(s);
            }
            TripleDESCryptoServiceProvider provider2 = new TripleDESCryptoServiceProvider();
            provider2.Key = buffer;
            provider2.Mode = CipherMode.ECB;
            provider2.Padding = PaddingMode.PKCS7;
            byte[] inArray = provider2.CreateEncryptor().TransformFinalBlock(bytes, 0, bytes.Length);
            provider2.Clear();
            return Convert.ToBase64String(inArray, 0, inArray.Length);
        }

        public static string RC(object strValue)
        {
            string Value = strValue as string;

            if (Value != null)
            {
                if (Value.Trim() != string.Empty)
                {
                    Value = Value.Replace("'", "''");
                }
            }
            return Value;
        }

        //Prevent URL Error - Encrypt
        public static string EURC(string strValue)
        {
            if (strValue != null)
            {
                if (strValue.Trim() != string.Empty)
                {
                    strValue = strValue.Replace("$", "%24");
                    strValue = strValue.Replace("&", "%26");
                    strValue = strValue.Replace("+", "%2b");
                    strValue = strValue.Replace(",", "%2c");
                    strValue = strValue.Replace("/", "%2f");
                    strValue = strValue.Replace(":", "%3a");
                    strValue = strValue.Replace(";", "%3b");
                    strValue = strValue.Replace("=", "%3d");
                    strValue = strValue.Replace("?", "%3f");
                    strValue = strValue.Replace("@", "%40");
                }
            }
            return strValue;
        }

        //Prevent URL Error - Decrypt
        public static string DURC(string strValue)
        {
            if (strValue != null)
            {
                if (strValue.Trim() != string.Empty)
                {
                    strValue = strValue.Replace("%24", "$");
                    strValue = strValue.Replace("%26", "&");
                    strValue = strValue.Replace("%2b", "+");
                    strValue = strValue.Replace("%2c", ",");
                    strValue = strValue.Replace("%2f", "/");
                    strValue = strValue.Replace("%3a", ":");
                    strValue = strValue.Replace("%3b", ";");
                    strValue = strValue.Replace("%3d", "=");
                    strValue = strValue.Replace("%3f", "?");
                    strValue = strValue.Replace("%40", "@");
                }
            }
            return strValue;
        }

        //Prevent Get Image Error
        public static string RSYMBOL(string strValue)
        {
            strValue = strValue.Replace("~", "_");
            strValue = strValue.Replace("`", "_");
            strValue = strValue.Replace("!", "_");
            strValue = strValue.Replace("@", "_");
            strValue = strValue.Replace("#", "_");
            strValue = strValue.Replace("$", "_");
            strValue = strValue.Replace("%", "_");
            strValue = strValue.Replace("^", "_");
            strValue = strValue.Replace("&", "_");
            strValue = strValue.Replace("*", "_");
            strValue = strValue.Replace("(", "_");
            strValue = strValue.Replace(")", "_");
            strValue = strValue.Replace("[", "_");
            strValue = strValue.Replace("]", "_");
            strValue = strValue.Replace("{", "_");
            strValue = strValue.Replace("}", "_");
            strValue = strValue.Replace("-", "_");
            strValue = strValue.Replace("+", "_");
            strValue = strValue.Replace("=", "_");
            strValue = strValue.Replace("|", "_");
            strValue = strValue.Replace("\\", "_");
            strValue = strValue.Replace(";", "_");
            strValue = strValue.Replace(":", "_");
            strValue = strValue.Replace("\"", "_");
            strValue = strValue.Replace("'", "_");
            strValue = strValue.Replace(",", "_");
            strValue = strValue.Replace("<", "_");
            strValue = strValue.Replace(">", "_");
            strValue = strValue.Replace("/", "_");
            strValue = strValue.Replace("?", "_");
            strValue = strValue.Replace(" ", "_");
            return strValue;
        }
    }
}

