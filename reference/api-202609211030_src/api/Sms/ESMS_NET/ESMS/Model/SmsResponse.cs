using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace ESMS.Model
{
    public class SmsResponse
    {
        public long status { get; set; }
        public string message { get; set; }
        public string id { get; set; }
        public double creditDeducted { get; set; }
        public long parts { get; set; }
        public long type { get; set; }
        public decimal balance { get; set; }
    }
}
