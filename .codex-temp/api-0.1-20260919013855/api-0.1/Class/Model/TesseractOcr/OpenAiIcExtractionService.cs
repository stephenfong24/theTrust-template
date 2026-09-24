using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Configuration;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication
{
    public class OpenAiIcExtractionService
    {
        // Maximum uploaded image size: 5 MB
        private const int MaxImageSizeBytes = 5 * 1024 * 1024;

        private static readonly HttpClient httpClient =
            new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(90)
            };

        private readonly string apiKey;
        private readonly string apiUrl;
        private readonly string model;
        private readonly OpenAiUsageCostService
            usageCostService =
                new OpenAiUsageCostService();

        private readonly OpenAiRequestLogService
            requestLogService =
                new OpenAiRequestLogService();

        public OpenAiIcExtractionService()
        {
            apiKey = ConfigurationManager.AppSettings["OpenAI.ApiKey"];
            apiUrl = ConfigurationManager.AppSettings["OpenAI.ApiUrl"];
            model = ConfigurationManager.AppSettings["OpenAI.Model"];

            if (string.IsNullOrWhiteSpace(apiKey))
                throw new ConfigurationErrorsException(
                    "OpenAI.ApiKey is not configured.");

            if (string.IsNullOrWhiteSpace(apiUrl))
                throw new ConfigurationErrorsException(
                    "OpenAI.ApiUrl is not configured.");

            if (string.IsNullOrWhiteSpace(model))
                throw new ConfigurationErrorsException(
                    "OpenAI.Model is not configured.");
        }

        public async Task<MalaysiaIcOcrResult> ExtractMalaysiaIcAsync(byte[] imageBytes, string contentType, string source, long? userID, string merchantID)
        {
            if (string.IsNullOrWhiteSpace(source))
            {
                throw new ArgumentException(
                    "OpenAI extraction source is required.",
                    nameof(source));
            }

            source = source.Trim();

            if (source.Length > 100)
            {
                throw new ArgumentException(
                    "OpenAI extraction source cannot exceed 100 characters.",
                    nameof(source));
            }

            if (imageBytes == null || imageBytes.Length == 0)
            {
                throw new ArgumentException("Image data cannot be empty.");
            }

            // Validate image size BEFORE Base64 conversion
            if (imageBytes.Length > MaxImageSizeBytes)
            {
                throw new ArgumentException("Image size exceeds the maximum allowed size of 5 MB.");
            }

            if (string.IsNullOrWhiteSpace(contentType))
            {
                throw new ArgumentException("Image content type is required.");
            }

            if (!IsSupportedContentType(contentType))
            {
                throw new ArgumentException("Unsupported image content type.");
            }

            // Validate the actual file content
            if (!IsValidImageSignature(imageBytes, contentType))
            {
                throw new ArgumentException("Invalid image file. The file content does not match the specified image type.");
            }

            string base64 = Convert.ToBase64String(imageBytes);
            string imageDataUrl = "data:" + contentType + ";base64," + base64;
            object requestBody = BuildRequest(imageDataUrl);
            string requestJson = JsonConvert.SerializeObject(requestBody);

            var stopwatch = Stopwatch.StartNew();

            using (var request =
                new HttpRequestMessage(
                    HttpMethod.Post,
                    apiUrl))
            {
                request.Headers.Authorization =
                    new AuthenticationHeaderValue(
                        "Bearer",
                        apiKey);

                request.Content =
                    new StringContent(
                        requestJson,
                        Encoding.UTF8,
                        "application/json");

                try
                {
                    using (HttpResponseMessage response =
                        await httpClient.SendAsync(request))
                    {
                        string responseJson =
                            await response.Content
                                .ReadAsStringAsync();

                        stopwatch.Stop();

                        if (!response.IsSuccessStatusCode)
                        {
                            await requestLogService
                                .LogFailureAsync(
                                    "IC_EXTRACTION",
                                    source,
                                    userID,
                                    merchantID,
                                    imageBytes.Length,
                                    stopwatch.ElapsedMilliseconds,
                                    (int)response.StatusCode,
                                    "OpenAI API returned HTTP " +
                                    (int)response.StatusCode +
                                    ".");

                            throw new Exception(
                                "OpenAI API returned HTTP " +
                                (int)response.StatusCode +
                                ".");
                        }

                        JObject responseObject;

                        try
                        {
                            responseObject =
                                JObject.Parse(
                                    responseJson);
                        }
                        catch (JsonException ex)
                        {
                            await requestLogService
                                .LogFailureAsync(
                                    "IC_EXTRACTION",
                                    source,
                                    userID,
                                    merchantID,
                                    imageBytes.Length,
                                    stopwatch.ElapsedMilliseconds,
                                    (int)response.StatusCode,
                                    "Unable to parse OpenAI response.");

                            throw new Exception(
                                "Unable to parse OpenAI response.",
                                ex);
                        }

                        // =========================================================
                        // Calculate OpenAI usage/cost first.
                        //
                        // Even if parsing the IC result fails later,
                        // OpenAI may already have charged for this request.
                        // =========================================================

                        OpenAiUsageCostResult usage =
                            await usageCostService
                                .CalculateAsync(
                                    responseObject);


                        // =========================================================
                        // Parse IC extraction result
                        // =========================================================

                        MalaysiaIcOcrResult result;

                        try
                        {
                            result =
                                ParseResponse(
                                    responseObject);
                        }
                        catch
                        {
                            // OpenAI returned a response and usage may exist,
                            // but the extraction result could not be used.

                            await requestLogService
                                .LogFailureWithUsageAsync(
                                    "IC_EXTRACTION",
                                    source,
                                    userID,
                                    merchantID,
                                    imageBytes.Length,
                                    stopwatch.ElapsedMilliseconds,
                                    (int)response.StatusCode,
                                    usage,
                                    "Unable to process OpenAI extraction result.");

                            throw;
                        }


                        // =========================================================
                        // Successful OpenAI extraction
                        // =========================================================

                        await requestLogService
                            .LogSuccessAsync(
                                "IC_EXTRACTION",
                                source,
                                userID,
                                merchantID,
                                imageBytes.Length,
                                stopwatch.ElapsedMilliseconds,
                                (int)response.StatusCode,
                                usage);

                        return result;
                    }
                }
                catch
                {
                    stopwatch.Stop();

                    throw;
                }
            }
        }

        private bool IsSupportedContentType(string contentType)
        {
            return
                string.Equals(contentType, "image/jpeg", StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(contentType, "image/png", StringComparison.OrdinalIgnoreCase);
        }

        private bool IsValidImageSignature(byte[] imageBytes, string contentType)
        {
            if (imageBytes == null || imageBytes.Length == 0)
            {
                return false;
            }

            if (string.Equals(
                contentType,
                "image/jpeg",
                StringComparison.OrdinalIgnoreCase))
            {
                return IsJpeg(imageBytes);
            }

            if (string.Equals(
                contentType,
                "image/png",
                StringComparison.OrdinalIgnoreCase))
            {
                return IsPng(imageBytes);
            }

            return false;
        }

        private bool IsJpeg(byte[] imageBytes)
        {
            // JPEG starts with:
            // FF D8 FF

            if (imageBytes.Length < 3)
            {
                return false;
            }

            return
                imageBytes[0] == 0xFF &&
                imageBytes[1] == 0xD8 &&
                imageBytes[2] == 0xFF;
        }

        private bool IsPng(byte[] imageBytes)
        {
            // PNG starts with:
            // 89 50 4E 47 0D 0A 1A 0A

            if (imageBytes.Length < 8)
            {
                return false;
            }

            return
                imageBytes[0] == 0x89 &&
                imageBytes[1] == 0x50 &&
                imageBytes[2] == 0x4E &&
                imageBytes[3] == 0x47 &&
                imageBytes[4] == 0x0D &&
                imageBytes[5] == 0x0A &&
                imageBytes[6] == 0x1A &&
                imageBytes[7] == 0x0A;
        }

        private object BuildRequest(string imageDataUrl)
        {
            string instructions =
@"You are an identity document extraction system
specialized in Malaysian identity cards.

Analyze the uploaded image.

The image is expected to contain a Malaysian
identity card (MyKad / Malaysian NRIC).

Extract only information that is clearly visible
and supported by the image.

Required fields:

- IC Number
- Full Name
- Postcode
- City
- State
- Address Line 1
- Address Line 2

VALIDATION RULES:

1. Determine whether the image actually appears
   to contain a Malaysian identity card.

2. Do not classify an arbitrary document as a
   Malaysian identity card simply because it
   contains a 12 digit number.

3. A Malaysian NRIC normally contains 12 digits
   and is commonly displayed as:

   YYMMDD-SS-NNNN

4. Return the IC number as exactly 12 digits,
   without spaces or hyphens.

5. Never invent, autocomplete or guess an
   IC number.

6. Never infer unreadable digits from context.

7. If one or more IC digits cannot be read
   reliably, return null for ICNumber.Value.

8. Preserve the person's full name as represented
   on the card.

9. Never invent missing parts of a person's name.

10. Malaysian postcode should contain exactly
    5 digits when reliably visible.

11. Extract city separately from the address.

12. Extract state separately from the address.

13. Normalize Malaysian state names to their
    standard name when the state is clearly
    identifiable.

14. Split the remaining street/building address
    logically between Address1 and Address2.

15. Do not repeat postcode, city or state inside
    Address1 or Address2 when those components
    can be separately identified.

16. Address2 may be null when there is no second
    address line.

17. If a field cannot be reliably read from the
    image, return null for Value.

18. Every extracted field must have a Confidence
    value between 0 and 1.

19. Confidence represents your estimated
    extraction certainty for that exact value.

20. If Value is null, Confidence must be 0.

21. Do not increase confidence merely because
    a value appears plausible.

22. Do not use outside knowledge to reconstruct
    personal information that cannot be read
    from the image.

23. Set IsValidIC to false if the image clearly
    is not a Malaysian identity card.

24. Set DocumentType to MALAYSIA_NRIC when the
    document is identified as a Malaysian MyKad.

25. Return only the requested structured output.";

            return new
            {
                model = model,
                // Do not store the Response object
                // for later retrieval.
                store = false,
                instructions = instructions,
                input = new object[]
                {
                    new
                    {
                        role = "user",
                        content = new object[]
                        {
                            new
                            {
                                type = "input_text",
                                text =
                                    "Extract the Malaysian identity " +
                                    "card information from this image."
                            },
                            new
                            {
                                type = "input_image",
                                image_url = imageDataUrl,
                                detail = "high"
                            }
                        }
                    }
                },
                text = new
                {
                    format = new
                    {
                        type = "json_schema",
                        name = "malaysia_ic_extraction",
                        strict = true,
                        schema = BuildJsonSchema()
                    }
                }
            };
        }

        private object BuildJsonSchema()
        {
            var fieldSchema =
                new
                {
                    type = "object",
                    properties = new
                    {
                        Value = new
                        {
                            type =
                                new[]
                                {
                                    "string",
                                    "null"
                                }
                        },
                        Confidence = new
                        {
                            type = "number",
                            minimum = 0,
                            maximum = 1
                        }
                    },
                    required =
                        new[]
                        {
                            "Value",
                            "Confidence"
                        },
                    additionalProperties = false
                };

            return new
            {
                type = "object",
                properties = new
                {
                    IsValidIC =
                        new
                        {
                            type = "boolean"
                        },
                    DocumentType =
                        new
                        {
                            type =
                                new[]
                                {
                                    "string",
                                    "null"
                                }
                        },
                    ICNumber = fieldSchema,
                    Name = fieldSchema,
                    Postcode = fieldSchema,
                    City = fieldSchema,
                    State = fieldSchema,
                    Address1 = fieldSchema,
                    Address2 = fieldSchema
                },

                required =
                    new[]
                    {
                        "IsValidIC",
                        "DocumentType",
                        "ICNumber",
                        "Name",
                        "Postcode",
                        "City",
                        "State",
                        "Address1",
                        "Address2"
                    },

                additionalProperties = false
            };
        }

        private MalaysiaIcOcrResult ParseResponse(JObject response)
        {
            if (response == null)
            {
                throw new Exception(
                    "OpenAI returned an empty response.");
            }

            string status = response["status"]?.ToString();

            if (!string.Equals(status, "completed", StringComparison.OrdinalIgnoreCase))
            {
                throw new Exception("OpenAI response was not completed.");
            }

            JArray output = response["output"] as JArray;

            if (output == null)
            {
                throw new Exception("OpenAI response does not contain output.");
            }

            string resultJson = null;

            foreach (JToken outputItem in output)
            {
                if (!string.Equals(outputItem["type"]?.ToString(), "message", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                JArray content = outputItem["content"] as JArray;

                if (content == null)
                    continue;

                foreach (JToken contentItem in content)
                {
                    string type = contentItem["type"]?.ToString();

                    if (string.Equals(type, "output_text", StringComparison.OrdinalIgnoreCase))
                    {
                        resultJson = contentItem["text"]?.ToString();
                        break;
                    }

                    if (string.Equals(type, "refusal", StringComparison.OrdinalIgnoreCase))
                    {
                        throw new Exception("OpenAI refused to process " + "the identity document.");
                    }
                }

                if (!string.IsNullOrWhiteSpace(resultJson))
                {
                    break;
                }
            }

            if (string.IsNullOrWhiteSpace(resultJson))
            {
                throw new Exception("OpenAI did not return structured " + "identity card information.");
            }

            MalaysiaIcOcrResult result;

            try
            {
                result = JsonConvert.DeserializeObject<MalaysiaIcOcrResult>(resultJson);
            }
            catch (JsonException ex)
            {
                throw new Exception("Unable to deserialize OpenAI " + "identity card result.", ex);
            }

            if (result == null)
            {
                throw new Exception("OpenAI returned an invalid " + "identity card result.");
            }

            NormalizeConfidence(result);

            return result;
        }

        private void NormalizeConfidence(MalaysiaIcOcrResult result)
        {
            NormalizeField(result.ICNumber);
            NormalizeField(result.Name);
            NormalizeField(result.Postcode);
            NormalizeField(result.City);
            NormalizeField(result.State);
            NormalizeField(result.Address1);
            NormalizeField(result.Address2);
        }

        private void NormalizeField(OcrFieldResult field)
        {
            if (field == null)
                return;

            if (string.IsNullOrWhiteSpace(field.Value))
            {
                field.Value = null;
                field.Confidence = 0;
                return;
            }

            field.Value = field.Value.Trim();

            if (field.Confidence < 0)
                field.Confidence = 0;

            if (field.Confidence > 1)
                field.Confidence = 1;
        }
    }
}