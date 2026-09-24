using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.TrustApplication
{
    public class TrustApplicationHistoryResult
    {
        public long RowID { get; set; }
        public string EventCode { get; set; }
        public string EventTitle { get; set; }
        public string EventDescription { get; set; }
        public string ReferenceType { get; set; }
        public long? ReferenceID { get; set; }
        public string OldStatus { get; set; }
        public string NewStatus { get; set; }
        public DateTime CreatedAt { get; set; }
        public long CreatedBy { get; set; }
        public string CreatedByName { get; set; }
    }
}