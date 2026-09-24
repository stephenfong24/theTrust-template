using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.Class
{
    public class RegisterRequest
    {
        public string MerchantID { get; set; }
        public string RoleCode { get; set; }
        public string Sponsor { get; set; }
        public string CountryMobileCode { get; set; }
        public string Mobile { get; set; }
        public string Username { get; set; }
        public string Fullname { get; set; }
        public string DateOfBirth { get; set; }
        public string IdentityType { get; set; }
        public string IdentityID { get; set; }
        public string Address_1 { get; set; }
        public string Address_2 { get; set; }
        public string Postcode { get; set; }
        public string State { get; set; }
        public string City { get; set; }
        public string Country_Domain { get; set; }
        public string Occupation { get; set; }
        public string TinNumber { get; set; }
        public string LoginPassword { get; set; }
        public string ConfirmLoginPassword { get; set; }
        public string BankName { get; set; }
        public string AccountName { get; set; }
        public string AccountNumber { get; set; }
        public string IdentityFrontPublicID { get; set; }
        public string IdentityBackPublicID { get; set; }
        public string PassportPublicID { get; set; }
        public string SSMPublicID { get; set; }
        public string OTP { get; set; }
    }
}