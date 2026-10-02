using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.Document
{
    public class LetterOfWishesType2DocumentModel
    {
        public string ReferencePrefix { get; set; }

        public string TrustNo { get; set; }

        public string Year { get; set; }

        public string SettlorFullName { get; set; }

        public string SettlorIdentityNo { get; set; }

        public string SettlorAddress { get; set; }

        public string City { get; set; }

        public string Postcode { get; set; }

        public string State { get; set; }

        public string Country { get; set; }

        public string TrustPlanName { get; set; }

        public string AfterLifetime { get; set; }

        public LetterOfWishesType2BeneficiaryDocumentModel
            MainBeneficiary
        { get; set; }

        public List<LetterOfWishesType2BeneficiaryDocumentModel>
            SubstituteBeneficiaries
        { get; set; }
    }

    public class LetterOfWishesType2BeneficiaryDocumentModel
    {
        public long BeneficiaryID { get; set; }

        public string Relationship { get; set; }

        public string Name { get; set; }

        public string IdentityNo { get; set; }
    }
}