using System;

namespace API_CPX.Class.Model.DTO.TrustDividend
{
    public class TrustDividendListRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        // Trust No / Settlor Name / Identity No /
        // Bank Name / Bank Account No
        public string Search { get; set; }
        // SCHEDULED / DUE / PAID / CANCELLED
        public string Status { get; set; }
        public string ProductCode { get; set; }
        // TRANSFER_TO_BANK / REDEPOSIT_AS_TRUST_ASSET
        public string ReturnOption { get; set; }
        public DateTime? PayoutDateFrom { get; set; }
        public DateTime? PayoutDateTo { get; set; }
        // FINANCE_PRIORITY
        // PAYOUT_DATE
        // TRUST_ID
        // SETTLOR_NAME
        // DIVIDEND_AMOUNT
        // STATUS
        public string SortBy { get; set; } = "FINANCE_PRIORITY";
        // ASC / DESC
        public string SortDirection { get; set; } = "ASC";
    }
}