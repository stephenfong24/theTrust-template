using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.Http;
using System.Web.Security;
using System.Web.Http.Controllers;
using API_CPX.Context;

namespace API_CPX.api
{
    public class RequestAuthorizeAttribute: AuthorizeAttribute
    {
        public override void OnAuthorization(HttpActionContext actionContext)
        {
            long CCMID = 0;
            //var authorization = HttpContext.Current.Request.Headers["Authorization"];
            var authorization = actionContext.Request.Headers.Authorization;
            if (actionContext.Request.Headers.Contains("CCMID"))
                CCMID = Convert.ToInt64(actionContext.Request.Headers.GetValues("CCMID").First());
            if (HttpContext.Current.Session["CCMID"] != null)
                CCMID = Convert.ToInt64(HttpContext.Current.Session["CCMID"].ToString());

            if ((authorization != null) && (authorization.Parameter != null))
            {
                var attributes = actionContext.ActionDescriptor.GetCustomAttributes<AllowAnonymousAttribute>().OfType<AllowAnonymousAttribute>();
                bool isAnonymous = attributes.Any(a => a is AllowAnonymousAttribute);
                if (isAnonymous)
                {
                    base.IsAuthorized(actionContext);
                }
                else if (ValidateToken(authorization.Parameter, CCMID))
                {
                    base.IsAuthorized(actionContext);
                }
                else
                {
                    HandleUnauthorizedRequest(actionContext);
                }
            }
            else
            {
                var attributes = actionContext.ActionDescriptor.GetCustomAttributes<AllowAnonymousAttribute>().OfType<AllowAnonymousAttribute>();
                bool isAnonymous = attributes.Any(a => a is AllowAnonymousAttribute);
                //bool isAnonymous = actionContext.ControllerContext.ControllerDescriptor.GetCustomAttributes<AllowAnonymousAttribute>().Any();
                //bool isAnonymous = ShouldSkipAuthorization(actionContext);
                if (isAnonymous) base.OnAuthorization(actionContext);
                else HandleUnauthorizedRequest(actionContext);
            }
        }

        private static bool ShouldSkipAuthorization(HttpActionContext actionContext)
        {
            return
                actionContext.ActionDescriptor.GetCustomAttributes<AllowAnonymousAttribute>(true).Any() ||
                actionContext.ActionDescriptor.ControllerDescriptor.GetCustomAttributes<AllowAnonymousAttribute>(true).Any();
        }

        private bool ValidateToken(string encryptToken, long memberid)
        {
            try
            {
                string token = encryptToken.Replace("Bearer ", "");
                tbl_AppToken t = new Sandbox_BasedEntities().tbl_AppToken.Where(a => a.MemberID == memberid &&
                       a.token == encryptToken).FirstOrDefault();
                if (t != null)
                    return true;
            }
            catch (Exception) { }
            return false;
        }
    }
}