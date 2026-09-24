using API_CPX.Context;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Http.Controllers;

namespace API_CPX.API
{
    public class UploadValidation : AuthorizeAttribute
    {
        protected override bool IsAuthorized(HttpActionContext actionContext)
        {
            try
            {
                long _UserID = 0;

                var authorization = actionContext.Request.Headers.Authorization;
                if ((authorization != null) && (authorization.Parameter != null))
                {
                    string encryptToken = authorization.Parameter;
                    tbl_AppToken t = new Sandbox_BasedEntities().tbl_AppToken.Where(a => a.token == encryptToken).FirstOrDefault();
                    if (t != null)
                    {
                        _UserID = t.MemberID;
                    }
                }
                else
                {
                    return false;
                }

                long CCMID = -1;
                if (actionContext.Request.Headers.Contains("CCMID"))
                    CCMID = Convert.ToInt64(actionContext.Request.Headers.GetValues("CCMID").First());
                if (HttpContext.Current.Session["CCMID"] != null)
                    CCMID = Convert.ToInt64(HttpContext.Current.Session["CCMID"].ToString());
                if (_UserID == CCMID)
                    return true;
            }
            catch (Exception) { }
            return false;
        }
    }
}