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
    public class AccountValidation : AuthorizeAttribute
    {
        protected override bool IsAuthorized(HttpActionContext actionContext)
        {
            try
            {
                var req = HttpContext.Current.Request.InputStream;
                string body = new StreamReader(req).ReadToEnd();
                AccountValidationMember t = JsonConvert.DeserializeObject<AccountValidationMember>(body);
                if (t == null)
                    return false;

                long CCMID = -1;
                if (actionContext.Request.Headers.Contains("CCMID"))
                    CCMID = Convert.ToInt64(actionContext.Request.Headers.GetValues("CCMID").First());
                if (HttpContext.Current.Session["CCMID"] != null)
                    CCMID = Convert.ToInt64(HttpContext.Current.Session["CCMID"].ToString());
                if (t.UserID == CCMID)
                    return true;
            }
            catch (Exception) { }
            return false;
        }
    }
}

public class AccountValidationMember
{
    public long UserID { get; set; }
}