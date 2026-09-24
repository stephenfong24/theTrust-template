using System.Web;

namespace API_CPX.Class.Helper
{
    public class ErrorLogContext
    {
        public string RawUrl { get; set; }
        public long LoginID { get; set; }
        public string Browser { get; set; }
        public string Version { get; set; }
        public string IP { get; set; }
        public string SessionID { get; set; }

        public static ErrorLogContext GetErrorContext()
        {
            var context = HttpContext.Current;

            string ip = "";

            try
            {
                if (context?.Request != null)
                {
                    ip = context.Request.ServerVariables["HTTP_X_FORWARDED_FOR"];

                    if (string.IsNullOrWhiteSpace(ip))
                    {
                        ip = context.Request.UserHostAddress;
                    }
                }
            }
            catch
            {
                ip = "";
            }

            return new ErrorLogContext
            {
                RawUrl = context?.Request?.RawUrl ?? "NA",
                Browser = context?.Request?.Browser?.Browser ?? "",
                Version = context?.Request?.Browser?.Version ?? "",
                IP = ip,
                SessionID = context?.Session?.SessionID ?? "",
                LoginID = 0
            };
        }
    }
}