using System;

namespace API_CPX.Class.Model.DTO
{
    public class ManualRankingResult
    {
        public int NetworkLevel { get; set; }
        public long MemberID { get; set; }
        public string Username { get; set; }
        public string Fullname { get; set; }
        public string ChangeSource { get; set; }
        public string ChangeType { get; set; }
        public int PreviousRanking { get; set; }
        public string PreviousRankingCode { get; set; }
        public string PreviousRankingName { get; set; }
        public int NewRanking { get; set; }
        public string NewRankingCode { get; set; }
        public string NewRankingName { get; set; }
        public int? QualifiedRanking { get; set; }
        public string QualifiedRankingCode { get; set; }
        public string QualifiedRankingName { get; set; }
        public int PreviousAdvanceRanking { get; set; }
        public string PreviousAdvanceRankingCode { get; set; }
        public string PreviousAdvanceRankingName { get; set; }
        public int NewAdvanceRanking { get; set; }
        public string NewAdvanceRankingCode { get; set; }
        public string NewAdvanceRankingName { get; set; }
        public int PreviousEffectiveRanking { get; set; }
        public string PreviousEffectiveRankingCode { get; set; }
        public string PreviousEffectiveRankingName { get; set; }
        public int NewEffectiveRanking { get; set; }
        public string NewEffectiveRankingCode { get; set; }
        public string NewEffectiveRankingName { get; set; }
        public decimal? PersonalSales { get; set; }
        public int? DirectTMOrAbove { get; set; }
        public int? DirectTDOrAbove { get; set; }
        public int? DirectGTDOrAbove { get; set; }
        public bool? PreviousAllowOverriding { get; set; }
        public bool? NewAllowOverriding { get; set; }
    }

    public class ManualRankingRequest
    {
        public long MemberID { get; set; }
        public int AdvanceRanking { get; set; }
    }
}