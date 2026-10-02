using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Net.Http;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.Security
{
    public class CloudflareTurnstileService
    {
        private const string SiteVerifyUrl =
            "https://challenges.cloudflare.com/turnstile/v0/siteverify";

        private const int MaxTokenLength = 2048;

        private readonly string _secretKey;
        private readonly string _expectedHostname;

        public CloudflareTurnstileService()
        {
            _secretKey =
                ConfigurationManager.AppSettings[
                    "CloudflareTurnstileSecretKey"];

            _expectedHostname =
                ConfigurationManager.AppSettings[
                    "CloudflareTurnstileHostname"];

            if (string.IsNullOrWhiteSpace(_secretKey))
            {
                throw new InvalidOperationException(
                    "Cloudflare Turnstile secret key is not configured.");
            }

            if (string.IsNullOrWhiteSpace(_expectedHostname))
            {
                throw new InvalidOperationException(
                    "Cloudflare Turnstile hostname is not configured.");
            }
        }

        public async Task<CloudflareTurnstileValidationResult>
            ValidateAsync(
                string token,
                string expectedAction,
                string remoteIp = null)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return Failed("MISSING_TOKEN");
            }

            if (token.Length > MaxTokenLength)
            {
                return Failed("INVALID_TOKEN_LENGTH");
            }

            if (string.IsNullOrWhiteSpace(expectedAction))
            {
                return Failed("INVALID_ACTION");
            }

            CloudflareTurnstileSiteVerifyResponse verifyResponse;

            try
            {
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(10);

                    var values =
                        new Dictionary<string, string>
                        {
                            { "secret", _secretKey },
                            { "response", token }
                        };

                    if (!string.IsNullOrWhiteSpace(remoteIp))
                    {
                        values.Add(
                            "remoteip",
                            remoteIp);
                    }

                    using (var content =
                        new FormUrlEncodedContent(values))
                    {
                        var response =
                            await client.PostAsync(
                                SiteVerifyUrl,
                                content);

                        if (!response.IsSuccessStatusCode)
                        {
                            return Failed(
                                "SITEVERIFY_HTTP_ERROR");
                        }

                        string json =
                            await response.Content
                                .ReadAsStringAsync();

                        verifyResponse =
                            JsonConvert.DeserializeObject<
                                CloudflareTurnstileSiteVerifyResponse>(
                                    json);
                    }
                }
            }
            catch
            {
                return Failed(
                    "SITEVERIFY_REQUEST_FAILED");
            }

            if (verifyResponse == null)
            {
                return Failed(
                    "INVALID_SITEVERIFY_RESPONSE");
            }

            if (!verifyResponse.Success)
            {
                return new CloudflareTurnstileValidationResult
                {
                    Success = false,
                    ErrorCode = "TURNSTILE_FAILED",
                    CloudflareErrorCodes =
                        verifyResponse.ErrorCodes
                };
            }

            // =====================================================
            // Validate Hostname
            // =====================================================

            if (!string.Equals(
                verifyResponse.Hostname,
                _expectedHostname,
                StringComparison.OrdinalIgnoreCase))
            {
                return Failed(
                    "INVALID_HOSTNAME");
            }

            // =====================================================
            // Validate Action
            // =====================================================

            if (!string.Equals(
                verifyResponse.Action,
                expectedAction,
                StringComparison.Ordinal))
            {
                return Failed(
                    "INVALID_ACTION");
            }

            return new CloudflareTurnstileValidationResult
            {
                Success = true,
                Hostname = verifyResponse.Hostname,
                Action = verifyResponse.Action
            };
        }

        private static CloudflareTurnstileValidationResult
            Failed(string errorCode)
        {
            return new CloudflareTurnstileValidationResult
            {
                Success = false,
                ErrorCode = errorCode
            };
        }
    }

    public class CloudflareTurnstileSiteVerifyResponse
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("challenge_ts")]
        public DateTime? ChallengeTs { get; set; }

        [JsonProperty("hostname")]
        public string Hostname { get; set; }

        [JsonProperty("action")]
        public string Action { get; set; }

        [JsonProperty("cdata")]
        public string CData { get; set; }

        [JsonProperty("error-codes")]
        public string[] ErrorCodes { get; set; }
    }

    public class CloudflareTurnstileValidationResult
    {
        public bool Success { get; set; }

        public string Hostname { get; set; }

        public string Action { get; set; }

        public string ErrorCode { get; set; }

        public string[] CloudflareErrorCodes { get; set; }
    }
}