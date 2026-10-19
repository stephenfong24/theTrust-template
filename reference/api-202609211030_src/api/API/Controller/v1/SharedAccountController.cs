using API_CPX.Class.Attributes;
using API_CPX.Class.Model;
using API_CPX.Class.Model.DTO.SharedAccount;
using System;
using System.Net;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/shared-account")]
    [JwtAuthorize]
    public class SharedAccountController : ApiController
    {
        private const string PublicValidationError = "Unable to validate shared registration details.";

        private static bool InvalidRequest(SharedAccountValidateRequest request)
        {
            return request == null || string.IsNullOrWhiteSpace(request.MerchantID) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Sponsor);
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("validate")]
        public async Task<IHttpActionResult> Validate(SharedAccountValidateRequest request)
        {
            const string code = "SHARED-ACCOUNT-VALIDATE";

            if (InvalidRequest(request) || !ModelState.IsValid)
            {
                return Ok(new
                {
                    Status = 4,
                    Message = "Invalid request.",
                    Code = code,
                    Data = (object)null
                });
            }

            Request.Properties["MerchantID"] = request.MerchantID;
            Request.Properties["AuditTitle"] = "Shared Account Validation";

            try
            {
                var service = new SharedAccountAsync();
                var result = await service.ValidateAsync(request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        TargetMerchantID = result.TargetMerchantID,
                        Sponsor = result.Sponsor,
                        SponsorName = result.SponsorName
                    }
                });
            }
            catch (ArgumentException)
            {
                return Ok(new
                {
                    Status = 4,
                    Message = "Invalid registration details.",
                    Code = code,
                    Data = (object)null
                });
            }
            catch (InvalidOperationException)
            {
                return Ok(new
                {
                    Status = 4,
                    Message = PublicValidationError,
                    Code = code,
                    Data = (object)null
                });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("complete")]
        public async Task<IHttpActionResult> Complete(SharedAccountCompleteRequest request)
        {
            const string code = "SHARED-ACCOUNT-COMPLETE";

            if (InvalidRequest(request) || !ModelState.IsValid || string.IsNullOrWhiteSpace(request.OTP))
            {
                return Ok(new
                {
                    Status = 4,
                    Message = "Invalid registration details.",
                    Code = code,
                    Data = (object)null
                });
            }

            Request.Properties["MerchantID"] = request.MerchantID;
            Request.Properties["AuditTitle"] = "Shared Account Registration";
            Request.Properties["AuditDescription"] = "Attempted to register an existing member " + "on an additional portal.";

            try
            {
                var service = new SharedAccountAsync();
                string ip = GetClientIp();
                var result = await service.CompleteAsync(request, ip);

                return Ok(new
                {
                    Status = 0,
                    Message = "Shared account registration successful.",
                    Code = code,
                    Data = result
                });
            }
            catch (ArgumentException)
            {
                return Ok(new
                {
                    Status = 4,
                    Message = "Invalid registration details.",
                    Code = code,
                    Data = (object)null
                });
            }
            catch (InvalidOperationException)
            {
                return Ok(new
                {
                    Status = 4,
                    Message = "Registration could not be completed.",
                    Code = code,
                    Data = (object)null
                });
            }
            catch (System.Data.SqlClient.SqlException)
            {
                // Log the detailed exception through the
                // existing centralized API exception logger.
                return Content(
                    HttpStatusCode.InternalServerError,
                    new
                    {
                        Status = 4,
                        Message = "Registration could not be completed.",
                        Code = code,
                        Data = (object)null
                    });
            }
        }

        private string GetClientIp()
        {
            var context = System.Web.HttpContext.Current;

            if (context == null)
                return null;

            return context.Request.UserHostAddress;
        }
    }
}