using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO
{
    public class CreateRegistrationSessionRequest
    {
        public string MerchantID { get; set; }
        public string ReferralCode { get; set; }
    }
}