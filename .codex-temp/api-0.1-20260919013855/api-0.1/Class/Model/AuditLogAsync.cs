using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class AuditLogAsync
    {
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }
        public IEnumerable<AuditLogList> AuditLogs { get; set; }

        public async Task<IEnumerable<AuditLogList>> GetAuditLogListAsync(string merchantId, int page, int pageSize, long userId, string roleCode, string activityKeyword = null, string userKeyword = null, DateTime? dateFrom = null, DateTime? dateTo = null)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                if (page <= 0)
                    page = 1;

                if (pageSize <= 0)
                    pageSize = 10;

                if (pageSize > 100)
                    pageSize = 100;

                var query = dbR.tbl_ApiRequestLog.Where(a => a.MerchantID == merchantId);

                if (userId > 0)
                {
                    query.Where(a => a.UserID == userId.ToString());
                }

                // ============================================================
                // KEYWORD
                // ============================================================

                if (!string.IsNullOrWhiteSpace(activityKeyword))
                {
                    activityKeyword = activityKeyword.Trim();

                    query = query.Where(a => a.ActivityTitle.Contains(activityKeyword) || a.Description.Contains(activityKeyword));
                }

                if (roleCode == "AG")
                {
                    query = query.Where(a => a.UserID == userId.ToString());
                }

                // ============================================================
                // USER KEYWORD
                // Search user Fullname / Email
                // ============================================================

                if (!string.IsNullOrWhiteSpace(userKeyword))
                {
                    string userSearch = userKeyword.Trim();

                    var matchingUserIds =
                        await (
                            from member in dbR.tbl_MemberInfo
                            join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                            where reference.MerchantID == merchantId
                                  && member.IsDeleted == false
                                  &&
                                  (
                                    (member.Fullname != null && member.Fullname.Contains(userSearch)) || (member.Email != null && member.Email.Contains(userSearch))
                                  )
                            select member.RowID
                        )
                        .Distinct()
                        .ToListAsync();

                    var matchingUserIdStrings = matchingUserIds.Select(a => a.ToString()).ToList();

                    query = query.Where(a => matchingUserIdStrings.Contains(a.UserID));
                }

                // ============================================================
                // DATE FROM
                // ============================================================

                if (dateFrom.HasValue)
                {
                    DateTime from = dateFrom.Value.Date;
                    query = query.Where(a => a.RequestTime >= from);
                }

                // ============================================================
                // DATE TO
                // ============================================================

                if (dateTo.HasValue)
                {
                    DateTime to = dateTo.Value.Date.AddDays(1);
                    query = query.Where(a => a.RequestTime < to);
                }

                // ============================================================
                // TOTAL RECORDS
                // ============================================================

                TotalRecords = await query.CountAsync();
                TotalPages = TotalRecords == 0 ? 0 : (int)Math.Ceiling((decimal)TotalRecords / pageSize);

                // ============================================================
                // SERVER-SIDE PAGINATION
                // ============================================================

                var records = await query
                    .OrderByDescending(a => a.RequestTime)
                    .ThenByDescending(a => a.RowID)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(a => new
                    {
                        a.RowID,
                        a.RequestID,
                        a.RequestTime,
                        a.ResponseTime,
                        a.DurationMs,
                        a.UserID,
                        a.MerchantID,
                        a.HttpMethod,
                        a.RequestUrl,
                        a.ControllerName,
                        a.ActionName,
                        a.IpAddress,
                        a.UserAgent,
                        a.RequestHeaders,
                        a.RequestBody,
                        a.ResponseStatusCode,
                        a.ResponseBody,
                        a.ActivityTitle,
                        a.Description,
                        a.IsSuccess,
                        a.ExceptionMessage,
                        a.CreatedAt
                    })
                    .ToListAsync();

                // ============================================================
                // GET USER INFORMATION
                // ============================================================

                var userIDs = records
                    .Where(a => !string.IsNullOrWhiteSpace(a.UserID))
                    .Select(a =>
                    {
                        long id;
                        return long.TryParse(a.UserID, out id) ? (long?)id : null;
                    })
                    .Where(a => a.HasValue)
                    .Select(a => a.Value)
                    .Distinct()
                    .ToList();

                var users =
                    await (
                        from member in dbR.tbl_MemberInfo
                        join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                        where reference.MerchantID == merchantId
                              && member.IsDeleted == false
                              && userIDs.Contains(member.RowID)
                        select new
                        {
                            member.RowID,
                            member.Fullname,
                            member.Email,
                            member.UserType
                        }
                    )
                    .Distinct()
                    .ToListAsync();

                // ============================================================
                // RESPONSE
                // ============================================================

                AuditLogs = records
                    .Select((a, index) =>
                    {
                        long userID;
                        var user = long.TryParse(a.UserID, out userID) ? users.FirstOrDefault(u => u.RowID == userID) : null;

                        return new AuditLogList
                        {
                            Id = ((page - 1) * pageSize) + index + 1,
                            RowID = a.RowID,
                            RequestID = a.RequestID,
                            RequestTime = a.RequestTime,
                            ResponseTime = a.ResponseTime,
                            DurationMs = a.DurationMs,
                            UserID = a.UserID,
                            UserName = user?.Fullname,
                            UserEmail = user?.Email,
                            UserType = user?.UserType,
                            MerchantID = a.MerchantID,
                            HttpMethod = a.HttpMethod,
                            RequestUrl = a.RequestUrl,
                            ControllerName = a.ControllerName,
                            ActionName = a.ActionName,
                            IpAddress = a.IpAddress,
                            UserAgent = a.UserAgent,
                            RequestHeaders = a.RequestHeaders,
                            RequestBody = a.RequestBody,
                            ResponseStatusCode = a.ResponseStatusCode,
                            ResponseBody = a.ResponseBody,
                            ActivityTitle = a.ActivityTitle,
                            Description = a.Description,
                            IsSuccess = a.IsSuccess,
                            ExceptionMessage = a.ExceptionMessage,
                            CreatedAt = a.CreatedAt
                        };
                    })
                    .ToList();

                return AuditLogs;
            }
        }

        public class AuditLogList
        {
            public long Id { get; set; }
            public long RowID { get; set; }
            public Guid RequestID { get; set; }
            public DateTime RequestTime { get; set; }
            public DateTime? ResponseTime { get; set; }
            public int? DurationMs { get; set; }
            public string UserID { get; set; }
            public string UserName { get; set; }
            public string UserEmail { get; set; }
            public string UserType { get; set; }
            public string MerchantID { get; set; }
            public string HttpMethod { get; set; }
            public string RequestUrl { get; set; }
            public string ControllerName { get; set; }
            public string ActionName { get; set; }
            public string IpAddress { get; set; }
            public string UserAgent { get; set; }
            public string RequestHeaders { get; set; }
            public string RequestBody { get; set; }
            public int? ResponseStatusCode { get; set; }
            public string ResponseBody { get; set; }
            public string ActivityTitle { get; set; }
            public string Description { get; set; }
            public bool? IsSuccess { get; set; }
            public string ExceptionMessage { get; set; }
            public DateTime CreatedAt { get; set; }
        }
    }
}