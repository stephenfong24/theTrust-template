using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.Class
{
    public class LogoutRequest
    {
        public long UserID { get; set; }
        public Guid? RememberMeToken { get; set; }
    }
}