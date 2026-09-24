using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO
{
    public class TrustApplicationStep5Request
    {
        public long TrustID { get; set; }

        // ============================================================
        // Execution Method
        // ============================================================

        public string SigningMethod { get; set; }

        // ============================================================
        // Special Circumstances
        // ============================================================

        public string SpecialCircumstance { get; set; }

        // ============================================================
        // Read-over / Interpreter Details
        // Required when SpecialCircumstance != NONE
        // ============================================================

        public string ReadOverBy { get; set; }
        public string ReadOverIdentityNo { get; set; }
        public string LanguageOrDialect { get; set; }
        public string RelationshipWithSettlor { get; set; }
        public string OtherRelationshipWithSettlor { get; set; }
    }
}