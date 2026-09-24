using API_CPX.Class.Model.TrustApplication;
using API_CPX.Context;
using System;
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
                    join personalTemp
                        in db.tbl_TrustApplication_PersonalDetail on application.RowID
                        equals personalTemp.TrustApplicationID
                        into personalJoin
                    from personal in personalJoin.DefaultIfEmpty()
                    join assetTemp
                        in db.tbl_TrustApplication_TrustAsset on application.RowID
                        equals assetTemp.TrustApplicationID
                        into assetJoin
                    from asset in assetJoin.DefaultIfEmpty()
                    where application.MerchantID == merchantId
                    select new
                    {
                        Application = application,
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
                                MemberID = x.Application.MemberID,
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
                    Applications = applications
                };
            }
        }
    }
}