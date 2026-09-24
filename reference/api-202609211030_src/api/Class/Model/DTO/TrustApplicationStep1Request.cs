using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.TrustApplication
{
    public class TrustApplicationStep1Request
    {
        public long? TrustID { get; set; }
        public string ProductCode { get; set; }
        public string FullName { get; set; }
        public string IdentityType { get; set; }
        public string IdentityNo { get; set; }
        public string Nationality { get; set; }
        public string Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string Email { get; set; }
        public string ContactNo { get; set; }
        public string AddressLine1 { get; set; }
        public string AddressLine2 { get; set; }
        public string Postcode { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string Country { get; set; }
        public bool? IsUSTaxPayer { get; set; }
        public bool? HasOtherTaxResidence { get; set; }
        public string TaxResidenceCountry { get; set; }
        public string TaxIdentificationNo { get; set; }
        public string TINUnavailableReason { get; set; }
        public string TINUnavailableExplanation { get; set; }
        public string EmployerName { get; set; }
        public string NatureOfBusiness { get; set; }
        public string Occupation { get; set; }
        public string AnnualIncomeCode { get; set; }
        public string NetWorthCode { get; set; }
        public List<TrustApplicationSourceOfFundRequest> SourceOfFunds { get; set; }
    }

    public class TrustApplicationSourceOfFundRequest
    {
        public string SourceCode { get; set; }
        public string OtherDescription { get; set; }
    }
}