using API_CPX.Context;
using System;

namespace API_CPX.Class.Helper
{
    public static class TrustApplicationHistoryHelper
    {
        public static void Add(
            Sandbox_BasedEntities db,
            long trustApplicationId,
            string eventCode,
            string eventTitle,
            string eventDescription,
            long userId,
            string referenceType = null,
            long? referenceId = null,
            string oldStatus = null,
            string newStatus = null)
        {
            if (db == null)
                throw new ArgumentNullException(nameof(db));

            db.tbl_TrustApplication_History.Add(
                new tbl_TrustApplication_History
                {
                    TrustApplicationID = trustApplicationId,
                    EventCode = eventCode,
                    EventTitle = eventTitle,
                    EventDescription = eventDescription,
                    ReferenceType = referenceType,
                    ReferenceID = referenceId,
                    OldStatus = oldStatus,
                    NewStatus = newStatus,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId
                });
        }
    }
}