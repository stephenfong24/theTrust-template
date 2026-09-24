using API_CPX.Class.Model.DTO.Payment;
using API_CPX.Class.Model.DTO.TrustApplication;
using API_CPX.Class.Model.TrustApplication;
using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO
{
    public class TrustApplicationDetailResult
    {
        // ============================================================
        // Application Header
        // ============================================================

        public long TrustApplicationID { get; set; }
        public long TrustID { get; set; }
        public string TrustNo { get; set; }
        public string ProductCode { get; set; }
        public TrustApplicationPlanDetail TrustPlan { get; set; }
        public long MemberID { get; set; }
        public string ApplicationStatus { get; set; }
        public int CurrentStep { get; set; }
        public int LastCompletedStep { get; set; }
        public DateTime? CommencementDate { get; set; }
        public DateTime? MaturityDate { get; set; }
        public DateTime? RejectedAt { get; set; }
        public long? RejectedBy { get; set; }
        public DateTime? EarlyWithdrawnAt { get; set; }
        public long? EarlyWithdrawnBy { get; set; }

        // ============================================================
        // Status Flow
        // ============================================================

        public List<TrustApplicationStatusFlowResult> StatusFlow { get; set; }

        // ============================================================
        // Status Flow History
        // ============================================================

        public List<TrustApplicationStatusFlowHistoryResult> StatusFlowHistory { get; set; }

        // ============================================================
        // Payment
        // ============================================================

        public TrustApplicationPaymentListResult Payment { get; set; }

        // ============================================================
        // Application History
        // ============================================================

        public List<TrustApplicationHistoryResult> History { get; set; }

        // ============================================================
        // Document
        // ============================================================

        public List<TrustApplicationGeneratedDocumentResult> Documents { get; set; }

        // ============================================================
        // Audit
        // ============================================================

        public DateTime CreatedAt { get; set; }
        public long? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public long? SubmittedBy { get; set; }

        // ============================================================
        // Step Status
        //
        // Mainly useful for Agent wizard UI.
        // Do not use these values as Admin edit permission.
        // ============================================================

        public TrustApplicationStepStatus StepStatus { get; set; }

        // ============================================================
        // Step 1
        // ============================================================

        public TrustApplicationStep1Request Step1 { get; set; }

        // ============================================================
        // Step 2
        // ============================================================

        public TrustApplicationStep2Request Step2 { get; set; }

        // ============================================================
        // Step 3
        // ============================================================

        public TrustApplicationStep3Request Step3 { get; set; }

        // ============================================================
        // Step 4
        // ============================================================

        public TrustApplicationStep4Request Step4 { get; set; }

        // ============================================================
        // Step 5
        // ============================================================

        public TrustApplicationStep5Request Step5 { get; set; }

        // ============================================================
        // Step 6
        // ============================================================

        public TrustApplicationStep6Detail Step6 { get; set; }

        // ============================================================
        // Step 7
        // ============================================================

        public TrustApplicationStep7Request Step7 { get; set; }
    }

    public class TrustApplicationPlanDetail
    {
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string ProductCategory { get; set; }
        public string ProductDescription { get; set; }
        public decimal MinimumPlacement { get; set; }
        public decimal? MaximumPlacement { get; set; }
        public int FundManagementPeriod { get; set; }
        public string FundManagementPeriodUnit { get; set; }
    }

    public class TrustApplicationStepStatus
    {
        public bool Step1Completed { get; set; }
        public bool Step2Completed { get; set; }
        public bool Step3Completed { get; set; }
        public bool Step4Completed { get; set; }
        public bool Step5Completed { get; set; }
        public bool Step6Completed { get; set; }
        public bool Step7Completed { get; set; }
    }


    public class TrustApplicationStep6Detail
    {
        public long TrustID { get; set; }
        public List<TrustApplicationSupportingDocumentReview> SupportingDocuments { get; set; }
    }
}