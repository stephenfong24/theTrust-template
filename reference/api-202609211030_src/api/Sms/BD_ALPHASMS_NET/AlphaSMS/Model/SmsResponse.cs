using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace AlphaSMS.Model
{
    public class SmsResponse
    {
        public long error { get; set; }
        public string msg { get; set; }
        public decimal balance { get; set; }
        public DataSMS data { get; set; }
    }
    public class DataSMS
    {
        public long request_id { get; set; }
    }
}
