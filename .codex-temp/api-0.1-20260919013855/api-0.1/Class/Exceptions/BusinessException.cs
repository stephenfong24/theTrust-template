using System;

namespace API_CPX.Class.Exceptions
{
    public class BusinessException : Exception
    {
        public string Code { get; private set; }

        public BusinessException(
            string message,
            string code = "BUSINESS_ERROR",
            Exception ex = null)
            : base(message)
        {
            Code = code;
        }
    }
}