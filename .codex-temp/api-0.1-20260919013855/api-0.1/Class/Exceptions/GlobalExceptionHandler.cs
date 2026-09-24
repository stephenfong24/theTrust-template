using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.Class;
using System;
using System.Collections.Generic;
using System.Net;
using System.Web.Http.ExceptionHandling;

public class GlobalExceptionHandler : ExceptionHandler
{
    public override void Handle(ExceptionHandlerContext context)
    {
        HttpStatusCode httpStatusCode = HttpStatusCode.InternalServerError;

        Response response;

        if (context.Exception is BusinessException businessException)
        {
            httpStatusCode = HttpStatusCode.BadRequest;

            response = ResponseHelper.Fail(
                businessException.Message,
                businessException.Code);
        }
        else if (context.Exception is UnauthorizedAccessException)
        {
            httpStatusCode = HttpStatusCode.Unauthorized;

            response = ResponseHelper.Fail(
                "Unauthorized access.",
                "UNAUTHORIZED");
        }
        else if (context.Exception is KeyNotFoundException)
        {
            httpStatusCode = HttpStatusCode.NotFound;

            response = ResponseHelper.Fail(
                context.Exception.Message,
                "NOT_FOUND");
        }
        else
        {
            /*response = ResponseHelper.Fail(
                "Internal server error.",
                "SERVER_ERROR");*/

            string errorMessage = context.Exception.Message;

            if (context.Exception.InnerException != null)
            {
                errorMessage += " | Inner: " + context.Exception.InnerException.Message;
            }

            response = ResponseHelper.Fail(
                errorMessage,
                "SERVER_ERROR");
        }

        context.Result = new ErrorResult(
            context.Request,
            response,
            httpStatusCode);
    }
}