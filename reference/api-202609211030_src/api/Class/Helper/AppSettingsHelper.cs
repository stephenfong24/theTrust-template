using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Helper
{
    public class AppSettingsHelper
    {
        public const string TrustMerchantId = "814152";
        public const string TheWillMerchantId = "378459";
        public static string MemberUrl => ConfigurationManager.AppSettings["Member.BaseUrl"];
        public static string HangfireUrl => ConfigurationManager.AppSettings["Hangfire.BaseUrl"];
        public static string MediaUrl => ConfigurationManager.AppSettings["Media.BaseUrl"];
        public static string theWillMemberUrl => ConfigurationManager.AppSettings["Member.theWill.BaseUrl"];
        public static string theWillHangfireUrl => ConfigurationManager.AppSettings["Hangfire.theWill.BaseUrl"];
        public static string theWillMediaUrl => ConfigurationManager.AppSettings["Media.theWill.BaseUrl"];

        public static bool IsTheTrust(string merchantId)
        {
            return string.Equals(merchantId, TrustMerchantId, StringComparison.OrdinalIgnoreCase);
        }

        public static bool IsTheWill(string merchantId)
        {
            return string.Equals(merchantId, TheWillMerchantId, StringComparison.OrdinalIgnoreCase);
        }

        private static void ValidateMerchantId(string merchantId)
        {
            if (!IsTheTrust(merchantId) && !IsTheWill(merchantId))
            {
                throw new ArgumentException("Invalid or unsupported MerchantID.", nameof(merchantId));
            }
        }

        public static string GetMediaUrl(string merchantId)
        {
            ValidateMerchantId(merchantId);
            return IsTheWill(merchantId) ? theWillMediaUrl : MediaUrl;
        }

        public static string GetMemberUrl(string merchantId)
        {
            ValidateMerchantId(merchantId);
            return IsTheWill(merchantId) ? theWillMemberUrl : MemberUrl;
        }

        public static string GetHangfireUrl(string merchantId)
        {
            ValidateMerchantId(merchantId);
            return IsTheWill(merchantId) ? theWillHangfireUrl : HangfireUrl;
        }

        public static string GetTurnstileSecretKey(string merchantId)
        {
            ValidateMerchantId(merchantId);
            return IsTheWill(merchantId) ? ConfigurationManager.AppSettings["theWillCloudflareTurnstileSecretKey"] : ConfigurationManager.AppSettings["CloudflareTurnstileSecretKey"];
        }

        public static string GetTurnstileHostname(string merchantId)
        {
            ValidateMerchantId(merchantId);
            return IsTheWill(merchantId) ? ConfigurationManager.AppSettings["theWillCloudflareTurnstileHostname"] : ConfigurationManager.AppSettings["CloudflareTurnstileHostname"];
        }
    }
}