using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Service
{
    public class RegistrationSessionService
    {
        public async Task<tbl_RegistrationSession> ValidateAsync(string token)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                if (string.IsNullOrWhiteSpace(token))
                    return null;

                string tokenHash = RegistrationTokenHelper.HashToken(token);
                DateTime now = DateTime.Now;

                var session = await dbR.tbl_RegistrationSession.FirstOrDefaultAsync(x => x.TokenHash == tokenHash && x.Status == "ACTIVE");
                if (session == null)
                    return null;

                if (session.ExpiresAt <= now)
                {
                    session.Status = "EXPIRED";
                    await dbR.SaveChangesAsync();
                    return null;
                }

                session.LastActivityAt = now;
                await dbR.SaveChangesAsync();
                return session;
            }
        }
    }
}