using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace PhilippinesOTP.Model
{
    public class ResultSend : BasicResponse
    {
        public long code { get; set; }
        public string desc { get; set; }
        public decimal balance { get; set; }
    }
}