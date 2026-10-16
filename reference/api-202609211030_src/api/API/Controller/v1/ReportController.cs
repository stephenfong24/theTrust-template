using API_CPX.Class.Exceptions;
using API_CPX.Class.Service.Report;
using System;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/report")]
    [JwtAuthorize]
    public class ReportController : ApiController
    {
        // =========================================================
        // GET /api/report/tac-history
        // Roles: SA, AD
        // =========================================================

        [Authorize(Roles = "SA,AD")]
        [HttpGet]
        [Route("tac-history")]
        public async Task<IHttpActionResult> GetTacHistory(
            int page = 1,
            int pageSize = 20,
            string search = null,
            string type = null,
            string sentMethod = null,
            int? status = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null)
        {
            const string code = "GET-TAC-HISTORY";
            Request.Properties["AuditTitle"] = "TAC History Report Viewed";
            Request.Properties["AuditDescription"] = "Requested the TAC/OTP history report.";

            try
            {
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                if (page <= 0)
                    page = 1;

                if (pageSize <= 0)
                    pageSize = 20;

                if (pageSize > 100)
                    pageSize = 100;

                if (dateFrom.HasValue && dateTo.HasValue && dateFrom.Value.Date > dateTo.Value.Date)
                {
                    throw new BusinessException("Date From cannot exceed Date To.", code);
                }

                if (dateTo.HasValue && dateTo.Value.Date == DateTime.MaxValue.Date)
                {
                    throw new BusinessException("Invalid Date To.", code);
                }

                if ((long)(page - 1) * pageSize > int.MaxValue)
                {
                    throw new BusinessException("Pagination range is too large.", code);
                }

                TacHistoryAsync service = new TacHistoryAsync();

                var result = await service.GetHistoryAsync(merchantId, page, pageSize, search, type, sentMethod, status, dateFrom, dateTo);

                return Ok(new
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
                throw new BusinessException(ex.Message, code);
            }
        }
    }
}