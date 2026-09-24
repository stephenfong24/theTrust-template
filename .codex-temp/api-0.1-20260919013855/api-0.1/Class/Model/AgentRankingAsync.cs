using API_CPX.Class.Model.DTO;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.SqlClient;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class AgentRankingAsync : Base
    {
        public async Task<List<ManualRankingResult>> ManualRankingAsync(string merchantID, long memberID, int newAdvanceRanking, long changedBy, bool previewOnly)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                try
                {
                    string strSQL = @"
                        EXEC [dbo].[USP_Trust_ManualAgentRanking]
                            @MerchantID,
                            @MemberID,
                            @NewAdvanceRanking,
                            @ChangedBy,
                            @PreviewOnly";

                    var result = await dbR.Database
                        .SqlQuery<ManualRankingResult>(
                            strSQL,
                            new SqlParameter("@MerchantID", merchantID),
                            new SqlParameter("@MemberID", memberID),
                            new SqlParameter("@NewAdvanceRanking", newAdvanceRanking),
                            new SqlParameter("@ChangedBy", changedBy),
                            new SqlParameter("@PreviewOnly", previewOnly)
                        )
                        .ToListAsync();

                    Status = 0;
                    Message = "Success";
                    return result;
                }
                catch (Exception ex)
                {
                    Status = 4;
                    Message = ex.Message;
                    return null;
                }
            }
        }
    }
}