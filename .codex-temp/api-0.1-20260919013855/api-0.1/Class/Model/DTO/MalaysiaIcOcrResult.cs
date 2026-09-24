using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO
{
    public class OcrFieldResult
    {
        public string Value { get; set; }
        public decimal Confidence { get; set; }
    }

    public class MalaysiaIcOcrResult
    {
        public bool IsValidIC { get; set; }
        public string DocumentType { get; set; }
        public OcrFieldResult ICNumber { get; set; }
        public OcrFieldResult Name { get; set; }
        public OcrFieldResult Postcode { get; set; }
        public OcrFieldResult City { get; set; }
        public OcrFieldResult State { get; set; }
        public OcrFieldResult Address1 { get; set; }
        public OcrFieldResult Address2 { get; set; }
    }
}