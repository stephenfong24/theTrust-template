using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.Class
{
    public class Response
    {
        public int Status { get; set; } // 1 = success, 0 = failed

        public string Message { get; set; }

        public string Code { get; set; }
        public object Data { get; set; }
    }
}