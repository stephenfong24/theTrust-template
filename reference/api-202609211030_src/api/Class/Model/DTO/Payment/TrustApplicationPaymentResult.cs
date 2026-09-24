using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.Payment
{
    public class TrustApplicationPaymentResult
    {
        public long PaymentID { get; set; }
        public int PaymentNo { get; set; }
        public decimal PaymentAmount { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string ReferenceNo { get; set; }
        public string PaymentStatus { get; set; }
        public string FinanceRemark { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public long? ApprovedBy { get; set; }
        public PaymentDocumentResult Document { get; set; }
    }

    public class PaymentDocumentResult
    {
        public long PaymentDocumentID { get; set; }
        public string OriginalFileName { get; set; }
        public string FileExtension { get; set; }
        public string FileUrl { get; set; }
        public string UploadedFile { get; set; }
        public long FileSize { get; set; }
        public string SHA256 { get; set; }
        public DateTime CreatedAt { get; set; }
        public long? CreatedBy { get; set; }
    }
}