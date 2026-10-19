using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.SharedAccount
{
    public class SharedAccountValidateRequest
    {
        [Required]
        public string MerchantID { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Sponsor { get; set; }
    }

    public class SharedAccountSendOtpRequest : SharedAccountValidateRequest
    {

    }

    public class SharedAccountCompleteRequest : SharedAccountValidateRequest
    {
        public int? Ranking { get; set; }

        [Required]
        public string OTP { get; set; }
    }

    public class SharedAccountRegistrationResult
    {
        public long MemberID { get; set; }
        public long ReferenceID { get; set; }
        public string ReferralCode { get; set; }
        public string MerchantID { get; set; }
        public string ReferenceType { get; set; }
        public int Ranking { get; set; }
        public bool Success { get; set; }
    }

    public class SharedAccountValidationResult
    {
        public long MemberID { get; set; }
        public string Email { get; set; }
        public string TargetMerchantID { get; set; }
        public string SourceMerchantID { get; set; }
        public string Sponsor { get; set; }
        public string SponsorName { get; set; }
        public string ActionType { get; set; }
        public string TargetReferenceType { get; set; }
    }
}