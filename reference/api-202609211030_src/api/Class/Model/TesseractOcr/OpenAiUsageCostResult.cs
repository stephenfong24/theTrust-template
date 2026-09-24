using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Service.TrustApplication
{
    public class OpenAiUsageCostResult
    {
        public string ResponseID { get; set; }
        public string Model { get; set; }
        public int InputTokens { get; set; }
        public int CachedInputTokens { get; set; }
        public int OutputTokens { get; set; }
        public int ReasoningTokens { get; set; }
        public int TotalTokens { get; set; }
        public decimal? InputPricePerMillion { get; set; }
        public decimal? CachedInputPricePerMillion { get; set; }
        public decimal? OutputPricePerMillion { get; set; }
        public decimal? InputCostUSD { get; set; }
        public decimal? CachedInputCostUSD { get; set; }
        public decimal? OutputCostUSD { get; set; }
        public decimal? TotalCostUSD { get; set; }
        public bool CostCalculated { get; set; }
    }
}