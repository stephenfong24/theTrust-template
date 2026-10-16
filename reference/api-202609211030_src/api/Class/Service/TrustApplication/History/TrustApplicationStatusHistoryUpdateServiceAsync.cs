
using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.TrustApplication;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.History
{
    public class TrustApplicationStatusHistoryUpdateServiceAsync
    {
        private const string Code =
            "UPDATE-TRUST-APPLICATION-STATUS-HISTORY";

        public async Task<object> UpdateAsync(
            string merchantId,
            long userId,
            string roleCode,
            long trustId,
            long historyRowId,
            TrustApplicationStatusHistoryUpdateRequest request)
        {
            if (roleCode != "SA" && roleCode != "AD")
            {
                throw new BusinessException(
                    "You are not allowed to edit status history.",
                    Code);
            }

            if (request == null || !request.ChangedAt.HasValue)
            {
                throw new BusinessException(
                    "ChangedAt is required.",
                    Code);
            }

            if (request.ChangedAt.Value < new DateTime(1753, 1, 1) ||
                request.ChangedAt.Value > new DateTime(9999, 12, 31, 23, 59, 59))
            {
                throw new BusinessException(
                    "ChangedAt is outside the supported SQL datetime range.",
                    Code);
            }

            if (request.Remark != null && request.Remark.Length > 500)
            {
                throw new BusinessException(
                    "Remark cannot exceed 500 characters.",
                    Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                var application =
                    await db.tbl_TrustApplication.FirstOrDefaultAsync(
                        x => x.MerchantID == merchantId &&
                             x.TrustID == trustId);

                if (application == null)
                {
                    throw new BusinessException(
                        "Trust application not found.",
                        Code);
                }

                var history =
                    await db.tbl_TrustApplication_StatusHistory
                        .FirstOrDefaultAsync(x =>
                            x.RowID == historyRowId &&
                            x.TrustApplicationID == application.RowID);

                if (history == null)
                {
                    throw new BusinessException(
                        "Status history record not found.",
                        Code);
                }


                bool isCompletedStatus = string.Equals(
                    history.NewStatus,
                    "COMPLETED",
                    StringComparison.OrdinalIgnoreCase);

                if (isCompletedStatus &&
                    history.ChangedAt != request.ChangedAt.Value)
                {
                    throw new BusinessException(
                        "The ChangedAt date cannot be modified for COMPLETED status.",
                        Code);
                }

                history.Remark = request.Remark;

                if (!isCompletedStatus)
                {
                    history.ChangedAt = request.ChangedAt.Value;
                }

                await db.SaveChangesAsync();


                await db.SaveChangesAsync();

                return new
                {
                    history.RowID,
                    history.TrustApplicationID,
                    history.PreviousStatus,
                    history.NewStatus,
                    history.Remark,
                    history.ChangedAt,
                    history.ChangedBy
                };
            }
        }
    }
}
