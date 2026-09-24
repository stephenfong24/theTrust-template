using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO
{
    public class TrustApplicationStep7Request
    {
        public long TrustID { get; set; }
        public List<TrustApplicationCoBrokerRequest> CoBrokers { get; set; }
    }


    public class TrustApplicationCoBrokerRequest
    {
        public string Email { get; set; }
        public decimal? AllocationPercentage { get; set; }
    }
}