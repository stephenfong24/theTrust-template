using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO
{
    /*public class AgentChangeProfileRequest
    {
        public string DateOfBirth { get; set; }
        public string CountryMobileCode { get; set; }
        public string Mobile { get; set; }
        public string Country_Domain { get; set; }
        public string Postcode { get; set; }
        public string State { get; set; }
        public string City { get; set; }
        public string Address_1 { get; set; }
        public string Address_2 { get; set; }
        public string Occupation { get; set; }
        public string TinNumber { get; set; }
        public string BankName { get; set; }
        public string AccountName { get; set; }
        public string AccountNumber { get; set; }
    }*/

    public class AgentChangeProfileRequest
    {
        public string Displayname { get; set; }
    }

    public class AgentChangeBankRequest
    {
        public string BankName { get; set; }
        public string AccountName { get; set; }
        public string AccountNumber { get; set; }
    }

    public class AgentChangeEmailRequest
    {
        public string Username { get; set; }
        public string OTP { get; set; }
    }

    public class AdminChangeAgentProfileRequest
    {
        public long UserID { get; set; }
        public string Username { get; set; }
        public string Displayname { get; set; }
        public string CountryMobileCode { get; set; }
        public string Mobile { get; set; }
        public string Country_Domain { get; set; }
        public string Postcode { get; set; }
        public string State { get; set; }
        public string City { get; set; }
        public string Address_1 { get; set; }
        public string Address_2 { get; set; }
        public bool LoginStatus { get; set; }
        public long CreatedBy { get; set; }
    }

    public class AdminChangeAgentIdentityRequest
    {
        public long UserID { get; set; }
        public string Fullname { get; set; }
        public string DateOfBirth { get; set; }
        public string IdentityType { get; set; }
        public string IdentityID { get; set; }
        public string Occupation { get; set; }
        public string TinNumber { get; set; }
        public string IdentityFrontPublicID { get; set; }
        public string IdentityBackPublicID { get; set; }
        public string PassportPublicID { get; set; }
        public string SSMPublicID { get; set; }
        public long CreatedBy { get; set; }
    }

    public class AdminChangeAgentBankRequest
    {
        public long UserID { get; set; }
        public string BankName { get; set; }
        public string AccountName { get; set; }
        public string AccountNumber { get; set; }
        public long CreatedBy { get; set; }
    }
}