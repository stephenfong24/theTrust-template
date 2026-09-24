using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.Payment
{
    public class TrustApplicationPaymentAllocationRequest
    {
        public List<TrustApplicationPaymentAllocationItemRequest> Payments
        {
            get;
            set;
        }
    }

    public class TrustApplicationPaymentAllocationItemRequest
    {
        public decimal Amount
        {
            get;
            set;
        }
    }

    public class TrustApplicationPaymentAllocationAddRequest
    {
        public List<TrustApplicationPaymentAllocationAddItemRequest> Payments
        {
            get;
            set;
        }
    }

    public class TrustApplicationPaymentAllocationAddItemRequest
    {
        public decimal Amount
        {
            get;
            set;
        }
    }
}