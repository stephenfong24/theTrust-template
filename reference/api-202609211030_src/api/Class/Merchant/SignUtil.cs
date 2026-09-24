using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web;

namespace API_CPX.Class.Merchant
{
    public class SignUtil
    {
        public static String sortData(Dictionary<string, string> dic)
        {
            var que = dic.OrderBy(s => s.Key);
            StringBuilder sbf = new StringBuilder();
            foreach (KeyValuePair<string, string> item in que)
            {
                if ((item.Value != null) && (item.Value.Length > 0))
                {
                    sbf.Append(item.Key).Append("=").Append(item.Value).Append("&");
                }
            }
            String returnStr = sbf.ToString();
            if (returnStr.EndsWith("&"))
            {
                returnStr = returnStr.Substring(0, returnStr.LastIndexOf('&'));
            }
            returnStr = returnStr.Replace("&", "");
            returnStr = returnStr.Replace("MerchantID=", "");
            returnStr = returnStr.Replace("token=", "");
            returnStr = returnStr.Replace("type=", "");
            returnStr = returnStr.Replace("address=", "");
            return returnStr;
        }

        public static void putIfNotNull(Dictionary<string, string> dic, string key, string value)
        {
            if (null != value && !"".Equals(value))
            {
                dic.Add(key, value);
            }
        }
    }
}