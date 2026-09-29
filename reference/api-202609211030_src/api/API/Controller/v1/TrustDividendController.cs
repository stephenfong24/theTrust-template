using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.TrustDividend;
using API_CPX.Class.Service.TrustApplication.Dividend.Finance;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.Controllers
{
    /// <summary>
    /// Trust Dividend Schedule APIs.
    ///
    /// Used by Finance/Admin to:
    /// - View all generated dividend schedules
    /// - Filter/search dividend schedules
    /// - View individual dividend details
    /// - Mark eligible bank-transfer dividends as PAID
    /// - Cancel eligible bank-transfer dividends
    ///
    /// Dividend generation itself is not performed by this controller.
    /// </summary>
    [RoutePrefix("api/trust-dividend")]
    [JwtAuthorize]
    public class TrustDividendController : System.Web.Http.ApiController
    {
        // ============================================================
        // GET DIVIDEND LIST
        // ============================================================

        /// <summary>
        /// Get paginated Trust Dividend Schedule listing.
        ///
        /// Example:
        ///
        /// GET /api/trust-dividend?page=1&pageSize=10
        ///
        /// GET /api/trust-dividend
        ///     ?page=1
        ///     &pageSize=10
        ///     &status=DUE
        ///     &returnOption=TRANSFER_TO_BANK
        ///     &sortBy=FINANCE_PRIORITY
        ///     &sortDirection=ASC
        /// </summary>
        [HttpGet]
        [Route("")]
        public async Task<IHttpActionResult> GetDividendList(
            int page = 1,
            int pageSize = 10,
            string search = null,
            string status = null,
            string productCode = null,
            string returnOption = null,
            DateTime? payoutDateFrom = null,
            DateTime? payoutDateTo = null,
            string sortBy = "FINANCE_PRIORITY",
            string sortDirection = "ASC")
        {
            const string code =
                "TRUST-DIVIDEND-LIST";

            Request.Properties["AuditTitle"] =
                "Trust Dividend Listing Viewed";

            Request.Properties["AuditDescription"] =
                "Attempted to retrieve Trust Dividend Schedule listing.";

            var identity =
                User.Identity as ClaimsIdentity;

            try
            {
                long userId =
                    Convert.ToInt64(
                        Request.Properties["UserID"]);

                string merchantId =
                    Convert.ToString(
                        Request.Properties["MerchantID"]);

                string roleCode =
                    identity?
                        .FindFirst(ClaimTypes.Role)?
                        .Value;

                var request =
                    new TrustDividendListRequest
                    {
                        Page =
                            page,

                        PageSize =
                            pageSize,

                        Search =
                            search,

                        Status =
                            status,

                        ProductCode =
                            productCode,

                        ReturnOption =
                            returnOption,

                        PayoutDateFrom =
                            payoutDateFrom,

                        PayoutDateTo =
                            payoutDateTo,

                        SortBy =
                            sortBy,

                        SortDirection =
                            sortDirection
                    };

                var service =
                    new TrustDividendFinanceServiceAsync();

                var result =
                    await service.GetListAsync(
                        merchantId,
                        userId,
                        roleCode,
                        request);

                Request.Properties["AuditDescription"] =
                    "Successfully retrieved Trust Dividend Schedule listing.";

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = result
                    });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                Request.Properties["AuditDescription"] =
                    "Failed to retrieve Trust Dividend Schedule listing. " +
                    ex.Message;

                return InternalServerError(ex);
            }
        }

        // ============================================================
        // GET DIVIDEND DETAIL
        // ============================================================

        /// <summary>
        /// Get one Trust Dividend Schedule record.
        ///
        /// dividendScheduleId refers to:
        /// tbl_TrustApplication_DividendSchedule.RowID
        ///
        /// Example:
        ///
        /// GET /api/trust-dividend/25
        /// </summary>
        [HttpGet]
        [Route("{dividendScheduleId:long}")]
        public async Task<IHttpActionResult> GetDividendDetail(
            long dividendScheduleId)
        {
            const string code =
                "TRUST-DIVIDEND-DETAIL";

            Request.Properties["AuditTitle"] =
                "Trust Dividend Detail Viewed";

            Request.Properties["AuditDescription"] =
                "Attempted to retrieve Trust Dividend Schedule detail.";

            var identity =
                User.Identity as ClaimsIdentity;

            try
            {
                long userId =
                    Convert.ToInt64(
                        Request.Properties["UserID"]);

                string merchantId =
                    Convert.ToString(
                        Request.Properties["MerchantID"]);

                string roleCode =
                    identity?
                        .FindFirst(ClaimTypes.Role)?
                        .Value;

                var service =
                    new TrustDividendFinanceServiceAsync();

                var result =
                    await service.GetDetailAsync(
                        merchantId,
                        userId,
                        roleCode,
                        dividendScheduleId);

                Request.Properties["AuditDescription"] =
                    "Successfully retrieved Trust Dividend Schedule detail. " +
                    "DividendScheduleID: " +
                    dividendScheduleId;

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = result
                    });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                Request.Properties["AuditDescription"] =
                    "Failed to retrieve Trust Dividend Schedule detail. " +
                    "DividendScheduleID: " +
                    dividendScheduleId +
                    ". " +
                    ex.Message;

                return InternalServerError(ex);
            }
        }

        // ============================================================
        // UPDATE DIVIDEND STATUS
        // ============================================================

        /// <summary>
        /// Finalize an eligible dividend schedule.
        ///
        /// Supported:
        ///
        /// PAID
        /// CANCELLED
        ///
        /// Only DUE + TRANSFER_TO_BANK schedules can be manually
        /// processed by Finance.
        ///
        /// REDEPOSIT_AS_TRUST_ASSET schedules cannot be manually
        /// processed by this API.
        ///
        /// Example:
        ///
        /// POST /api/trust-dividend/25/status
        ///
        /// {
        ///     "Status": "PAID",
        ///     "Remark": "Dividend transferred to settlor."
        /// }
        /// </summary>
        [HttpPost]
        [Route("{dividendScheduleId:long}/status")]
        public async Task<IHttpActionResult> UpdateDividendStatus(
            long dividendScheduleId,
            TrustDividendStatusRequest request)
        {
            const string code =
                "TRUST-DIVIDEND-STATUS";

            Request.Properties["AuditTitle"] =
                "Trust Dividend Status Updated";

            Request.Properties["AuditDescription"] =
                "Attempted to update Trust Dividend Schedule status. " +
                "DividendScheduleID: " +
                dividendScheduleId;

            var identity =
                User.Identity as ClaimsIdentity;

            try
            {
                long userId =
                    Convert.ToInt64(
                        Request.Properties["UserID"]);

                string merchantId =
                    Convert.ToString(
                        Request.Properties["MerchantID"]);

                string roleCode =
                    identity?
                        .FindFirst(ClaimTypes.Role)?
                        .Value;

                if (request == null)
                {
                    throw new BusinessException(
                        "Dividend Status request is required.",
                        code);
                }

                var service =
                    new TrustDividendFinanceServiceAsync();

                var result =
                    await service.UpdateStatusAsync(
                        merchantId,
                        userId,
                        roleCode,
                        dividendScheduleId,
                        request);

                Request.Properties["AuditDescription"] =
                    "Successfully updated Trust Dividend Schedule status. " +
                    "DividendScheduleID: " +
                    dividendScheduleId +
                    ". Status: " +
                    result.Status;

                return Ok(
                    new
                    {
                        Status = 0,
                        Message =
                            "Dividend status updated successfully.",
                        Code = code,
                        Data = result
                    });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                Request.Properties["AuditDescription"] =
                    "Failed to update Trust Dividend Schedule status. " +
                    "DividendScheduleID: " +
                    dividendScheduleId +
                    ". " +
                    ex.Message;

                return InternalServerError(ex);
            }
        }
    }
}