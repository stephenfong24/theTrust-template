using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO
{
    public class TrustApplicationSupportingDocumentResult
    {
        public long SupportingDocumentID { get; set; }

        public string OriginalFileName { get; set; }

        public string FileExtension { get; set; }

        public long FileSize { get; set; }

        public string FileUrl { get; set; }

        public string UploadedFile { get; set; }

        public DateTime UploadedAt { get; set; }
    }
}