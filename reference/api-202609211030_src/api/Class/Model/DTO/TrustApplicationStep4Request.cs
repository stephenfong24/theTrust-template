using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO
{
    public class TrustApplicationStep4Request
    {
        public long TrustID { get; set; }
        public int AllocationType { get; set; }
        public List<TrustApplicationAllocationBeneficiaryRequest> MainBeneficiaries { get; set; }
        public List<TrustApplicationAllocationBeneficiaryRequest> SubstituteBeneficiaries { get; set; }
    }

    public class TrustApplicationAllocationBeneficiaryRequest
    {
        public long BeneficiaryID { get; set; }
        public decimal? AllocationPercentage { get; set; }
    }
}