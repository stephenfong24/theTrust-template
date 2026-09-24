using API_CPX.api;
using API_CPX.Class;
using API_CPX.Class.Exceptions;
using API_CPX.Class.Merchant;
using API_CPX.Class.Model;
using API_CPX.Class.Model.Class;
using API_CPX.Context;
using API_CPX.Model;
using System;
using System.Collections.Generic;
using System.Data.Entity.Core.Objects;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
using System.Web.Http.Description;
using Util;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/service")]
    [JwtAuthorize]
    public class ServiceController : System.Web.Http.ApiController
    {
        [HttpPost]
        [AllowAnonymous]
        [Route("send-otp")]
        public async Task<IHttpActionResult> SendOTP(SendOTPRequest t)
        {
            Request.Properties["AuditTitle"] = "OTP Requst";
            Request.Properties["AuditDescription"] = "Attempted to request a one-time password (OTP).";
            OneTimePassword m = new OneTimePassword();

            m.MerchantID = t.MerchantID;
            m.MemberID = t.UserID;
            m.ActionType = t.ActionType;
            m.OTP_SentMethod = t.SendMethod;
            m.ReceiverAddress = t.ReceiverAddress;

            bool result = await m.SendOTPAsync();

            if (!result)
            {
                throw new BusinessException(m.Message, "REQUEST-OTP");
            }

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = "REQUEST-OTP",
                Data = (object)null
            });
        }
    }
}