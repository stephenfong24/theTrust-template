using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.Document
{
    public class BookingFormDocumentModel
    {
        public long TrustID { get; set; }
        public string FullName { get; set; }
        public string IdentityNo { get; set; }
        public string Email { get; set; }
        public string ContactNo { get; set; }
        public string ProductName { get; set; }
        public decimal PlacementAmount { get; set; }
        public DateTime BookingDate { get; set; }
        public string AgentName { get; set; }
    }
}