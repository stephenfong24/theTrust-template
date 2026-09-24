using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.TrustApplication
{
    public class TrustApplicationGeneratedDocumentResult
    {
        public long RowID { get; set; }
        public long TrustDocumentID { get; set; }
        public string DocumentCode { get; set; }
        public string DocumentName { get; set; }
        public string Description { get; set; }
        public long TrustDocumentTemplateID { get; set; }
        public string GenerationStatus { get; set; }
        public string OriginalFileName { get; set; }
        public string FileExtension { get; set; }
        public long? FileSize { get; set; }
        public string FileUrl { get; set; }
        public string GeneratedFile { get; set; }
        public string SHA256 { get; set; }
        public DateTime? GeneratedAt { get; set; }
        public long? GeneratedBy { get; set; }
        public string GeneratedByName { get; set; }
        public string ErrorMessage { get; set; }
        public int RetryCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}