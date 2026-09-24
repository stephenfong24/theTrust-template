using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PhilippinesOTP.Model
{
    public class BalanceResponse: BasicResponse
    {
        public string appkey { get; set; }
        public string balance_time { get; set; }
        public decimal balance { get; set; }
    }
}
