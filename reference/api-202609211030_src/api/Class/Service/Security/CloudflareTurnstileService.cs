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
        // =========================================================
        // Cloudflare Siteverify
        // =========================================================

        private const string SiteVerifyUrl =
            "https://challenges.cloudflare.com/turnstile/v0/siteverify";

        private const int MaxTokenLength = 2048;

        // =========================================================
        // Cloudflare Official Test Secret
        //
        // Used together with development site key:
        // 1x00000000000000000000AA
        //
        // Test secret:
        // 1x0000000000000000000000000000000AA
        // =========================================================

        private const string CloudflareTestSecret =
            "1x0000000000000000000000000000000AA";

        private readonly string _secretKey;
        private readonly string _expectedHostname;

        // =========================================================
        // Constructor
        // =========================================================

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

            // Hostname is required for real staging/production
            // credentials.
            //
            // The official Cloudflare test credentials return
            // test metadata, so hostname validation is not used
            // for the test secret.
            if (!IsUsingCloudflareTestSecret() &&
                string.IsNullOrWhiteSpace(_expectedHostname))
            {
                throw new InvalidOperationException(
                    "Cloudflare Turnstile hostname is not configured.");
            }
        }

        // =========================================================
        // Validate Turnstile Token
        // =========================================================

        public async Task<CloudflareTurnstileValidationResult>
            ValidateAsync(
                string token,
                string expectedAction,
                string remoteIp = null)
        {
            // =====================================================
            // Basic Validation
            // =====================================================

            if (string.IsNullOrWhiteSpace(token))
            {
                return Failed(
                    "MISSING_TOKEN");
            }

            if (token.Length > MaxTokenLength)
            {
                return Failed(
                    "INVALID_TOKEN_LENGTH");
            }

            if (string.IsNullOrWhiteSpace(expectedAction))
            {
                return Failed(
                    "INVALID_ACTION");
            }

            // =====================================================
            // Call Cloudflare Siteverify
            // =====================================================

            CloudflareTurnstileSiteVerifyResponse verifyResponse;

            try
            {
                using (var client = new HttpClient())
                {
                    client.Timeout =
                        TimeSpan.FromSeconds(10);

                    var values =
                        new Dictionary<string, string>
                        {
                            {
                                "secret",
                                _secretKey
                            },
                            {
                                "response",
                                token
                            }
                        };

                    // remoteip is optional.
                    //
                    // Only include it when the caller has supplied
                    // a trusted client IP address.
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

            // =====================================================
            // Validate Cloudflare Response
            // =====================================================

            if (verifyResponse == null)
            {
                return Failed(
                    "INVALID_SITEVERIFY_RESPONSE");
            }

            // =====================================================
            // Cloudflare Must Accept The Token
            // =====================================================

            if (!verifyResponse.Success)
            {
                return Failed(
                    "TURNSTILE_FAILED",
                    verifyResponse);
            }

            // =====================================================
            // DEVELOPMENT / TESTING
            //
            // When the official Cloudflare always-pass test secret
            // is configured, Siteverify has already confirmed
            // success.
            //
            // Cloudflare test credentials return test metadata
            // rather than the production hostname/action metadata.
            //
            // Therefore:
            //
            // 1. Siteverify is STILL called.
            // 2. success MUST still be true.
            // 3. Hostname/action comparison is skipped only when
            //    using Cloudflare's official test secret.
            //
            // This allows:
            //
            // http://localhost:5173/login
            //
            // to work correctly during development.
            // =====================================================

            if (IsUsingCloudflareTestSecret())
            {
                return Success(
                    verifyResponse);
            }

            // =====================================================
            // STAGING / PRODUCTION
            // Validate React Hostname
            // =====================================================

            if (!string.Equals(
                verifyResponse.Hostname,
                _expectedHostname,
                StringComparison.OrdinalIgnoreCase))
            {
                return Failed(
                    "INVALID_HOSTNAME",
                    verifyResponse);
            }

            // =====================================================
            // STAGING / PRODUCTION
            // Validate Turnstile Action
            // =====================================================

            if (!string.Equals(
                verifyResponse.Action,
                expectedAction,
                StringComparison.Ordinal))
            {
                return Failed(
                    "INVALID_ACTION",
                    verifyResponse);
            }

            // =====================================================
            // Valid
            // =====================================================

            return Success(
                verifyResponse);
        }

        // =========================================================
        // Is Using Official Cloudflare Test Secret
        // =========================================================

        private bool IsUsingCloudflareTestSecret()
        {
            return string.Equals(
                _secretKey,
                CloudflareTestSecret,
                StringComparison.Ordinal);
        }

        // =========================================================
        // Success Result
        // =========================================================

        private static CloudflareTurnstileValidationResult
            Success(
                CloudflareTurnstileSiteVerifyResponse response)
        {
            return new CloudflareTurnstileValidationResult
            {
                Success = true,

                Hostname =
                    response != null
                        ? response.Hostname
                        : null,

                Action =
                    response != null
                        ? response.Action
                        : null,

                CloudflareErrorCodes =
                    response != null
                        ? response.ErrorCodes
                        : null
            };
        }

        // =========================================================
        // Failed Result
        // No Cloudflare response available
        // =========================================================

        private static CloudflareTurnstileValidationResult
            Failed(
                string errorCode)
        {
            return new CloudflareTurnstileValidationResult
            {
                Success = false,
                ErrorCode = errorCode
            };
        }

        // =========================================================
        // Failed Result
        // Preserve Cloudflare response for internal logging
        // =========================================================

        private static CloudflareTurnstileValidationResult
            Failed(
                string errorCode,
                CloudflareTurnstileSiteVerifyResponse response)
        {
            return new CloudflareTurnstileValidationResult
            {
                Success = false,

                ErrorCode =
                    errorCode,

                Hostname =
                    response != null
                        ? response.Hostname
                        : null,

                Action =
                    response != null
                        ? response.Action
                        : null,

                CloudflareErrorCodes =
                    response != null
                        ? response.ErrorCodes
                        : null
            };
        }
    }

    // =============================================================
    // Cloudflare Siteverify API Response
    // =============================================================

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

    // =============================================================
    // Internal Validation Result
    // =============================================================

    public class CloudflareTurnstileValidationResult
    {
        public bool Success { get; set; }

        public string Hostname { get; set; }

        public string Action { get; set; }

        public string ErrorCode { get; set; }

        public string[] CloudflareErrorCodes { get; set; }
    }
}