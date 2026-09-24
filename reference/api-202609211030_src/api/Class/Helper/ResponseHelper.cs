using API_CPX.Class.Model.Class;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Helper
{
    public class ResponseHelper
    {
        public static Response Success(string message = "Success.", string code = "SUCCESS", object data = null)
        {
            return new Response
            {
                Status = 0,
                Message = message,
                Code = code,
                Data = data
            };
        }

        public static Response Fail(string message = "Error.", string code = "ERROR", object data = null)
        {
            return new Response
            {
                Status = 4,
                Message = message,
                Code = code,
                Data = data
            };
        }
    }
}