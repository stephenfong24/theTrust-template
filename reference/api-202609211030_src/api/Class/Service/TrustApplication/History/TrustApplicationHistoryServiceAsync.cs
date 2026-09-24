using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.TrustApplication;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.History
{
    public class TrustApplicationHistoryServiceAsync
    {
        private const string Code = "GET-TRUST-APPLICATION-HISTORY";

        public async Task<List<TrustApplicationHistoryResult>> GetHistoryAsync(string merchantId, long userId, string roleCode, long trustId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                // =====================================================
                // Get Trust Application
                // =====================================================

                var application = await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                if (application == null)
                {
                    throw new BusinessException("Trust application not found.", Code);
                }

                // =====================================================
                // Access Control
                //
                // AG:
                // Own Trust Application only
                //
                // Internal:
                // SA / AD / OP / AC
                // =====================================================

                if (string.Equals(roleCode, "AG", StringComparison.OrdinalIgnoreCase))
                {
                    if (application.MemberID != userId)
                    {
                        throw new BusinessException("You are not allowed to view this Trust Application history.", Code);
                    }
                }
                else if (
                    !string.Equals(roleCode, "SA", StringComparison.OrdinalIgnoreCase)
                    &&
                    !string.Equals(roleCode, "AD", StringComparison.OrdinalIgnoreCase)
                    &&
                    !string.Equals(roleCode, "OP", StringComparison.OrdinalIgnoreCase)
                    &&
                    !string.Equals(roleCode, "AC", StringComparison.OrdinalIgnoreCase))
                {
                    throw new BusinessException("You are not allowed to view this Trust Application history.", Code);
                }

                // =====================================================
                // Get History
                // =====================================================

                var histories =
                    await (
                        from h in db.tbl_TrustApplication_History
                        join m in db.tbl_MemberInfo on h.CreatedBy equals m.RowID into memberJoin
                        from m in memberJoin.DefaultIfEmpty()
                        where h.TrustApplicationID == application.RowID
                        orderby h.CreatedAt descending, h.RowID descending
                        select new TrustApplicationHistoryResult
                        {
                            RowID = h.RowID,
                            EventCode = h.EventCode,
                            EventTitle = h.EventTitle,
                            EventDescription = h.EventDescription,
                            ReferenceType = h.ReferenceType,
                            ReferenceID = h.ReferenceID,
                            OldStatus = h.OldStatus,
                            NewStatus = h.NewStatus,
                            CreatedAt = h.CreatedAt,
                            CreatedBy = h.CreatedBy,
                            CreatedByName = m != null ? m.Fullname : null
                        })
                        .ToListAsync();

                return histories;
            }
        }

        public async Task<List<TrustApplicationHistoryResult>> GetHistoryAsync(Sandbox_BasedEntities db, long trustApplicationId)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            var histories =
                await (
                    from h in db.tbl_TrustApplication_History
                    join m in db.tbl_MemberInfo on h.CreatedBy equals m.RowID into memberJoin
                    from m in memberJoin.DefaultIfEmpty()
                    where h.TrustApplicationID == trustApplicationId
                    orderby h.CreatedAt descending, h.RowID descending
                    select new TrustApplicationHistoryResult
                    {
                        RowID = h.RowID,
                        EventCode = h.EventCode,
                        EventTitle = h.EventTitle,
                        EventDescription = h.EventDescription,
                        ReferenceType = h.ReferenceType,
                        ReferenceID = h.ReferenceID,
                        OldStatus = h.OldStatus,
                        NewStatus = h.NewStatus,
                        CreatedAt = h.CreatedAt,
                        CreatedBy = h.CreatedBy,
                        CreatedByName = m != null ? m.Fullname : null
                    })
                    .ToListAsync();

            return histories;
        }
    }
}