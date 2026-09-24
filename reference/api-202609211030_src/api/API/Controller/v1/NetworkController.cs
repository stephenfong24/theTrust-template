using API_CPX.Class.Exceptions;
using API_CPX.Class.Model;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.api
{
    [RoutePrefix("api/network")]
    [JwtAuthorize]
    public class NetworkController : ApiController
    {
        // ================================================================
        // Trust Network
        //
        // GET /api/network/trust/downline-list
        // GET /api/network/trust/downline-list?email=agent@gmail.com
        // ================================================================

        [HttpGet]
        [Route("trust/downline-list")]
        public async Task<IHttpActionResult> GetTrustDownlineList(string email = null)
        {
            Request.Properties["AuditTitle"] = "Trust Network Downline Viewed";
            Request.Properties["AuditDescription"] = "Requested the Trust network downline listing.";
            const string code = "GET-TRUST-DOWNLINE-LIST";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userID = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantID = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var networkTree = new NetworkTreeAsync();
                var result = await networkTree.GetTrustDownlineListAsync(merchantID, userID, roleCode, email);

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

        // ================================================================
        // Will Network
        //
        // GET /api/network/will/downline-list
        // GET /api/network/will/downline-list?email=agent@gmail.com
        // ================================================================

        [HttpGet]
        [Route("will/downline-list")]
        public async Task<IHttpActionResult> GetWillDownlineList(string email = null)
        {
            Request.Properties["AuditTitle"] = "Will Network Downline Viewed";
            Request.Properties["AuditDescription"] = "Requested the Will network downline listing.";
            const string code = "GET-WILL-DOWNLINE-LIST";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userID = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantID = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var networkTree = new NetworkTreeAsync();
                var result = await networkTree.GetWillDownlineListAsync(merchantID, userID, roleCode, email);

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