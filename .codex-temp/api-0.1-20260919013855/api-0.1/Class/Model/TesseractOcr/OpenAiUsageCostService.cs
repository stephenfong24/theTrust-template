using API_CPX.Context;
using Newtonsoft.Json.Linq;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication
{
    public class OpenAiUsageCostService
    {
        public async Task<OpenAiUsageCostResult> CalculateAsync(
            JObject response)
        {
            if (response == null)
                throw new ArgumentNullException(nameof(response));

            string responseID =
                response["id"]?.ToString();

            string returnedModel =
                response["model"]?.ToString();

            JObject usage =
                response["usage"] as JObject;

            if (usage == null)
            {
                return new OpenAiUsageCostResult
                {
                    ResponseID = responseID,
                    Model = returnedModel,
                    CostCalculated = false
                };
            }

            int inputTokens =
                usage["input_tokens"]?.Value<int?>() ?? 0;

            int cachedInputTokens =
                usage["input_tokens_details"]?["cached_tokens"]
                    ?.Value<int?>() ?? 0;

            int outputTokens =
                usage["output_tokens"]?.Value<int?>() ?? 0;

            int reasoningTokens =
                usage["output_tokens_details"]?["reasoning_tokens"]
                    ?.Value<int?>() ?? 0;

            int totalTokens =
                usage["total_tokens"]?.Value<int?>() ?? 0;

            if (cachedInputTokens > inputTokens)
            {
                cachedInputTokens = inputTokens;
            }

            var result = new OpenAiUsageCostResult
            {
                ResponseID = responseID,

                Model = returnedModel,

                InputTokens = inputTokens,
                CachedInputTokens = cachedInputTokens,
                OutputTokens = outputTokens,
                ReasoningTokens = reasoningTokens,
                TotalTokens = totalTokens,

                CostCalculated = false
            };

            if (string.IsNullOrWhiteSpace(returnedModel))
            {
                return result;
            }

            using (var db = new Sandbox_BasedEntities())
            {
                DateTime now = DateTime.Now;

                var pricing =
                    await db.tbl_OpenAiModelPricing
                        .Where(x =>
                            x.Model == returnedModel &&
                            x.IsActive &&
                            x.EffectiveFrom <= now &&
                            (
                                x.EffectiveTo == null ||
                                x.EffectiveTo > now
                            ))
                        .OrderByDescending(
                            x => x.EffectiveFrom)
                        .FirstOrDefaultAsync();

                // IMPORTANT:
                // Missing pricing must NOT break OCR.
                if (pricing == null)
                {
                    return result;
                }

                int normalInputTokens =
                    inputTokens - cachedInputTokens;

                decimal inputCost =
                    (normalInputTokens / 1000000m) *
                    pricing.InputPricePerMillion;

                decimal cachedInputCost =
                    (cachedInputTokens / 1000000m) *
                    pricing.CachedInputPricePerMillion;

                decimal outputCost =
                    (outputTokens / 1000000m) *
                    pricing.OutputPricePerMillion;

                decimal totalCost =
                    inputCost +
                    cachedInputCost +
                    outputCost;

                result.InputPricePerMillion =
                    pricing.InputPricePerMillion;

                result.CachedInputPricePerMillion =
                    pricing.CachedInputPricePerMillion;

                result.OutputPricePerMillion =
                    pricing.OutputPricePerMillion;

                result.InputCostUSD =
                    inputCost;

                result.CachedInputCostUSD =
                    cachedInputCost;

                result.OutputCostUSD =
                    outputCost;

                result.TotalCostUSD =
                    totalCost;

                result.CostCalculated = true;

                return result;
            }
        }
    }
}