using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Model
{
    public class RankListAsync
    {
        public IEnumerable<RankItem> Ranks { get; set; }

        public async Task<IEnumerable<RankItem>> GetRankListAsync(string MerchantId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                var query = db.tbl_AgentRank.Where(x => x.MerchantID == MerchantId && x.Status == 0);

                return await query
                    .OrderBy(x => x.Ranking)
                    .Select(x => new RankItem
                    {
                        RankCode = x.RankCode,
                        RankName = x.RankName,
                        Ranking = x.Ranking,
                        isAutoRankEligible = (bool)x.IsAutoRankEligible
                    })
                    .ToListAsync();
            }
        }
    }

    public class RankItem
    {
        public string RankCode { get; set; }
        public string RankName { get; set; }
        public int Ranking { get; set; }
        public bool isAutoRankEligible { get; set; }
    }
}