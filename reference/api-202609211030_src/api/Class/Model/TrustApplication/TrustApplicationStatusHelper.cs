using API_CPX.Class.Exceptions;
using API_CPX.Context;
using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.TrustApplication
{
    public static class TrustApplicationStatusHelper
    {
        private static readonly Dictionary<string, string[]> AllowedTransitions =
            new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
            {
                {
                    "DRAFT", new[] { "PENDING_PAYMENT_APPROVAL" }
                },
                {
                    "PENDING_PAYMENT_APPROVAL", new[] { "PAYMENT_APPROVED" }
                },
                {
                    "PAYMENT_APPROVED", new[] { "PENDING_ADMIN_APPROVAL" }
                },
                {
                    "PENDING_ADMIN_APPROVAL", new[] { "SENT_OUT" }
                },
                {
                    "SENT_OUT", new[] { "STAMPING" }
                },
                {
                    "STAMPING", new[] { "COMPLETED" }
                }
            };

        public static bool ChangeStatus(Sandbox_BasedEntities db, tbl_TrustApplication application, string newStatus, long userId, string remark = null)
        {
            if (db == null)
                throw new ArgumentNullException(nameof(db));

            if (application == null)
                throw new ArgumentNullException(nameof(application));

            if (string.IsNullOrWhiteSpace(newStatus))
                throw new ArgumentException("New application status is required.", nameof(newStatus));

            string normalizedNewStatus = newStatus.Trim().ToUpperInvariant();
            string previousStatus = application.ApplicationStatus?.Trim().ToUpperInvariant();

            // ====================================================
            // No Status Change
            // ====================================================

            if (string.Equals(previousStatus, normalizedNewStatus, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            // ====================================================
            // Validate Transition
            // ====================================================

            string[] allowedStatuses;

            if (!AllowedTransitions.TryGetValue(previousStatus ?? string.Empty, out allowedStatuses))
            {
                throw new BusinessException("Current Trust Application status does not allow status changes.", "INVALID-TRUST-APPLICATION-STATUS");
            }

            bool allowed = Array.Exists(allowedStatuses, x => string.Equals(x, normalizedNewStatus, StringComparison.OrdinalIgnoreCase));

            if (!allowed)
            {
                throw new BusinessException("Invalid Trust Application status transition from " + previousStatus + " to " + normalizedNewStatus + ".", "INVALID-TRUST-APPLICATION-STATUS");
            }

            DateTime now = DateTime.Now;

            // ====================================================
            // Update Current Status
            // ====================================================

            application.ApplicationStatus = normalizedNewStatus;
            application.UpdatedAt = now;
            application.UpdatedBy = userId;

            // ====================================================
            // Status History
            // ====================================================

            db.tbl_TrustApplication_StatusHistory.Add(
                new tbl_TrustApplication_StatusHistory
                {
                    TrustApplicationID = application.RowID,
                    PreviousStatus = previousStatus,
                    NewStatus = normalizedNewStatus,
                    Remark = string.IsNullOrWhiteSpace(remark) ? null : remark.Trim(),
                    ChangedAt = now,
                    ChangedBy = userId
                });

            return true;
        }
    }
}