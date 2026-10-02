using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.Document
{
    public class IntroductionFormBeneficiaryDocumentModel
    {
        public int No { get; set; }
        public string FullName { get; set; }
        public string IdentityType { get; set; }
        public string IdentityNo { get; set; }
        public string Nationality { get; set; }
        public string Gender { get; set; }
        public string DateOfBirth { get; set; }
        public string Relationship { get; set; }
        public string AddressLine1 { get; set; }
        public string AddressLine2 { get; set; }
        public string Postcode { get; set; }
        public string State { get; set; }
        public string Country { get; set; }
        public string Email { get; set; }
        public string ContactNo { get; set; }
        public bool IsUSTaxPayer { get; set; }
        public bool HasOtherTaxResidence { get; set; }
        public string TaxResidenceCountry { get; set; }
        public string TaxIdentificationNo { get; set; }
        public string TINUnavailableReason { get; set; }
    }

    public class IntroductionFormAllocationDocumentModel
    {
        public string RoleType { get; set; }
        public string BeneficiaryName { get; set; }
        public decimal Percentage { get; set; }
    }
}