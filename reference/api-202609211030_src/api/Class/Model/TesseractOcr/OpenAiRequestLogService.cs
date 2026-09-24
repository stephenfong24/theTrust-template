using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Service.TrustApplication
{
    public class OpenAiRequestLogService
    {
        public async Task LogSuccessAsync(
            string requestType,
            string source,
            long? userID,
            string merchantID,
            int imageSizeBytes,
            long durationMs,
            int httpStatusCode,
            OpenAiUsageCostResult usage)
        {
            try
            {
                using (var db = new Sandbox_BasedEntities())
                {
                    var log =
                        new tbl_OpenAiRequestLog
                        {
                            RequestType = requestType,

                            Source = source,

                            UserID = userID,
                            MerchantID = merchantID,

                            OpenAiResponseID =
                                usage.ResponseID,

                            Model =
                                usage.Model,

                            InputTokens =
                                usage.InputTokens,

                            CachedInputTokens =
                                usage.CachedInputTokens,

                            OutputTokens =
                                usage.OutputTokens,

                            ReasoningTokens =
                                usage.ReasoningTokens,

                            TotalTokens =
                                usage.TotalTokens,

                            InputPricePerMillion =
                                usage.InputPricePerMillion,

                            CachedInputPricePerMillion =
                                usage.CachedInputPricePerMillion,

                            OutputPricePerMillion =
                                usage.OutputPricePerMillion,

                            InputCostUSD =
                                usage.InputCostUSD,

                            CachedInputCostUSD =
                                usage.CachedInputCostUSD,

                            OutputCostUSD =
                                usage.OutputCostUSD,

                            TotalCostUSD =
                                usage.TotalCostUSD,

                            CostCalculated =
                                usage.CostCalculated,

                            ImageSizeBytes =
                                imageSizeBytes,

                            DurationMs =
                                durationMs,

                            HttpStatusCode =
                                httpStatusCode,

                            IsSuccess =
                                true,

                            ErrorMessage =
                                null,

                            CreatedAt =
                                DateTime.Now
                        };

                    db.tbl_OpenAiRequestLog.Add(log);

                    await db.SaveChangesAsync();
                }
            }
            catch
            {
                // IMPORTANT:
                // Logging failure must never cause
                // successful IC extraction to fail.
            }
        }


        public async Task LogFailureAsync(
            string requestType,
            string source,
            long? userID,
            string merchantID,
            int imageSizeBytes,
            long durationMs,
            int? httpStatusCode,
            string errorMessage)
        {
            try
            {
                using (var db = new Sandbox_BasedEntities())
                {
                    var log =
                        new tbl_OpenAiRequestLog
                        {
                            RequestType = requestType,

                            Source = source,

                            UserID = userID,
                            MerchantID = merchantID,

                            ImageSizeBytes =
                                imageSizeBytes,

                            DurationMs =
                                durationMs,

                            HttpStatusCode =
                                httpStatusCode,

                            IsSuccess =
                                false,

                            CostCalculated =
                                false,

                            ErrorMessage =
                                errorMessage,

                            CreatedAt =
                                DateTime.Now
                        };

                    db.tbl_OpenAiRequestLog.Add(log);

                    await db.SaveChangesAsync();
                }
            }
            catch
            {
                // Do not replace the original
                // OpenAI exception with a log error.
            }
        }

        public async Task LogFailureWithUsageAsync(
            string requestType,
            string source,
            long? userID,
            string merchantID,
            int imageSizeBytes,
            long durationMs,
            int? httpStatusCode,
            OpenAiUsageCostResult usage,
            string errorMessage)
        {
            try
            {
                using (var db = new Sandbox_BasedEntities())
                {
                    var log =
                        new tbl_OpenAiRequestLog
                        {
                            RequestType = requestType,
                            Source = source,

                            UserID = userID,
                            MerchantID = merchantID,

                            OpenAiResponseID =
                                usage?.ResponseID,

                            Model =
                                usage?.Model,

                            InputTokens =
                                usage?.InputTokens,

                            CachedInputTokens =
                                usage?.CachedInputTokens,

                            OutputTokens =
                                usage?.OutputTokens,

                            ReasoningTokens =
                                usage?.ReasoningTokens,

                            TotalTokens =
                                usage?.TotalTokens,

                            InputPricePerMillion =
                                usage?.InputPricePerMillion,

                            CachedInputPricePerMillion =
                                usage?.CachedInputPricePerMillion,

                            OutputPricePerMillion =
                                usage?.OutputPricePerMillion,

                            InputCostUSD =
                                usage?.InputCostUSD,

                            CachedInputCostUSD =
                                usage?.CachedInputCostUSD,

                            OutputCostUSD =
                                usage?.OutputCostUSD,

                            TotalCostUSD =
                                usage?.TotalCostUSD,

                            CostCalculated =
                                usage?.CostCalculated ?? false,

                            ImageSizeBytes =
                                imageSizeBytes,

                            DurationMs =
                                durationMs,

                            HttpStatusCode =
                                httpStatusCode,

                            IsSuccess =
                                false,

                            ErrorMessage =
                                errorMessage,

                            CreatedAt =
                                DateTime.Now
                        };

                    db.tbl_OpenAiRequestLog.Add(log);

                    await db.SaveChangesAsync();
                }
            }
            catch
            {
                // Logging failure must never replace
                // the original OpenAI/extraction error.
            }
        }
    }
}