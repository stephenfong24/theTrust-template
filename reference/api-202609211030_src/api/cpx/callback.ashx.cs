using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.cpx
{
    /// <summary>
    /// Summary description for callback
    /// </summary>
    public class callback : IHttpHandler
    {

        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "text/plain";
            context.Response.Write("OK");
        }

        public bool IsReusable
        {
            get
            {
                return false;
            }
        }
    }
}