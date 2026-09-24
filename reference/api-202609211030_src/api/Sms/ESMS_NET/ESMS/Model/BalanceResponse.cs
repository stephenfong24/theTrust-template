using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ESMS.Model
{
    public class BalanceResponse
    {
        public long status { get; set; }
        public string message { get; set; }
        public string id { get; set; }
        public decimal balance { get; set; }
    }
}
