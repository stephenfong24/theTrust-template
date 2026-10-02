using API_CPX.Class.Attributes;
using API_CPX.Class.Exceptions;
using API_CPX.Class.Service.DocumentDownload;
using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/document-download")]
    [JwtAuthorize]
    [SkipApiLogging]
    public class DocumentDownloadController : System.Web.Http.ApiController
    {
        // ============================================================
        // Get Documents By Module
        // ============================================================

        [HttpGet]
        [Route("{moduleCode}")]
        public async Task<IHttpActionResult> GetDocuments(
            string moduleCode)
        {
            const string code =
                "GET-DOCUMENT-DOWNLOAD-LIST";

            Request.Properties["AuditTitle"] =
                "Download Documents Viewed";

            Request.Properties["AuditDescription"] =
                "Viewed available downloadable documents.";

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
                    new DocumentDownloadServiceAsync();

                var result =
                    await service.GetDocumentsAsync(
                        merchantId,
                        userId,
                        roleCode,
                        moduleCode);

                return Ok(result);
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(
                    "Unable to retrieve documents.",
                    code,
                    ex);
            }
        }

        /// <summary>
        /// Download registered document.
        /// </summary>
        /// <param name="moduleCode">
        /// Document module code.
        /// Example: TRUST_WITHDRAWAL.
        /// </param>
        /// <param name="documentGuid">
        /// Public document GUID.
        /// </param>
        [HttpGet]
        [Route("{moduleCode}/{documentGuid:guid}")]
        public async Task<HttpResponseMessage> Download(
            string moduleCode,
            Guid documentGuid)
        {
            const string code =
                "DOCUMENT-DOWNLOAD";

            Request.Properties["AuditTitle"] =
                "Document Downloaded";

            Request.Properties["AuditDescription"] =
                "Attempted to download document.";

            var identity =
                User.Identity as ClaimsIdentity;

            try
            {
                // ====================================================
                // Current User
                // ====================================================

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

                // ====================================================
                // Document
                // ====================================================

                var service =
                    new DocumentDownloadServiceAsync();

                var file =
                    await service.GetFileAsync(
                        merchantId,
                        userId,
                        roleCode,
                        moduleCode,
                        documentGuid);

                // ====================================================
                // File Stream
                // ====================================================

                var stream =
                    new FileStream(
                        file.PhysicalPath,
                        FileMode.Open,
                        FileAccess.Read,
                        FileShare.Read);

                // ====================================================
                // HTTP Response
                // ====================================================

                var response =
                    Request.CreateResponse(
                        HttpStatusCode.OK);

                response.Content =
                    new StreamContent(
                        stream);

                response.Content.Headers.ContentType =
                    new MediaTypeHeaderValue(
                        file.ContentType);

                response.Content.Headers.ContentLength =
                    file.FileSize;

                response.Content.Headers.ContentDisposition =
                    new ContentDispositionHeaderValue(
                        "attachment")
                    {
                        FileName =
                            file.FileName
                    };

                return response;
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(
                    "Unable to download document.",
                    code,
                    ex);
            }
        }
    }
}