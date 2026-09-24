using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.Class
{
    public class LoginRequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public string MerchantID { get; set; }
        public bool RememberMe { get; set; }
    }
}