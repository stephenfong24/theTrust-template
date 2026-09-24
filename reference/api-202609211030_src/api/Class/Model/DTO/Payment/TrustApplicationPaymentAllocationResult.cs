using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.Payment
{
    public class TrustApplicationPaymentAllocationResult
    {
        public long TrustID { get; set; }
        public decimal TrustAssetAmount { get; set; }
        public decimal TotalAllocatedAmount { get; set; }
        public List<TrustApplicationPaymentResult> Payments
        {
            get;
            set;
        }
    }
}