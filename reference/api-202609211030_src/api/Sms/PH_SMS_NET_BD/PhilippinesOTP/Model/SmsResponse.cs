using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace PhilippinesOTP.Model
{
    public class SmsResponse : BasicResponse
    {
        public string uid { get; set; }
        public decimal balance { get; set; }
        public DataResponse[] result { get; set; }
    }
    public class DataResponse {
        public string status { get; set; }
        public string phone { get; set; }
        public string desc { get; set; }
    }
}

