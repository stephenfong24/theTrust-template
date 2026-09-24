using API_CPX.Class.Exceptions;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class NetworkTreeAsync
    {
        // ================================================================
        // TRUST NETWORK
        //
        // Type = V
        // Network Table = tbl_MemberUnit_Trust
        // ================================================================

        public async Task<NetworkNode> GetTrustDownlineListAsync(string merchantId, long userId, string roleCode, string username = null)
        {
            const string code = "GET-TRUST-DOWNLINE-LIST";

            using (var dbR = new Sandbox_BasedEntities())
            {
                long selectedUserId;

                // ============================================================
                // Determine Selected User
                //
                // Search supplied:
                // -> Search Trust agent
                //
                // AG + no search:
                // -> Logged-in AG
                //
                // Internal user + no search:
                // -> Trust base member from Web.config
                // ============================================================

                if (!string.IsNullOrWhiteSpace(username))
                {
                    // ========================================================
                    // Search Trust Agent By Username
                    // ========================================================

                    string searchUsername = username.Trim();

                    var searchedUser =
                        await (
                            from member in dbR.tbl_MemberInfo
                            join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                            where reference.Type == "V" && member.IsDeleted == false && member.Username == searchUsername
                            select new
                            {
                                member.RowID
                            }
                        )
                        .FirstOrDefaultAsync();

                    if (searchedUser == null)
                    {
                        throw new BusinessException("Agent not found.", code);
                    }

                    selectedUserId = searchedUser.RowID;
                }
                else
                {
                    // ========================================================
                    // AG
                    //
                    // No search -> Start from himself
                    // ========================================================

                    if (string.Equals(roleCode, "AG", StringComparison.OrdinalIgnoreCase))
                    {
                        selectedUserId = userId;
                    }

                    // ========================================================
                    // Internal User
                    //
                    // No search -> Start from Trust base member
                    // ========================================================

                    else
                    {
                        string baseMemberUsername = ConfigurationManager.AppSettings["TrustNetworkBaseMemberUsername"];

                        if (string.IsNullOrWhiteSpace(baseMemberUsername))
                        {
                            throw new BusinessException("Trust network base member is not configured.", code);
                        }

                        baseMemberUsername = baseMemberUsername.Trim();

                        var baseMember =
                            await (
                                from member in dbR.tbl_MemberInfo
                                join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                                where reference.Type == "V" && member.IsDeleted == false && member.Username == baseMemberUsername
                                select new
                                {
                                    member.RowID
                                }
                            )
                            .FirstOrDefaultAsync();

                        if (baseMember == null)
                        {
                            throw new BusinessException("Trust network base member not found.", code);
                        }

                        selectedUserId = baseMember.RowID;
                    }
                }

                // ============================================================
                // AG Security
                //
                // AG can only view:
                //
                // 1. Himself
                // 2. His Trust downlines
                //
                // AG cannot view:
                //
                // - His upline
                // - Unrelated agents
                //
                // Internal users are not restricted by this rule.
                // ============================================================

                if (string.Equals(roleCode, "AG", StringComparison.OrdinalIgnoreCase))
                {
                    bool canView = selectedUserId == userId || await IsTrustDownlineAsync(dbR, userId, selectedUserId);

                    if (!canView)
                    {
                        throw new BusinessException("You are not authorized to view this agent's network.", code);
                    }
                }

                // ============================================================
                // Get Selected Trust Agent
                // ============================================================

                var selectedUser =
                    await (
                        from member in dbR.tbl_MemberInfo
                        join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                        join rank in dbR.tbl_AgentRank
                            on new
                            {
                                MerchantID = merchantId,
                                Ranking = reference.AdvanceRanking > reference.Ranking ? reference.AdvanceRanking : reference.Ranking
                            }
                            equals new
                            {
                                MerchantID = rank.MerchantID,
                                Ranking = rank.Ranking
                            }
                            into rankJoin
                        from rank in rankJoin.DefaultIfEmpty()
                        where member.RowID == selectedUserId && reference.Type == "V" && member.IsDeleted == false
                        select new
                        {
                            member.RowID,
                            member.Fullname,
                            member.Username,
                            RankName = rank != null ? rank.RankName : null
                        }
                    )
                    .FirstOrDefaultAsync();

                if (selectedUser == null)
                {
                    throw new BusinessException("Agent not found.", code);
                }

                // ============================================================
                // Get Direct Trust Downlines
                // ============================================================

                var members =
                    await (
                        from unit in dbR.tbl_MemberUnit_Trust
                        join member in dbR.tbl_MemberInfo on unit.memberID equals member.RowID
                        join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                        join rank in dbR.tbl_AgentRank
                            on new
                            {
                                MerchantID = merchantId,
                                Ranking = reference.AdvanceRanking > reference.Ranking ? reference.AdvanceRanking : reference.Ranking
                            }
                            equals new
                            {
                                MerchantID = rank.MerchantID,
                                Ranking = rank.Ranking
                            }
                            into rankJoin
                        from rank in rankJoin.DefaultIfEmpty()
                        where unit.unitSponsor == selectedUserId && reference.Type == "V" && member.IsDeleted == false && unit.isDeleted == false
                        select new
                        {
                            member.RowID,
                            member.Fullname,
                            member.Username,
                            RankName = rank != null ? rank.RankName : null
                        }
                    )
                    .Distinct().ToListAsync();

                // ============================================================
                // Get Direct Downline Count
                //
                // Count how many direct Trust children each returned member has.
                // ============================================================

                var memberIds = members.Select(x => x.RowID).ToList();

                var downlineCounts =
                    await dbR.tbl_MemberUnit_Trust
                        .Where(x => x.unitSponsor.HasValue &&  memberIds.Contains(x.unitSponsor.Value) && x.isDeleted == false)
                        .GroupBy(x => x.unitSponsor)
                        .Select(g => new
                        {
                            UserID = g.Key,
                            Count = g.Count()
                        })
                        .ToListAsync();

                // ============================================================
                // Build Trust Downline Response
                // ============================================================

                var downlines =
                    members
                        .Select(x => new DownlineList
                        {
                            UserID = x.RowID,
                            FullName = x.Fullname,
                            Username = x.Username,
                            PersonalSales = 0,
                            RankName = x.RankName,
                            TotalDownline =
                                downlineCounts.Where(d => d.UserID.HasValue && d.UserID.Value == x.RowID).Select(d => d.Count).FirstOrDefault()
                        })
                        .ToList();

                // ============================================================
                // Return Trust Network Node
                // ============================================================

                return new NetworkNode
                {
                    UserID = selectedUser.RowID,
                    FullName = selectedUser.Fullname,
                    Username = selectedUser.Username,
                    PersonalSales = 0,
                    RankName = selectedUser.RankName,
                    TotalDownline = downlines.Count,
                    Downlines = downlines
                };
            }
        }

        // ================================================================
        // WILL NETWORK
        //
        // Type = W
        // Network Table = tbl_MemberUnit_Will
        // ================================================================

        public async Task<NetworkNode> GetWillDownlineListAsync(string merchantId, long userId, string roleCode, string username = null)
        {
            const string code = "GET-WILL-DOWNLINE-LIST";

            using (var dbR = new Sandbox_BasedEntities())
            {
                long selectedUserId;

                // ============================================================
                // Determine Selected User
                //
                // Search supplied:
                // -> Search Will agent
                //
                // AG + no search:
                // -> Logged-in AG
                //
                // Internal user + no search:
                // -> Will base member from Web.config
                // ============================================================

                if (!string.IsNullOrWhiteSpace(username))
                {
                    // ========================================================
                    // Search Will Agent By Username
                    // ========================================================

                    string searchUsername = username.Trim();

                    var searchedUser =
                        await (
                            from member in dbR.tbl_MemberInfo
                            join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                            where reference.Type == "W" && member.IsDeleted == false && member.Username == searchUsername
                            select new
                            {
                                member.RowID
                            }
                        )
                        .FirstOrDefaultAsync();

                    if (searchedUser == null)
                    {
                        throw new BusinessException("Agent not found.", code);
                    }

                    selectedUserId = searchedUser.RowID;
                }
                else
                {
                    // ========================================================
                    // AG
                    //
                    // No search -> Start from himself
                    // ========================================================

                    if (string.Equals(roleCode, "AG", StringComparison.OrdinalIgnoreCase))
                    {
                        selectedUserId = userId;
                    }

                    // ========================================================
                    // Internal User
                    //
                    // No search -> Start from Will base member
                    // ========================================================

                    else
                    {
                        string baseMemberUsername = ConfigurationManager.AppSettings["WillNetworkBaseMemberUsername"];

                        if (string.IsNullOrWhiteSpace(baseMemberUsername))
                        {
                            throw new BusinessException("Will network base member is not configured.", code);
                        }

                        baseMemberUsername = baseMemberUsername.Trim();

                        var baseMember =
                            await (
                                from member in dbR.tbl_MemberInfo
                                join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                                where reference.Type == "W" && member.IsDeleted == false && member.Username == baseMemberUsername
                                select new
                                {
                                    member.RowID
                                }
                            )
                            .FirstOrDefaultAsync();

                        if (baseMember == null)
                        {
                            throw new BusinessException("Will network base member not found.", code);
                        }

                        selectedUserId = baseMember.RowID;
                    }
                }

                // ============================================================
                // AG Security
                //
                // AG can only view:
                //
                // 1. Himself
                // 2. His Will downlines
                // ============================================================

                if (string.Equals(roleCode, "AG", StringComparison.OrdinalIgnoreCase))
                {
                    bool canView = selectedUserId == userId || await IsWillDownlineAsync(dbR, userId, selectedUserId);

                    if (!canView)
                    {
                        throw new BusinessException("You are not authorized to view this agent's network.", code);
                    }
                }

                // ============================================================
                // Get Selected Will Agent
                // ============================================================

                var selectedUser =
                    await (
                        from member in dbR.tbl_MemberInfo
                        join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                        join rank in dbR.tbl_AgentRank
                            on new
                            {
                                MerchantID = merchantId,
                                Ranking = reference.AdvanceRanking > reference.Ranking ? reference.AdvanceRanking : reference.Ranking
                            }
                            equals new
                            {
                                MerchantID = rank.MerchantID,
                                Ranking = rank.Ranking
                            }
                            into rankJoin
                        from rank in rankJoin.DefaultIfEmpty()
                        where member.RowID == selectedUserId && reference.Type == "W" && member.IsDeleted == false
                        select new
                        {
                            member.RowID,
                            member.Fullname,
                            member.Username,
                            RankName = rank != null ? rank.RankName : null
                        }
                    )
                    .FirstOrDefaultAsync();

                if (selectedUser == null)
                {
                    throw new BusinessException("Agent not found.", code);
                }

                // ============================================================
                // Get Direct Will Downlines
                // ============================================================

                var members =
                    await (
                        from unit in dbR.tbl_MemberUnit_Will
                        join member in dbR.tbl_MemberInfo on unit.memberID equals member.RowID
                        join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                        join rank in dbR.tbl_AgentRank
                            on new
                            {
                                MerchantID = merchantId,
                                Ranking = reference.AdvanceRanking > reference.Ranking ? reference.AdvanceRanking : reference.Ranking
                            }
                            equals new
                            {
                                MerchantID = rank.MerchantID,
                                Ranking = rank.Ranking
                            }
                            into rankJoin
                        from rank in rankJoin.DefaultIfEmpty()
                        where unit.unitSponsor == selectedUserId && reference.Type == "W" && member.IsDeleted == false && unit.isDeleted == false
                        select new
                        {
                            member.RowID,
                            member.Fullname,
                            member.Username,
                            RankName = rank != null ? rank.RankName : null
                        }
                    )
                    .Distinct().ToListAsync();

                // ============================================================
                // Get Direct Downline Count
                // ============================================================

                var memberIds = members.Select(x => x.RowID).ToList();

                var downlineCounts =
                    await dbR.tbl_MemberUnit_Will
                        .Where(x => x.unitSponsor.HasValue && memberIds.Contains(x.unitSponsor.Value) && x.isDeleted == false)
                        .GroupBy(x => x.unitSponsor)
                        .Select(g => new
                        {
                            UserID = g.Key,
                            Count = g.Count()
                        })
                        .ToListAsync();

                // ============================================================
                // Build Will Downline Response
                // ============================================================

                var downlines =
                    members
                        .Select(x => new DownlineList
                        {
                            UserID = x.RowID,
                            FullName = x.Fullname,
                            Username = x.Username,
                            PersonalSales = 0,
                            RankName = x.RankName,
                            TotalDownline = downlineCounts.Where(d => d.UserID.HasValue && d.UserID.Value == x.RowID).Select(d => d.Count).FirstOrDefault()
                        })
                        .ToList();

                // ============================================================
                // Return Will Network Node
                // ============================================================

                return new NetworkNode
                {
                    UserID = selectedUser.RowID,
                    FullName = selectedUser.Fullname,
                    Username = selectedUser.Username,
                    PersonalSales = 0,
                    RankName = selectedUser.RankName,
                    TotalDownline = downlines.Count,
                    Downlines = downlines
                };
            }
        }

        // ================================================================
        // CHECK TRUST DOWNLINE
        //
        // Used only for AG security.
        //
        // Example:
        //
        // A
        // └── B
        //     └── C
        //         └── D
        //
        // Logged-in B:
        //
        // B -> allowed
        // C -> allowed
        // D -> allowed
        // A -> blocked
        // ================================================================

        private async Task<bool> IsTrustDownlineAsync(Sandbox_BasedEntities dbR, long loggedInUserId, long targetUserId)
        {
            if (loggedInUserId == targetUserId)
            {
                return true;
            }

            long currentUserId = targetUserId;

            var visited = new HashSet<long>();

            while (true)
            {
                // ========================================================
                // Prevent Circular Network
                // ========================================================

                if (!visited.Add(currentUserId))
                {
                    return false;
                }

                // ========================================================
                // Get Trust Sponsor
                // ========================================================

                var sponsorId = await dbR.tbl_MemberUnit_Trust.Where(x => x.memberID == currentUserId && x.isDeleted == false).Select(x => x.unitSponsor).FirstOrDefaultAsync();

                // ========================================================
                // Reached Top Of Network
                // ========================================================

                if (!sponsorId.HasValue)
                {
                    return false;
                }

                // ========================================================
                // Logged-In AG Found In Upline Chain
                // ========================================================

                if (sponsorId.Value == loggedInUserId)
                {
                    return true;
                }

                // ========================================================
                // Continue Walking Up
                // ========================================================

                currentUserId = sponsorId.Value;
            }
        }

        // ================================================================
        // CHECK WILL DOWNLINE
        // ================================================================

        private async Task<bool> IsWillDownlineAsync(Sandbox_BasedEntities dbR, long loggedInUserId, long targetUserId)
        {
            if (loggedInUserId == targetUserId)
            {
                return true;
            }

            long currentUserId = targetUserId;

            var visited = new HashSet<long>();

            while (true)
            {
                // ========================================================
                // Prevent Circular Network
                // ========================================================

                if (!visited.Add(currentUserId))
                {
                    return false;
                }

                // ========================================================
                // Get Will Sponsor
                // ========================================================

                var sponsorId = await dbR.tbl_MemberUnit_Will.Where(x => x.memberID == currentUserId && x.isDeleted == false).Select(x => x.unitSponsor).FirstOrDefaultAsync();

                // ========================================================
                // Reached Top Of Network
                // ========================================================

                if (!sponsorId.HasValue)
                {
                    return false;
                }

                // ========================================================
                // Logged-In AG Found In Upline Chain
                // ========================================================

                if (sponsorId.Value == loggedInUserId)
                {
                    return true;
                }

                // ========================================================
                // Continue Walking Up
                // ========================================================

                currentUserId = sponsorId.Value;
            }
        }

        // ================================================================
        // NETWORK NODE RESPONSE
        // ================================================================

        public class NetworkNode
        {
            public long UserID { get; set; }
            public string FullName { get; set; }
            public string Username { get; set; }
            public decimal PersonalSales { get; set; }
            public string RankName { get; set; }
            public int TotalDownline { get; set; }
            public IEnumerable<DownlineList> Downlines { get; set; }
        }

        // ================================================================
        // DOWNLINE RESPONSE
        // ================================================================

        public class DownlineList
        {
            public long UserID { get; set; }
            public string FullName { get; set; }
            public string Username { get; set; }
            public decimal PersonalSales { get; set; }
            public string RankName { get; set; }
            public int TotalDownline { get; set; }
        }
    }
}