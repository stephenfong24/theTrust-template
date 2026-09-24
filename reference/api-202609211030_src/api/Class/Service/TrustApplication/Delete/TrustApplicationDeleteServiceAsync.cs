using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Context;
using System;
using System.Data;
using System.Data.Entity;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Delete
{
    public class TrustApplicationDeleteServiceAsync
    {
        private const string Code = "DELETE-DRAFT-TRUST-APPLICATION";

        public async Task DeleteAsync(string merchantId, long userId, string roleCode, long trustId)
        {
            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction(IsolationLevel.Serializable))
            {
                try
                {
                    // =====================================================
                    // Get Application
                    // =====================================================

                    var application = await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                    if (application == null)
                    {
                        throw new BusinessException("Trust Application not found.", Code);
                    }

                    // =====================================================
                    // Already Deleted
                    // =====================================================

                    if (string.Equals(application.ApplicationStatus, "DELETED", StringComparison.OrdinalIgnoreCase))
                    {
                        throw new BusinessException("Trust Application has already been deleted.", Code);
                    }

                    // =====================================================
                    // Only DRAFT can be deleted
                    // =====================================================

                    if (!string.Equals(application.ApplicationStatus, "DRAFT", StringComparison.OrdinalIgnoreCase))
                    {
                        throw new BusinessException("Only Draft Trust Applications can be deleted.", Code);
                    }

                    // =====================================================
                    // Role / Ownership Validation
                    //
                    // AG:
                    // - Can delete own Draft only.
                    //
                    // SA / AD:
                    // - Can delete Draft applications.
                    // =====================================================

                    string normalizedRole = (roleCode ?? string.Empty).Trim().ToUpperInvariant();

                    if (normalizedRole == "AG")
                    {
                        if (application.MemberID != userId)
                        {
                            throw new BusinessException("You are not allowed to delete this Trust Application.", Code);
                        }
                    }
                    else if (normalizedRole != "SA" && normalizedRole != "AD")
                    {
                        throw new BusinessException("You are not allowed to delete this Trust Application.", Code);
                    }

                    // =====================================================
                    // Keep previous status for history
                    // =====================================================

                    string previousStatus = application.ApplicationStatus;

                    // =====================================================
                    // Soft Delete
                    // =====================================================

                    application.ApplicationStatus = "DELETED";
                    application.UpdatedAt = DateTime.Now;
                    application.UpdatedBy = userId;

                    // =====================================================
                    // Status History
                    // =====================================================

                    db.tbl_TrustApplication_StatusHistory.Add(
                        new tbl_TrustApplication_StatusHistory
                        {
                            TrustApplicationID = application.RowID,
                            PreviousStatus = previousStatus,
                            NewStatus = "DELETED",
                            Remark = "Draft Trust Application deleted.",
                            ChangedAt = DateTime.Now,
                            ChangedBy = userId
                        });

                    // =====================================================
                    // Application History
                    // =====================================================

                    TrustApplicationHistoryHelper.Add(
                        db,
                        application.RowID,
                        "APPLICATION_DELETED",
                        "Application Deleted",
                        "Draft Trust Application " + application.TrustID.ToString("D4") + " was deleted.",
                        userId,
                        "APPLICATION",
                        application.RowID,
                        previousStatus,
                        "DELETED");

                    // =====================================================
                    // Save
                    // =====================================================

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