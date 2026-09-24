using System;

namespace API_CPX.Class.Model.TrustApplication
{
    public class TrustApplicationStep2Request
    {
        public long TrustID { get; set; }

        // ============================================================
        // Trust Asset
        // ============================================================

        public decimal? TrustAssetAmount { get; set; }

        // ============================================================
        // Settlor Bank Account Details
        // ============================================================

        public string SettlorBankName { get; set; }
        public string SettlorOtherBankName { get; set; }
        public string SettlorBankAccountHolder { get; set; }
        public string SettlorBankAccountNumber { get; set; }
        public string SettlorSwiftCode { get; set; }
        public string SettlorBankAddress { get; set; }

        // ============================================================
        // Guaranteed Returns
        // ============================================================

        public string GuaranteedReturnOption { get; set; }

        // ============================================================
        // Payments to Trustee
        // ============================================================

        public string PaymentSource { get; set; }

        // ============================================================
        // Joint Account
        // ============================================================

        public string JointAccountHolderName { get; set; }

        // ============================================================
        // Third Party
        // ============================================================

        public string ThirdPartyName { get; set; }
        public string ThirdPartyIdentityNo { get; set; }
        public string ThirdPartyRelationship { get; set; }
        public string ThirdPartyOtherRelationship { get; set; }
        public string ThirdPartyBankName { get; set; }
        public string ThirdPartyOtherBankName { get; set; }
        public string ThirdPartyBankAccountHolder { get; set; }
        public string ThirdPartyBankAccountNumber { get; set; }
    }
}