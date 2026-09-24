using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.Document
{
    public class TrustApplicationDocumentListResult
    {
        public long TrustID { get; set; }
        public string TrustNo { get; set; }
        public string ApplicationStatus { get; set; }
        public IEnumerable<TrustApplicationDocumentResult> Documents
        {
            get;
            set;
        }
    }

    public class TrustApplicationDocumentResult
    {
        public long GeneratedDocumentID { get; set; }
        public long TrustDocumentID { get; set; }
        public string DocumentCode { get; set; }
        public string DocumentName { get; set; }
        public string Description { get; set; }
        public string DocumentType { get; set; }
        public string AvailableStage { get; set; }
        public string GenerationStatus { get; set; }
        public string OriginalFileName { get; set; }
        public string FileExtension { get; set; }
        public long? FileSize { get; set; }
        public DateTime? GeneratedAt { get; set; }
        public bool CanView { get; set; }
        public bool CanDownload { get; set; }
        public string ErrorMessage { get; set; }
    }
}