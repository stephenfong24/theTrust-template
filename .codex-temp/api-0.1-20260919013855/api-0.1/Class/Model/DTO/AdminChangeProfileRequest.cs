using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO
{
    public class AdminChangeProfileRequest
    {
        public string Username { get; set; }
        public string Fullname { get; set; }
    }

    public class AdminChangePasswordRequest
    {
        public long UserID { get; set; }
        public string LoginPassword { get; set; }
        public string ConfirmLoginPassword { get; set; }
        public string CreatedBy { get; set; }
    }

    public class EditAdministratorRequest : Base
    {
        public string MerchantID { get; set; }
        public long UserID { get; set; }
        public string Username { get; set; }
        public string Fullname { get; set; }
        public string RoleCode { get; set; }
        public int TrustAccess { get; set; }
        public int WillAccess { get; set; }
        public int LoginStatus { get; set; }
        public string CreatedBy { get; set; }
    }
}