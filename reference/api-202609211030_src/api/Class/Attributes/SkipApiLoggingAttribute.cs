using System;

namespace API_CPX.Class.Attributes
{
    [AttributeUsage(
        AttributeTargets.Method | AttributeTargets.Class,
        AllowMultiple = false,
        Inherited = true)]
    public class SkipApiLoggingAttribute : Attribute
    {
    }
}