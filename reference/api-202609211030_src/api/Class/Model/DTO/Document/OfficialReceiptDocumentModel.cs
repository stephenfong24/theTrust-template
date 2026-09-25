using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.Document
{
    public class OfficialReceiptDocumentModel
    {
        public string ReceivedFrom { get; set; }
        public string ReceiptNo { get; set; }
        public DateTime ReceiptDate { get; set; }
        public string BankName { get; set; }
        public string Description { get; set; }
        public decimal ReceiptAmount { get; set; }
        public decimal SstPercentage { get; set; }
        public decimal SstAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public string AmountInWords { get; set; }
    }
}