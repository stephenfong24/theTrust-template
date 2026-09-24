using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO.TrustApplication;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Dividend;
using API_CPX.Class.Service.TrustApplication.Document;
using API_CPX.Class.Service.TrustApplication.Snapshot;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Workflow
{
    public class TrustApplicationWorkflowServiceAsync
    {
        private const string Code = "TRUST-APPLICATION-WORKFLOW";

        // ============================================================
        // PAYMENT_APPROVED -> PENDING_ADMIN_APPROVAL
        // ============================================================

        public async Task<TrustApplicationWorkflowResult> SubmitForAdminApprovalAsync(string merchantId, long userId, string roleCode, long trustId, TrustApplicationWorkflowRequest request)
        {
            if (!IsFinance(roleCode) && !IsAdmin(roleCode))
            {
                throw new BusinessException("You are not allowed to submit this Trust Application for Admin approval.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        var application = await GetApplicationAsync(db, merchantId, trustId);

                        ValidateStatus(application, "PAYMENT_APPROVED");

                        // ============================================
                        // Payment approval should already have
                        // generated these dates.
                        // ============================================

                        ValidateTrustDates(application);

                        // ============================================
                        // Status
                        // ============================================

                        string previousStatus = application.ApplicationStatus;
                        TrustApplicationStatusHelper.ChangeStatus(db, application, "PENDING_ADMIN_APPROVAL", userId, GetRemark(request, "Trust Application submitted for Admin approval."));

                        // ====================================================
                        // Create Automatic Step 2 Documents
                        // ====================================================

                        var documentService = new TrustApplicationDocumentServiceAsync();
                        var generatedDocumentIds = await documentService.CreateAutomaticDocumentsAsync(db, application, "PENDING_ADMIN_APPROVAL", userId);

                        // ============================================
                        // History
                        // ============================================

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "SUBMITTED_FOR_ADMIN_APPROVAL",
                            "Submitted for Admin Approval",
                            GetRemark(request, "Trust Application submitted for Admin approval."),
                            userId,
                            "APPLICATION",
                            application.RowID,
                            previousStatus,
                            "PENDING_ADMIN_APPROVAL");

                        // ============================================
                        // Save
                        // ============================================

                        await db.SaveChangesAsync();

                        transaction.Commit();

                        return BuildResult(application, previousStatus);
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // PENDING_ADMIN_APPROVAL -> SENT_OUT
        //
        // Admin approves application.
        // Generate final Trust documents.
        // ============================================================

        public async Task<TrustApplicationWorkflowResult> AdminApproveAsync(string merchantId, long userId, string roleCode, long trustId, TrustApplicationWorkflowRequest request)
        {
            if (!IsAdmin(roleCode))
            {
                throw new BusinessException("You are not allowed to approve this Trust Application.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        var application = await GetApplicationAsync(db, merchantId, trustId);

                        ValidateStatus(application, "PENDING_ADMIN_APPROVAL");

                        // Dates must already exist from
                        // full payment approval.
                        ValidateTrustDates(application);

                        // ============================================
                        // Status
                        // ============================================

                        string previousStatus = application.ApplicationStatus;
                        TrustApplicationStatusHelper.ChangeStatus(db, application, "SENT_OUT", userId, GetRemark(request, "Trust Application approved by Admin and documents generated."));

                        // ============================================
                        // History
                        // ============================================

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "ADMIN_APPROVED",
                            "Application Approved by Admin",
                            GetRemark(request, "Trust Application approved by Admin and documents generated."),
                            userId,
                            "APPLICATION",
                            application.RowID,
                            previousStatus,
                            "SENT_OUT");

                        // ============================================
                        // Save
                        // ============================================

                        await db.SaveChangesAsync();

                        transaction.Commit();

                        return BuildResult(application, previousStatus);
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // SENT_OUT -> STAMPING
        // ============================================================

        public async Task<TrustApplicationWorkflowResult> SubmitForStampingAsync(string merchantId, long userId, string roleCode, long trustId, TrustApplicationWorkflowRequest request)
        {
            if (!IsOperation(roleCode) && !IsAdmin(roleCode))
            {
                throw new BusinessException("You are not allowed to submit this Trust Application for stamping.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        var application = await GetApplicationAsync(db, merchantId, trustId);

                        ValidateStatus(application, "SENT_OUT");

                        string previousStatus = application.ApplicationStatus;

                        TrustApplicationStatusHelper.ChangeStatus(db, application, "STAMPING", userId, GetRemark(request, "Trust Application submitted for stamping."));

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "SUBMITTED_FOR_STAMPING",
                            "Submitted for Stamping",
                            GetRemark(request, "Trust Application submitted for stamping."),
                            userId,
                            "APPLICATION",
                            application.RowID,
                            previousStatus,
                            "STAMPING");

                        await db.SaveChangesAsync();

                        transaction.Commit();

                        return BuildResult(application, previousStatus);
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // STAMPING -> COMPLETED
        // ============================================================

        public async Task<TrustApplicationWorkflowResult> CompleteAsync(string merchantId, long userId, string roleCode, long trustId, TrustApplicationWorkflowRequest request)
        {
            if (!IsOperation(roleCode) && !IsAdmin(roleCode))
            {
                throw new BusinessException("You are not allowed to complete this Trust Application.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        var application = await GetApplicationAsync(db, merchantId, trustId);

                        ValidateStatus(application, "STAMPING");

                        // ============================================
                        // Final Integrity Check
                        //
                        // We DO NOT calculate dates here.
                        // They were created during full payment
                        // approval.
                        // ============================================

                        ValidateTrustDates(application);

                        DateTime completedAt = DateTime.Now;

                        // ============================================
                        // Create Trust Plan Snapshot
                        //
                        // Freeze the exact Trust Plan configuration
                        // used when this application is completed.
                        //
                        // IMPORTANT:
                        // Future Trust Plan changes must not affect
                        // this completed Trust Application.
                        // ============================================

                        var snapshotService = new TrustApplicationPlanSnapshotServiceAsync();

                        var snapshot = await snapshotService.CreateSnapshotAsync(db, application, merchantId, userId);

                        // ============================================
                        // Read Frozen Trust Plan
                        // ============================================

                        var frozenPlan = snapshotService.DeserializeSnapshot(snapshot);

                        // ============================================
                        // Generate Dividend Schedule
                        //
                        // Current:
                        // MYTRUST
                        // INVESTMENT_PERIOD_TIER_RATE
                        //
                        // Bonus:
                        // Reserved for future implementation.
                        // ============================================

                        var dividendScheduleService = new TrustApplicationDividendScheduleServiceAsync();

                        await dividendScheduleService.GenerateAsync(db, application, frozenPlan, userId, completedAt);

                        // ============================================
                        // TODO - Future
                        //
                        // Commission payout generation
                        // Dividend payout schedule generation
                        //
                        // Add these services here when ready.
                        // ============================================

                        string previousStatus = application.ApplicationStatus;
                        TrustApplicationStatusHelper.ChangeStatus(db, application, "COMPLETED", userId, GetRemark(request, "Trust Application completed."));

                        // ============================================
                        // History
                        // ============================================

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "TRUST_COMPLETED",
                            "Trust Application Completed",
                            GetRemark(request, "Trust Application completed."),
                            userId,
                            "APPLICATION",
                            application.RowID,
                            previousStatus,
                            "COMPLETED");

                        // ============================================
                        // Generate Documents
                        // ============================================

                        var documentService = new TrustApplicationDocumentServiceAsync();
                        await documentService.CreateAutomaticDocumentsAsync(db, application, "COMPLETED", userId);

                        // ============================================
                        // Save
                        // ============================================

                        await db.SaveChangesAsync();

                        transaction.Commit();

                        return BuildResult(application, previousStatus);
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // Get Trust Application
        // ============================================================

        private async Task<tbl_TrustApplication> GetApplicationAsync(Sandbox_BasedEntities db, string merchantId, long trustId)
        {
            var application = await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

            if (application == null)
            {
                throw new BusinessException("Trust Application not found.", Code);
            }

            return application;
        }

        // ============================================================
        // Validate Application Status
        // ============================================================

        private void ValidateStatus(tbl_TrustApplication application, string requiredStatus)
        {
            if (!string.Equals(application.ApplicationStatus, requiredStatus, StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessException("Trust Application must be in " + requiredStatus + " status.", Code);
            }
        }

        // ============================================================
        // Validate Trust Dates
        //
        // These dates should already have been created during
        // full payment approval.
        // ============================================================

        private void ValidateTrustDates(tbl_TrustApplication application)
        {
            if (!application.CommencementDate.HasValue)
            {
                throw new BusinessException("Trust Application Commencement Date is missing.", Code);
            }

            if (!application.MaturityDate.HasValue)
            {
                throw new BusinessException("Trust Application Maturity Date is missing.", Code);
            }

            if (application.MaturityDate.Value.Date <= application.CommencementDate.Value.Date)
            {
                throw new BusinessException("Trust Application Maturity Date must be later than the Commencement Date.", Code);
            }
        }

        // ============================================================
        // REJECTED
        // ============================================================

        public async Task<TrustApplicationWorkflowResult> RejectAsync(string merchantId, long userId, string roleCode, long trustId, TrustApplicationWorkflowRequest request)
        {
            if (!IsAdmin(roleCode) && !IsOperation(roleCode) && !IsFinance(roleCode))
            {
                throw new BusinessException("You are not allowed to reject this Trust Application.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        var application = await GetApplicationAsync(db, merchantId, trustId);

                        // Rejection reason is mandatory.
                        if (request == null || string.IsNullOrWhiteSpace(request.Remark))
                        {
                            throw new BusinessException("Rejection reason is required.", Code);
                        }

                        string previousStatus = application.ApplicationStatus;

                        // The central helper validates whether
                        // current status -> REJECTED is allowed.
                        TrustApplicationStatusHelper.ChangeStatus(
                            db,
                            application,
                            "REJECTED",
                            userId,
                            request.Remark.Trim());

                        application.RejectedAt = DateTime.Now;
                        application.RejectedBy = userId;

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "TRUST_REJECTED",
                            "Trust Application Rejected",
                            request.Remark.Trim(),
                            userId,
                            "APPLICATION",
                            application.RowID,
                            previousStatus,
                            "REJECTED");

                        await db.SaveChangesAsync();
                        transaction.Commit();

                        return BuildResult(application, previousStatus);
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // EARLY WIDTHDRAWAL
        // ============================================================

        public async Task<TrustApplicationWorkflowResult> EarlyWithdrawAsync(string merchantId, long userId, string roleCode, long trustId, TrustApplicationWorkflowRequest request)
        {
            if (!IsAdmin(roleCode))
            {
                throw new BusinessException("You are not allowed to early withdraw this Trust Application.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        var application = await GetApplicationAsync(db, merchantId, trustId);

                        // ============================================
                        // Must currently be COMPLETED
                        // ============================================

                        ValidateStatus(application, "COMPLETED");

                        // ============================================
                        // Reason required
                        // ============================================

                        if (request == null || string.IsNullOrWhiteSpace(request.Remark))
                        {
                            throw new BusinessException("Early withdrawal reason is required.", Code);
                        }

                        // ============================================
                        // Maturity Date required
                        // ============================================

                        if (!application.MaturityDate.HasValue)
                        {
                            throw new BusinessException("Trust Application Maturity Date is missing.", Code);
                        }

                        DateTime today = DateTime.Today;

                        // ============================================
                        // Must occur BEFORE maturity
                        // ============================================

                        if (today >= application.MaturityDate.Value.Date)
                        {
                            throw new BusinessException("This Trust Application has already reached its maturity date and cannot be early withdrawn.", Code);
                        }

                        string previousStatus = application.ApplicationStatus;

                        // ============================================
                        // COMPLETED -> EARLY_WITHDRAWN
                        // ============================================

                        TrustApplicationStatusHelper.ChangeStatus(
                            db,
                            application,
                            "EARLY_WITHDRAWN",
                            userId,
                            request.Remark.Trim());

                        application.EarlyWithdrawnAt = DateTime.Now;
                        application.EarlyWithdrawnBy = userId;

                        // ============================================
                        // Application History
                        // ============================================

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "TRUST_EARLY_WITHDRAWN",
                            "Trust Application Early Withdrawn",
                            request.Remark.Trim(),
                            userId,
                            "APPLICATION",
                            application.RowID,
                            previousStatus,
                            "EARLY_WITHDRAWN");

                        await db.SaveChangesAsync();
                        transaction.Commit();

                        return BuildResult(application, previousStatus);
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // Result
        // ============================================================

        private TrustApplicationWorkflowResult BuildResult(tbl_TrustApplication application, string previousStatus)
        {
            return new TrustApplicationWorkflowResult
            {
                TrustID = application.TrustID,
                PreviousStatus = previousStatus,
                ApplicationStatus = application.ApplicationStatus,
                CommencementDate = application.CommencementDate,
                MaturityDate = application.MaturityDate,
                RejectedAt = application.RejectedAt,
                EarlyWithdrawnAt = application.EarlyWithdrawnAt,
                UpdatedAt = application.UpdatedAt
            };
        }

        // ============================================================
        // Remark
        // ============================================================

        private string GetRemark(TrustApplicationWorkflowRequest request, string defaultRemark)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Remark))
            {
                return defaultRemark;
            }

            return request.Remark.Trim();
        }

        // ============================================================
        // Admin Role
        // ============================================================

        private bool IsAdmin(string roleCode)
        {
            return
                string.Equals(
                    roleCode,
                    "SA",
                    StringComparison.OrdinalIgnoreCase) ||
                string.Equals(
                    roleCode,
                    "AD",
                    StringComparison.OrdinalIgnoreCase);
        }

        // ============================================================
        // Finance / Account Role
        // ============================================================

        private bool IsFinance(string roleCode)
        {
            return string.Equals(roleCode, "AC", StringComparison.OrdinalIgnoreCase);
        }

        // ============================================================
        // Operation Role
        // ============================================================

        private bool IsOperation(string roleCode)
        {
            return string.Equals(roleCode, "OP", StringComparison.OrdinalIgnoreCase);
        }
    }
}