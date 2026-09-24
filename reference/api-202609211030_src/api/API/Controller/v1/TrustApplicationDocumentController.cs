using API_CPX.Class.Attributes;
using API_CPX.Class.Exceptions;
using API_CPX.Class.Service.TrustApplication.Document;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/trust-application-document")]
    [JwtAuthorize]
    [SkipApiLogging]
    public class TrustApplicationDocumentController : System.Web.Http.ApiController
    {
        [HttpGet]
        [AllowAnonymous]
        [Route("{trustId:long}/document/{documentCode}/view")]
        public async Task<HttpResponseMessage> ViewDocument(long trustId, string documentCode)
        {
            const string code = "VIEW-TRUST-APPLICATION-DOCUMENT";

            try
            {
                /*
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                var identity = User.Identity as ClaimsIdentity;
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;
                */

                long userId = 1;
                string merchantId = "814152";
                string roleCode = "SA";

                var service = new TrustApplicationDocumentServiceAsync();
                var result = await service.GenerateDocumentForViewAsync(merchantId, userId, roleCode, trustId, documentCode);

                var response = Request.CreateResponse(HttpStatusCode.OK);
                response.Content = new ByteArrayContent(result.Content);
                response.Content.Headers.ContentType = new MediaTypeHeaderValue(result.ContentType);
                response.Content.Headers.ContentDisposition =
                    new ContentDispositionHeaderValue(
                        "inline")
                    {
                        FileName =
                            result.FileName
                    };

                return response;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code);
            }
        }
    }
}