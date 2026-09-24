using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.TrustPlan;
using API_CPX.Class.Service.TrustApplication.Dividend.Provider;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Dividend
{
    public class TrustApplicationDividendScheduleServiceAsync
    {
        private const string Code = "TRUST-APPLICATION-DIVIDEND-SCHEDULE";

        // ============================================================
        // Generate Dividend Schedule
        // ============================================================

        public async Task GenerateAsync(Sandbox_BasedEntities db, tbl_TrustApplication application, TrustPlanDetailsResponse plan, long userId, DateTime completedAt)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            if (application == null)
            {
                throw new ArgumentNullException(nameof(application));
            }

            if (plan == null || plan.Steps == null)
            {
                throw new BusinessException("Trust Plan Snapshot configuration is missing.", Code);
            }

            // ========================================================
            // Prevent Duplicate Schedule
            // ========================================================

            bool scheduleExists =
                db.tbl_TrustApplication_DividendSchedule.Local.Any(x => x.TrustApplicationID == application.RowID);

            if (!scheduleExists)
            {
                scheduleExists =
                    await db.tbl_TrustApplication_DividendSchedule
                        .AnyAsync(x => x.TrustApplicationID == application.RowID);
            }

            if (scheduleExists)
            {
                throw new BusinessException("Dividend Schedule has already been generated for this Trust Application.", Code);
            }

            // ========================================================
            // Get Dividend / Return Configuration
            // ========================================================

            var dividend = plan.Steps.Step4DividendReturn;

            if (dividend == null)
            {
                throw new BusinessException("Dividend / Return configuration is missing.", Code);
            }

            if (string.IsNullOrWhiteSpace(dividend.Method))
            {
                throw new BusinessException("Dividend / Return Method is required.", Code);
            }

            // ========================================================
            // Resolve Calculation Provider
            // ========================================================

            var resolver = new TrustApplicationDividendProviderResolver();

            var provider = resolver.Resolve(dividend.Method);

            // ========================================================
            // Generate Schedule
            // ========================================================

            await provider.GenerateAsync(db, application, plan, userId, completedAt);

            // ========================================================
            // History
            // ========================================================

            TrustApplicationHistoryHelper.Add(
                db,
                application.RowID,
                "DIVIDEND_SCHEDULE_GENERATED",
                "Dividend Schedule Generated",
                "Dividend schedule was generated successfully.",
                userId,
                "DIVIDEND_SCHEDULE",
                application.RowID);
        }
    }
}