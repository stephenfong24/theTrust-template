using API_CPX.Class.Model.DTO;
using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.TrustApplication
{
    public class TrustApplicationStep8ReviewResult
    {
        public long TrustApplicationID { get; set; }
        public long TrustID { get; set; }
        public string TrustNo { get; set; }
        public string ProductCode { get; set; }
        public string ApplicationStatus { get; set; }
        public int CurrentStep { get; set; }
        public int LastCompletedStep { get; set; }
        public object PersonalDetails { get; set; }
        public TrustApplicationStep2Request TrustAsset { get; set; }
        public TrustApplicationStep3Request BeneficiaryDetails { get; set; }
        public TrustApplicationStep4Request BeneficiaryAllocation { get; set; }
        public object TrustDeedExecution { get; set; }
        public List<TrustApplicationSupportingDocumentReview> SupportingDocuments { get; set; }
        public List<TrustApplicationCoBrokerReview> CoBrokers { get; set; }
    }


    public class TrustApplicationSupportingDocumentReview
    {
        public long SupportingDocumentID { get; set; }
        public string OriginalFileName { get; set; }
        public string FileExtension { get; set; }
        public long FileSize { get; set; }
        public string FileUrl { get; set; }
        public string SHA256 { get; set; }
        public DateTime CreatedAt { get; set; }
    }


    public class TrustApplicationCoBrokerReview
    {
        public long MemberID { get; set; }
        public string Email { get; set; }
        public decimal AllocationPercentage { get; set; }
    }
}