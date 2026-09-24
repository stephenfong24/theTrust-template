using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.TrustApplication
{
    public class TrustApplicationListResult
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }
        public List<TrustApplicationListItem> Applications { get; set; }
    }

    public class TrustApplicationListItem
    {
        public long TrustApplicationID { get; set; }
        public long TrustID { get; set; }
        public string TrustNo { get; set; }
        public string ProductCode { get; set; }
        public long MemberID { get; set; }
        // Applicant / Settlor
        public string FullName { get; set; }
        public string IdentityType { get; set; }
        public string IdentityNo { get; set; }
        public string Email { get; set; }
        public string ContactNo { get; set; }
        public decimal? TrustAssetAmount { get; set; }
        public string ApplicationStatus { get; set; }
        public int CurrentStep { get; set; }
        public int LastCompletedStep { get; set; }
        public DateTime CreatedAt { get; set; }
        public long? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public long? SubmittedBy { get; set; }
    }
}