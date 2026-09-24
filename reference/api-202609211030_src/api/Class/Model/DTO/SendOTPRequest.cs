using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.Class
{
    public class SendOTPRequest
    {
        public string MerchantID { get; set; }
        public long UserID { get; set; }
        public string ActionType { get; set; }
        public string SendMethod { get; set; }
        public string ReceiverAddress { get; set; }
    }
}