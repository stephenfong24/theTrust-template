using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.TrustApplication
{
    public class TrustApplicationReturnDocumentResult
    {
        public long ReturnDocumentID { get; set; }
        public long? GeneratedDocumentRowID { get; set; }
        public Guid DocumentGuid { get; set; }
        public string DocumentName { get; set; }
        public DateTime ReturnDate { get; set; }
        public string Remark { get; set; }
        public string OriginalFileName { get; set; }
        public string FileExtension { get; set; }
        public string ContentType { get; set; }
        public long FileSize { get; set; }
        public string SHA256 { get; set; }
        public DateTime CreatedAt { get; set; }
        public long CreatedBy { get; set; }
    }
}