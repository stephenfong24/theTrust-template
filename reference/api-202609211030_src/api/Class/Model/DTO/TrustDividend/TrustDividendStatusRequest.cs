using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.TrustDividend
{
    public class TrustDividendStatusRequest
    {
        // PAID / CANCELLED
        public string Status { get; set; }
        public string Remark { get; set; }
    }
}