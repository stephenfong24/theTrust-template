using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class AdministratorListAsync
    {
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }

        private IEnumerable<AdministratorList> administratorLists;

        public IEnumerable<AdministratorList> AdministratorLists
        {
            get { return administratorLists; }
            set { administratorLists = value; }
        }

        public async Task<IEnumerable<AdministratorList>> GetAdministratorListAsync(string merchantId, int page, int pageSize, string search = null, string roleCode = null, bool? loginStatus = null)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                if (page <= 0)
                    page = 1;

                if (pageSize <= 0)
                    pageSize = 10;

                string searchValue = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
                string roleValue = string.IsNullOrWhiteSpace(roleCode) ? null : roleCode.Trim();

                var query =
                    from member in dbR.tbl_MemberInfo
                    join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                    join role in dbR.tbl_Role on member.UserType equals role.UserType
                    join login in dbR.tbl_Login on member.RowID equals login.MemberID
                    where reference.MerchantID == merchantId
                          && member.IsDeleted == false
                          && role.AdminRank > 0
                          && role.IsDeleted == 0
                    select new
                    {
                        member.RowID,
                        member.displayName,
                        member.Username,
                        member.Fullname,
                        member.UserType,
                        member.Email,
                        RoleCode = login.LoginRole,
                        RoleName = role.RoleName,
                        LoginStatus = login.LoginStatus,
                        LastLogin = login.LastTimeLogin,
                        role.AdminRank,
                        WillAccess = dbR.tbl_MemberControl.Any(a =>
                            a.MemberID == member.RowID &&
                            a.WillAccess == 1),
                        member.CreatedAt
                    };

                // ============================================================
                // Search User
                // ============================================================

                if (!string.IsNullOrWhiteSpace(searchValue))
                {
                    query = query.Where(x =>
                        (x.Fullname != null &&
                         x.Fullname.Contains(searchValue))
                        ||
                        (x.displayName != null &&
                         x.displayName.Contains(searchValue))
                        ||
                        (x.Username != null &&
                         x.Username.Contains(searchValue))
                        ||
                        (x.Email != null &&
                         x.Email.Contains(searchValue))
                    );
                }

                // ============================================================
                // Role Filter
                // ============================================================

                if (!string.IsNullOrWhiteSpace(roleValue))
                {
                    query = query.Where(x => x.RoleCode == roleValue);
                }

                // ============================================================
                // Login Status Filter
                // ============================================================

                if (loginStatus.HasValue)
                {
                    query = query.Where(x => x.LoginStatus == loginStatus.Value);
                }

                TotalRecords = await query.CountAsync();
                TotalPages = (int)Math.Ceiling((decimal)TotalRecords / pageSize);

                var result = await query.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.RowID).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

                AdministratorLists = result.Select((x, index) => new AdministratorList
                    {
                        Id = ((page - 1) * pageSize) + index + 1,
                        UserID = x.RowID,
                        DisplayName = x.displayName,
                        Username = x.Username,
                        FullName = x.Fullname,
                        UserType = x.UserType,
                        RoleCode = x.RoleCode,
                        RoleName = x.RoleName,
                        Email = x.Email,
                        WillAccess = x.WillAccess,
                        LastLogin = x.LastLogin.HasValue ? x.LastLogin.Value.ToString("yyyy-MM-dd HH:mm:ss") : "-",
                        LoginStatus = (bool)x.LoginStatus
                    })
                    .ToList();

                return AdministratorLists;
            }
        }

        public class AdministratorList
        {
            public long Id { get; set; }
            public long UserID { get; set; }
            public string DisplayName { get; set; }
            public string Username { get; set; }
            public string FullName { get; set; }
            public string UserType { get; set; }
            public string RoleCode { get; set; }
            public string RoleName { get; set; }
            public string Email { get; set; }
            public bool WillAccess { get; set; }
            public string LastLogin { get; set; }
            public bool LoginStatus { get; set; }
        }
    }
}