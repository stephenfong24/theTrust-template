using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Helper
{
    public class AppSettingsHelper
    {
        public static string MemberUrl => ConfigurationManager.AppSettings["Member.BaseUrl"];
        public static string HangfireUrl => ConfigurationManager.AppSettings["Hangfire.BaseUrl"];
        public static string MediaUrl => ConfigurationManager.AppSettings["Media.BaseUrl"];
        public static string MerchantID => ConfigurationManager.AppSettings["Base.MerchantID"];
    }
}