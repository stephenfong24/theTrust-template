using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.Payment
{
    public class TrustApplicationPaymentListResult
    {
        public long TrustID { get; set; }

        public string ApplicationStatus { get; set; }

        public decimal TrustAssetAmount { get; set; }

        // Total amount allocated into payment records.
        // Example:
        // RM20,000 + RM20,000 + RM10,000 = RM50,000
        public decimal AllocatedAmount { get; set; }

        public string PaymentSource { get; set; }

        public PaymentSourceResult PaymentSourceDetail { get; set; }

        // PENDING_APPROVAL + APPROVED
        public decimal SubmittedAmount { get; set; }

        // APPROVED only
        public decimal ApprovedAmount { get; set; }

        // PENDING_APPROVAL only
        public decimal PendingAmount { get; set; }

        // TrustAssetAmount - SubmittedAmount
        public decimal RemainingToSubmit { get; set; }

        // TrustAssetAmount - ApprovedAmount
        public decimal RemainingToApprove { get; set; }
        public decimal UnallocatedAmount { get; set; }
        public IEnumerable<TrustApplicationPaymentResult> Payments { get; set; }
    }

    public class PaymentSourceResult
    {
        public string BankName { get; set; }

        public string OtherBankName { get; set; }

        public string AccountHolder { get; set; }

        public string AccountNumber { get; set; }

        public string SwiftCode { get; set; }

        public string BankAddress { get; set; }

        public string JointAccountHolderName { get; set; }

        public string ThirdPartyName { get; set; }

        public string ThirdPartyIdentityNo { get; set; }

        public string ThirdPartyRelationship { get; set; }

        public string ThirdPartyOtherRelationship { get; set; }
    }
}