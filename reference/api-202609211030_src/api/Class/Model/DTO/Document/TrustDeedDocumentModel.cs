using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.Document
{
    public class TrustDeedDocumentModel
    {
        public string SettlorFullName { get; set; }
        public string SettlorIdentityNo { get; set; }
        public string SettlorAddress { get; set; }
        public string TrustPlanName { get; set; }
        public string CommenceDate { get; set; }
        public decimal TrustPlacement { get; set; }
        public string TrustPlacementWord { get; set; }
        public List<TrustDeedBeneficiaryDocumentModel> Beneficiaries { get; set; }
    }

    public class TrustDeedBeneficiaryDocumentModel
    {
        public int No { get; set; }
        public string Name { get; set; }
        public string IdentityNo { get; set; }
        public string Address { get; set; }
        public string Relationship { get; set; }
    }
}