using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO.TrustCommission;
using API_CPX.Class.Services.TrustCommission;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/trust-commission")]
    [JwtAuthorize]
    public class TrustCommissionController : System.Web.Http.ApiController
    {
        // ============================================================
        // Commission Batch Listing
        // ============================================================

        /// <summary>
        /// Get Trust commission batch listing.
        /// </summary>
        /// <remarks>
        /// Returns tbl_TrustCommissionBatch records with server-side
        /// pagination. Batch visibility is restricted to batches containing
        /// commission records for the authenticated MerchantID.
        /// </remarks>
        [Authorize(Roles = "SA,AD,AC")]
        [HttpGet]
        [Route("batch/list")]
        public async Task<IHttpActionResult> GetBatchList(
            int page = 1,
            int pageSize = 10,
            string search = null,
            string batchStatus = null,
            DateTime? cutoffDateFrom = null,
            DateTime? cutoffDateTo = null,
            string sortBy = "CREATED_AT",
            string sortDirection = "DESC")
        {
            const string code = "TRUST-COMMISSION-BATCH-LIST";

            Request.Properties["AuditTitle"] = "Trust Commission Batch Listing Viewed";
            Request.Properties["AuditDescription"] = "Attempted to retrieve Trust commission batch listing.";

            var identity = User.Identity as ClaimsIdentity;

            try
            {
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var request =
                    new TrustCommissionBatchListRequest
                    {
                        Page = page,
                        PageSize = pageSize,
                        Search = search,
                        BatchStatus = batchStatus,
                        CutoffDateFrom = cutoffDateFrom,
                        CutoffDateTo = cutoffDateTo,
                        SortBy = sortBy,
                        SortDirection = sortDirection
                    };

                var service = new TrustCommissionServiceAsync();
                var result =
                    await service.GetBatchListAsync(
                        merchantId,
                        roleCode,
                        request);

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
                throw new BusinessException(
                    "Unable to retrieve Trust commission batch listing.",
                    code,
                    ex);
            }
        }

        // ============================================================
        // Commission Listing
        // ============================================================

        /// <summary>
        /// Get Trust commission payout listing.
        /// </summary>
        /// <remarks>
        /// Supports server-side pagination and filtering by:
        /// Batch, Trust ID, selling agent, recipient agent, settlor,
        /// payout date range and commission status.
        ///
        /// Selling/recipient agent search:
        /// Username / Fullname / Identity ID.
        ///
        /// Settlor search:
        /// Fullname / Email / Identity ID / Contact Number.
        ///
        /// Status:
        /// ALL / CALCULATED / PAID / CANCELLED.
        /// </remarks>
        [Authorize(Roles = "SA,AD,AC,AG")]
        [HttpGet]
        [Route("list")]
        public async Task<IHttpActionResult> GetCommissionList(
            int page = 1,
            int pageSize = 10,
            string batchNo = null,
            string trustSearch = null,
            string sellingAgentSearch = null,
            string recipientAgentSearch = null,
            string settlorSearch = null,
            DateTime? payoutDateFrom = null,
            DateTime? payoutDateTo = null,
            string commissionStatus = null,
            string sortBy = "PAYOUT_DATE",
            string sortDirection = "DESC")
        {
            const string code = "TRUST-COMMISSION-LIST";

            Request.Properties["AuditTitle"] = "Trust Commission Payout Listing Viewed";
            Request.Properties["AuditDescription"] = "Attempted to retrieve Trust commission payout listing.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var request =
                    new TrustCommissionListRequest
                    {
                        Page = page,
                        PageSize = pageSize,
                        BatchNo = batchNo,
                        TrustSearch = trustSearch,
                        SellingAgentSearch = sellingAgentSearch,
                        RecipientAgentSearch = recipientAgentSearch,
                        SettlorSearch = settlorSearch,
                        PayoutDateFrom = payoutDateFrom,
                        PayoutDateTo = payoutDateTo,
                        CommissionStatus = commissionStatus,
                        SortBy = sortBy,
                        SortDirection = sortDirection
                    };

                var service = new TrustCommissionServiceAsync();
                var result =
                    await service.GetListAsync(
                        merchantId,
                        userId,
                        roleCode,
                        request);

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
                throw new BusinessException(
                    "Unable to retrieve Trust commission payout listing.",
                    code,
                    ex);
            }
        }

        // ============================================================
        // Commission Detail
        // ============================================================

        /// <summary>
        /// Get a single Trust commission record with complete payout details.
        /// </summary>
        [Authorize(Roles = "SA,AD,AC,AG")]
        [HttpGet]
        [Route("{commissionId:long}")]
        public async Task<IHttpActionResult> GetCommissionDetail(long commissionId)
        {
            const string code = "TRUST-COMMISSION-DETAIL";

            Request.Properties["AuditTitle"] = "Trust Commission Detail Viewed";
            Request.Properties["AuditDescription"] = "Attempted to retrieve Trust commission detail.";

            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustCommissionServiceAsync();
                var result =
                    await service.GetDetailAsync(
                        merchantId,
                        userId,
                        roleCode,
                        commissionId);

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
                throw new BusinessException(
                    "Unable to retrieve Trust commission detail.",
                    code,
                    ex);
            }
        }

        // ============================================================
        // Update Commission Status
        // ============================================================

        /// <summary>
        /// Update a calculated commission to PAID or CANCELLED.
        /// </summary>
        /// <remarks>
        /// Only SA / AD / AC are allowed.
        ///
        /// Valid transition:
        /// CALCULATED -> PAID
        /// CALCULATED -> CANCELLED
        ///
        /// Remark is optional and limited to 1000 characters.
        /// PAID and CANCELLED are final states.
        /// </remarks>
        [Authorize(Roles = "SA,AD,AC")]
        [HttpPost]
        [Route("{commissionId:long}/status")]
        public async Task<IHttpActionResult> UpdateCommissionStatus(
            long commissionId,
            TrustCommissionStatusUpdateRequest request)
        {
            const string code = "UPDATE-TRUST-COMMISSION-STATUS";

            Request.Properties["AuditTitle"] = "Trust Commission Payout Status Updated";
            Request.Properties["AuditDescription"] = "Attempted to update Trust commission payout status.";

            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustCommissionServiceAsync();
                var result =
                    await service.UpdateStatusAsync(
                        merchantId,
                        userId,
                        roleCode,
                        commissionId,
                        request);

                Request.Properties["AuditDescription"] =
                    "Trust commission payout status updated successfully. Commission ID: "
                    + commissionId
                    + ", Status: "
                    + result.CommissionStatus
                    + ".";

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Commission status updated successfully.",
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
                throw new BusinessException(
                    "Unable to update Trust commission payout status.",
                    code,
                    ex);
            }
        }
    }
}
