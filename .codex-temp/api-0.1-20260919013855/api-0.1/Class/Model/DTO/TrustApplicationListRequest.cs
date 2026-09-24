using System;

namespace API_CPX.Class.Model.TrustApplication
{
    public class TrustApplicationListRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        // General search:
        // Trust No / Name / Identity No / Email
        public string Search { get; set; }
        public string ProductCode { get; set; }
        public string ApplicationStatus { get; set; }
        // Search application owner / agent
        // Internal roles only
        public string AgentSearch { get; set; }
        public DateTime? CreatedFrom { get; set; }
        public DateTime? CreatedTo { get; set; }
        public DateTime? SubmittedFrom { get; set; }
        public DateTime? SubmittedTo { get; set; }
        // CREATED_AT
        // UPDATED_AT
        // SUBMITTED_AT
        // TRUST_ID
        public string SortBy { get; set; }
        // ASC / DESC
        public string SortDirection { get; set; }
    }
}