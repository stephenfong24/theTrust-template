using System;
using System.Net.Http;
using System.Web.Http.Controllers;
using System.Web.Http.Hosting;

namespace API_CPX.Class.Helper
{
    public static class ApiActionHelper
    {
        public static string GetControllerName(HttpRequestMessage request)
        {
            if (request == null)
            {
                return null;
            }

            object value;

            if (request.Properties.TryGetValue(HttpPropertyKeys.HttpActionDescriptorKey, out value))
            {
                var actionDescriptor = value as HttpActionDescriptor;

                if (actionDescriptor != null)
                {
                    return actionDescriptor.ControllerDescriptor?.ControllerName;
                }
            }

            var routeData = request.GetRouteData();

            if (routeData != null && routeData.Values.ContainsKey("controller"))
            {
                return Convert.ToString(routeData.Values["controller"]);
            }

            return null;
        }

        public static string GetActionName(HttpRequestMessage request)
        {
            if (request == null)
            {
                return null;
            }

            object value;

            if (request.Properties.TryGetValue(HttpPropertyKeys.HttpActionDescriptorKey, out value))
            {
                var actionDescriptor = value as HttpActionDescriptor;

                if (actionDescriptor != null)
                {
                    return actionDescriptor.ActionName;
                }
            }

            var routeData = request.GetRouteData();

            if (routeData != null && routeData.Values.ContainsKey("action"))
            {
                return Convert.ToString(routeData.Values["action"]);
            }

            return null;
        }
    }
}