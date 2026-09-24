using API_CPX.Class.Model.TrustApplication;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.List
{
    public class TrustApplicationListServiceAsync
    {
        public async Task<TrustApplicationListResult> GetAsync(string merchantId, long userId, string roleCode, TrustApplicationListRequest request)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                // ================================================
                // Pagination
                // ================================================

                int page = request.Page <= 0 ? 1 : request.Page;
                int pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

                if (pageSize > 100)
                {
                    pageSize = 100;
                }

                // ================================================
                // Base Query
                // ================================================

                var query =
                    from application in db.tbl_TrustApplication

                        // ================================================
                        // Trust Plan
                        // ================================================

                        join planTemp in db.tbl_TrustPlan on application.ProductCode equals planTemp.ProductCode into planJoin

                    from plan
                        in planJoin.DefaultIfEmpty()

                        // ================================================
                        // Trust Representative
                        //
                        // application.MemberID -> tbl_MemberInfo.RowID
                        // ================================================

                        join memberTemp in db.tbl_MemberInfo on application.MemberID equals memberTemp.RowID into memberJoin

                    from member
                        in memberJoin.DefaultIfEmpty()

                        // ================================================
                        // Applicant / Settlor
                        // ================================================

                        join personalTemp in db.tbl_TrustApplication_PersonalDetail on application.RowID equals personalTemp.TrustApplicationID into personalJoin

                    from personal
                        in personalJoin.DefaultIfEmpty()

                        // ================================================
                        // Trust Asset
                        // ================================================

                        join assetTemp in db.tbl_TrustApplication_TrustAsset on application.RowID equals assetTemp.TrustApplicationID into assetJoin

                    from asset
                        in assetJoin.DefaultIfEmpty()

                        // ================================================
                        // Application Filter
                        // ================================================

                        where application.MerchantID == merchantId && application.ApplicationStatus != "DELETED"

                    select new
                    {
                        Application = application,
                        Plan = plan,
                        Member = member,
                        Personal = personal,
                        Asset = asset
                    };

                // ================================================
                // Agent Access Restriction
                // ================================================

                if (roleCode == "AG")
                {
                    query = query.Where(x => x.Application.MemberID == userId);
                }

                // ================================================
                // Total Statistics
                //
                // Count BEFORE applying search/filter.
                //
                // AG:
                // - Own applications only.
                //
                // Internal user:
                // - All applications under MerchantID.
                // ================================================

                var totalStatusCounts =
                    await query
                        .GroupBy(x => x.Application.ApplicationStatus)
                        .Select(
                            x => new StatusCountResult
                            {
                                Status = x.Key,
                                Count = x.Count()
                            })
                        .ToListAsync();

                var totalStatistics = BuildStatusStatistics(totalStatusCounts);

                // ================================================
                // General Search
                //
                // Trust No
                // Full Name
                // Identity No
                // Email
                // ================================================

                if (!string.IsNullOrWhiteSpace(request.Search))
                {
                    string search = request.Search.Trim();
                    long trustId;
                    bool isTrustId = long.TryParse(search, out trustId);

                    query =
                        query.Where(x =>
                            (isTrustId && x.Application.TrustID == trustId)
                            ||
                            (
                                x.Personal != null &&
                                (
                                    (x.Personal.FullName != null && x.Personal.FullName.Contains(search))
                                    ||
                                    (x.Personal.IdentityNo != null && x.Personal.IdentityNo.Contains(search))
                                    ||
                                    (x.Personal.Email != null && x.Personal.Email.Contains(search))
                                )
                            ));
                }

                if (!string.IsNullOrEmpty(request.AgentSearch))
                {
                    string agentSearch = request.AgentSearch.Trim();
                    query = query.Where(x => x.Member != null &&
                    (
                        (x.Member.Username != null && x.Member.Username.Contains(agentSearch))
                        ||
                        (x.Member.Fullname != null && x.Member.Fullname.Contains(agentSearch))
                    ));
                }

                // ================================================
                // Product
                // ================================================

                if (!string.IsNullOrWhiteSpace(request.ProductCode))
                {
                    string productCode = request.ProductCode.Trim();
                    query = query.Where(x => x.Application.ProductCode == productCode);
                }

                // ================================================
                // Application Status
                // ================================================

                if (!string.IsNullOrWhiteSpace(request.ApplicationStatus))
                {
                    string status = request.ApplicationStatus.Trim();
                    query = query.Where(x => x.Application.ApplicationStatus == status);
                }

                // ================================================
                // Created Date
                // ================================================

                if (request.CreatedFrom.HasValue)
                {
                    DateTime createdFrom = request.CreatedFrom.Value.Date;
                    query = query.Where(x => x.Application.CreatedAt >= createdFrom);
                }

                if (request.CreatedTo.HasValue)
                {
                    DateTime createdTo = request.CreatedTo.Value.Date.AddDays(1);
                    query = query.Where(x => x.Application.CreatedAt < createdTo);
                }

                // ================================================
                // Submitted Date
                // ================================================

                if (request.SubmittedFrom.HasValue)
                {
                    DateTime submittedFrom = request.SubmittedFrom.Value.Date;
                    query = query.Where(x => x.Application.SubmittedAt.HasValue && x.Application.SubmittedAt.Value >= submittedFrom);
                }

                if (request.SubmittedTo.HasValue)
                {
                    DateTime submittedTo = request.SubmittedTo.Value.Date.AddDays(1);
                    query = query.Where(x => x.Application.SubmittedAt.HasValue && x.Application.SubmittedAt.Value < submittedTo);
                }

                // ================================================
                // Search Statistics
                //
                // Count AFTER applying all search/filter conditions,
                // but BEFORE pagination.
                // ================================================

                var searchStatusCounts =
                    await query
                        .GroupBy(x => x.Application.ApplicationStatus)
                        .Select(
                            x => new StatusCountResult
                            {
                                Status = x.Key,
                                Count = x.Count()
                            })
                        .ToListAsync();

                var searchStatistics = BuildStatusStatistics(searchStatusCounts);

                // ================================================
                // Total Records BEFORE Skip/Take
                // ================================================

                int totalRecords = await query.CountAsync();

                // ================================================
                // Sorting
                // ================================================

                string sortBy = string.IsNullOrWhiteSpace(request.SortBy) ? "CREATED_AT" : request.SortBy.Trim().ToUpper();
                string sortDirection = string.IsNullOrWhiteSpace(request.SortDirection) ? "DESC" : request.SortDirection.Trim().ToUpper();
                bool ascending = sortDirection == "ASC";

                switch (sortBy)
                {
                    case "TRUST_ID":
                        query = ascending ? query.OrderBy(x => x.Application.TrustID) : query.OrderByDescending(x => x.Application.TrustID);
                        break;
                    case "UPDATED_AT":
                        query = ascending ? query.OrderBy(x => x.Application.UpdatedAt) : query.OrderByDescending(x => x.Application.UpdatedAt);
                        break;
                    case "SUBMITTED_AT":
                        query = ascending ? query.OrderBy(x => x.Application.SubmittedAt) : query.OrderByDescending(x => x.Application.SubmittedAt);
                        break;
                    default:
                        query = ascending ? query.OrderBy(x => x.Application.CreatedAt) : query.OrderByDescending(x => x.Application.CreatedAt);
                        break;
                }

                // ================================================
                // Server-Side Pagination
                // ================================================

                var applications =
                    await query
                        .Skip((page - 1) * pageSize).Take(pageSize)
                        .Select(x =>
                            new TrustApplicationListItem
                            {
                                TrustApplicationID = x.Application.RowID,
                                TrustID = x.Application.TrustID,
                                ProductCode = x.Application.ProductCode,
                                ProductName = x.Plan == null ? null : x.Plan.ProductName,
                                MemberID = x.Application.MemberID,
                                TrustRepresentativeUsername = x.Member == null ? null : x.Member.Username,
                                TrustRepresentativeFullName = x.Member == null ? null : x.Member.Fullname,
                                FullName = x.Personal == null ? null : x.Personal.FullName,
                                IdentityType = x.Personal == null ? null : x.Personal.IdentityType,
                                IdentityNo = x.Personal == null ? null : x.Personal.IdentityNo,
                                Email = x.Personal == null ? null : x.Personal.Email,
                                ContactNo = x.Personal == null ? null : x.Personal.ContactNo,
                                TrustAssetAmount = x.Asset == null ? (decimal?)null : x.Asset.TrustAssetAmount,
                                ApplicationStatus = x.Application.ApplicationStatus,
                                CurrentStep = x.Application.CurrentStep,
                                LastCompletedStep = x.Application.LastCompletedStep,
                                CreatedAt = x.Application.CreatedAt,
                                CreatedBy = x.Application.CreatedBy,
                                UpdatedAt = x.Application.UpdatedAt,
                                SubmittedAt = x.Application.SubmittedAt,
                                SubmittedBy = x.Application.SubmittedBy
                            })
                        .ToListAsync();

                // ================================================
                // TrustNo
                //
                // ToString("D4") cannot reliably be translated
                // by EF6 to SQL, so format after query.
                // ================================================

                foreach (var item in applications)
                {
                    item.TrustNo = item.TrustID.ToString("D4");
                }

                // ================================================
                // Total Pages
                // ================================================

                int totalPages = totalRecords == 0 ? 0 : (int)Math.Ceiling(totalRecords / (double)pageSize);

                return new TrustApplicationListResult
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalRecords = totalRecords,
                    TotalPages = totalPages,
                    TotalStatistics = totalStatistics,
                    SearchStatistics = searchStatistics,
                    Applications = applications
                };
            }
        }
        // ============================================================
        // Status Count Result
        //
        // Internal model used only for grouped status count queries.
        // ============================================================

        private class StatusCountResult
        {
            public string Status { get; set; }
            public int Count { get; set; }
        }

        // ============================================================
        // Build Status Statistics
        // ============================================================

        private TrustApplicationStatusStatistic BuildStatusStatistics(List<StatusCountResult> counts)
        {
            var result = new TrustApplicationStatusStatistic();

            if (counts == null)
            {
                return result;
            }

            foreach (var item in counts)
            {
                result.Total += item.Count;

                string status = (item.Status ?? string.Empty).Trim().ToUpperInvariant();

                switch (status)
                {
                    case "DRAFT":
                        result.Draft = item.Count;
                        break;

                    case "PENDING_PAYMENT_APPROVAL":
                        result.PendingPaymentApproval = item.Count;
                        break;

                    case "PAYMENT_APPROVED":
                        result.PaymentApproved = item.Count;
                        break;

                    case "PENDING_ADMIN_APPROVAL":
                        result.PendingAdminApproval = item.Count;
                        break;

                    case "SENT_OUT":
                        result.SentOut = item.Count;
                        break;

                    case "STAMPING":
                        result.Stamping = item.Count;
                        break;

                    case "COMPLETED":
                        result.Completed = item.Count;
                        break;

                    case "REJECTED":
                        result.Rejected = item.Count;
                        break;

                    case "EARLY_WITHDRAWN":
                        result.EarlyWithdrawn = item.Count;
                        break;

                    case "MATURED":
                        result.Matured = item.Count;
                        break;
                }
            }

            return result;
        }
    }
}