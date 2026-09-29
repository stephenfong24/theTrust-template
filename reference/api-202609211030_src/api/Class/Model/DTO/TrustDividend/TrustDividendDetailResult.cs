using System;

namespace API_CPX.Class.Model.DTO.TrustDividend
{
    public class TrustDividendDetailResult
    {
        public long DividendScheduleID { get; set; }
        public long TrustApplicationID { get; set; }
        public long TrustID { get; set; }
        public string TrustNo { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }

        // ============================================================
        // Settlor
        // ============================================================

        public string SettlorName { get; set; }
        public string SettlorIdentityType { get; set; }
        public string SettlorIdentityNo { get; set; }
        public string SettlorEmail { get; set; }
        public string SettlorContactNo { get; set; }

        // ============================================================
        // Trust Asset
        // ============================================================

        public decimal? TrustAssetAmount { get; set; }

        // ============================================================
        // Dividend Schedule
        // ============================================================

        public int ScheduleNo { get; set; }
        public int ReturnYear { get; set; }
        public int PeriodNo { get; set; }
        public string DividendMethod { get; set; }
        public string PayoutFrequency { get; set; }
        public string CalculationStart { get; set; }
        public DateTime PeriodStartDate { get; set; }
        public DateTime PeriodEndDate { get; set; }
        public DateTime PayoutDate { get; set; }

        // ============================================================
        // Calculation
        // ============================================================

        public decimal CalculationBasisAmount { get; set; }
        public decimal AnnualRate { get; set; }
        public decimal PeriodRate { get; set; }
        public decimal BaseDividendAmount { get; set; }
        public decimal BonusAmount { get; set; }
        public decimal TotalReturnAmount { get; set; }

        // ============================================================
        // Return
        // ============================================================

        public string ReturnOption { get; set; }
        public bool IsRedeposit { get; set; }
        public decimal PayoutAmount { get; set; }
        public decimal RedepositAmount { get; set; }

        // ============================================================
        // Status
        // ============================================================

        public string Status { get; set; }
        public DateTime? PaidAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string StatusRemark { get; set; }

        // ============================================================
        // Settlor Bank
        // ============================================================

        public string SettlorBankName { get; set; }
        public string SettlorBankNameDetail { get; set; }
        public string SettlorBankAccountHolder { get; set; }
        public string SettlorBankAccountNumber { get; set; }
        public string SettlorSwiftCode { get; set; }
        public string SettlorBankAddress { get; set; }

        // ============================================================
        // Permission
        // ============================================================

        public bool CanProcess { get; set; }
        public bool CanMarkPaid { get; set; }
        public bool CanCancel { get; set; }

        // ============================================================
        // Audit
        // ============================================================

        public DateTime CreatedAt { get; set; }
        public long CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
    }
}