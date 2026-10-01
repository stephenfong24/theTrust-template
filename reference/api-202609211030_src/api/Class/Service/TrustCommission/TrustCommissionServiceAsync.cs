using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.TrustCommission;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Services.TrustCommission
{
    public class TrustCommissionServiceAsync
    {
        private const string BatchListCode = "TRUST-COMMISSION-BATCH-LIST";
        private const string ListCode = "TRUST-COMMISSION-LIST";
        private const string DetailCode = "TRUST-COMMISSION-DETAIL";
        private const string UpdateStatusCode = "UPDATE-TRUST-COMMISSION-STATUS";

        // ============================================================
        // Permission
        // ============================================================

        private static bool CanView(string roleCode)
        {
            return
                string.Equals(roleCode, "SA", StringComparison.OrdinalIgnoreCase)
                || string.Equals(roleCode, "AD", StringComparison.OrdinalIgnoreCase)
                || string.Equals(roleCode, "AC", StringComparison.OrdinalIgnoreCase)
                || string.Equals(roleCode, "AG", StringComparison.OrdinalIgnoreCase);
        }

        private static bool CanUpdateStatus(string roleCode)
        {
            return
                string.Equals(roleCode, "SA", StringComparison.OrdinalIgnoreCase)
                || string.Equals(roleCode, "AD", StringComparison.OrdinalIgnoreCase)
                || string.Equals(roleCode, "AC", StringComparison.OrdinalIgnoreCase);
        }

        private static void ValidateViewPermission(string roleCode, string code)
        {
            if (!CanView(roleCode))
            {
                throw new BusinessException("You are not allowed to view Trust commission payout information.", code);
            }
        }

        // ============================================================
        // Batch Listing
        // ============================================================

        public async Task<TrustCommissionBatchListResult> GetBatchListAsync(string merchantId, string roleCode, TrustCommissionBatchListRequest request)
        {
            ValidateViewPermission(roleCode, BatchListCode);

            if (request == null)
            {
                request = new TrustCommissionBatchListRequest();
            }

            int page = request.Page <= 0 ? 1 : request.Page;
            int pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

            if (pageSize > 100)
            {
                pageSize = 100;
            }

            using (var db = new Sandbox_BasedEntities())
            {
                // tbl_TrustCommissionBatch does not currently contain MerchantID.
                // Restrict batches through tbl_TrustCommission so one merchant
                // cannot retrieve another merchant's batch.
                var query =
                    db.tbl_TrustCommissionBatch
                        .Where(batch =>
                            db.tbl_TrustCommission.Any(commission => commission.BatchID == batch.RowID && commission.MerchantID == merchantId));

                if (!string.IsNullOrWhiteSpace(request.Search))
                {
                    string search = request.Search.Trim();

                    query =
                        query.Where(x =>
                            x.BatchNo.Contains(search)
                            || (x.ErrorMessage != null && x.ErrorMessage.Contains(search)));
                }

                if (!string.IsNullOrWhiteSpace(request.BatchStatus) && !string.Equals(request.BatchStatus.Trim(), "ALL", StringComparison.OrdinalIgnoreCase))
                {
                    string status = request.BatchStatus.Trim().ToUpper();
                    query = query.Where(x => x.BatchStatus == status);
                }

                if (request.CutoffDateFrom.HasValue)
                {
                    DateTime from = request.CutoffDateFrom.Value.Date;
                    query = query.Where(x => x.CutoffDate >= from);
                }

                if (request.CutoffDateTo.HasValue)
                {
                    DateTime toExclusive = request.CutoffDateTo.Value.Date.AddDays(1);
                    query = query.Where(x => x.CutoffDate < toExclusive);
                }

                int totalRecords = await query.CountAsync();

                string sortBy = string.IsNullOrWhiteSpace(request.SortBy) ? "CREATED_AT" : request.SortBy.Trim().ToUpper();

                bool ascending = string.Equals(request.SortDirection, "ASC", StringComparison.OrdinalIgnoreCase);

                switch (sortBy)
                {
                    case "BATCH_NO":
                        query =
                            ascending
                                ? query.OrderBy(x => x.BatchNo)
                                : query.OrderByDescending(x => x.BatchNo);
                        break;

                    case "CUTOFF_DATE":
                        query =
                            ascending
                                ? query.OrderBy(x => x.CutoffDate)
                                : query.OrderByDescending(x => x.CutoffDate);
                        break;

                    case "STARTED_AT":
                        query =
                            ascending
                                ? query.OrderBy(x => x.StartedAt)
                                : query.OrderByDescending(x => x.StartedAt);
                        break;

                    case "COMPLETED_AT":
                        query =
                            ascending
                                ? query.OrderBy(x => x.CompletedAt)
                                : query.OrderByDescending(x => x.CompletedAt);
                        break;

                    default:
                        query =
                            ascending
                                ? query.OrderBy(x => x.CreatedAt)
                                : query.OrderByDescending(x => x.CreatedAt);
                        break;
                }

                var batches =
                    await query
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .Select(
                            x =>
                                new TrustCommissionBatchListItem
                                {
                                    BatchID = x.RowID,
                                    BatchNo = x.BatchNo,
                                    CutoffDate = x.CutoffDate,
                                    StartedAt = x.StartedAt,
                                    CompletedAt = x.CompletedAt,
                                    BatchStatus = x.BatchStatus,
                                    TotalSource = x.TotalSource,
                                    ProcessedSource = x.ProcessedSource,
                                    FailedSource = x.FailedSource,
                                    TotalCommissionRecords = x.TotalCommissionRecords,
                                    TotalCommissionAmount = x.TotalCommissionAmount,
                                    ErrorMessage = x.ErrorMessage,
                                    CreatedAt = x.CreatedAt
                                })
                        .ToListAsync();

                int totalPages =
                    totalRecords == 0
                        ? 0
                        : (int)Math.Ceiling(totalRecords / (double)pageSize);

                return new TrustCommissionBatchListResult
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalRecords = totalRecords,
                    TotalPages = totalPages,
                    Batches = batches
                };
            }
        }

        // ============================================================
        // Commission Listing
        // ============================================================

        public async Task<TrustCommissionListResult> GetListAsync(string merchantId, long userId, string roleCode, TrustCommissionListRequest request)
        {
            ValidateViewPermission(roleCode, ListCode);

            if (request == null)
            {
                request = new TrustCommissionListRequest();
            }

            int page = request.Page <= 0 ? 1 : request.Page;
            int pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

            if (pageSize > 100)
            {
                pageSize = 100;
            }

            using (var db = new Sandbox_BasedEntities())
            {
                var baseQuery =
                    from commission in db.tbl_TrustCommission
                    join batchTemp in db.tbl_TrustCommissionBatch on commission.BatchID equals batchTemp.RowID into batchJoin
                    from batch in batchJoin.DefaultIfEmpty()
                    join sellingTemp in db.tbl_MemberInfo on commission.SellingMemberID equals sellingTemp.RowID into sellingJoin
                    from selling in sellingJoin.DefaultIfEmpty()
                    join recipientTemp in db.tbl_MemberInfo on commission.RecipientMemberID equals recipientTemp.RowID into recipientJoin
                    from recipient in recipientJoin.DefaultIfEmpty()
                    join personalTemp in db.tbl_TrustApplication_PersonalDetail on commission.TrustApplicationID equals personalTemp.TrustApplicationID into personalJoin
                    from personal in personalJoin.DefaultIfEmpty()
                    where commission.MerchantID == merchantId
                    select new
                    {
                        Commission = commission,
                        Batch = batch,
                        Selling = selling,
                        Recipient = recipient,
                        Personal = personal
                    };

                if (string.Equals(roleCode, "AG", StringComparison.OrdinalIgnoreCase))
                {
                    baseQuery = baseQuery.Where(x => x.Commission.SellingMemberID == userId || x.Commission.RecipientMemberID == userId);
                }

                // Overall statistics are merchant-scoped and intentionally
                // calculated before batch/search/date/status filters.
                TrustCommissionStatistics totalStatistics =
                    await BuildStatisticsAsync(
                        baseQuery.Select(
                            x =>
                                new CommissionStatisticProjection
                                {
                                    Status = x.Commission.CommissionStatus,
                                    Amount = x.Commission.CommissionAmount
                                }));

                var query = baseQuery;

                if (!string.IsNullOrWhiteSpace(request.BatchNo))
                {
                    string batchNo = request.BatchNo.Trim();
                    query = query.Where(x => x.Batch != null && x.Batch.BatchNo == batchNo);
                }

                if (!string.IsNullOrWhiteSpace(request.TrustSearch))
                {
                    string search = request.TrustSearch.Trim();
                    long trustId;
                    bool isTrustId = long.TryParse(search, out trustId);

                    if (!isTrustId)
                    {
                        query = query.Where(x => false);
                    }
                    else
                    {
                        query = query.Where(x => x.Commission.TrustID == trustId);
                    }
                }

                if (!string.IsNullOrWhiteSpace(request.SellingAgentSearch))
                {
                    string search = request.SellingAgentSearch.Trim();
                    query =
                        query.Where(x =>
                            x.Selling != null
                            && (
                                (x.Selling.Username != null && x.Selling.Username.Contains(search))
                                || (x.Selling.Fullname != null && x.Selling.Fullname.Contains(search))
                                || (x.Selling.IC != null && x.Selling.IC.Contains(search))
                            ));
                }

                if (!string.IsNullOrWhiteSpace(request.RecipientAgentSearch))
                {
                    string search = request.RecipientAgentSearch.Trim();
                    query =
                        query.Where(x =>
                            x.Recipient != null
                            && (
                                (x.Recipient.Username != null && x.Recipient.Username.Contains(search))
                                || (x.Recipient.Fullname != null && x.Recipient.Fullname.Contains(search))
                                || (x.Recipient.IC != null && x.Recipient.IC.Contains(search))
                            ));
                }

                if (!string.IsNullOrWhiteSpace(request.SettlorSearch))
                {
                    string search = request.SettlorSearch.Trim();
                    query =
                        query.Where(x =>
                            x.Personal != null
                            && (
                                (x.Personal.FullName != null && x.Personal.FullName.Contains(search))
                                || (x.Personal.Email != null && x.Personal.Email.Contains(search))
                                || (x.Personal.IdentityNo != null && x.Personal.IdentityNo.Contains(search))
                                || (x.Personal.ContactNo != null && x.Personal.ContactNo.Contains(search))
                            ));
                }

                if (request.PayoutDateFrom.HasValue)
                {
                    DateTime from = request.PayoutDateFrom.Value.Date;
                    query = query.Where(x => x.Commission.CommissionDate >= from);
                }

                if (request.PayoutDateTo.HasValue)
                {
                    DateTime toExclusive = request.PayoutDateTo.Value.Date.AddDays(1);
                    query = query.Where(x => x.Commission.CommissionDate < toExclusive);
                }

                if (!string.IsNullOrWhiteSpace(request.CommissionStatus) && !string.Equals(request.CommissionStatus.Trim(), "ALL", StringComparison.OrdinalIgnoreCase))
                {
                    string status = request.CommissionStatus.Trim().ToUpper();

                    if (status != "CALCULATED" && status != "PAID" && status != "CANCELLED")
                    {
                        throw new BusinessException("Invalid commission status. Allowed values are ALL, CALCULATED, PAID and CANCELLED.", ListCode);
                    }

                    query = query.Where(x => x.Commission.CommissionStatus == status);
                }

                TrustCommissionStatistics searchStatistics =
                    await BuildStatisticsAsync(
                        query.Select(
                            x =>
                                new CommissionStatisticProjection
                                {
                                    Status = x.Commission.CommissionStatus,
                                    Amount = x.Commission.CommissionAmount
                                }));

                int totalRecords = await query.CountAsync();

                string sortBy = string.IsNullOrWhiteSpace(request.SortBy) ? "PAYOUT_DATE" : request.SortBy.Trim().ToUpper();
                bool ascending = string.Equals(request.SortDirection, "ASC", StringComparison.OrdinalIgnoreCase);

                switch (sortBy)
                {
                    case "TRUST_ID":
                        query =
                            ascending
                                ? query.OrderBy(x => x.Commission.TrustID)
                                : query.OrderByDescending(x => x.Commission.TrustID);
                        break;

                    case "COMMISSION_NO":
                        query =
                            ascending
                                ? query.OrderBy(x => x.Commission.CommissionNo)
                                : query.OrderByDescending(x => x.Commission.CommissionNo);
                        break;

                    case "COMMISSION_AMOUNT":
                        query =
                            ascending
                                ? query.OrderBy(x => x.Commission.CommissionAmount)
                                : query.OrderByDescending(x => x.Commission.CommissionAmount);
                        break;

                    case "STATUS":
                        query =
                            ascending
                                ? query.OrderBy(x => x.Commission.CommissionStatus)
                                : query.OrderByDescending(x => x.Commission.CommissionStatus);
                        break;

                    case "CREATED_AT":
                        query =
                            ascending
                                ? query.OrderBy(x => x.Commission.CreatedAt)
                                : query.OrderByDescending(x => x.Commission.CreatedAt);
                        break;

                    default:
                        query =
                            ascending
                                ? query.OrderBy(x => x.Commission.CommissionDate)
                                : query.OrderByDescending(x => x.Commission.CommissionDate);
                        break;
                }

                var rawItems =
                    await query
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .Select(
                            x =>
                                new
                                {
                                    CommissionID = x.Commission.RowID,
                                    x.Commission.CommissionNo,
                                    BatchID = x.Commission.BatchID,
                                    BatchNo = x.Batch == null ? null : x.Batch.BatchNo,
                                    x.Commission.TrustApplicationID,
                                    x.Commission.TrustID,
                                    x.Commission.ProductCode,
                                    SellingMemberID = x.Commission.SellingMemberID,
                                    SellingUsername = x.Selling == null ? null : x.Selling.Username,
                                    SellingFullName = x.Selling == null ? null : x.Selling.Fullname,
                                    SellingIdentityNo = x.Selling == null ? null : x.Selling.IC,
                                    SellingEmail = x.Selling == null ? null : x.Selling.Email,
                                    SellingContactNo =
                                        x.Selling == null
                                            ? null
                                            : (x.Selling.CountryMobileCode ?? "") + (x.Selling.Mobile ?? ""),
                                    RecipientMemberID = x.Commission.RecipientMemberID,
                                    RecipientUsername = x.Recipient == null ? null : x.Recipient.Username,
                                    RecipientFullName = x.Recipient == null ? null : x.Recipient.Fullname,
                                    RecipientIdentityNo = x.Recipient == null ? null : x.Recipient.IC,
                                    RecipientEmail = x.Recipient == null ? null : x.Recipient.Email,
                                    RecipientContactNo =
                                        x.Recipient == null
                                            ? null
                                            : (x.Recipient.CountryMobileCode ?? "") + (x.Recipient.Mobile ?? ""),
                                    SettlorFullName = x.Personal == null ? null : x.Personal.FullName,
                                    SettlorIdentityType = x.Personal == null ? null : x.Personal.IdentityType,
                                    SettlorIdentityNo = x.Personal == null ? null : x.Personal.IdentityNo,
                                    SettlorEmail = x.Personal == null ? null : x.Personal.Email,
                                    SettlorContactNo = x.Personal == null ? null : x.Personal.ContactNo,
                                    x.Commission.CommissionMethod,
                                    x.Commission.CommissionType,
                                    x.Commission.RequiredRankCode,
                                    x.Commission.RecipientRankCode,
                                    x.Commission.NetworkLevel,
                                    x.Commission.IsCompressed,
                                    x.Commission.CompressedLevels,
                                    x.Commission.CalculationBasis,
                                    x.Commission.PlacementAmount,
                                    x.Commission.CommissionRate,
                                    x.Commission.CommissionAmount,
                                    x.Commission.CommissionPeriod,
                                    PayoutDate = x.Commission.CommissionDate,
                                    x.Commission.CommissionStatus,
                                    x.Commission.StatusRemark,
                                    x.Commission.StatusUpdatedAt,
                                    x.Commission.StatusUpdatedBy,
                                    x.Commission.CreatedAt
                                })
                        .ToListAsync();

                var statusUpdatedByIds =
                    rawItems
                        .Where(x => x.StatusUpdatedBy.HasValue)
                        .Select(x => x.StatusUpdatedBy.Value)
                        .Distinct()
                        .ToList();

                var statusUsers =
                    statusUpdatedByIds.Count == 0
                        ? new List<StatusUserProjection>()
                        : await db.tbl_MemberInfo
                            .Where(x => statusUpdatedByIds.Contains(x.RowID))
                            .Select(
                                x =>
                                    new StatusUserProjection
                                    {
                                        MemberID = x.RowID,
                                        Username = x.Username,
                                        FullName = x.Fullname
                                    })
                            .ToListAsync();

                var commissions =
                    rawItems
                        .Select(
                            x =>
                            {
                                var statusUser =
                                    x.StatusUpdatedBy.HasValue
                                        ? statusUsers.FirstOrDefault(u => u.MemberID == x.StatusUpdatedBy.Value)
                                        : null;

                                return new TrustCommissionListItem
                                {
                                    CommissionID = x.CommissionID,
                                    CommissionNo = x.CommissionNo,
                                    BatchID = x.BatchID,
                                    BatchNo = x.BatchNo,
                                    TrustApplicationID = x.TrustApplicationID,
                                    TrustID = x.TrustID,
                                    TrustNo = x.TrustID.ToString("D4"),
                                    ProductCode = x.ProductCode,

                                    SellingAgent =
                                        new TrustCommissionAgentResult
                                        {
                                            MemberID = x.SellingMemberID,
                                            Username = x.SellingUsername,
                                            FullName = x.SellingFullName,
                                            IdentityNo = x.SellingIdentityNo,
                                            Email = x.SellingEmail,
                                            ContactNo = x.SellingContactNo
                                        },

                                    RecipientAgent =
                                        new TrustCommissionAgentResult
                                        {
                                            MemberID = x.RecipientMemberID,
                                            Username = x.RecipientUsername,
                                            FullName = x.RecipientFullName,
                                            IdentityNo = x.RecipientIdentityNo,
                                            Email = x.RecipientEmail,
                                            ContactNo = x.RecipientContactNo
                                        },

                                    Settlor =
                                        new TrustCommissionSettlorResult
                                        {
                                            FullName = x.SettlorFullName,
                                            IdentityType = x.SettlorIdentityType,
                                            IdentityNo = x.SettlorIdentityNo,
                                            Email = x.SettlorEmail,
                                            ContactNo = x.SettlorContactNo
                                        },

                                    CommissionMethod = x.CommissionMethod,
                                    CommissionType = x.CommissionType,
                                    RequiredRankCode = x.RequiredRankCode,
                                    RecipientRankCode = x.RecipientRankCode,
                                    NetworkLevel = x.NetworkLevel,
                                    IsCompressed = x.IsCompressed,
                                    CompressedLevels = x.CompressedLevels,
                                    CalculationBasis = x.CalculationBasis,
                                    PlacementAmount = x.PlacementAmount,
                                    CommissionRate = x.CommissionRate,
                                    CommissionAmount = x.CommissionAmount,
                                    CommissionPeriod = x.CommissionPeriod,
                                    PayoutDate = x.PayoutDate,
                                    CommissionStatus = x.CommissionStatus,
                                    StatusRemark = x.StatusRemark,
                                    StatusUpdatedAt = x.StatusUpdatedAt,
                                    StatusUpdatedBy = x.StatusUpdatedBy,
                                    StatusUpdatedByUsername = statusUser == null ? null : statusUser.Username,
                                    StatusUpdatedByFullName = statusUser == null ? null : statusUser.FullName,
                                    CreatedAt = x.CreatedAt
                                };
                            })
                        .ToList();

                int totalPages =
                    totalRecords == 0
                        ? 0
                        : (int)Math.Ceiling(totalRecords / (double)pageSize);

                return new TrustCommissionListResult
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalRecords = totalRecords,
                    TotalPages = totalPages,
                    TotalStatistics = totalStatistics,
                    SearchStatistics = searchStatistics,
                    Commissions = commissions
                };
            }
        }

        // ============================================================
        // Commission Detail
        // ============================================================

        public async Task<TrustCommissionDetailResult> GetDetailAsync(string merchantId, long userId, string roleCode, long commissionId)
        {
            ValidateViewPermission(roleCode, DetailCode);

            using (var db = new Sandbox_BasedEntities())
            {
                var commission = await db.tbl_TrustCommission.FirstOrDefaultAsync(x => x.RowID == commissionId && x.MerchantID == merchantId);

                if (commission == null)
                {
                    throw new BusinessException("Commission record not found.", DetailCode);
                }

                if (string.Equals(roleCode, "AG", StringComparison.OrdinalIgnoreCase))
                {
                    bool canView = commission.SellingMemberID == userId || commission.RecipientMemberID == userId;

                    if (!canView)
                    {
                        throw new BusinessException("Commission record not found.", DetailCode);
                    }
                }

                var batch = await db.tbl_TrustCommissionBatch.FirstOrDefaultAsync(x => x.RowID == commission.BatchID);

                var application =
                    await db.tbl_TrustApplication
                        .FirstOrDefaultAsync(x => x.RowID == commission.TrustApplicationID && x.MerchantID == merchantId);

                var personal =
                    await db.tbl_TrustApplication_PersonalDetail
                        .FirstOrDefaultAsync(x => x.TrustApplicationID == commission.TrustApplicationID);

                var selling =
                    await db.tbl_MemberInfo.FirstOrDefaultAsync(x => x.RowID == commission.SellingMemberID);

                var recipient =
                    await db.tbl_MemberInfo.FirstOrDefaultAsync(x => x.RowID == commission.RecipientMemberID);

                // The schema does not expose a "primary bank" flag.
                // Use the latest non-deleted bank record for this merchant/member.
                var recipientBank =
                    await db.tbl_MemberInfo_Bank
                        .Where(
                            x =>
                                x.MerchantID == merchantId
                                && x.MemberID == commission.RecipientMemberID
                                && (x.IsDeleted == null || x.IsDeleted == 0))
                        .OrderByDescending(x => x.RowID)
                        .FirstOrDefaultAsync();

                string recipientBankNameDetail = null;

                if (recipientBank != null && !string.IsNullOrWhiteSpace(recipientBank.BankName))
                {
                    string bankName = recipientBank.BankName;

                    recipientBankNameDetail =
                        await db.tbl_Master_BankList
                            .Where(x => x.BankName == bankName && x.ShowOption == "Bank" && x.Status == 0)
                            .Select(x => x.BankNameDetail)
                            .FirstOrDefaultAsync();
                }

                tbl_MemberInfo statusUpdatedBy = null;

                if (commission.StatusUpdatedBy.HasValue)
                {
                    long statusUserId = commission.StatusUpdatedBy.Value;
                    statusUpdatedBy = await db.tbl_MemberInfo.FirstOrDefaultAsync(x => x.RowID == statusUserId);
                }

                return new TrustCommissionDetailResult
                {
                    CommissionID = commission.RowID,
                    CommissionNo = commission.CommissionNo,
                    CommissionSourceID = commission.CommissionSourceID,

                    Batch =
                        batch == null
                            ? null
                            : new TrustCommissionBatchResult
                            {
                                BatchID = batch.RowID,
                                BatchNo = batch.BatchNo,
                                CutoffDate = batch.CutoffDate,
                                StartedAt = batch.StartedAt,
                                CompletedAt = batch.CompletedAt,
                                BatchStatus = batch.BatchStatus,
                                TotalSource = batch.TotalSource,
                                ProcessedSource = batch.ProcessedSource,
                                FailedSource = batch.FailedSource,
                                TotalCommissionRecords = batch.TotalCommissionRecords,
                                TotalCommissionAmount = batch.TotalCommissionAmount,
                                ErrorMessage = batch.ErrorMessage,
                                CreatedAt = batch.CreatedAt
                            },

                    Application =
                        application == null
                            ? null
                            : new TrustCommissionApplicationResult
                            {
                                TrustApplicationID = application.RowID,
                                TrustID = application.TrustID,
                                TrustNo = application.TrustID.ToString("D4"),
                                ProductCode = application.ProductCode,
                                ApplicationStatus = application.ApplicationStatus,
                                CommencementDate = application.CommencementDate,
                                MaturityDate = application.MaturityDate,
                                CompletedAt = application.CompletedAt
                            },

                    SellingAgent =
                        new TrustCommissionAgentResult
                        {
                            MemberID = commission.SellingMemberID,
                            Username = selling == null ? null : selling.Username,
                            FullName = selling == null ? null : selling.Fullname,
                            IdentityNo = selling == null ? null : selling.IC,
                            Email = selling == null ? null : selling.Email,
                            ContactNo = selling == null ? null : selling.Mobile
                        },

                    RecipientAgent =
                        new TrustCommissionAgentResult
                        {
                            MemberID = commission.RecipientMemberID,
                            Username = recipient == null ? null : recipient.Username,
                            FullName = recipient == null ? null : recipient.Fullname,
                            IdentityNo = recipient == null ? null : recipient.IC,
                            Email = recipient == null ? null : recipient.Email,
                            ContactNo = recipient == null ? null : recipient.Mobile
                        },

                    RecipientBank =
                        recipientBank == null
                            ? null
                            : new TrustCommissionBankResult
                            {
                                BankID = recipientBank.RowID,
                                AccountName = recipientBank.AccountName,
                                AccountNumber = recipientBank.AccountNumber,
                                BankName = recipientBank.BankName,
                                BankNameDetail = recipientBankNameDetail,
                                BankBranch = recipientBank.BankBranch,
                                SwiftCode = recipientBank.SwiftCode,
                                IBAN = recipientBank.IBAN,
                                BankCountry = recipientBank.BankCountry
                            },

                    Settlor =
                        personal == null
                            ? null
                            : new TrustCommissionSettlorResult
                            {
                                FullName = personal.FullName,
                                IdentityType = personal.IdentityType,
                                IdentityNo = personal.IdentityNo,
                                Email = personal.Email,
                                ContactNo = personal.ContactNo
                            },

                    CommissionMethod = commission.CommissionMethod,
                    CommissionType = commission.CommissionType,
                    RequiredRankCode = commission.RequiredRankCode,
                    RecipientRankCode = commission.RecipientRankCode,
                    NetworkLevel = commission.NetworkLevel,
                    IsCompressed = commission.IsCompressed,
                    CompressedLevels = commission.CompressedLevels,
                    CalculationBasis = commission.CalculationBasis,
                    PlacementAmount = commission.PlacementAmount,
                    CommissionRate = commission.CommissionRate,
                    CommissionAmount = commission.CommissionAmount,
                    CommissionPeriod = commission.CommissionPeriod,
                    PayoutDate = commission.CommissionDate,
                    CommissionStatus = commission.CommissionStatus,
                    StatusRemark = commission.StatusRemark,
                    StatusUpdatedAt = commission.StatusUpdatedAt,
                    StatusUpdatedBy = commission.StatusUpdatedBy,
                    StatusUpdatedByUsername = statusUpdatedBy == null ? null : statusUpdatedBy.Username,
                    StatusUpdatedByFullName = statusUpdatedBy == null ? null : statusUpdatedBy.Fullname,
                    CreatedAt = commission.CreatedAt
                };
            }
        }

        // ============================================================
        // Update Commission Status
        //
        // Allowed:
        // CALCULATED -> PAID
        // CALCULATED -> CANCELLED
        //
        // PAID and CANCELLED are final states.
        // ============================================================

        public async Task<TrustCommissionStatusUpdateResult> UpdateStatusAsync(string merchantId, long userId, string roleCode, long commissionId, TrustCommissionStatusUpdateRequest request)
        {
            if (!CanUpdateStatus(roleCode))
            {
                throw new BusinessException("You are not allowed to update Trust commission payout status.", UpdateStatusCode);
            }

            if (request == null)
            {
                throw new BusinessException("Invalid request.", UpdateStatusCode);
            }

            string newStatus = string.IsNullOrWhiteSpace(request.Status) ? string.Empty : request.Status.Trim().ToUpper();

            if (newStatus != "PAID" && newStatus != "CANCELLED")
            {
                throw new BusinessException("Invalid commission status. Only PAID or CANCELLED is allowed.", UpdateStatusCode);
            }

            string remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim();

            if (remark != null && remark.Length > 1000)
            {
                throw new BusinessException("Remark cannot exceed 1000 characters.", UpdateStatusCode);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        var commission =
                            await db.tbl_TrustCommission.FirstOrDefaultAsync(x => x.RowID == commissionId && x.MerchantID == merchantId);

                        if (commission == null)
                        {
                            throw new BusinessException("Commission record not found.", UpdateStatusCode);
                        }

                        string currentStatus = (commission.CommissionStatus ?? string.Empty).Trim().ToUpper();

                        if (currentStatus != "CALCULATED")
                        {
                            throw new BusinessException("Only commission records with CALCULATED status can be updated to PAID or CANCELLED.", UpdateStatusCode);
                        }

                        DateTime now = DateTime.Now;
                        string previousStatus = commission.CommissionStatus;

                        commission.CommissionStatus = newStatus;
                        commission.StatusRemark = remark;
                        commission.StatusUpdatedAt = now;
                        commission.StatusUpdatedBy = userId;

                        await db.SaveChangesAsync();
                        transaction.Commit();

                        return new TrustCommissionStatusUpdateResult
                        {
                            CommissionID = commission.RowID,
                            CommissionNo = commission.CommissionNo,
                            PreviousStatus = previousStatus,
                            CommissionStatus = commission.CommissionStatus,
                            StatusRemark = commission.StatusRemark,
                            StatusUpdatedAt = now,
                            StatusUpdatedBy = userId
                        };
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // Statistics
        // ============================================================

        private async Task<TrustCommissionStatistics> BuildStatisticsAsync(IQueryable<CommissionStatisticProjection> query)
        {
            var grouped =
                await query
                    .GroupBy(x => x.Status)
                    .Select(
                        x =>
                            new CommissionStatisticGroup
                            {
                                Status = x.Key,
                                Count = x.Count(),
                                Amount = x.Sum(y => y.Amount)
                            })
                    .ToListAsync();

            var result = new TrustCommissionStatistics();

            foreach (var item in grouped)
            {
                string status = (item.Status ?? string.Empty).Trim().ToUpper();

                result.TotalRecords += item.Count;
                result.TotalAmount += item.Amount;

                switch (status)
                {
                    case "CALCULATED":
                        result.CalculatedRecords += item.Count;
                        result.CalculatedAmount += item.Amount;
                        break;

                    case "PAID":
                        result.PaidRecords += item.Count;
                        result.PaidAmount += item.Amount;
                        break;

                    case "CANCELLED":
                        result.CancelledRecords += item.Count;
                        result.CancelledAmount += item.Amount;
                        break;
                }
            }

            return result;
        }

        private class CommissionStatisticProjection
        {
            public string Status { get; set; }
            public decimal Amount { get; set; }
        }

        private class CommissionStatisticGroup
        {
            public string Status { get; set; }
            public int Count { get; set; }
            public decimal Amount { get; set; }
        }

        private class StatusUserProjection
        {
            public long MemberID { get; set; }
            public string Username { get; set; }
            public string FullName { get; set; }
        }
    }
}
