using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Context;
using System;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Snapshot
{
    public class TrustApplicationPlanSnapshotRefreshServiceAsync
    {
        private const string Code =
            "REFRESH-TRUST-APPLICATION-PLAN-SNAPSHOT";

        private readonly TrustApplicationCommonService commonService;

        public TrustApplicationPlanSnapshotRefreshServiceAsync()
        {
            commonService =
                new TrustApplicationCommonService();
        }

        public async Task RefreshAsync(
            string merchantId,
            long userId,
            string roleCode,
            long trustId)
        {
            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction())
            {
                try
                {
                    var application =
                        await commonService.GetApplicationAsync(
                            db,
                            merchantId,
                            trustId);

                    // =================================================
                    // Permission
                    // Recommend SA / AD only
                    // =================================================

                    if (!commonService.IsAdmin(roleCode))
                    {
                        throw new BusinessException(
                            "You are not allowed to refresh the Trust Plan Snapshot.",
                            Code);
                    }

                    // =================================================
                    // Status
                    // =================================================

                    if (!string.Equals(
                        application.ApplicationStatus,
                        "COMPLETED",
                        StringComparison.OrdinalIgnoreCase))
                    {
                        throw new BusinessException(
                            "Trust Application must be in COMPLETED status.",
                            Code);
                    }

                    var snapshotService =
                        new TrustApplicationPlanSnapshotServiceAsync();

                    await snapshotService.RefreshSnapshotAsync(
                        db,
                        application,
                        merchantId,
                        userId);

                    TrustApplicationHistoryHelper.Add(
                        db,
                        application.RowID,
                        "PLAN_SNAPSHOT_REFRESHED",
                        "Trust Plan Snapshot Refreshed",
                        "Trust Plan snapshot was refreshed using the current Trust Plan configuration.",
                        userId,
                        "APPLICATION",
                        application.RowID);

                    await db.SaveChangesAsync();

                    transaction.Commit();
                }
                catch
                {
                    transaction.Rollback();
                    throw;
                }
            }
        }
    }
}