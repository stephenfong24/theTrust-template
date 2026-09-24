using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Http.Controllers;

namespace API_CPX.API
{
    public class ValidateModelStateFilter : AuthorizeAttribute
    {
        public override void OnAuthorization(HttpActionContext actionContext)
        {
            try
            {
                string query = actionContext.Request.RequestUri.Query;
                var nvc = HttpUtility.ParseQueryString(query);
                string memberID = nvc["UserID"];
                long pid = Convert.ToInt64(memberID);
                long mid = Convert.ToInt64(HttpContext.Current.Session["CCMID"].ToString());
                if (pid != mid)
                    throw new Exception();
            }
            catch (Exception)
            {
                //HandleUnauthorizedRequest(actionContext);
            }
        }
    }
}