using API_CPX.Class.Attributes;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.Class;
using System;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Http;
using System.Web.Http.Controllers;

namespace API_CPX.Class.Handler
{
    public class ApiLoggingHandler : DelegatingHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Guid requestId = Guid.NewGuid();
            DateTime requestTime = DateTime.Now;
            Stopwatch stopwatch = Stopwatch.StartNew();

            string requestBody = string.Empty;
            string responseBody = string.Empty;
            string exceptionMessage = null;

            try
            {
                if (ShouldSkipLogging(request))
                {
                    return await base.SendAsync(request, cancellationToken);
                }

                bool isMultipartUpload = IsMultipartUpload(request);

                if (request.Content != null && !isMultipartUpload)
                {
                    requestBody = await request.Content.ReadAsStringAsync();
                    requestBody = ApiLogMaskHelper.MaskSensitiveJson(requestBody);
                    requestBody = ApiLogMaskHelper.TrimLargeText(requestBody);
                }
                else if (isMultipartUpload)
                {
                    requestBody = "<MULTIPART/FILE UPLOAD BODY SKIPPED>";
                }

                HttpResponseMessage response = await base.SendAsync(request, cancellationToken);

                await TrySetUserIdentityAsync(request);

                stopwatch.Stop();

                bool isBinaryResponse = IsBinaryResponse(response);

                if (response.Content != null && !isBinaryResponse)
                {
                    responseBody = await response.Content.ReadAsStringAsync();
                    responseBody = ApiLogMaskHelper.MaskSensitiveJson(responseBody);
                    responseBody = ApiLogMaskHelper.TrimLargeText(responseBody);
                }
                else if (isBinaryResponse)
                {
                    responseBody = "<BINARY RESPONSE BODY SKIPPED>";
                }

                var log = BuildLog(
                    request,
                    requestId,
                    requestTime,
                    DateTime.Now,
                    stopwatch.ElapsedMilliseconds,
                    requestBody,
                    responseBody,
                    (int)response.StatusCode,
                    response.IsSuccessStatusCode,
                    exceptionMessage
                );

                await ApiLogHelper.InsertApiLogAsync(log);

                return response;
            }
            catch (Exception ex)
            {
                stopwatch.Stop();

                exceptionMessage = ex.ToString();

                await TrySetUserIdentityAsync(request);

                var log = BuildLog(
                    request,
                    requestId,
                    requestTime,
                    DateTime.Now,
                    stopwatch.ElapsedMilliseconds,
                    requestBody,
                    responseBody,
                    500,
                    false,
                    exceptionMessage
                );

                await ApiLogHelper.InsertApiLogAsync(log);

                throw;
            }
        }

        private async Task TrySetUserIdentityAsync(HttpRequestMessage request)
        {
            try
            {
                // Already populated by JwtAuthorizeAttribute
                if (request.Properties.ContainsKey("UserID"))
                {
                    return;
                }

                var authHeader = request.Headers.Authorization;

                if (authHeader == null ||
                    !string.Equals(
                        authHeader.Scheme,
                        "Bearer",
                        StringComparison.OrdinalIgnoreCase) ||
                    string.IsNullOrWhiteSpace(authHeader.Parameter))
                {
                    return;
                }

                var principal =
                    await JwtHelper.ValidateToken(authHeader.Parameter);

                if (principal == null)
                {
                    return;
                }

                var userId = principal.Claims
                    .FirstOrDefault(c => c.Type == "UserID")
                    ?.Value;

                var merchantId = principal.Claims
                    .FirstOrDefault(c => c.Type == "MerchantID")
                    ?.Value;

                if (!string.IsNullOrWhiteSpace(userId))
                {
                    request.Properties["UserID"] = userId;
                }

                if (!string.IsNullOrWhiteSpace(merchantId))
                {
                    request.Properties["MerchantID"] = merchantId;
                }
            }
            catch
            {
                // Do not block AllowAnonymous APIs
                // if token is missing, expired or invalid.
            }
        }

        private ApiRequestLog BuildLog(
            HttpRequestMessage request,
            Guid requestId,
            DateTime requestTime,
            DateTime responseTime,
            long durationMs,
            string requestBody,
            string responseBody,
            int statusCode,
            bool isSuccess,
            string exceptionMessage)
        {
            string userId = null;
            string merchantId = null;
            string description = null;
            string activitytitle = null;

            if (request.Properties.ContainsKey("UserID"))
                userId = request.Properties["UserID"]?.ToString();

            if (request.Properties.ContainsKey("MerchantID"))
                merchantId = request.Properties["MerchantID"]?.ToString();

            if (request.Properties.ContainsKey("AuditDescription"))
                description = request.Properties["AuditDescription"]?.ToString();

            if (request.Properties.ContainsKey("AuditTile"))
                activitytitle = request.Properties["AuditTile"]?.ToString();

            string controllerName = ApiActionHelper.GetControllerName(request);
            string actionName = ApiActionHelper.GetActionName(request);

            return new ApiRequestLog
            {
                RequestID = requestId,
                RequestTime = requestTime,
                ResponseTime = responseTime,
                DurationMs = Convert.ToInt32(durationMs),
                UserID = userId,
                MerchantID = merchantId,
                HttpMethod = request.Method.Method,
                RequestUrl = request.RequestUri == null ? null : request.RequestUri.ToString(),
                ControllerName = controllerName,
                ActionName = actionName,
                ActivityTitle  = activitytitle,
                Description = description,
                IpAddress = GetClientIp(request),
                UserAgent = request.Headers.UserAgent == null ? null : request.Headers.UserAgent.ToString(),
                RequestHeaders = ApiLogMaskHelper.TrimLargeText(request.Headers.ToString()),
                RequestBody = requestBody,
                ResponseStatusCode = statusCode,
                ResponseBody = responseBody,
                IsSuccess = isSuccess,
                ExceptionMessage = exceptionMessage
            };
        }

        private string GetClientIp(HttpRequestMessage request)
        {
            try
            {
                if (request.Properties.ContainsKey("MS_HttpContext"))
                {
                    dynamic ctx = request.Properties["MS_HttpContext"];
                    return ctx.Request.UserHostAddress;
                }
            }
            catch
            {
            }

            return null;
        }

        private bool IsMultipartUpload(HttpRequestMessage request)
        {
            if (request.Content == null || request.Content.Headers.ContentType == null)
                return false;

            return request.Content.Headers.ContentType.MediaType
                .Equals("multipart/form-data", StringComparison.OrdinalIgnoreCase);
        }

        private bool IsBinaryResponse(HttpResponseMessage response)
        {
            if (response.Content == null || response.Content.Headers.ContentType == null)
                return false;

            var mediaType = response.Content.Headers.ContentType.MediaType.ToLower();

            return mediaType.StartsWith("image/") ||
                   mediaType == "application/pdf" ||
                   mediaType == "application/octet-stream";
        }

        private bool ShouldSkipLogging(HttpRequestMessage request)
        {
            try
            {
                var path = request.RequestUri.AbsolutePath.ToLowerInvariant();

                if (!path.StartsWith("/api/"))
                    return true;

                var configuration = request.GetConfiguration();

                if (configuration == null)
                    return false;

                // ============================================================
                // GET CONTROLLER
                // ============================================================

                var controllerSelector =
                    configuration.Services.GetHttpControllerSelector();

                var controllerDescriptor =
                    controllerSelector.SelectController(request);

                if (controllerDescriptor == null)
                    return false;

                // ============================================================
                // CHECK CONTROLLER [SkipApiLogging]
                // ============================================================

                if (controllerDescriptor
                    .GetCustomAttributes<SkipApiLoggingAttribute>()
                    .Any())
                {
                    return true;
                }

                // ============================================================
                // CREATE CONTROLLER CONTEXT
                // ============================================================

                var controllerContext = new HttpControllerContext(
                    configuration,
                    request.GetRouteData(),
                    request
                );

                controllerContext.ControllerDescriptor = controllerDescriptor;

                // ============================================================
                // GET ACTION
                // ============================================================

                var actionSelector =
                    configuration.Services.GetActionSelector();

                var actionDescriptor =
                    actionSelector.SelectAction(controllerContext);

                if (actionDescriptor == null)
                    return false;

                // ============================================================
                // CHECK ACTION [SkipApiLogging]
                // ============================================================

                if (actionDescriptor
                    .GetCustomAttributes<SkipApiLoggingAttribute>()
                    .Any())
                {
                    return true;
                }

                return false;
            }
            catch
            {
                // Skip-log detection must never break the API.
                return false;
            }
        }
    }
}