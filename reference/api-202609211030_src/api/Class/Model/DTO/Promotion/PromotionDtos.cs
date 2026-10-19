using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.Promotion
{
    public class PromotionSaveRequest
    {
        public string PromotionType { get; set; }
        public string PromotionName { get; set; }
        public string PromotionCode { get; set; }
        public int RemainingBalance { get; set; }
        public string DiscountType { get; set; }
        public decimal DiscountAmount { get; set; }
        public string TargetUsername { get; set; }
        public DateTime? ExpiredDate { get; set; }
        public bool IsActive { get; set; } = true;
        public List<string> WillTypes { get; set; } = new List<string>();
    }

    // PromotionCode is intentionally excluded.
    public class PromotionUpdateRequest
    {
        public string PromotionType { get; set; }
        public string PromotionName { get; set; }
        public int RemainingBalance { get; set; }
        public string DiscountType { get; set; }
        public decimal DiscountAmount { get; set; }
        public string TargetUsername { get; set; }
        public DateTime? ExpiredDate { get; set; }
        public bool IsActive { get; set; }
        public List<string> WillTypes { get; set; } = new List<string>();
    }

    public class PromotionListRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string Search { get; set; }
        public string PromotionType { get; set; }
        public string DiscountType { get; set; }
        public string WillType { get; set; }
        public bool? IsActive { get; set; }
        public bool? HasBalance { get; set; }
        public string ExpiredStatus { get; set; }
        public string TargetUsername { get; set; }
        public string SortBy { get; set; } = "CreatedAt";
        public string SortDirection { get; set; } = "DESC";
    }

    public class PromotionResult
    {
        public long RowID { get; set; }
        public string PromotionType { get; set; }
        public string PromotionName { get; set; }
        public string PromotionCode { get; set; }
        public int RemainingBalance { get; set; }
        public string DiscountType { get; set; }
        public decimal DiscountAmount { get; set; }
        public long? TargetMemberID { get; set; }
        public string TargetUsername { get; set; }
        public DateTime? ExpiredDate { get; set; }
        public bool IsActive { get; set; }
        public bool IsExpired { get; set; }
        public bool IsDeleted { get; set; }
        public List<string> WillTypes { get; set; }
        public DateTime CreatedAt { get; set; }
        public long CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
    }

    public class PromotionPagedResult
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }
        public List<PromotionResult> Items { get; set; }
    }

    public class PromotionValidationRequest
    {
        public string PromotionCode { get; set; }
        public string PromotionType { get; set; }
        public string WillType { get; set; }
        public long MemberID { get; set; }
        public decimal OriginalAmount { get; set; }
    }

    public class PromotionValidationResult
    {
        public bool IsValid { get; set; }
        public string Code { get; set; }
        public string Message { get; set; }
        public long? PromotionID { get; set; }
        public string PromotionCode { get; set; }
        public string DiscountType { get; set; }
        public decimal ConfiguredDiscount { get; set; }
        public decimal AppliedDiscount { get; set; }
        public decimal FinalAmount { get; set; }
        public int RemainingBalance { get; set; }
    }

    public class PromotionUtilizationRequest : PromotionValidationRequest
    {
        public string ReferenceType { get; set; }
        public long ReferenceID { get; set; }
    }

    public class PromotionUtilizationResult
    {
        public long LogID { get; set; }
        public long PromotionID { get; set; }
        public string PromotionCode { get; set; }
        public decimal OriginalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public int RemainingBalance { get; set; }
        public bool AlreadyUtilized { get; set; }
    }
}