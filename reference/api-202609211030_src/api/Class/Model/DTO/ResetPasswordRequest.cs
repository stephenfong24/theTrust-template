using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.Class
{
    public class RequestResetPasswordRequest
    {
        public string Username { get; set; }
        public string MerchantID { get; set; }
    }

    public class ResetPasswordRequest
    {
        public string MerchantID { get; set; }
        public string UniqueID { get; set; }
        public string NewLoginPassword { get; set; }
        public string ConfirmLoginPassword { get; set; }
    }
}