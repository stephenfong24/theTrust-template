using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.TrustApplication
{
    public class TrustApplicationWorkflowResult
    {
        public long TrustID { get; set; }
        public string PreviousStatus { get; set; }
        public string ApplicationStatus { get; set; }
        public DateTime? CommencementDate { get; set; }
        public DateTime? MaturityDate { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? RejectedAt { get; set; }
        public DateTime? EarlyWithdrawnAt { get; set; }
    }
}