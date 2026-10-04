using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class OpenAiRequestLogListAsync
    {
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }

        public async Task<IEnumerable<OpenAiRequestLogList>>
            GetOpenAiRequestLogListAsync(
                string merchantId,
                int page,
                int pageSize,
                string search = null,
                string requestType = null,
                string source = null,
                string model = null,
                bool? isSuccess = null,
                bool? costCalculated = null,
                DateTime? dateFrom = null,
                DateTime? dateTo = null)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                if (page <= 0)
                    page = 1;

                if (pageSize <= 0)
                    pageSize = 10;

                if (pageSize > 100)
                    pageSize = 100;

                var query =
                    from log in dbR.tbl_OpenAiRequestLog

                    join member in dbR.tbl_MemberInfo
                        on log.UserID equals member.RowID
                        into memberJoin

                    from member in memberJoin.DefaultIfEmpty()

                    where log.MerchantID == merchantId

                    select new
                    {
                        log.RowID,
                        log.RequestType,
                        log.Source,
                        log.UserID,
                        log.MerchantID,

                        MemberName = member.Fullname,
                        MemberUsername = member.Username,
                        MemberEmail = member.Email,

                        log.OpenAiResponseID,
                        log.Model,

                        log.InputTokens,
                        log.CachedInputTokens,
                        log.OutputTokens,
                        log.ReasoningTokens,
                        log.TotalTokens,

                        log.InputPricePerMillion,
                        log.CachedInputPricePerMillion,
                        log.OutputPricePerMillion,

                        log.InputCostUSD,
                        log.CachedInputCostUSD,
                        log.OutputCostUSD,
                        log.TotalCostUSD,

                        log.CostCalculated,

                        log.ImageSizeBytes,
                        log.DurationMs,
                        log.HttpStatusCode,
                        log.IsSuccess,
                        log.ErrorMessage,
                        log.CreatedAt
                    };

                // ============================================================
                // SEARCH
                // ============================================================

                if (!string.IsNullOrWhiteSpace(search))
                {
                    search = search.Trim();

                    query = query.Where(x =>
                        x.RequestType.Contains(search) ||
                        x.Source.Contains(search) ||
                        x.Model.Contains(search) ||
                        x.OpenAiResponseID.Contains(search) ||
                        x.MemberName.Contains(search) ||
                        x.MemberUsername.Contains(search) ||
                        x.MemberEmail.Contains(search));
                }

                // ============================================================
                // REQUEST TYPE
                // ============================================================

                if (!string.IsNullOrWhiteSpace(requestType))
                {
                    requestType = requestType.Trim();

                    query = query.Where(
                        x => x.RequestType == requestType);
                }

                // ============================================================
                // SOURCE
                // ============================================================

                if (!string.IsNullOrWhiteSpace(source))
                {
                    source = source.Trim();

                    query = query.Where(
                        x => x.Source == source);
                }

                // ============================================================
                // MODEL
                // ============================================================

                if (!string.IsNullOrWhiteSpace(model))
                {
                    model = model.Trim();

                    query = query.Where(
                        x => x.Model == model);
                }

                // ============================================================
                // SUCCESS
                // ============================================================

                if (isSuccess.HasValue)
                {
                    query = query.Where(
                        x => x.IsSuccess == isSuccess.Value);
                }

                // ============================================================
                // COST CALCULATED
                // ============================================================

                if (costCalculated.HasValue)
                {
                    query = query.Where(
                        x => x.CostCalculated == costCalculated.Value);
                }

                // ============================================================
                // DATE FROM
                // ============================================================

                if (dateFrom.HasValue)
                {
                    DateTime fromDate =
                        dateFrom.Value.Date;

                    query = query.Where(
                        x => x.CreatedAt >= fromDate);
                }

                // ============================================================
                // DATE TO
                // Include entire selected day
                // ============================================================

                if (dateTo.HasValue)
                {
                    DateTime nextDate =
                        dateTo.Value.Date.AddDays(1);

                    query = query.Where(
                        x => x.CreatedAt < nextDate);
                }

                // ============================================================
                // COUNT
                // ============================================================

                TotalRecords =
                    await query.CountAsync();

                TotalPages =
                    (int)Math.Ceiling(
                        (decimal)TotalRecords / pageSize);

                // ============================================================
                // PAGINATION
                // ============================================================

                var result =
                    await query
                        .OrderByDescending(
                            x => x.CreatedAt)
                        .ThenByDescending(
                            x => x.RowID)
                        .Skip(
                            (page - 1) * pageSize)
                        .Take(pageSize)
                        .ToListAsync();

                // ============================================================
                // RESULT
                // ============================================================

                return result
                    .Select((x, index) =>
                        new OpenAiRequestLogList
                        {
                            Id = ((page - 1) * pageSize) + index + 1,
                            RowID = x.RowID,
                            RequestType = x.RequestType,
                            Source = x.Source,
                            UserID = x.UserID,
                            MerchantID = x.MerchantID,
                            MemberName = x.MemberName,
                            MemberUsername = x.MemberUsername,
                            MemberEmail = x.MemberEmail,
                            OpenAiResponseID = x.OpenAiResponseID,
                            Model = x.Model,
                            InputTokens = x.InputTokens,
                            CachedInputTokens = x.CachedInputTokens,
                            OutputTokens = x.OutputTokens,
                            ReasoningTokens = x.ReasoningTokens,
                            TotalTokens = x.TotalTokens,
                            InputPricePerMillion = x.InputPricePerMillion,
                            CachedInputPricePerMillion = x.CachedInputPricePerMillion,
                            OutputPricePerMillion = x.OutputPricePerMillion,
                            InputCostUSD = x.InputCostUSD,
                            CachedInputCostUSD = x.CachedInputCostUSD,
                            OutputCostUSD = x.OutputCostUSD,
                            TotalCostUSD = x.TotalCostUSD,
                            CostCalculated = x.CostCalculated,
                            ImageSizeBytes = x.ImageSizeBytes,
                            ImageSizeDisplay = FormatFileSize(x.ImageSizeBytes),
                            DurationMs = x.DurationMs,
                            DurationDisplay = FormatDuration(x.DurationMs),
                            HttpStatusCode = x.HttpStatusCode,
                            IsSuccess = x.IsSuccess,
                            ErrorMessage = x.ErrorMessage,
                            CreatedAt = x.CreatedAt
                        })
                    .ToList();
            }
        }

        private string FormatFileSize(int? sizeBytes)
        {
            if (!sizeBytes.HasValue)
                return "-";

            double size = sizeBytes.Value;

            if (size < 1024)
                return size.ToString("0") + " B";

            if (size < 1024 * 1024)
                return (size / 1024).ToString("0.00") + " KB";

            return (size / (1024 * 1024)).ToString("0.00") + " MB";
        }


        private string FormatDuration(long? durationMs)
        {
            if (!durationMs.HasValue)
                return "-";

            if (durationMs.Value < 1000)
            {
                return durationMs.Value + " ms";
            }

            return (durationMs.Value / 1000m).ToString("0.00") + " sec";
        }


        public class OpenAiRequestLogList
        {
            public long Id { get; set; }
            public long RowID { get; set; }
            public string RequestType { get; set; }
            public string Source { get; set; }
            public long? UserID { get; set; }
            public string MerchantID { get; set; }

            // User

            public string MemberName { get; set; }
            public string MemberUsername { get; set; }
            public string MemberEmail { get; set; }

            // OpenAI

            public string OpenAiResponseID { get; set; }
            public string Model { get; set; }

            // Token usage

            public int? InputTokens { get; set; }
            public int? CachedInputTokens { get; set; }
            public int? OutputTokens { get; set; }
            public int? ReasoningTokens { get; set; }
            public int? TotalTokens { get; set; }

            // Pricing

            public decimal? InputPricePerMillion { get; set; }
            public decimal? CachedInputPricePerMillion { get; set; }
            public decimal? OutputPricePerMillion { get; set; }

            // Cost

            public decimal? InputCostUSD { get; set; }
            public decimal? CachedInputCostUSD { get; set; }
            public decimal? OutputCostUSD { get; set; }
            public decimal? TotalCostUSD { get; set; }
            public bool CostCalculated { get; set; }

            // Request

            public int? ImageSizeBytes { get; set; }
            public string ImageSizeDisplay { get; set; }
            public long? DurationMs { get; set; }
            public string DurationDisplay { get; set; }
            public int? HttpStatusCode { get; set; }
            public bool IsSuccess { get; set; }
            public string ErrorMessage { get; set; }
            public DateTime CreatedAt { get; set; }
        }
    }
}