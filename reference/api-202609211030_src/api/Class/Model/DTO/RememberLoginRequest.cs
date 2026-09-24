using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.Class
{
    public class RememberLoginRequest
    {
        public Guid RememberMeToken { get; set; }
        public string MerchantID { get; set; }
    }
}