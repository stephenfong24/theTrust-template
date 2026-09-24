using API_CPX.Class.Exceptions;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
using System.Web.Http.Controllers;

public class JwtAuthorizeAttribute : AuthorizeAttribute
{
    public override async Task OnAuthorizationAsync(
        HttpActionContext actionContext,
        CancellationToken cancellationToken)
    {
        // Allow anonymous
        if (actionContext.ActionDescriptor
            .GetCustomAttributes<AllowAnonymousAttribute>().Any())
        {
            return;
        }

        var authHeader = actionContext.Request.Headers.Authorization;

        if (authHeader == null ||
            authHeader.Scheme != "Bearer" ||
            string.IsNullOrWhiteSpace(authHeader.Parameter))
        {
            actionContext.Response = actionContext.Request
                .CreateResponse(HttpStatusCode.Unauthorized, new
                {
                    Status = 401,
                    Message = "Invalid or missing token.",
                    Code = "TOKEN_MISSING"
                });

            return;
        }

        try
        {
            var principal = await JwtHelper.ValidateToken(authHeader.Parameter);

            // IMPORTANT: assign authenticated principal
            Thread.CurrentPrincipal = principal;
            HttpContext.Current.User = principal;
            actionContext.RequestContext.Principal = principal;

            var userId = principal.Claims
                .FirstOrDefault(c => c.Type == "UserID")?.Value;

            var merchantId = principal.Claims
                .FirstOrDefault(c => c.Type == "MerchantID")?.Value;

            if (string.IsNullOrWhiteSpace(userId))
            {
                actionContext.Response = actionContext.Request
                    .CreateResponse(HttpStatusCode.Unauthorized, new
                    {
                        Status = 401,
                        Message = "Invalid token user.",
                        Code = "INVALID_TOKEN_USER"
                    });

                return;
            }

            actionContext.Request.Properties["UserID"] = userId;
            actionContext.Request.Properties["MerchantID"] = merchantId;
        }
        catch (BusinessException ex)
        {
            actionContext.Response = actionContext.Request
                .CreateResponse(HttpStatusCode.Unauthorized, new
                {
                    Status = 401,
                    Message = ex.Message,
                    Code = ex.Code
                });
        }
        catch
        {
            actionContext.Response = actionContext.Request
                .CreateResponse(HttpStatusCode.Unauthorized, new
                {
                    Status = 401,
                    Message = "Authorization failed.",
                    Code = "AUTHORIZATION_FAILED"
                });
        }
    }

    protected override void HandleUnauthorizedRequest(HttpActionContext actionContext)
    {
        actionContext.Response = actionContext.Request
            .CreateResponse(
                HttpStatusCode.Unauthorized,
                "Invalid or missing token");
    }
}