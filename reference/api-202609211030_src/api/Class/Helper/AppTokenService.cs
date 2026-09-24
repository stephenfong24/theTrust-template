using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Services
{
    public class AppTokenService
    {
        public static async Task SaveTokenAsync(
            long memberId,
            string token)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                // OPTIONAL:
                // remove old token if only allow 1 active login

                var existingTokens = await db.tbl_AppToken
                    .Where(x => x.MemberID == memberId)
                    .ToListAsync();

                if (existingTokens.Any())
                {
                    db.tbl_AppToken.RemoveRange(existingTokens);
                }

                db.tbl_AppToken.Add(new tbl_AppToken
                {
                    MemberID = memberId,
                    token = token,
                    lastTxnDate = DateTime.Now
                });

                await db.SaveChangesAsync();
            }
        }

        public static async Task<bool> IsTokenValidAsync(
            long memberId,
            string token)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                return await db.tbl_AppToken.AnyAsync(x =>
                    x.MemberID == memberId &&
                    x.token == token);
            }
        }

        public static async Task RemoveTokenAsync(string token)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                var existingToken = await db.tbl_AppToken
                    .FirstOrDefaultAsync(x => x.token == token);

                if (existingToken != null)
                {
                    db.tbl_AppToken.Remove(existingToken);
                    await db.SaveChangesAsync();
                }
            }
        }
    }
}