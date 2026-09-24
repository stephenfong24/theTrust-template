using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class RoleListAsync
    {
        public IEnumerable<RoleItem> Roles { get; set; }

        public async Task<IEnumerable<RoleItem>> GetRoleListAsync(bool isAdmin, string MerchantId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                var query = db.tbl_Role.Where(x => x.MerchantID == MerchantId && x.IsDeleted == 0);

                if (isAdmin)
                    query = query.Where(x => x.AdminRank > 0);
                else
                    query = query.Where(x => x.AdminRank == 0);

                return await query
                    .OrderByDescending(x => x.AdminRank)
                    .ThenBy(x => x.RoleName)
                    .Select(x => new RoleItem
                    {
                        RoleCode = x.RoleCode,
                        RoleName = x.RoleName,
                        UserType = x.UserType,
                        AdminRank = (int)x.AdminRank
                    })
                    .ToListAsync();
            }
        }
        public async Task<IEnumerable<RoleItem>> GetAllRoleListAsync(string MerchantId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                var query = db.tbl_Role.Where(x => x.MerchantID == MerchantId && x.IsDeleted == 0);

                return await query
                    .OrderByDescending(x => x.AdminRank)
                    .ThenBy(x => x.RoleName)
                    .Select(x => new RoleItem
                    {
                        RoleCode = x.RoleCode,
                        RoleName = x.RoleName,
                        UserType = x.UserType,
                        AdminRank = (int)x.AdminRank
                    })
                    .ToListAsync();
            }
        }
    }

    public class RoleItem
    {
        public string RoleCode { get; set; }
        public string RoleName { get; set; }
        public string UserType { get; set; }
        public int AdminRank { get; set; }
    }
}