using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO
{
    public class TesseractOcrResult
    {
        public string Text { get; set; }

        public float Confidence { get; set; }
    }
}