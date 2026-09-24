using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.Class
{
    public class ChangePasswordRequest
    {
        public string OldPassword { get; set; }
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }
    }

    public class AdminChangeAgentPasswordRequest
    {
        public long UserID { get; set; }
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }
        public string CreatedBy { get; set; }
    }
}