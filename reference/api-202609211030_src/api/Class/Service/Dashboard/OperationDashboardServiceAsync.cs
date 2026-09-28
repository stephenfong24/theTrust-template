using API_CPX.Class.Model.DTO.Dashboard;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.Dashboard
{
    public class OperationDashboardServiceAsync
    {
        public async Task<OperationDashboardResult> GetAsync(string merchantId, int year)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                var now = DateTime.Now;
                var today = DateTime.Today;

                var yearStart = new DateTime(year, 1, 1);
                var nextYearStart = yearStart.AddYears(1);
                var currentMonthStart = new DateTime(now.Year, now.Month, 1);
                var nextMonthStart = currentMonthStart.AddMonths(1);
                var next30Days = today.AddDays(30);
                var next60Days = today.AddDays(60);
                var next90Days = today.AddDays(90);

                // trust application

                var applications =
                    await db.tbl_TrustApplication
                        .Where(x => x.MerchantID == merchantId)
                        .Select(
                            x => new
                            {
                                x.RowID, x.TrustID, x.ProductCode, x.ApplicationStatus, x.CreatedAt, x.UpdatedAt, x.MaturityDate
                            })
                        .ToListAsync();

                var applicationIds = applications.Select(x => x.RowID).ToList();

                var statusHistory =
                    await db.tbl_TrustApplication_StatusHistory
                        .Where(x => applicationIds.Contains(x.TrustApplicationID))
                        .Select(
                            x => new
                            {
                                x.TrustApplicationID, x.PreviousStatus, x.NewStatus, x.ChangedAt
                            })
                        .ToListAsync();

                var firstCompletedEvents =
                    statusHistory
                        .Where(x => x.NewStatus == "COMPLETED")
                        .GroupBy(x => x.TrustApplicationID)
                        .Select(
                            g => new
                            {
                                TrustApplicationID = g.Key,
                                CompletedAt = g.Min(x => x.ChangedAt)
                            })
                        .ToList();

                var operationalStatuses =
                    new[]
                    {
                        "PAYMENT_APPROVED",
                        "PENDING_ADMIN_APPROVAL",
                        "SENT_OUT",
                        "STAMPING"
                    };

                int inProcess = applications.Count(x => operationalStatuses.Contains(x.ApplicationStatus));

                int readyForProcessing = applications.Count(x => x.ApplicationStatus == "PAYMENT_APPROVED");

                int pendingAdminApproval = applications.Count(x => x.ApplicationStatus == "PENDING_ADMIN_APPROVAL");

                int sentOut = applications.Count(x => x.ApplicationStatus == "SENT_OUT");

                int stamping = applications.Count(x => x.ApplicationStatus == "STAMPING");

                int completedThisMonth =
                    firstCompletedEvents.Count(x => x.CompletedAt >= currentMonthStart && x.CompletedAt < nextMonthStart);

                var summary =
                    new OperationDashboardSummaryResult
                    {
                        InProcess = inProcess,
                        ReadyForProcessing = readyForProcessing,
                        PendingAdminApproval = pendingAdminApproval,
                        SentOut = sentOut,
                        Stamping = stamping,
                        CompletedThisMonth = completedThisMonth
                    };

                var workflowPipeline =
                    new OperationDashboardWorkflowResult
                    {
                        Total = inProcess,
                        PaymentApproved = readyForProcessing,
                        PendingAdminApproval = pendingAdminApproval,
                        SentOut = sentOut,
                        Stamping = stamping
                    };

                // upcoming maturities

                int maturingNext30Days =
                    applications.Count(
                        x =>
                            x.ApplicationStatus == "COMPLETED" &&
                            x.MaturityDate.HasValue &&
                            x.MaturityDate.Value >= today &&
                            x.MaturityDate.Value <= next30Days);

                int maturingNext60Days =
                    applications.Count(
                        x =>
                            x.ApplicationStatus == "COMPLETED" &&
                            x.MaturityDate.HasValue &&
                            x.MaturityDate.Value >= today &&
                            x.MaturityDate.Value <= next60Days);

                int maturingNext90Days =
                    applications.Count(
                        x =>
                            x.ApplicationStatus == "COMPLETED" &&
                            x.MaturityDate.HasValue &&
                            x.MaturityDate.Value >= today &&
                            x.MaturityDate.Value <= next90Days);

                var upcomingMaturities =
                    new OperationDashboardMaturityResult
                    {
                        MaturingNext30Days = maturingNext30Days,
                        MaturingNext60Days = maturingNext60Days,
                        MaturingNext90Days = maturingNext90Days
                    };

                // required attention

                var requiresAttention =
                    new OperationDashboardAttentionResult
                    {
                        PendingAdminApproval = pendingAdminApproval,
                        MaturingNext30Days = maturingNext30Days,
                        Total = pendingAdminApproval + maturingNext30Days
                    };

                // processing trend

                var yearCompletedEvents =
                    firstCompletedEvents
                        .Where(x => x.CompletedAt >= yearStart && x.CompletedAt < nextYearStart)
                        .ToList();

                var processingTrend = new List<OperationDashboardMonthlyResult>();

                for (int month = 1; month <= 12; month++)
                {
                    int completedApplications = yearCompletedEvents.Count(x => x.CompletedAt.Month == month);

                    processingTrend.Add(
                        new OperationDashboardMonthlyResult
                        {
                            Month = month,
                            MonthName = CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedMonthName(month),
                            CompletedApplications = completedApplications
                        });
                }

                // work queue

                var workQueueApplications =
                    applications
                        .Where(x => operationalStatuses.Contains(x.ApplicationStatus))
                        .ToList();

                var workQueueWithStage =
                    workQueueApplications
                        .Select(
                            application =>
                            {
                                var stageHistory =
                                    statusHistory
                                        .Where(x => x.TrustApplicationID == application.RowID && x.NewStatus == application.ApplicationStatus)
                                        .OrderByDescending(x => x.ChangedAt)
                                        .FirstOrDefault();

                                DateTime stageSince = stageHistory != null ? stageHistory.ChangedAt : application.UpdatedAt ?? application.CreatedAt;

                                return new
                                {
                                    Application = application,
                                    StageSince = stageSince
                                };
                            })
                        .OrderBy(x => x.StageSince)
                        .Take(10)
                        .ToList();

                var workQueueApplicationIds =
                    workQueueWithStage
                        .Select(x => x.Application.RowID)
                        .ToList();

                var personalDetails =
                    await db.tbl_TrustApplication_PersonalDetail
                        .Where(x => workQueueApplicationIds.Contains( x.TrustApplicationID))
                        .Select(
                            x => new
                            {
                                x.TrustApplicationID, x.FullName
                            })
                        .ToListAsync();

                var workQueue =
                    workQueueWithStage
                        .Select(
                            item =>
                            {
                                var personalDetail = personalDetails.FirstOrDefault(x => x.TrustApplicationID == item.Application.RowID);

                                int daysInStage = Math.Max(0, (today - item.StageSince.Date).Days);

                                return new OperationDashboardWorkQueueResult
                                {
                                    TrustID = item.Application.TrustID,
                                    SettlorName = personalDetail != null ? personalDetail.FullName : "",
                                    ProductCode = item.Application.ProductCode,
                                    ApplicationStatus = item.Application.ApplicationStatus,
                                    StageSince = item.StageSince,
                                    DaysInStage = daysInStage
                                };
                            })
                        .ToList();

                return new OperationDashboardResult
                {
                    Year = year,
                    Summary = summary,
                    WorkflowPipeline = workflowPipeline,
                    RequiresAttention = requiresAttention,
                    UpcomingMaturities = upcomingMaturities,
                    ProcessingTrend = processingTrend,
                    WorkQueue = workQueue
                };
            }
        }
    }
}