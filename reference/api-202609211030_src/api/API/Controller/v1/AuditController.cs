using API_CPX.Class.Attributes;
using API_CPX.Class.Exceptions;
using API_CPX.Class.Model;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/audit")]
    [JwtAuthorize]
    [SkipApiLogging]
    public class AuditController : ApiController
    {
        [HttpGet]
        [Route("request-list")]
        public async Task<IHttpActionResult> AuditList(
            int page = 1,
            int pageSize = 10,
            string activitykeyword = null,
            string userkeyword = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null)
        {
            const string code = "GET-AUDIT-LIST";
            Request.Properties["AuditTitle"] = "Audit Log Viewed";
            Request.Properties["AuditDescription"] = "Requested the system audit log listing.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                if (page <= 0)
                    page = 1;

                if (pageSize <= 0)
                    pageSize = 10;

                if (pageSize > 100)
                    pageSize = 100;

                AuditLogAsync m = new AuditLogAsync();

                var auditLogs =
                    await m.GetAuditLogListAsync(
                        merchantId,
                        page,
                        pageSize,
                        userId,
                        roleCode,
                        activitykeyword,
                        userkeyword,
                        dateFrom,
                        dateTo
                    );

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        AuditLogs = auditLogs,
                        Pagination = new
                        {
                            Page = page,
                            PageSize = pageSize,
                            TotalRecords = m.TotalRecords,
                            TotalPages = m.TotalPages
                        }
                    }
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

        [Authorize(Roles = "SA,AD,OP,AC")]
        [HttpGet]
        [Route("file-upload-list")]
        public async Task<IHttpActionResult> FileUploadAuditList(
            int page = 1,
            int pageSize = 10,
            string search = null,
            string moduleCode = null,
            string uploadType = null,
            int? scanStatus = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null)
        {
            Request.Properties["AuditTitle"] = "File Upload Log Viewed";
            Request.Properties["AuditDescription"] = "Requested the file upload audit log.";
            const string code = "GET-FILE-UPLOAD-AUDIT-LIST";

            try
            {
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                if (page <= 0)
                    page = 1;

                if (pageSize <= 0)
                    pageSize = 10;

                FileUploadAuditListAsync m = new FileUploadAuditListAsync();

                var fileUploadAuditLists =
                    await m.GetFileUploadAuditListAsync(
                        merchantId,
                        page,
                        pageSize,
                        search,
                        moduleCode,
                        uploadType,
                        scanStatus,
                        dateFrom,
                        dateTo
                    );

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        FileUploadAuditLists = fileUploadAuditLists,
                        Pagination = new
                        {
                            Page = page,
                            PageSize = pageSize,
                            TotalRecords = m.TotalRecords,
                            TotalPages = m.TotalPages
                        }
                    }
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