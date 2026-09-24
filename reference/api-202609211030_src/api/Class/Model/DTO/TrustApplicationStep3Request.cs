using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.TrustApplication
{
    public class TrustApplicationStep3Request
    {
        public long TrustID { get; set; }
        public TrustApplicationCaretakerDistributionRequest CaretakerDistribution { get; set; }
        public TrustApplicationMinorDistributionRequest MinorDistribution { get; set; }
        public List<TrustApplicationBeneficiaryRequest> Beneficiaries { get; set; }
    }

    // ============================================================
    // Caretaker Distribution
    // ============================================================

    public class TrustApplicationCaretakerDistributionRequest
    {
        public bool Enabled { get; set; }
        public TrustApplicationCaretakerRequest Main { get; set; }
        public TrustApplicationCaretakerRequest Substitute { get; set; }
    }

    public class TrustApplicationCaretakerRequest
    {
        public string Name { get; set; }
        public string IdentityNo { get; set; }
        public string ContactNo { get; set; }
    }

    public class TrustApplicationBeneficiaryRequest
    {
        // Null = New Beneficiary
        // Value = Existing Beneficiary
        public long? BeneficiaryID { get; set; }
        public string BeneficiaryClientID { get; set; }

        // ============================================================
        // Identity Information
        // ============================================================

        public string FullName { get; set; }
        public string IdentityType { get; set; }
        public string IdentityNo { get; set; }
        public string Nationality { get; set; }
        public string Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string Email { get; set; }
        public string ContactNo { get; set; }

        // ============================================================
        // Relationship
        // ============================================================

        public string RelationshipCode { get; set; }
        public string OtherRelationship { get; set; }

        // ============================================================
        // Address
        // ============================================================

        public string AddressLine1 { get; set; }
        public string AddressLine2 { get; set; }
        public string Postcode { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string Country { get; set; }

        // ============================================================
        // Tax Information
        // ============================================================

        public bool? IsUSTaxPayer { get; set; }
        public bool? HasOtherTaxResidence { get; set; }
        public string TaxResidenceCountry { get; set; }
        public string TaxIdentificationNo { get; set; }
        public string TINUnavailableReason { get; set; }
        public string TINUnavailableExplanation { get; set; }
    }

    public class TrustApplicationMinorDistributionRequest
    {
        public bool DistributeToGuardian { get; set; }
        public bool HoldByTrusteeCompany { get; set; }
        public int? ReleaseAge { get; set; }
    }
}