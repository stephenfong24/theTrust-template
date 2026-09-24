using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO
{
    public class SupportingDocumentUploadResult
    {
        public long SupportingDocumentID { get; set; }
        public long TrustID { get; set; }
        public string OriginalFileName { get; set; }
        public string FileUrl { get; set; }
        public long FileSize { get; set; }
    }
}