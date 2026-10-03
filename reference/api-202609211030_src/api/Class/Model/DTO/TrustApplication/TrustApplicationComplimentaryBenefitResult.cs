using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.TrustApplication
{
    public class TrustApplicationComplimentaryBenefitResult
    {
        public long RowID { get; set; }
        public long TrustPlanBenefitID { get; set; }
        public decimal QualifiedPlacementAmount { get; set; }
        public decimal MinimumPlacement { get; set; }
        public decimal? MaximumPlacement { get; set; }
        public string BenefitName { get; set; }
        public decimal? BenefitValue { get; set; }
        public string FulfilmentMethod { get; set; }
    }
}