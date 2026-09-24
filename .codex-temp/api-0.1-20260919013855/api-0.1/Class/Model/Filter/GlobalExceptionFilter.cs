using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.Class;
using System;
using System.Net;
using System.Net.Http;
using System.Web.Http.Filters;

namespace API_CPX.Class.Filter
{
    public class GlobalExceptionFilter : ExceptionFilterAttribute
    {
        public override void OnException(HttpActionExecutedContext context)
        {
            if (context.Exception is BusinessException businessEx)
            {
                context.Response = context.Request.CreateResponse(
                    HttpStatusCode.BadRequest,
                    new
                    {
                        Status = 4,
                        Message = businessEx.Message,
                        Code = businessEx.Code,
                        Data = (object)null
                    }
                );

                return;
            }

            context.Response = context.Request.CreateResponse(
                HttpStatusCode.InternalServerError,
                new
                {
                    Status = 4,
                    Message = "Internal Server Error",
                    Code = "SERVER-ERROR",
                    Data = (object)null
                }
            );
        }
    }
}