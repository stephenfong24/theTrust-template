using API_CPX.Class.Filter;
using API_CPX.Class.Handler;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Http.Cors;

namespace API_CPX.App_Start
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            // inject global error handling
            // throw new BusinessException("Email already exists.", "DUPLICATE_EMAIL");
            // return Ok(ResponseHelper.Success("User created successfully.", "USER_CREATED"));

            var cors = new EnableCorsAttribute(
                "http://localhost:53741",
                "*",
                "*",
                "Content-Disposition"
            );

            config.EnableCors(cors);

            config.MessageHandlers.Add(new ApiLoggingHandler());

            config.Filters.Add(new GlobalExceptionFilter());

            //config.Services.Replace(
            //    typeof(IExceptionHandler),
            //    new GlobalExceptionHandler());

            config.MapHttpAttributeRoutes();
        }
    }
}
