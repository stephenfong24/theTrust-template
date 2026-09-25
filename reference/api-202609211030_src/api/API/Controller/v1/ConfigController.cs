using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model;
using API_CPX.Class.Model.Class;
using API_CPX.Class.Model.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
using static API_CPX.Class.Model.ConfigAsync;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/config")]
    [JwtAuthorize]
    public class ConfigController : System.Web.Http.ApiController
    {
        [Authorize(Roles = "SA,AD")]
        [HttpGet]
        [Route("get-config-list")]
        public async Task<IHttpActionResult> GetGeneralConfiguration()
        {
            Request.Properties["AuditTitle"] = "General Configuration Viewed";
            Request.Properties["AuditDescription"] = "Viewed the general system configuration.";

            const string code = "GET-GENERAL-CONFIGURATION";

            try
            {
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                var model = new ConfigAsync
                {
                    MerchantID = merchantId
                };

                var config = await model.GetConfiguration();

                if (config == null)
                {
                    throw new BusinessException(model.Message ?? "Configuration not found.", code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    code = code,
                    data = config
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to retrieve general configuration.", code, ex);
            }
        }

        [HttpPut]
        [Authorize(Roles = "SA,AD")]
        [Route("update-config")]
        public async Task<IHttpActionResult> UpdateGeneralConfiguration(UpdateConfigRequest request)
        {
            Request.Properties["AuditTitle"] = "General Configuration Updated";
            Request.Properties["AuditDescription"] = "Attempted to update the general system configuration.";
            const string code = "UPDATE-GENERAL-CONFIGURATION";

            try
            {
                if (request == null)
                {
                    throw new BusinessException("Invalid configuration request.", code);
                }

                if (request.SST < 0)
                {
                    throw new BusinessException("SST cannot be less than 0.", code);
                }

                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                var config = new ConfigAsync
                {
                    MerchantID = merchantId,
                    CreatedBy = userId
                };

                bool result = await config.UpdateConfiguration(request);

                if (!result)
                {
                    throw new BusinessException(config.Message ?? "Unable to update configuration.", code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    code = code,
                    Data = (object)null
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to update configuration.", code, ex);
            }
        }

        [Authorize(Roles = "SA,AD")]
        [HttpGet]
        [Route("bank-list")]
        public async Task<IHttpActionResult> GetBankList()
        {
            Request.Properties["AuditTitle"] = "Bank List Viewed";
            Request.Properties["AuditDescription"] = "Viewed the master bank list.";
            const string code = "GET-BANK-LIST";

            try
            {
                var model = new ConfigAsync();

                var banks = await model.GetBankList();

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    code = code,
                    data = banks
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to retrieve bank list.", code, ex);
            }
        }

        [Authorize(Roles = "SA,AD")]
        [HttpPost]
        [Route("add-bank")]
        public async Task<IHttpActionResult> AddBank(AddBankRequest request)
        {
            Request.Properties["AuditTitle"] = "Bank Added";
            Request.Properties["AuditDescription"] = "Attempted to add a master bank.";
            const string code = "ADD-BANK";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);

                var model = new ConfigAsync
                {
                    CreatedBy = userId
                };

                bool result = await model.AddBank(request);

                if (!result)
                {
                    throw new BusinessException(model.Message ?? "Unable to add bank.", code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    code = code,
                    Data = (object)null
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to add bank.", code, ex);
            }
        }

        [Authorize(Roles = "SA,AD")]
        [HttpPut]
        [Route("edit-bank")]
        public async Task<IHttpActionResult> EditBank(EditBankRequest request)
        {
            Request.Properties["AuditTitle"] = "Bank Updated";
            Request.Properties["AuditDescription"] = "Attempted to update a master bank.";
            const string code = "EDIT-BANK";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);

                var model = new ConfigAsync
                {
                    CreatedBy = userId
                };

                bool result = await model.EditBank(request);

                if (!result)
                {
                    throw new BusinessException(model.Message ?? "Unable to update bank.", code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    code = code,
                    Data = (object)null
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to update bank.", code, ex);
            }
        }
    }
}