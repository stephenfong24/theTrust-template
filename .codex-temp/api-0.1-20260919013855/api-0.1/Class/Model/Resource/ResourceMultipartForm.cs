using System;
using System.Net.Http;

namespace API_CPX.Class.Model.Resource
{
    public class ResourceMultipartForm
    {
        public long ResourceID { get; set; }
        public string CategoryCode { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Type { get; set; }
        public string Url { get; set; }
        public string RoleCodes { get; set; }
        public int Status { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public HttpContent FileContent { get; set; }
    }
}