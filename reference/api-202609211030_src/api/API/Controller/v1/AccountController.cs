using API_CPX.api;
using API_CPX.Class;
using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Merchant;
using API_CPX.Class.Model;
using API_CPX.Class.Model.Class;
using API_CPX.Class.Model.DTO;
using API_CPX.Context;
using API_CPX.Model;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.Entity.Core.Objects;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
using System.Web.Http.Description;
using Util;
using static API_CPX.Class.Model.DTO.AgentSignupValidationRequest;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/account")]
    [JwtAuthorize]
    public class AccountController : System.Web.Http.ApiController
    {
        [HttpPost]
        [Route("change-login-password")]
        public async Task<IHttpActionResult> ChangeLoginPassword(ChangePasswordRequest t)
        {
            Request.Properties["AuditTitle"] = "Password Change";
            Request.Properties["AuditDescription"] = "Attempted to change the account login password.";
            ChangePassword m = new ChangePassword();

            long userId = Convert.ToInt64(Request.Properties["UserID"]);
            string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
            bool result = await m.ChangeLoginPassword(userId, t.OldPassword, t.Password, t.ConfirmPassword, merchantId);
            if (!result)
            {
                throw new BusinessException(m.Message, "CHANGE-LOGIN-PASSWORD");
            }

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = "CHANGE-LOGIN-PASSWORD",
                Data = (object)null
            });
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("request-reset-password")]
        public async Task<IHttpActionResult> RequestResetPassword(RequestResetPasswordRequest t)
        {
            try
            {
                Request.Properties["AuditTitle"] = "Password Reset Request";
                Request.Properties["AuditDescription"] = "Requested instructions to reset the login password.";
                ResetPasswordAsync m = new ResetPasswordAsync();
                bool isValid = await m.RequestResetPassword(t.MerchantID, t.Username);
                if (!isValid)
                {
                    throw new BusinessException(m.Message, "REQUEST-RESET-PASSWORD");
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "REQUEST-RESET-PASSWORD",
                    Data = (object)null
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "REQUEST-RESET-PASSWORD");
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("reset-password")]
        public async Task<IHttpActionResult> ChangePassword(ResetPasswordRequest request)
        {
            try
            {
                Request.Properties["AuditTitle"] = "Password Reset";
                Request.Properties["AuditDescription"] = "Attempted to reset the account login password.";
                ResetPasswordAsync m = new ResetPasswordAsync();
                bool isValid = await m.RequestChangePassword(request.MerchantID, request.UniqueID, request.NewLoginPassword, request.ConfirmLoginPassword);
                if (!isValid)
                {
                    throw new BusinessException(m.Message, "RESET-LOGIN-PASSWORD");
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "RESET-PASSWORD",
                    Data = (object)null
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "REQUEST-RESET-PASSWORD");
            }
        }

        [HttpGet]
        [Route("get-profile")]
        public async Task<IHttpActionResult> GetProfile()
        {
            Request.Properties["AuditTitle"] = "Profile View";
            Request.Properties["AuditDescription"] = "Requested account profile information.";
            long userId = Convert.ToInt64(Request.Properties["UserID"]);
            string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
            ProfileAsync m = new ProfileAsync();
            m.UserID = userId;
            m.MerchantID = merchantId;

            var profile = await m.GetProfile();

            if (profile.Status != 0)
            {
                throw new BusinessException(profile.Message, "GET-PROFILE");
            }

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = "GET-PROFILE",
                Data = new
                {
                    profile.ReferralID,
                    profile.AvatarUrl,
                    profile.CountryMobileCode,
                    profile.Mobile,
                    profile.Email,
                    profile.Fullname,
                    profile.Displayname,
                    profile.DateOfBirth,
                    profile.IdentityType,
                    profile.IdentityID,
                    profile.Country,
                    profile.Country_Domain,
                    profile.Postcode,
                    profile.City,
                    profile.State,
                    profile.Address_1,
                    profile.Address_2,
                    profile.Occupation,
                    profile.TinNumber,
                    profile.AllowTrustOverridingCommission,
                    profile.LastChangePasswordDate,
                    profile.TotalReferrals,
                    profile.BankName,
                    profile.BankNameDetail,
                    profile.AccountName,
                    profile.AccountNumber,
                    profile.SwiftCode,
                    profile.IcFront,
                    profile.IcBack,
                    profile.Passport,
                    profile.SsmCertificate,
                    profile.Introducer,
                    profile.Activities
                }
            });
        }

        [HttpPost]
        [Route("change-profile")]
        [Authorize(Roles = "AG")]
        public async Task<IHttpActionResult> AgentChangeProfile(AgentChangeProfileRequest request)
        {
            Request.Properties["AuditTitle"] = "Profile Update";
            Request.Properties["AuditDescription"] = "Attempted to update personal profile information.";
            const string code = "CHANGE-PROFILE";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                ProfileAsync m = new ProfileAsync();

                m.UserID = userId;
                m.MerchantID = merchantId;
                m.Displayname = request.Displayname;

                bool isValid = await m.AgentChangeProfile();

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

        [HttpPost]
        [Route("change-bank")]
        [Authorize(Roles = "AG")]
        public async Task<IHttpActionResult> AgentChangeBank(AgentChangeBankRequest request)
        {
            Request.Properties["AuditTitle"] = "Bank Update";
            Request.Properties["AuditDescription"] = "Attempted to update bank information.";
            const string code = "CHANGE-BANK";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                ProfileAsync m = new ProfileAsync();

                m.UserID = userId;
                m.MerchantID = merchantId;
                m.BankName = request.BankName;
                m.AccountName = request.AccountName;
                m.AccountNumber = request.AccountNumber;

                bool isValid = await m.AgentChangeBankInfo();

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

        [HttpPost]
        [Route("change-email")]
        [Authorize(Roles = "AG")]
        public async Task<IHttpActionResult> AgentChangeEmail(AgentChangeEmailRequest request)
        {
            Request.Properties["AuditTitle"] = "Email Update";
            Request.Properties["AuditDescription"] = "Attempted to update profile email address.";
            const string code = "CHANGE-EMAIL";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                ProfileAsync m = new ProfileAsync();

                m.UserID = userId;
                m.MerchantID = merchantId;
                m.Username = request.Username;
                m.OTP = request.OTP;

                bool isValid = await m.AgentChangeEmail();

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

        [HttpPost]
        [Route("upload-avatar")]
        public async Task<IHttpActionResult> UploadAvatar()
        {
            Request.Properties["AuditTitle"] = "Profile Picture Updated";
            Request.Properties["AuditDescription"] = "Attempted to update the account profile picture.";
            const string code =  "UPDATE-PROFILE-PIC";
            string tempFilePath = null;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                MultipartUploadResult upload = await MultipartUploadHelper.ReadSingleFileAsync(Request);

                if (!upload.IsSuccess)
                {
                    throw new BusinessException(upload.Message, code);
                }

                tempFilePath = upload.TempFilePath;

                var m = new FileUpload
                {
                    MerchantID = merchantId,
                    UserID = userId,
                    FileName = upload.OriginalFileName,
                    FileType = upload.ContentType,
                    FileSize = upload.FileSize,
                    UploadType = "AVATAR",
                    TempFilePath = upload.TempFilePath
                };

                bool isValid =  await m.UploadAvatarAsync();
                tempFilePath = null;

                if (!isValid)
                {
                    throw new BusinessException(m.Message, code);
                }

                var data = new { m.FileUrl, m.UploadedFile };

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
                throw new BusinessException(ex.Message, code);
            }
            finally
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
            }
        }
    }
}