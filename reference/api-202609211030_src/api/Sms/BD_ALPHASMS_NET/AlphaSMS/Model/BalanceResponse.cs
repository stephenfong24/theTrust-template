using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AlphaSMS.Model
{
    public class BalanceResponse
    {
        public long error { get; set; }
        public string msg { get; set; }
        public DataBalance data { get; set; }
    }
    public class DataBalance { 
        public decimal balance { get; set; }
    }
}
