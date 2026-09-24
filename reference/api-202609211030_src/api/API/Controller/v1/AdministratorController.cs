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

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/administrator")]
    [JwtAuthorize]
    public class AdministratorController : System.Web.Http.ApiController
    {
        [Authorize(Roles = "SA,AD")]
        [HttpGet]
        [Route("administrator-list")]
        public async Task<IHttpActionResult> AdministratorList(int page = 1, int pageSize = 10, string search = null, string roleCode = null, bool? status = null)
        {
            try
            {
                Request.Properties["AuditTitle"] = "Administrator List Viewed";
                Request.Properties["AuditDescription"] = "Requested the administrator account listing.";
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                if (page <= 0) page = 1;
                if (pageSize <= 0) pageSize = 10;

                AdministratorListAsync m = new AdministratorListAsync();

                var administratorLists = await m.GetAdministratorListAsync(merchantId, page, pageSize, search, roleCode, status);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-ADMINISTRATOR-LIST",
                    Data = new
                    {
                        AdministratorLists = administratorLists,
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
                throw new BusinessException(ex.Message, "GET-ADMINISTRATOR-LIST");
            }
        }

        [Authorize(Roles = "SA,AD")]
        [HttpPost]
        [Route("add")]
        public async Task<IHttpActionResult> AddAdministrator(AdministratorAsync model)
        {
            Request.Properties["AuditTitle"] = "Administrator Account Creation";
            Request.Properties["AuditDescription"] = "Attempted to create a new administrator account.";
            const string code = "ADD-ADMINISTRATOR";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                if (model == null)
                {
                    throw new BusinessException("Invalid request.", code);
                }

                model.MerchantID = merchantId;
                model.Username = model.Username;
                model.Fullname = model.Fullname;
                model.RoleCode = model.RoleCode;
                model.LoginPassword = model.LoginPassword;
                model.ConfirmLoginPassword = model.ConfirmLoginPassword;
                model.TrustAccess = model.TrustAccess;
                model.WillAccess = model.WillAccess;
                model.CreatedBy = userId.ToString();

                bool isValid = await model.AddAdministrator();

                if (!isValid)
                {
                    throw new BusinessException(model.Message, code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code
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

        [HttpPut]
        [Route("edit-profile/{id:long}")]
        [Authorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> EditAdministrator(long id, EditAdministratorRequest request)
        {
            Request.Properties["AuditTitle"] = "Administrator Account Update";
            Request.Properties["AuditDescription"] = "Attempted to update administrator account information.";
            const string code = "EDIT-ADMINISTRATOR";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                AdministratorAsync m = new AdministratorAsync();

                m.UserID = id;
                m.MerchantID = merchantId;
                m.Username = request.Username;
                m.Fullname = request.Fullname;
                m.RoleCode = request.RoleCode;
                m.TrustAccess = request.TrustAccess;
                m.WillAccess = request.WillAccess;
                m.LoginStatus = request.LoginStatus;
                m.CreatedBy = userId.ToString();

                bool isValid = await m.EditProfile();
                if (!isValid)
                {
                    throw new BusinessException(m.Message, code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code
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

        [HttpPost]
        [Route("edit-passsword/{id:long}")]
        [Authorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> EditPassword(AdminChangePasswordRequest request)
        {
            Request.Properties["AuditTitle"] = "Administrator Password Changed";
            Request.Properties["AuditDescription"] = "Changed the password for an administrator account.";
            const string code = "ADMIN-CHANGE-PASSWORD";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                AdministratorAsync m = new AdministratorAsync();

                m.UserID = request.UserID;
                m.MerchantID = merchantId;
                m.LoginPassword = request.LoginPassword;
                m.ConfirmLoginPassword = request.ConfirmLoginPassword;
                m.CreatedBy = request.CreatedBy;

                bool isValid = await m.EditAdministratorPassword();

                if (!isValid)
                {
                    throw new BusinessException(m.Message, code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = (object)null
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code);
            }
        }

        [HttpDelete]
        [Route("delete/{id:long}")]
        [Authorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> DeleteAdministrator(long id, AdministratorAsync model)
        {
            Request.Properties["AuditTitle"] = "Administrator Account Removal";
            Request.Properties["AuditDescription"] = "Attempted to remove an administrator account.";
            const string code = "DELETE-ADMINISTRATOR";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                if (model == null || string.IsNullOrWhiteSpace(model.Username))
                {
                    throw new BusinessException("Please enter the administrator email address.", code);
                }

                model.MerchantID = merchantId;
                model.UserID = id;
                model.CreatedBy = userId.ToString();

                bool isValid = await model.DeleteAdministrator();
                if (!isValid)
                {
                    throw new BusinessException(model.Message, code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code
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

        [HttpPost]
        [Route("change-profile")]
        [Authorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> AdminChangeProfile(AdminChangeProfileRequest request)
        {
            Request.Properties["AuditTitle"] = "Administrator Account Update";
            Request.Properties["AuditDescription"] = "Attempted to update the administrator profile information.";
            const string code = "ADMIN-CHANGE-PROFILE";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                AdministratorAsync m = new AdministratorAsync();

                m.UserID = userId;
                m.MerchantID = merchantId;
                m.Fullname = request.Fullname;
                m.Username = request.Username;

                bool isValid = await m.AdminChangeProfile();

                if (!isValid)
                {
                    throw new BusinessException(m.Message, code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = (object)null
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code);
            }
        }
    }
}