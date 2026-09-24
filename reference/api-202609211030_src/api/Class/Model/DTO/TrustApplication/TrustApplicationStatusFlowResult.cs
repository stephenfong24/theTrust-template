using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.TrustApplication
{
    public class TrustApplicationStatusFlowResult
    {
        public string StatusCode { get; set; }
        public string StatusName { get; set; }
        public int Sequence { get; set; }
        public string State { get; set; }
        public bool IsReached { get; set; }
        public DateTime? ReachedAt { get; set; }
        public long? ReachedBy { get; set; }
        public string ReachedByName { get; set; }
    }
    public class TrustApplicationStatusFlowHistoryResult
    {
        public long RowID { get; set; }
        public string PreviousStatus { get; set; }
        public string NewStatus { get; set; }
        public DateTime ChangedAt { get; set; }
        public long? ChangedBy { get; set; }
        public string ChangedByName { get; set; }
    }
}