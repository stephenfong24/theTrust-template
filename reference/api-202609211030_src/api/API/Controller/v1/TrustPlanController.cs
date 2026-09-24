using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.TrustPlan;
using API_CPX.Class.Service.TrustPlan;
using API_CPX.Services.TrustPlan;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;

namespace API_CPX.api
{
    [RoutePrefix("api/trust-plan")]
    [JwtAuthorize]
    public class TrustPlanController : System.Web.Http.ApiController
    {
        private readonly ITrustPlanService trustPlanService;

        public TrustPlanController()
        {
            trustPlanService = new TrustPlanServiceAsync();
        }

        [HttpPost]
        [Route("create-trust-plan")]
        [JwtAuthorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> Create(TrustPlanRequest request)
        {
            Request.Properties["AuditTitle"] = "Trust Plan Created";
            Request.Properties["AuditDescription"] = "Attempted to create a new Trust Plan.";
            const string code = "CREATE-TRUST-PLAN";

            try
            {
                long? userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string productCode = await trustPlanService.CreateAsync(request, userId, merchantId);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        ProductCode = productCode
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to create Trust Plan.", code, ex);
            }
        }


        [HttpPut]
        [Route("{productCode}")]
        [JwtAuthorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> Update(string productCode, TrustPlanRequest request)
        {
            Request.Properties["AuditTitle"] = "Trust Plan Updated";
            Request.Properties["AuditDescription"] = "Attempted to update a Trust Plan.";
            const string code = "UPDATE-TRUST-PLAN";

            try
            {
                long? userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                await trustPlanService.UpdateAsync(productCode, request, userId, merchantId);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        ProductCode = productCode
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to update Trust Plan.", code, ex);
            }
        }

        [HttpGet]
        [Route("get-trust-product-list")]
        [JwtAuthorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> GetTrustProductList([FromUri] TrustPlanListRequest request)
        {
            Request.Properties["AuditTitle"] = "Trust Plan List Viewed";
            Request.Properties["AuditDescription"] = "Viewed Trust Plan listing.";
            const string code = "GET-TRUST-PRODUCT-LIST";

            try
            {
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                TrustPlanListResponse result = await trustPlanService.GetTrustProductListAsync(request, merchantId);

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
                throw new BusinessException("Unable to retrieve Trust Plan list.", code, ex);
            }
        }

        [HttpGet]
        [Route("get-trust-product-details/{productCode}")]
        [JwtAuthorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> GetTrustProductDetails(string productCode)
        {
            Request.Properties["AuditTitle"] = "Trust Plan Viewed";
            Request.Properties["AuditDescription"] = "Viewed Trust Plan details.";
            const string code = "GET-TRUST-PRODUCT-DETAILS";

            try
            {
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                TrustPlanDetailsResponse result = await trustPlanService.GetTrustProductDetailsAsync(productCode, merchantId);

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
                throw new BusinessException("Unable to retrieve Trust Plan details.", code, ex);
            }
        }
    }
}