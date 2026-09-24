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
        public TrustApplicationStatusStatistic TotalStatistics { get; set; }
        public TrustApplicationStatusStatistic SearchStatistics { get; set; }
        public List<TrustApplicationListItem> Applications { get; set; }
    }

    public class TrustApplicationStatusStatistic
    {
        public int Total { get; set; }
        public int Draft { get; set; }
        public int PendingPaymentApproval { get; set; }
        public int PaymentApproved { get; set; }
        public int PendingAdminApproval { get; set; }
        public int SentOut { get; set; }
        public int Stamping { get; set; }
        public int Completed { get; set; }
        public int Rejected { get; set; }
        public int EarlyWithdrawn { get; set; }
        public int Matured { get; set; }
    }

    public class TrustApplicationListItem
    {
        public long TrustApplicationID { get; set; }
        public long TrustID { get; set; }
        public string TrustNo { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public long MemberID { get; set; }
        public string TrustRepresentativeUsername { get; set; }
        public string TrustRepresentativeFullName { get; set; }
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