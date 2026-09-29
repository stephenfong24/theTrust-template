using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.TrustDividend;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Dividend.Finance
{
    /// <summary>
    /// Finance/Admin service for viewing and processing generated
    /// Trust Application Dividend Schedule records.
    ///
    /// IMPORTANT:
    /// This service does NOT generate dividend schedules.
    ///
    /// Dividend generation remains handled by:
    /// TrustApplicationDividendScheduleServiceAsync.
    ///
    /// This service only:
    /// - Lists generated schedules
    /// - Calculates effective DUE status
    /// - Returns schedule details
    /// - Marks eligible bank-transfer dividends as PAID
    /// - Cancels eligible bank-transfer dividends
    /// - Writes application history
    /// </summary>
    public class TrustDividendFinanceServiceAsync
    {
        private const string ListCode = "TRUST-DIVIDEND-LIST";
        private const string DetailCode = "TRUST-DIVIDEND-DETAIL";
        private const string StatusCode = "TRUST-DIVIDEND-STATUS";
        private const string AccessCode = "TRUST-DIVIDEND-ACCESS";
        private const string StatusScheduled = "SCHEDULED";
        private const string StatusDue = "DUE";
        private const string StatusPaid = "PAID";
        private const string StatusCancelled = "CANCELLED";
        private const string ReturnTransferToBank = "TRANSFER_TO_BANK";
        private const string ReturnRedeposit = "REDEPOSIT_AS_TRUST_ASSET";

        // ============================================================
        // Access
        // ============================================================

        /// <summary>
        /// Dividend viewing is available to:
        ///
        /// SA = Superadmin
        /// AD = Admin
        /// AC = Account / Finance
        /// AG = Agent - own Trust Applications only
        ///
        /// OP is intentionally excluded.
        /// </summary>
        private static bool IsAllowedViewRole(string roleCode)
        {
            string role = (roleCode ?? string.Empty).Trim().ToUpperInvariant();

            return
                role == "SA" ||
                role == "AD" ||
                role == "AC" ||
                role == "AG";
        }

        /// <summary>
        /// Dividend status processing is available only to:
        ///
        /// SA = Superadmin
        /// AD = Admin
        /// AC = Account / Finance
        ///
        /// AG is view-only.
        /// </summary>
        
        private static bool IsAllowedProcessRole(string roleCode)
        {
            string role = (roleCode ?? string.Empty).Trim().ToUpperInvariant();

            return
                role == "SA" ||
                role == "AD" ||
                role == "AC";
        }

        private static bool IsAgent(string roleCode)
        {
            return string.Equals((roleCode ?? string.Empty).Trim(), "AG", StringComparison.OrdinalIgnoreCase);
        }

        private static void ValidateViewAccess(string roleCode)
        {
            if (!IsAllowedViewRole(roleCode))
            {
                throw new BusinessException("You are not allowed to access Trust Dividend management.", AccessCode);
            }
        }

        private static void ValidateProcessAccess(string roleCode)
        {
            if (!IsAllowedProcessRole(roleCode))
            {
                throw new BusinessException("You are not allowed to process Trust Dividends.", AccessCode);
            }
        }

        // ============================================================
        // Effective Status
        // ============================================================

        /// <summary>
        /// DUE is a derived status.
        ///
        /// The database record remains SCHEDULED until Finance makes
        /// the final PAID or CANCELLED decision.
        ///
        /// SCHEDULED + PayoutDate <= Today = DUE.
        /// </summary>
        
        private static string ResolveEffectiveStatus(string storedStatus, DateTime payoutDate, DateTime today)
        {
            string status = (storedStatus ?? string.Empty).Trim().ToUpperInvariant();

            if (status == StatusScheduled && payoutDate.Date <= today.Date)
            {
                return StatusDue;
            }

            return status;
        }

        // ============================================================
        // Settlor Bank
        // ============================================================

        /// <summary>
        /// Resolve the actual Settlor Bank Name.
        ///
        /// If SettlorBankName is OTHER, use SettlorOtherBankName.
        /// </summary>
        
        private static string ResolveSettlorBankName( tbl_TrustApplication_TrustAsset asset)
        {
            if (asset == null)
            {
                return null;
            }

            string bankName = (asset.SettlorBankName ?? string.Empty).Trim();

            if (string.Equals(bankName, "OTHER", StringComparison.OrdinalIgnoreCase))
            {
                return asset.SettlorOtherBankName;
            }

            return asset.SettlorBankName;
        }

        // ============================================================
        // LIST
        // ============================================================

        public async Task<TrustDividendListResult> GetListAsync(
            string merchantId,
            long userId,
            string roleCode,
            TrustDividendListRequest request)
        {
            ValidateViewAccess(roleCode);

            if (request == null)
            {
                request = new TrustDividendListRequest();
            }

            using (var db = new Sandbox_BasedEntities())
            {
                DateTime today = DateTime.Today;

                // ====================================================
                // Pagination
                // ====================================================

                int page =
                    request.Page <= 0
                        ? 1
                        : request.Page;

                int pageSize =
                    request.PageSize <= 0
                        ? 10
                        : request.PageSize;

                if (pageSize > 100)
                {
                    pageSize = 100;
                }

                // ====================================================
                // Base Query
                // ====================================================

                var query =
                    from dividend
                        in db.tbl_TrustApplication_DividendSchedule

                    join application
                        in db.tbl_TrustApplication
                        on dividend.TrustApplicationID
                        equals application.RowID

                    join planTemp
                        in db.tbl_TrustPlan
                        on application.ProductCode
                        equals planTemp.ProductCode
                        into planJoin

                    from plan
                        in planJoin.DefaultIfEmpty()

                    join personalTemp
                        in db.tbl_TrustApplication_PersonalDetail
                        on application.RowID
                        equals personalTemp.TrustApplicationID
                        into personalJoin

                    from personal
                        in personalJoin.DefaultIfEmpty()

                    join assetTemp
                        in db.tbl_TrustApplication_TrustAsset
                        on application.RowID
                        equals assetTemp.TrustApplicationID
                        into assetJoin

                    from asset
                        in assetJoin.DefaultIfEmpty()

                    join bankTemp
                        in db.tbl_Master_BankList
                        on asset.SettlorBankName
                        equals bankTemp.BankName
                        into bankJoin

                    from bank
                        in bankJoin
                            .Where(x =>
                                x.ShowOption == "Bank" &&
                                x.Status == 0)
                            .DefaultIfEmpty()

                    where
                        application.MerchantID == merchantId

                    select new
                    {
                        Dividend = dividend,
                        Application = application,
                        Plan = plan,
                        Personal = personal,
                        Asset = asset,
                        Bank = bank
                    };

                // ============================================================
                // Agent Ownership Filter
                //
                // AG can only view dividend schedules belonging to
                // Trust Applications created/owned by the logged-in Agent.
                // ============================================================

                if (IsAgent(roleCode))
                {
                    query =
                        query.Where(x =>
                            x.Application.MemberID == userId);
                }

                // ====================================================
                // Overall Statistics
                //
                // These are calculated before applying search filters.
                // ====================================================

                var totalStatisticRows =
                    await query
                        .Select(x =>
                            new DividendStatisticRow
                            {
                                Status =
                                    x.Dividend.Status,

                                PayoutDate =
                                    x.Dividend.PayoutDate,

                                Amount =
                                    x.Dividend.TotalReturnAmount
                            })
                        .ToListAsync();

                TrustDividendStatistic totalStatistics =
                    BuildStatistics(
                        totalStatisticRows,
                        today);

                // ====================================================
                // Search
                // ====================================================

                if (!string.IsNullOrWhiteSpace(request.Search))
                {
                    string search =
                        request.Search.Trim();

                    long trustId;

                    bool isTrustId =
                        long.TryParse(
                            search,
                            out trustId);

                    query =
                        query.Where(x =>
                            (
                                isTrustId &&
                                x.Application.TrustID == trustId
                            )
                            ||
                            (
                                x.Personal != null &&
                                (
                                    (
                                        x.Personal.FullName != null &&
                                        x.Personal.FullName.Contains(search)
                                    )
                                    ||
                                    (
                                        x.Personal.IdentityNo != null &&
                                        x.Personal.IdentityNo.Contains(search)
                                    )
                                )
                            )
                            ||
                            (
                                x.Asset != null &&
                                (
                                    (
                                        x.Asset.SettlorBankName != null &&
                                        x.Asset.SettlorBankName.Contains(search)
                                    )
                                    ||
                                    (
                                        x.Asset.SettlorOtherBankName != null &&
                                        x.Asset.SettlorOtherBankName.Contains(search)
                                    )
                                    ||
                                    (
                                        x.Asset.SettlorBankAccountNumber != null &&
                                        x.Asset.SettlorBankAccountNumber.Contains(search)
                                    )
                                    ||
                                    (
                                        x.Asset.SettlorBankAccountHolder != null &&
                                        x.Asset.SettlorBankAccountHolder.Contains(search)
                                    )
                                )
                            ));
                }

                // ====================================================
                // Product
                // ====================================================

                if (!string.IsNullOrWhiteSpace(request.ProductCode))
                {
                    string productCode =
                        request.ProductCode.Trim();

                    query =
                        query.Where(x =>
                            x.Application.ProductCode == productCode);
                }

                // ====================================================
                // Return Option
                // ====================================================

                if (!string.IsNullOrWhiteSpace(request.ReturnOption))
                {
                    string returnOption =
                        request.ReturnOption
                            .Trim()
                            .ToUpperInvariant();

                    if (
                        returnOption != ReturnTransferToBank &&
                        returnOption != ReturnRedeposit)
                    {
                        throw new BusinessException(
                            "Invalid Dividend Return Option.",
                            ListCode);
                    }

                    query =
                        query.Where(x =>
                            x.Dividend.ReturnOption == returnOption);
                }

                // ====================================================
                // Payout Date From
                // ====================================================

                if (request.PayoutDateFrom.HasValue)
                {
                    DateTime payoutDateFrom =
                        request.PayoutDateFrom.Value.Date;

                    query =
                        query.Where(x =>
                            x.Dividend.PayoutDate >= payoutDateFrom);
                }

                // ====================================================
                // Payout Date To
                // ====================================================

                if (request.PayoutDateTo.HasValue)
                {
                    DateTime payoutDateTo =
                        request.PayoutDateTo.Value.Date;

                    query =
                        query.Where(x =>
                            x.Dividend.PayoutDate <= payoutDateTo);
                }

                // ====================================================
                // Effective Status Filter
                // ====================================================

                if (!string.IsNullOrWhiteSpace(request.Status))
                {
                    string status =
                        request.Status
                            .Trim()
                            .ToUpperInvariant();

                    switch (status)
                    {
                        case StatusScheduled:

                            query =
                                query.Where(x =>
                                    x.Dividend.Status == StatusScheduled &&
                                    x.Dividend.PayoutDate > today);

                            break;

                        case StatusDue:

                            query =
                                query.Where(x =>
                                    x.Dividend.Status == StatusScheduled &&
                                    x.Dividend.PayoutDate <= today);

                            break;

                        case StatusPaid:

                            query =
                                query.Where(x =>
                                    x.Dividend.Status == StatusPaid);

                            break;

                        case StatusCancelled:

                            query =
                                query.Where(x =>
                                    x.Dividend.Status == StatusCancelled);

                            break;

                        default:

                            throw new BusinessException(
                                "Invalid Dividend Status.",
                                ListCode);
                    }
                }

                // ====================================================
                // Search Statistics
                // ====================================================

                var searchStatisticRows =
                    await query
                        .Select(x =>
                            new DividendStatisticRow
                            {
                                Status =
                                    x.Dividend.Status,

                                PayoutDate =
                                    x.Dividend.PayoutDate,

                                Amount =
                                    x.Dividend.TotalReturnAmount
                            })
                        .ToListAsync();

                TrustDividendStatistic searchStatistics =
                    BuildStatistics(
                        searchStatisticRows,
                        today);

                // ====================================================
                // Total Records
                // ====================================================

                int totalRecords =
                    await query.CountAsync();

                // ====================================================
                // Sorting
                // ====================================================

                string sortBy =
                    string.IsNullOrWhiteSpace(request.SortBy)
                        ? "FINANCE_PRIORITY"
                        : request.SortBy
                            .Trim()
                            .ToUpperInvariant();

                string sortDirection =
                    string.IsNullOrWhiteSpace(request.SortDirection)
                        ? "ASC"
                        : request.SortDirection
                            .Trim()
                            .ToUpperInvariant();

                bool ascending =
                    sortDirection == "ASC";

                switch (sortBy)
                {
                    case "PAYOUT_DATE":

                        query =
                            ascending
                                ? query
                                    .OrderBy(x =>
                                        x.Dividend.PayoutDate)
                                    .ThenBy(x =>
                                        x.Dividend.RowID)
                                : query
                                    .OrderByDescending(x =>
                                        x.Dividend.PayoutDate)
                                    .ThenByDescending(x =>
                                        x.Dividend.RowID);

                        break;

                    case "TRUST_ID":

                        query =
                            ascending
                                ? query
                                    .OrderBy(x =>
                                        x.Application.TrustID)
                                    .ThenBy(x =>
                                        x.Dividend.PayoutDate)
                                : query
                                    .OrderByDescending(x =>
                                        x.Application.TrustID)
                                    .ThenByDescending(x =>
                                        x.Dividend.PayoutDate);

                        break;

                    case "SETTLOR_NAME":

                        query =
                            ascending
                                ? query
                                    .OrderBy(x =>
                                        x.Personal.FullName)
                                    .ThenBy(x =>
                                        x.Dividend.PayoutDate)
                                : query
                                    .OrderByDescending(x =>
                                        x.Personal.FullName)
                                    .ThenByDescending(x =>
                                        x.Dividend.PayoutDate);

                        break;

                    case "DIVIDEND_AMOUNT":

                        query =
                            ascending
                                ? query
                                    .OrderBy(x =>
                                        x.Dividend.TotalReturnAmount)
                                    .ThenBy(x =>
                                        x.Dividend.PayoutDate)
                                : query
                                    .OrderByDescending(x =>
                                        x.Dividend.TotalReturnAmount)
                                    .ThenByDescending(x =>
                                        x.Dividend.PayoutDate);

                        break;

                    case "FINANCE_PRIORITY":
                    default:

                        // ============================================
                        // Finance Priority:
                        //
                        // 0 = DUE
                        // 1 = future SCHEDULED
                        // 2 = PAID
                        // 3 = CANCELLED / other
                        // ============================================

                        query =
                            query
                                .OrderBy(x =>
                                    x.Dividend.Status == StatusScheduled &&
                                    x.Dividend.PayoutDate <= today
                                        ? 0
                                        :
                                    x.Dividend.Status == StatusScheduled
                                        ? 1
                                        :
                                    x.Dividend.Status == StatusPaid
                                        ? 2
                                        : 3)
                                .ThenBy(x =>
                                    x.Dividend.PayoutDate)
                                .ThenBy(x =>
                                    x.Dividend.RowID);

                        break;
                }

                // ====================================================
                // Pagination
                // ====================================================

                var records =
                    await query
                        .Skip(
                            (page - 1) * pageSize)
                        .Take(pageSize)
                        .Select(x =>
                            new
                            {
                                DividendScheduleID =
                                    x.Dividend.RowID,

                                TrustApplicationID =
                                    x.Application.RowID,

                                TrustID =
                                    x.Application.TrustID,

                                ProductCode =
                                    x.Application.ProductCode,

                                ProductName =
                                    x.Plan == null
                                        ? null
                                        : x.Plan.ProductName,

                                SettlorName =
                                    x.Personal == null
                                        ? null
                                        : x.Personal.FullName,

                                SettlorIdentityNo =
                                    x.Personal == null
                                        ? null
                                        : x.Personal.IdentityNo,

                                ScheduleNo =
                                    x.Dividend.ScheduleNo,

                                ReturnYear =
                                    x.Dividend.ReturnYear,

                                PeriodNo =
                                    x.Dividend.PeriodNo,

                                PayoutDate =
                                    x.Dividend.PayoutDate,

                                CalculationBasisAmount =
                                    x.Dividend.CalculationBasisAmount,

                                AnnualRate =
                                    x.Dividend.AnnualRate,

                                PeriodRate =
                                    x.Dividend.PeriodRate,

                                DividendAmount =
                                    x.Dividend.TotalReturnAmount,

                                PayoutAmount =
                                    x.Dividend.PayoutAmount,

                                RedepositAmount =
                                    x.Dividend.RedepositAmount,

                                ReturnOption =
                                    x.Dividend.ReturnOption,

                                PayoutFrequency = x.Dividend.PayoutFrequency,

                                StoredStatus =
                                    x.Dividend.Status,

                                PaidAt =
                                    x.Dividend.PaidAt,

                                CancelledAt =
                                    x.Dividend.CancelledAt,

                                SettlorBankName =
                                    x.Asset == null
                                        ? null
                                        : x.Asset.SettlorBankName,

                                SettlorBankNameDetail =
                                    x.Bank == null
                                        ? null
                                        : x.Bank.BankNameDetail,

                                SettlorOtherBankName =
                                    x.Asset == null
                                        ? null
                                        : x.Asset.SettlorOtherBankName,

                                SettlorBankAccountNumber =
                                    x.Asset == null
                                        ? null
                                        : x.Asset.SettlorBankAccountNumber,

                                SettlorBankAccountHolder =
                                    x.Asset == null
                                        ? null
                                        : x.Asset.SettlorBankAccountHolder
                            })
                        .ToListAsync();

                // ====================================================
                // Convert to API Result
                // ====================================================

                var dividends =
                    records
                        .Select(x =>
                        {
                            string effectiveStatus =
                                ResolveEffectiveStatus(
                                    x.StoredStatus,
                                    x.PayoutDate,
                                    today);

                            bool isRedeposit =
                                string.Equals(
                                    x.ReturnOption,
                                    ReturnRedeposit,
                                    StringComparison.OrdinalIgnoreCase);

                            bool isDue =
                                effectiveStatus == StatusDue;

                            return new TrustDividendListItem
                            {
                                DividendScheduleID =
                                    x.DividendScheduleID,

                                TrustApplicationID =
                                    x.TrustApplicationID,

                                TrustID =
                                    x.TrustID,

                                TrustNo =
                                    x.TrustID.ToString("D4"),

                                ProductCode =
                                    x.ProductCode,

                                ProductName =
                                    x.ProductName,

                                SettlorName =
                                    x.SettlorName,

                                SettlorIdentityNo =
                                    x.SettlorIdentityNo,

                                ScheduleNo =
                                    x.ScheduleNo,

                                ReturnYear =
                                    x.ReturnYear,

                                PeriodNo =
                                    x.PeriodNo,

                                PayoutDate =
                                    x.PayoutDate,

                                CalculationBasisAmount =
                                    x.CalculationBasisAmount,

                                AnnualRate =
                                    x.AnnualRate,

                                PeriodRate =
                                    x.PeriodRate,

                                DividendAmount =
                                    x.DividendAmount,

                                PayoutAmount =
                                    x.PayoutAmount,

                                RedepositAmount =
                                    x.RedepositAmount,

                                ReturnOption =
                                    x.ReturnOption,

                                PayoutFrequency = x.PayoutFrequency,

                                IsRedeposit =
                                    isRedeposit,

                                Status =
                                    effectiveStatus,

                                PaidAt =
                                    x.PaidAt,

                                CancelledAt =
                                    x.CancelledAt,

                                SettlorBankName =
                                    string.Equals(
                                        x.SettlorBankName,
                                        "OTHER",
                                        StringComparison.OrdinalIgnoreCase)
                                            ? x.SettlorOtherBankName
                                            : x.SettlorBankName,

                                SettlorBankNameDetail =
                                    string.Equals(
                                        x.SettlorBankName,
                                        "OTHER",
                                        StringComparison.OrdinalIgnoreCase)
                                            ? x.SettlorOtherBankName
                                            : x.SettlorBankNameDetail,

                                SettlorBankAccountNumber = x.SettlorBankAccountNumber,

                                SettlorBankAccountHolder = x.SettlorBankAccountHolder,

                                CanProcess =
                                    isDue &&
                                    !isRedeposit,

                                CanMarkPaid =
                                    isDue &&
                                    !isRedeposit,

                                CanCancel =
                                    isDue &&
                                    !isRedeposit
                            };
                        })
                        .ToList();

                // ====================================================
                // Total Pages
                // ====================================================

                int totalPages =
                    totalRecords == 0
                        ? 0
                        : (int)Math.Ceiling(
                            totalRecords /
                            (double)pageSize);

                return new TrustDividendListResult
                {
                    Page =
                        page,

                    PageSize =
                        pageSize,

                    TotalRecords =
                        totalRecords,

                    TotalPages =
                        totalPages,

                    TotalStatistics =
                        totalStatistics,

                    SearchStatistics =
                        searchStatistics,

                    Dividends =
                        dividends
                };
            }
        }

        // ============================================================
        // DETAIL
        // ============================================================

        public async Task<TrustDividendDetailResult> GetDetailAsync(
            string merchantId,
            long userId,
            string roleCode,
            long dividendScheduleId)
        {
            ValidateViewAccess(roleCode);

            bool isAgent = IsAgent(roleCode);

            using (var db = new Sandbox_BasedEntities())
            {
                DateTime today =
                    DateTime.Today;

                var record =
                    await (
                        from dividend
                            in db.tbl_TrustApplication_DividendSchedule

                        join application
                            in db.tbl_TrustApplication
                            on dividend.TrustApplicationID
                            equals application.RowID

                        join planTemp
                            in db.tbl_TrustPlan
                            on application.ProductCode
                            equals planTemp.ProductCode
                            into planJoin

                        from plan
                            in planJoin.DefaultIfEmpty()

                        join personalTemp
                            in db.tbl_TrustApplication_PersonalDetail
                            on application.RowID
                            equals personalTemp.TrustApplicationID
                            into personalJoin

                        from personal
                            in personalJoin.DefaultIfEmpty()

                        join assetTemp
                            in db.tbl_TrustApplication_TrustAsset
                            on application.RowID
                            equals assetTemp.TrustApplicationID
                            into assetJoin

                        from asset
                            in assetJoin.DefaultIfEmpty()

                        join bankTemp
                            in db.tbl_Master_BankList
                            on asset.SettlorBankName
                            equals bankTemp.BankName
                            into bankJoin

                        from bank
                            in bankJoin
                                .Where(x =>
                                    x.ShowOption == "Bank" &&
                                    x.Status == 0)
                                .DefaultIfEmpty()

                        where
                            dividend.RowID == dividendScheduleId
                            &&
                            application.MerchantID == merchantId
                            &&
                            (
                                !isAgent
                                ||
                                application.MemberID == userId
                            )

                        select new
                        {
                            Dividend = dividend,
                            Application = application,
                            Plan = plan,
                            Personal = personal,
                            Asset = asset,
                            Bank = bank
                        })
                        .FirstOrDefaultAsync();

                if (record == null)
                {
                    throw new BusinessException(
                        "Dividend Schedule record not found.",
                        DetailCode);
                }

                string effectiveStatus =
                    ResolveEffectiveStatus(
                        record.Dividend.Status,
                        record.Dividend.PayoutDate,
                        today);

                bool isRedeposit =
                    string.Equals(
                        record.Dividend.ReturnOption,
                        ReturnRedeposit,
                        StringComparison.OrdinalIgnoreCase);

                bool isDue =
                    effectiveStatus == StatusDue;

                return new TrustDividendDetailResult
                {
                    DividendScheduleID =
                        record.Dividend.RowID,

                    TrustApplicationID =
                        record.Application.RowID,

                    TrustID =
                        record.Application.TrustID,

                    TrustNo =
                        record.Application.TrustID.ToString("D4"),

                    ProductCode =
                        record.Application.ProductCode,

                    ProductName =
                        record.Plan == null
                            ? null
                            : record.Plan.ProductName,

                    SettlorName =
                        record.Personal == null
                            ? null
                            : record.Personal.FullName,

                    SettlorIdentityType =
                        record.Personal == null
                            ? null
                            : record.Personal.IdentityType,

                    SettlorIdentityNo =
                        record.Personal == null
                            ? null
                            : record.Personal.IdentityNo,

                    SettlorEmail =
                        record.Personal == null
                            ? null
                            : record.Personal.Email,

                    SettlorContactNo =
                        record.Personal == null
                            ? null
                            : record.Personal.ContactNo,

                    TrustAssetAmount =
                        record.Asset == null
                            ? (decimal?)null
                            : record.Asset.TrustAssetAmount,

                    ScheduleNo =
                        record.Dividend.ScheduleNo,

                    ReturnYear =
                        record.Dividend.ReturnYear,

                    PeriodNo =
                        record.Dividend.PeriodNo,

                    DividendMethod =
                        record.Dividend.DividendMethod,

                    PayoutFrequency =
                        record.Dividend.PayoutFrequency,

                    CalculationStart =
                        record.Dividend.CalculationStart,

                    PeriodStartDate =
                        record.Dividend.PeriodStartDate,

                    PeriodEndDate =
                        record.Dividend.PeriodEndDate,

                    PayoutDate =
                        record.Dividend.PayoutDate,

                    CalculationBasisAmount =
                        record.Dividend.CalculationBasisAmount,

                    AnnualRate =
                        record.Dividend.AnnualRate,

                    PeriodRate =
                        record.Dividend.PeriodRate,

                    BaseDividendAmount =
                        record.Dividend.BaseDividendAmount,

                    BonusAmount =
                        record.Dividend.BonusAmount,

                    TotalReturnAmount =
                        record.Dividend.TotalReturnAmount,

                    ReturnOption =
                        record.Dividend.ReturnOption,

                    IsRedeposit =
                        isRedeposit,

                    PayoutAmount =
                        record.Dividend.PayoutAmount,

                    RedepositAmount =
                        record.Dividend.RedepositAmount,

                    Status =
                        effectiveStatus,

                    PaidAt =
                        record.Dividend.PaidAt,

                    CancelledAt =
                        record.Dividend.CancelledAt,

                    StatusRemark =
                        record.Dividend.StatusRemark,

                    SettlorBankName =
                        ResolveSettlorBankName(
                            record.Asset),

                    SettlorBankNameDetail =
                        record.Bank == null
                            ? null
                            : record.Bank.BankNameDetail,

                    SettlorBankAccountHolder =
                        record.Asset == null
                            ? null
                            : record.Asset.SettlorBankAccountHolder,

                    SettlorBankAccountNumber =
                        record.Asset == null
                            ? null
                            : record.Asset.SettlorBankAccountNumber,

                    SettlorSwiftCode =
                        record.Asset == null
                            ? null
                            : record.Asset.SettlorSwiftCode,

                    SettlorBankAddress =
                        record.Asset == null
                            ? null
                            : record.Asset.SettlorBankAddress,

                    CanProcess =
                        isDue &&
                        !isRedeposit,

                    CanMarkPaid =
                        isDue &&
                        !isRedeposit,

                    CanCancel =
                        isDue &&
                        !isRedeposit,

                    CreatedAt =
                        record.Dividend.CreatedAt,

                    CreatedBy =
                        record.Dividend.CreatedBy,

                    UpdatedAt =
                        record.Dividend.UpdatedAt,

                    UpdatedBy =
                        record.Dividend.UpdatedBy
                };
            }
        }

        // ============================================================
        // UPDATE STATUS
        // ============================================================

        public async Task<TrustDividendDetailResult> UpdateStatusAsync(
            string merchantId,
            long userId,
            string roleCode,
            long dividendScheduleId,
            TrustDividendStatusRequest request)
        {
            ValidateProcessAccess(roleCode);

            if (request == null)
            {
                throw new BusinessException(
                    "Dividend Status request is required.",
                    StatusCode);
            }

            string targetStatus =
                (request.Status ?? string.Empty)
                    .Trim()
                    .ToUpperInvariant();

            if (
                targetStatus != StatusPaid &&
                targetStatus != StatusCancelled)
            {
                throw new BusinessException(
                    "Dividend Status must be PAID or CANCELLED.",
                    StatusCode);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                DateTime now =
                    DateTime.Now;

                DateTime today =
                    now.Date;

                var record =
                    await (
                        from schedule
                            in db.tbl_TrustApplication_DividendSchedule

                        join application
                            in db.tbl_TrustApplication
                            on schedule.TrustApplicationID
                            equals application.RowID

                        where
                            schedule.RowID == dividendScheduleId
                            &&
                            application.MerchantID == merchantId

                        select new
                        {
                            Dividend = schedule,
                            Application = application
                        })
                        .FirstOrDefaultAsync();

                if (record == null)
                {
                    throw new BusinessException(
                        "Dividend Schedule record not found.",
                        StatusCode);
                }

                var dividend =
                    record.Dividend;

                string storedStatus = (dividend.Status ?? string.Empty).Trim().ToUpperInvariant();

                // ====================================================
                // Final statuses cannot be changed again.
                // ====================================================

                if (storedStatus == StatusPaid || storedStatus == StatusCancelled)
                {
                    throw new BusinessException("This Dividend Schedule has already been finalized.", StatusCode);
                }

                // ====================================================
                // Only DUE records can be processed.
                // ====================================================

                string effectiveStatus = ResolveEffectiveStatus(dividend.Status, dividend.PayoutDate, today);

                if (effectiveStatus != StatusDue)
                {
                    throw new BusinessException("Only a Due Dividend Schedule can be processed.", StatusCode);
                }

                // ====================================================
                // Redeposit Protection
                //
                // Redeposit schedules must not be manually marked
                // PAID/CANCELLED because future generated schedules may
                // already depend on the compounded basis amount.
                // ====================================================

                bool isRedeposit = string.Equals(dividend.ReturnOption, ReturnRedeposit, StringComparison.OrdinalIgnoreCase);

                if (isRedeposit)
                {
                    throw new BusinessException("A Dividend configured for redeposit cannot be manually processed by Finance.", StatusCode);
                }

                // ====================================================
                // PAID
                // ====================================================

                if (targetStatus == StatusPaid)
                {
                    if (!string.Equals(dividend.ReturnOption, ReturnTransferToBank, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new BusinessException("Only a Dividend configured for bank transfer can be marked as Paid.", StatusCode);
                    }

                    dividend.Status = StatusPaid;
                    dividend.PaidAt = now;
                    dividend.CancelledAt = null;
                    dividend.CancelledBy = null;
                }

                // ====================================================
                // CANCELLED
                // ====================================================

                if (targetStatus == StatusCancelled)
                {
                    if (string.IsNullOrWhiteSpace(request.Remark))
                    {
                        throw new BusinessException("Cancellation remark is required.", StatusCode);
                    }

                    dividend.Status = StatusCancelled;
                    dividend.PaidAt = null;
                    dividend.CancelledAt = now;
                    dividend.CancelledBy = userId;
                }

                // ====================================================
                // Common Audit Fields
                // ====================================================

                dividend.StatusRemark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim();
                dividend.UpdatedAt = now;
                dividend.UpdatedBy = userId;

                // ====================================================
                // Application History
                // ====================================================

                db.tbl_TrustApplication_History.Add(
                    new tbl_TrustApplication_History
                    {
                        TrustApplicationID = record.Application.RowID,
                        EventCode = targetStatus == StatusPaid ? "DIVIDEND_PAID" : "DIVIDEND_CANCELLED",
                        EventTitle = targetStatus == StatusPaid ? "Dividend Paid" : "Dividend Cancelled",
                        EventDescription =
                            targetStatus == StatusPaid ? "Dividend Schedule #" + dividend.ScheduleNo +
                            " was marked as paid." : "Dividend Schedule #" + dividend.ScheduleNo + " was cancelled. " + request.Remark.Trim(),
                        ReferenceType = "DIVIDEND_SCHEDULE",
                        ReferenceID = dividend.RowID,
                        OldStatus = StatusDue,
                        NewStatus = targetStatus,
                        CreatedAt = now,
                        CreatedBy = userId
                    });

                await db.SaveChangesAsync();
            }

            // ========================================================
            // Return fresh record after update.
            // ========================================================

            return await GetDetailAsync(merchantId, userId, roleCode, dividendScheduleId);
        }

        // ============================================================
        // STATISTICS
        // ============================================================

        private class DividendStatisticRow
        {
            public string Status { get; set; }
            public DateTime PayoutDate { get; set; }
            public decimal Amount { get; set; }
        }

        private static TrustDividendStatistic BuildStatistics(List<DividendStatisticRow> records, DateTime today)
        {
            var result = new TrustDividendStatistic();

            if (records == null)
            {
                return result;
            }

            foreach (var item in records)
            {
                string status = ResolveEffectiveStatus(item.Status, item.PayoutDate, today);

                result.Total++;
                result.TotalAmount += item.Amount;

                switch (status)
                {
                    case StatusScheduled:

                        result.Scheduled++;
                        result.ScheduledAmount += item.Amount;
                        break;

                    case StatusDue:

                        result.Due++;
                        result.DueAmount += item.Amount;
                        break;

                    case StatusPaid:

                        result.Paid++;
                        result.PaidAmount += item.Amount;
                        break;

                    case StatusCancelled:

                        result.Cancelled++;
                        result.CancelledAmount += item.Amount;
                        break;
                }
            }

            return result;
        }
    }
}