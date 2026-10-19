using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.Promotion;
using API_CPX.Class.Service.Promotion;
using System;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/promotion")]
    [JwtAuthorize]
    [Authorize(Roles = "SA,AD")]
    public class PromotionController : System.Web.Http.ApiController
    {
        private readonly PromotionManagementService _service;

        public PromotionController()
        {
            _service = new PromotionManagementService();
        }

        private string MerchantID => Convert.ToString(Request.Properties["MerchantID"]);

        private long UserID => Convert.ToInt64(Request.Properties["UserID"]);

        private void SetAudit(string title, string description)
        {
            Request.Properties["AuditTitle"] = title;
            Request.Properties["AuditDescription"] = description;
        }

        private static IHttpActionResult Unused()
        {
            // No action; intentionally not used.
            return null;
        }

        private static BusinessException Unexpected(string message, string code, Exception ex)
        {
            return new BusinessException(message, code, ex);
        }

        // GET /api/promotion
        [HttpGet]
        [Route("")]
        public async Task<IHttpActionResult> GetList([FromUri] PromotionListRequest request)
        {
            const string code = "GET-PROMOTION-LIST";
            SetAudit("Promotion Listing Viewed", "Viewed promotion listing.");

            try
            {
                var data = await _service.GetListAsync(MerchantID, request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected("Unable to retrieve promotions.", code, ex);
            }
        }

        // GET /api/promotion/123
        [HttpGet]
        [Route("{id:long}")]
        public async Task<IHttpActionResult> Get(long id)
        {
            const string code = "GET-PROMOTION";
            SetAudit("Promotion Viewed", "Viewed promotion ID " + id);

            try
            {
                var data = await _service.GetAsync(MerchantID, id);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected("Unable to retrieve promotion.", code, ex);
            }
        }

        // POST /api/promotion
        [HttpPost]
        [Route("")]
        public async Task<IHttpActionResult> Create([FromBody] PromotionSaveRequest request)
        {
            const string code = "CREATE-PROMOTION";
            SetAudit("Promotion Created", "Attempted to create promotion.");

            try
            {
                if (request == null || !ModelState.IsValid)
                    throw new BusinessException("Invalid promotion request.", code);

                var data = await _service.CreateAsync(MerchantID, UserID, request);

                Request.Properties["AuditDescription"] = "Created promotion " + data.PromotionCode + " (ID " + data.RowID + ").";

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected("Unable to create promotion.", code, ex);
            }
        }

        // PUT /api/promotion/123
        [HttpPut]
        [Route("{id:long}")]
        public async Task<IHttpActionResult> Update(long id, [FromBody] PromotionUpdateRequest request)
        {
            const string code = "UPDATE-PROMOTION";
            SetAudit("Promotion Updated", "Attempted to update promotion ID " + id);

            try
            {
                if (request == null || !ModelState.IsValid)
                    throw new BusinessException("Invalid promotion request.", code);

                var data = await _service.UpdateAsync(MerchantID, UserID, id, request);

                Request.Properties["AuditDescription"] = "Updated promotion " + data.PromotionCode + " (ID " + id + ").";

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected("Unable to update promotion.", code, ex);
            }
        }

        // DELETE /api/promotion/123
        [HttpDelete]
        [Route("{id:long}")]
        public async Task<IHttpActionResult> Delete(long id)
        {
            const string code = "DELETE-PROMOTION";
            SetAudit("Promotion Deleted", "Attempted to delete promotion ID " + id);

            try
            {
                await _service.DeleteAsync(MerchantID, UserID, id);
                Request.Properties["AuditDescription"] = "Soft deleted promotion ID " + id;

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        RowID = id,
                        IsDeleted = true
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected("Unable to delete promotion.", code, ex);
            }
        }
    }
}
