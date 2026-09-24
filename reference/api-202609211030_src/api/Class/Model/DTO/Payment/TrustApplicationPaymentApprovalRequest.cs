using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.Payment
{
    public class TrustApplicationPaymentApprovalRequest
    {
        public string FinanceRemark { get; set; }
        public DateTime? CommencementDate { get; set; }
    }
}