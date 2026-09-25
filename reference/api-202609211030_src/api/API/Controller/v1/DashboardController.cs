using API_CPX.Class.Exceptions;
using API_CPX.Class.Service.Dashboard;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.Controllers
{
    [RoutePrefix("api/dashboard")]
    [JwtAuthorize]
    public class DashboardController : System.Web.Http.ApiController
    {
        [HttpGet]
        [Route("")]
        public async Task<IHttpActionResult> GetDashboard(int? year = null)
        {
            const string code = "GET-DASHBOARD";
            Request.Properties["AuditTitle"] = "Dashboard Viewed";
            Request.Properties["AuditDescription"] = "Requested dashboard information.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                int selectedYear = year ?? DateTime.Now.Year;

                if (selectedYear < 2000 || selectedYear > DateTime.Now.Year + 1)
                {
                    throw new BusinessException("Invalid dashboard year.", code);
                }

                var service = new DashboardServiceAsync();
                var result = await service.GetAsync(merchantId, userId, roleCode, selectedYear);

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
                throw new BusinessException("Unable to retrieve dashboard.", code, ex);
            }
        }
    }
}