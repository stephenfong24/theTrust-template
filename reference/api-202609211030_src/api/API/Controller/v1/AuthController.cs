using API_CPX.api;
using API_CPX.Class;
using API_CPX.Class.Exceptions;
using API_CPX.Class.Merchant;
using API_CPX.Class.Model;
using API_CPX.Class.Model.Class;
using API_CPX.Context;
using API_CPX.Model;
using API_CPX.Services;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Http;
using Util;

namespace API_CPX.API.Controller
{
    [RoutePrefix("api/auth")]
    [JwtAuthorize]
    public class AuthController : ApiController
    {
        // ============================================================
        // LOGIN
        // ============================================================

        [HttpPost]
        [AllowAnonymous]
        [Route("login")]
        public async Task<IHttpActionResult> Login(LoginRequest request)
        {
            const string code = "LOGIN";
            Request.Properties["AuditTitle"] = "Account Login";
            Request.Properties["AuditDescription"] = "Attempted to sign in to the account.";

            if (request == null)
            {
                throw new BusinessException("Invalid login request.", code);
            }

            var model = new LoginUserModel();

            bool isValid = await model.VerifyLogin(request.Username, request.Password, request.MerchantID, request.RememberMe);
            if (!isValid)
            {
                throw new BusinessException(model.Message, code);
            }

            Request.Properties["UserID"] = model.UserId;
            Request.Properties["MerchantID"] = model.MerchantID;
            var response = await BuildLoginResponseAsync(model, code);
            return Ok(response);
        }

        // ============================================================
        // REMEMBER ME LOGIN
        // ============================================================

        [HttpPost]
        [AllowAnonymous]
        [Route("remember-login")]
        public async Task<IHttpActionResult> RememberLogin(RememberLoginRequest request)
        {
            const string code = "REMEMBER-LOGIN";
            Request.Properties["AuditTitle"] = "Remember Me Login";
            Request.Properties["AuditDescription"] = "Attempted to sign in using a remember-me session.";

            if (request == null || request.RememberMeToken == Guid.Empty)
            {
                throw new BusinessException("Invalid remember me token.", code);
            }

            var model = new LoginUserModel();
            bool isValid = await model.VerifyRememberLogin(request.RememberMeToken, request.MerchantID);
            if (!isValid)
            {
                throw new BusinessException(model.Message, code);
            }

            Request.Properties["UserID"] = model.UserId;
            Request.Properties["MerchantID"] = model.MerchantID;
            var response = await BuildLoginResponseAsync(model, code);
            return Ok(response);
        }

        // ============================================================
        // LOGOUT
        // ============================================================

        [HttpPost]
        [Route("logout")]
        public async Task<IHttpActionResult> Logout()
        {
            const string code = "LOGOUT";
            Request.Properties["AuditTitle"] = "Account Logout";
            Request.Properties["AuditDescription"] = "Attempted to sign out from the account.";
            var authHeader = Request.Headers.Authorization;

            if (authHeader == null || !string.Equals(authHeader.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(authHeader.Parameter))
            {
                throw new BusinessException("Invalid token.", "INVALID_TOKEN");
            }

            if (!Request.Properties.ContainsKey("UserID"))
            {
                throw new BusinessException("Invalid token.", "INVALID_TOKEN");
            }

            string token = authHeader.Parameter;
            long userId = Convert.ToInt64(Request.Properties["UserID"]);

            using (var db = new Sandbox_BasedEntities())
            {
                var rememberTokens = await db.tbl_RememberMeToken.Where(x => x.MemberID == userId && x.IsRevoked == false).ToListAsync();
                foreach (var rememberToken in rememberTokens)
                {
                    rememberToken.IsRevoked = true;
                }

                if (rememberTokens.Count > 0)
                {
                    await db.SaveChangesAsync();
                }
            }

            await AppTokenService.RemoveTokenAsync(token);

            return Ok(new
            {
                Status = 0,
                Message = "Logout successful.",
                Code = code
            });
        }

        // ============================================================
        // COMMON LOGIN RESPONSE
        // ============================================================

        private async Task<LoginResponse> BuildLoginResponseAsync(LoginUserModel model, string code)
        {
            model.Token = JwtHelper.GenerateToken(model.UserId, model.MerchantID, model.Role);
            model.SignalRToken = JwtHelper.GenerateSignalRToken(model.UserId, model.MerchantID);
            await AppTokenService.SaveTokenAsync( model.UserId, model.Token);

            return new LoginResponse
            {
                Status = 0,
                Message = "Success",
                Code = code,
                Data = new LoginResponseData
                {
                    Token = model.Token,
                    SignalRToken = model.SignalRToken,
                    RememberMeToken = model.RememberMeToken,
                    UserId = model.UserId,
                    DisplayName = model.DisplayName,
                    UserName = model.UserName,
                    Name = model.Name,
                    Role = model.Role,
                    RoleName = model.RoleName,
                    Ranking = model.Ranking,
                    RankName = model.RankName,
                    Country = model.Country,
                    Country_Domain = model.Country_Domain,
                    JoinDate = model.JoinDate,
                    LastLogin = model.LastLogin,
                    Email = model.Email,
                    AvatarUrl = model.AvatarUrl,
                    SponsorID = model.SponsorID,
                    SponsorName = model.SponsorName,
                    ReferralCode = model.ReferralCode,
                    CommissionAccess = model.CommissionAccess,
                    Redirects = model.Redirects,
                    Access = model.Access
                }
            };
        }
    }
}


// ================================================================
// BASE RESPONSE MODEL
// ================================================================

public class Base
{
    public int Status { get; set; }
    public string Message { get; set; }
}

// ================================================================
// UPLOAD RESPONSE
// ================================================================

public class UploadResponse : Base
{
    public string FileUrl { get; set; }
    public string UploadedFile { get; set; }
}

// ================================================================
// REQUEST RESPONSE
// ================================================================

[Serializable]
public class RequestResponse
{
    public int Status { get; set; }
    public string Message { get; set; }
}

// ================================================================
// LOGIN RESPONSE
// ================================================================

public class LoginResponse
{
    public int Status { get; set; }
    public string Message { get; set; }
    public string Code { get; set; }
    public LoginResponseData Data { get; set; }
}

// ================================================================
// LOGIN RESPONSE DATA
// ================================================================

public class LoginResponseData
{
    // ============================================================
    // TOKEN
    // ============================================================

    public string Token { get; set; }
    public string SignalRToken { get; set; }
    public Guid? RememberMeToken { get; set; }

    // ============================================================
    // USER
    // ============================================================

    public long UserId { get; set; }
    public string DisplayName { get; set; }
    public string UserName { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public string AvatarUrl { get; set; }

    // ============================================================
    // ROLE
    // ============================================================

    public string Role { get; set; }
    public string RoleName { get; set; }

    // ============================================================
    // RANKING
    // ============================================================

    public int Ranking { get; set; }
    public string RankName { get; set; }

    // ============================================================
    // COUNTRY
    // ============================================================

    public string Country { get; set; }
    public string Country_Domain { get; set; }

    // ============================================================
    // DATE
    // ============================================================

    public DateTime JoinDate { get; set; }
    public DateTime LastLogin { get; set; }

    // ============================================================
    // SPONSOR / REFERRAL
    // ============================================================

    public long SponsorID { get; set; }
    public string SponsorName { get; set; }
    public string ReferralCode { get; set; }

    // ============================================================
    // SYSTEM CONTROL
    // ============================================================
    public CommissionPermission CommissionAccess { get; set; }
    public RedirectRecords Redirects { get; set; }
    public AccessPermission Access { get; set; }
}