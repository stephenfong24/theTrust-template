using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.Class
{
    public class ApiRequestLog
    {
        public Guid RequestID { get; set; }
        public DateTime RequestTime { get; set; }
        public DateTime? ResponseTime { get; set; }
        public int? DurationMs { get; set; }
        public string UserID { get; set; }
        public string MerchantID { get; set; }
        public string HttpMethod { get; set; }
        public string RequestUrl { get; set; }
        public string ControllerName { get; set; }
        public string ActionName { get; set; }
        public string IpAddress { get; set; }
        public string UserAgent { get; set; }
        public string RequestHeaders { get; set; }
        public string RequestBody { get; set; }
        public int? ResponseStatusCode { get; set; }
        public string ResponseBody { get; set; }
        public string ActivityTitle { get; set; }
        public string Description { get; set; }
        public bool? IsSuccess { get; set; }
        public string ExceptionMessage { get; set; }
    }
}