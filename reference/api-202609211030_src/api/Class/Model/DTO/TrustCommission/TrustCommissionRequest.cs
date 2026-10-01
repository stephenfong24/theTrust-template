using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.TrustCommission
{
    // =========================================================
    // Commission Batch Listing
    // =========================================================

    public class TrustCommissionBatchListRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string Search { get; set; }
        public string BatchStatus { get; set; }
        public DateTime? CutoffDateFrom { get; set; }
        public DateTime? CutoffDateTo { get; set; }
        public string SortBy { get; set; } = "CREATED_AT";
        public string SortDirection { get; set; } = "DESC";
    }

    public class TrustCommissionBatchListResult
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }
        public List<TrustCommissionBatchListItem> Batches { get; set; }
    }

    public class TrustCommissionBatchListItem
    {
        public long BatchID { get; set; }
        public string BatchNo { get; set; }
        public DateTime CutoffDate { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string BatchStatus { get; set; }
        public int TotalSource { get; set; }
        public int ProcessedSource { get; set; }
        public int FailedSource { get; set; }
        public int TotalCommissionRecords { get; set; }
        public decimal TotalCommissionAmount { get; set; }
        public string ErrorMessage { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // =========================================================
    // Commission Listing
    // =========================================================

    public class TrustCommissionListRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string BatchNo { get; set; }

        /// <summary>
        /// Search by Trust ID.
        /// </summary>
        public string TrustSearch { get; set; }

        /// <summary>
        /// Search selling agent by:
        /// Username / Fullname / Identity ID.
        /// </summary>
        public string SellingAgentSearch { get; set; }

        /// <summary>
        /// Search recipient agent by:
        /// Username / Fullname / Identity ID.
        /// </summary>
        public string RecipientAgentSearch { get; set; }

        /// <summary>
        /// Search settlor by:
        /// Fullname / Email / Identity ID / Contact Number.
        /// </summary>
        public string SettlorSearch { get; set; }
        public DateTime? PayoutDateFrom { get; set; }
        public DateTime? PayoutDateTo { get; set; }

        /// <summary>
        /// ALL / CALCULATED / PAID / CANCELLED
        /// </summary>
        public string CommissionStatus { get; set; }
        public string SortBy { get; set; } = "PAYOUT_DATE";
        public string SortDirection { get; set; } = "DESC";
    }

    public class TrustCommissionListResult
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }

        /// <summary>
        /// Statistics before listing filters.
        /// Merchant scoped.
        /// </summary>
        public TrustCommissionStatistics TotalStatistics { get; set; }

        /// <summary>
        /// Statistics after current listing filters.
        /// </summary>
        public TrustCommissionStatistics SearchStatistics { get; set; }
        public List<TrustCommissionListItem> Commissions { get; set; }
    }

    public class TrustCommissionStatistics
    {
        public int TotalRecords { get; set; }
        public int CalculatedRecords { get; set; }
        public int PaidRecords { get; set; }
        public int CancelledRecords { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal CalculatedAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal CancelledAmount { get; set; }
    }

    public class TrustCommissionListItem
    {
        public long CommissionID { get; set; }
        public string CommissionNo { get; set; }
        public long BatchID { get; set; }
        public string BatchNo { get; set; }
        public long TrustApplicationID { get; set; }
        public long TrustID { get; set; }
        public string TrustNo { get; set; }
        public string ProductCode { get; set; }
        public TrustCommissionAgentResult SellingAgent { get; set; }
        public TrustCommissionAgentResult RecipientAgent { get; set; }
        public TrustCommissionSettlorResult Settlor { get; set; }
        public string CommissionMethod { get; set; }
        public string CommissionType { get; set; }
        public string RequiredRankCode { get; set; }
        public string RecipientRankCode { get; set; }
        public int NetworkLevel { get; set; }
        public bool IsCompressed { get; set; }
        public int CompressedLevels { get; set; }
        public string CalculationBasis { get; set; }
        public decimal PlacementAmount { get; set; }
        public decimal CommissionRate { get; set; }
        public decimal CommissionAmount { get; set; }
        public string CommissionPeriod { get; set; }

        /// <summary>
        /// Mapped from tbl_TrustCommission.CommissionDate.
        /// </summary>
        public DateTime PayoutDate { get; set; }
        public string CommissionStatus { get; set; }
        public string StatusRemark { get; set; }
        public DateTime? StatusUpdatedAt { get; set; }
        public long? StatusUpdatedBy { get; set; }
        public string StatusUpdatedByUsername { get; set; }
        public string StatusUpdatedByFullName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // =========================================================
    // Commission Detail
    // =========================================================

    public class TrustCommissionDetailResult
    {
        public long CommissionID { get; set; }
        public string CommissionNo { get; set; }
        public TrustCommissionBatchResult Batch { get; set; }
        public TrustCommissionApplicationResult Application { get; set; }
        public long CommissionSourceID { get; set; }
        public TrustCommissionAgentResult SellingAgent { get; set; }
        public TrustCommissionAgentResult RecipientAgent { get; set; }
        public TrustCommissionBankResult RecipientBank { get; set; }
        public TrustCommissionSettlorResult Settlor { get; set; }
        public string CommissionMethod { get; set; }
        public string CommissionType { get; set; }
        public string RequiredRankCode { get; set; }
        public string RecipientRankCode { get; set; }
        public int NetworkLevel { get; set; }
        public bool IsCompressed { get; set; }
        public int CompressedLevels { get; set; }
        public string CalculationBasis { get; set; }
        public decimal PlacementAmount { get; set; }
        public decimal CommissionRate { get; set; }
        public decimal CommissionAmount { get; set; }
        public string CommissionPeriod { get; set; }
        public DateTime PayoutDate { get; set; }
        public string CommissionStatus { get; set; }
        public string StatusRemark { get; set; }
        public DateTime? StatusUpdatedAt { get; set; }
        public long? StatusUpdatedBy { get; set; }
        public string StatusUpdatedByUsername { get; set; }
        public string StatusUpdatedByFullName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // =========================================================
    // Batch Detail
    // =========================================================

    public class TrustCommissionBatchResult
    {
        public long BatchID { get; set; }
        public string BatchNo { get; set; }
        public DateTime CutoffDate { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string BatchStatus { get; set; }
        public int TotalSource { get; set; }
        public int ProcessedSource { get; set; }
        public int FailedSource { get; set; }
        public int TotalCommissionRecords { get; set; }
        public decimal TotalCommissionAmount { get; set; }
        public string ErrorMessage { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // =========================================================
    // Trust Application
    // =========================================================

    public class TrustCommissionApplicationResult
    {
        public long TrustApplicationID { get; set; }
        public long TrustID { get; set; }
        public string TrustNo { get; set; }
        public string ProductCode { get; set; }
        public string ApplicationStatus { get; set; }
        public DateTime? CommencementDate { get; set; }
        public DateTime? MaturityDate { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    // =========================================================
    // Agent
    // =========================================================

    public class TrustCommissionAgentResult
    {
        public long MemberID { get; set; }
        public string Username { get; set; }
        public string FullName { get; set; }
        public string IdentityNo { get; set; }
        public string Email { get; set; }
        public string ContactNo { get; set; }
    }

    // =========================================================
    // Settlor
    // =========================================================

    public class TrustCommissionSettlorResult
    {
        public string FullName { get; set; }
        public string IdentityType { get; set; }
        public string IdentityNo { get; set; }
        public string Email { get; set; }
        public string ContactNo { get; set; }
    }

    // =========================================================
    // Recipient Bank
    // =========================================================

    public class TrustCommissionBankResult
    {
        public long BankID { get; set; }
        public string AccountName { get; set; }
        public string AccountNumber { get; set; }
        public string BankName { get; set; }
        public string BankNameDetail { get; set; }
        public string BankBranch { get; set; }
        public string SwiftCode { get; set; }
        public string IBAN { get; set; }
        public string BankCountry { get; set; }
    }

    // =========================================================
    // Update Commission Status
    // =========================================================

    public class TrustCommissionStatusUpdateRequest
    {
        /// <summary>
        /// PAID / CANCELLED
        /// </summary>
        public string Status { get; set; }

        /// <summary>
        /// Optional payment/cancellation remark.
        /// Maximum 1000 characters.
        /// </summary>
        public string Remark { get; set; }
    }

    public class TrustCommissionStatusUpdateResult
    {
        public long CommissionID { get; set; }
        public string CommissionNo { get; set; }
        public string PreviousStatus { get; set; }
        public string CommissionStatus { get; set; }
        public string StatusRemark { get; set; }
        public DateTime StatusUpdatedAt { get; set; }
        public long StatusUpdatedBy { get; set; }
    }
}