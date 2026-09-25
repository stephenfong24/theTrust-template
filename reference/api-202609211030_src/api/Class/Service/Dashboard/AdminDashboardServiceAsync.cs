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
    public class AdminDashboardServiceAsync
    {
        public async Task<AdminDashboardResult> GetAsync(string merchantId, int year)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                var now = DateTime.Now;
                var yearStart = new DateTime(year, 1, 1);
                var nextYearStart = yearStart.AddYears(1);
                var currentMonthStart = new DateTime(now.Year, now.Month, 1);
                var nextMonthStart = currentMonthStart.AddMonths(1);

                // application

                var applications =
                    await db.tbl_TrustApplication
                        .Where(x => x.MerchantID == merchantId)
                        .Select(
                            x => new
                            {
                                x.RowID, x.TrustID, x.MemberID, x.ProductCode, x.ApplicationStatus,
                                x.CreatedAt, x.UpdatedAt, x.MaturityDate
                            })
                        .ToListAsync();

                var applicationIds = applications.Select(x => x.RowID).ToList();

                var assets =
                    await db.tbl_TrustApplication_TrustAsset
                        .Where(x => applicationIds.Contains(x.TrustApplicationID))
                        .Select(
                            x => new
                            {
                                x.TrustApplicationID, x.TrustAssetAmount
                            })
                        .ToListAsync();

                var completedEvents =
                    await db.tbl_TrustApplication_StatusHistory
                        .Where(x => applicationIds.Contains(x.TrustApplicationID) && x.NewStatus == "COMPLETED")
                        .Select(
                            x => new
                            {
                                x.TrustApplicationID, x.ChangedAt
                            })
                        .ToListAsync();

                var firstCompletedEvents =
                    completedEvents
                        .GroupBy(x => x.TrustApplicationID)
                        .Select(
                            g => new
                            {
                                TrustApplicationID = g.Key,
                                CompletedAt = g.Min(x => x.ChangedAt)
                            })
                        .ToList();

                // total trust placement

                var completedApplicationIds = firstCompletedEvents.Select(x => x.TrustApplicationID).ToHashSet();

                decimal totalTrustPlacement =
                    assets
                        .Where(x => completedApplicationIds.Contains(x.TrustApplicationID))
                        .Sum(x => x.TrustAssetAmount);

                // current month total placement

                var thisMonthCompletedIds =
                    firstCompletedEvents
                        .Where(x => x.CompletedAt >= currentMonthStart && x.CompletedAt < nextMonthStart)
                        .Select(x => x.TrustApplicationID)
                        .ToHashSet();

                decimal thisMonthPlacement =
                    assets
                        .Where(x => thisMonthCompletedIds.Contains(x.TrustApplicationID))
                        .Sum(x => x.TrustAssetAmount);

                // active trust count

                var activeApplicationIds =
                    applications
                        .Where(x => x.ApplicationStatus == "COMPLETED")
                        .Select(x => x.RowID)
                        .ToHashSet();

                decimal activeTrustValue =
                    assets
                        .Where(x => activeApplicationIds.Contains(x.TrustApplicationID))
                        .Sum(x => x.TrustAssetAmount);

                int activeTrustCount = activeApplicationIds.Count;

                // payments record

                var payments =
                    await db.tbl_TrustApplication_Payment
                        .Where(x => applicationIds.Contains(x.TrustApplicationID) && x.IsActive)
                        .Select(
                            x => new
                            {
                                x.TrustApplicationID, x.PaymentAmount, x.PaymentStatus, x.ApprovedAt
                            })
                        .ToListAsync();

                decimal approvedCollection =
                    payments
                        .Where(x => x.PaymentStatus == "PAYMENT_APPROVED")
                        .Sum(x => x.PaymentAmount);

                decimal thisMonthApprovedCollection =
                    payments
                        .Where(
                            x =>
                                x.PaymentStatus == "PAYMENT_APPROVED" && x.ApprovedAt.HasValue &&
                                x.ApprovedAt.Value >= currentMonthStart && x.ApprovedAt.Value < nextMonthStart)
                        .Sum(x => x.PaymentAmount);

                // total application

                int totalApplications = applications.Count;

                // total current month application

                int thisMonthApplications =
                    applications.Count(x => x.CreatedAt >= currentMonthStart && x.CreatedAt < nextMonthStart);

                // completed trust count

                int completedTrusts =
                    applications.Count(x => x.ApplicationStatus == "COMPLETED" || x.ApplicationStatus == "MATURED" || x.ApplicationStatus == "EARLY_WITHDRAWN");

                // current month completed trust count

                int thisMonthCompletedTrusts =
                    firstCompletedEvents.Count(x => x.CompletedAt >= currentMonthStart && x.CompletedAt < nextMonthStart);

                // application pipeline

                var applicationPipeline =
                    new AdminDashboardApplicationPipelineResult
                    {
                        Total = applications.Count,
                        Draft = applications.Count(x => x.ApplicationStatus == "DRAFT"),
                        PendingPayment = applications.Count(x => x.ApplicationStatus == "PENDING_PAYMENT_APPROVAL"),
                        PaymentApproved = applications.Count(x => x.ApplicationStatus == "PAYMENT_APPROVED"),
                        PendingAdminApproval = applications.Count(x => x.ApplicationStatus == "PENDING_ADMIN_APPROVAL"),
                        SentOut = applications.Count(x => x.ApplicationStatus == "SENT_OUT"),
                        Stamping = applications.Count(x => x.ApplicationStatus == "STAMPING"),
                        Completed = applications.Count(x => x.ApplicationStatus == "COMPLETED"),
                        Matured = applications.Count(x => x.ApplicationStatus == "MATURED"),
                        EarlyWithdrawn = applications.Count(x => x.ApplicationStatus == "EARLY_WITHDRAWN"),
                        Rejected = applications.Count(x => x.ApplicationStatus == "REJECTED")
                    };

                var yearCompletedEvents =
                    firstCompletedEvents
                        .Where(x => x.CompletedAt >= yearStart && x.CompletedAt < nextYearStart)
                        .ToList();

                // placement trend

                var placementTrend = new List<DashboardMonthlyPlacementResult>();

                for (int month = 1; month <= 12; month++)
                {
                    var monthApplicationIds =
                        yearCompletedEvents
                            .Where(x => x.CompletedAt.Month == month)
                            .Select(x => x.TrustApplicationID)
                            .ToHashSet();

                    decimal amount =
                        assets
                            .Where(x => monthApplicationIds.Contains(x.TrustApplicationID))
                            .Sum(x => x.TrustAssetAmount);

                    placementTrend.Add(
                        new DashboardMonthlyPlacementResult
                        {
                            Month = month,
                            MonthName = CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedMonthName(month),
                            Amount = amount,
                            CompletedTrusts = monthApplicationIds.Count
                        });
                }

                // placmeent vs collection chart

                var placementVsCollection = new List<DashboardPlacementCollectionResult>();

                for (int month = 1; month <= 12; month++)
                {
                    var monthApplicationIds =
                        yearCompletedEvents
                            .Where(x => x.CompletedAt.Month == month)
                            .Select(x => x.TrustApplicationID)
                            .ToHashSet();

                    decimal placementAmount =
                        assets
                            .Where(x => monthApplicationIds.Contains(x.TrustApplicationID))
                            .Sum(x => x.TrustAssetAmount);


                    decimal collectionAmount =
                        payments
                            .Where(
                                x =>
                                    x.PaymentStatus == "PAYMENT_APPROVED" && x.ApprovedAt.HasValue &&
                                    x.ApprovedAt.Value.Year == year && x.ApprovedAt.Value.Month == month)
                            .Sum(x => x.PaymentAmount);

                    placementVsCollection.Add(
                        new DashboardPlacementCollectionResult
                        {
                            Month = month,
                            MonthName = CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedMonthName(month),
                            PlacementAmount = placementAmount,
                            CollectionAmount = collectionAmount
                        });
                }

                // trust representative list

                var agentReferences =
                    await db.tbl_Reference
                        .Where(x => x.MerchantID == merchantId)
                        .Select(
                            x => new
                            {
                                x.MemberID, x.Ranking, x.AdvanceRanking
                            })
                        .ToListAsync();

                var agentIds = agentReferences.Select(x => x.MemberID).Distinct().ToList();

                var agents =
                    await db.tbl_MemberInfo
                        .Where(x => agentIds.Contains(x.RowID) && x.UserType == "AGENT" && x.IsDeleted == false)
                        .Select(
                            x => new
                            {
                                UserID = x.RowID, x.Username, x.Fullname, x.CreatedAt
                            })
                        .ToListAsync();

                int totalAgents = agents.Count;
                int newAgentsThisMonth = agents.Count(x => x.CreatedAt >= currentMonthStart && x.CreatedAt < nextMonthStart);

                // selling agent
                // An agent who has at least one Trust application that first entered COMPLETED during the selected year.

                var selectedYearCompletedApplicationIds =
                    yearCompletedEvents
                        .Select(x => x.TrustApplicationID)
                        .ToHashSet();

                var sellingAgentIds =
                    applications
                        .Where(x => selectedYearCompletedApplicationIds.Contains(x.RowID))
                        .Select(x => x.MemberID)
                        .Distinct()
                        .ToHashSet();

                int sellingAgents = agents.Count(x => sellingAgentIds.Contains(x.UserID));
                int agentsWithNoSales = totalAgents - sellingAgents;

                // agent network result

                var agentNetwork =
                    new AdminDashboardAgentNetworkResult
                    {
                        TotalAgents = totalAgents,
                        NewAgentsThisMonth = newAgentsThisMonth,
                        SellingAgents = sellingAgents,
                        AgentsWithNoSales = agentsWithNoSales
                    };

                // lifecycle

                var today = DateTime.Today;
                var next30Days = today.AddDays(30);
                var next90Days = today.AddDays(90);

                int maturingNext30Days =
                    applications.Count(
                        x =>
                            x.ApplicationStatus == "COMPLETED" &&
                            x.MaturityDate.HasValue &&
                            x.MaturityDate.Value >= today &&
                            x.MaturityDate.Value <= next30Days);

                int maturingNext90Days =
                    applications.Count(
                        x =>
                            x.ApplicationStatus == "COMPLETED" &&
                            x.MaturityDate.HasValue &&
                            x.MaturityDate.Value >= today &&
                            x.MaturityDate.Value <= next90Days);

                var lifecycle =
                    new AdminDashboardLifecycleResult
                    {
                        MaturingNext30Days = maturingNext30Days,
                        MaturingNext90Days = maturingNext90Days,
                        Matured = applications.Count(x => x.ApplicationStatus == "MATURED"),
                        EarlyWithdrawn = applications.Count(x => x.ApplicationStatus == "EARLY_WITHDRAWN")
                    };

                int pendingPaymentApproval =
                    payments
                        .Where(x => x.PaymentStatus == "PENDING_APPROVAL")
                        .Select(x => x.TrustApplicationID)
                        .Distinct()
                        .Count();

                int pendingAdminApproval = applications.Count(x => x.ApplicationStatus == "PENDING_ADMIN_APPROVAL");

                var rejectedThisMonthApplicationIds =
                    await db.tbl_TrustApplication_StatusHistory
                        .Where(
                            x =>
                                applicationIds.Contains(x.TrustApplicationID) && x.NewStatus == "REJECTED" &&
                                x.ChangedAt >= currentMonthStart && x.ChangedAt < nextMonthStart)
                        .Select(x => x.TrustApplicationID)
                        .Distinct()
                        .ToListAsync();

                int rejectedThisMonth = rejectedThisMonthApplicationIds.Count;

                var requiresAttention =
                    new AdminDashboardAttentionResult
                    {
                        PendingPaymentApproval = pendingPaymentApproval,
                        PendingAdminApproval = pendingAdminApproval,
                        MaturingNext30Days = maturingNext30Days,
                        RejectedThisMonth = rejectedThisMonth,
                        Total = pendingPaymentApproval + pendingAdminApproval + maturingNext30Days + rejectedThisMonth
                    };

                var agentPerformanceRaw =
                    agents
                        .Select(
                            agent =>
                            {
                                var agentCompletedApplicationIds =
                                    applications
                                        .Where(
                                            x => x.MemberID == agent.UserID && selectedYearCompletedApplicationIds.Contains(x.RowID))
                                        .Select(x => x.RowID)
                                        .ToHashSet();

                                decimal personalSales =
                                    assets
                                        .Where(x => agentCompletedApplicationIds.Contains(x.TrustApplicationID))
                                        .Sum(x => x.TrustAssetAmount);

                                return new
                                {
                                    agent.UserID,
                                    agent.Username,
                                    agent.Fullname,
                                    agent.CreatedAt,
                                    PersonalSales = personalSales,
                                    CompletedTrusts = agentCompletedApplicationIds.Count
                                };
                            })
                            .OrderByDescending(x => x.PersonalSales)
                            .ThenByDescending(x => x.CompletedTrusts)
                            .ThenByDescending(x => x.CreatedAt)
                            .ThenByDescending(x => x.UserID)
                        .Take(5)
                        .ToList();

                var agentRanks =
                    await db.tbl_AgentRank
                        .Where(x => x.MerchantID == merchantId)
                        .Select(
                            x => new
                            {
                                x.Ranking, x.RankCode, x.RankName
                            })
                        .ToListAsync();

                var agentPerformance =
                    agentPerformanceRaw
                        .Select(
                            agent =>
                            {
                                var reference = agentReferences.FirstOrDefault(x => x.MemberID == agent.UserID);

                                int ranking = 0;

                                if (reference != null)
                                {
                                    ranking =
                                        reference.AdvanceRanking >
                                        reference.Ranking
                                            ? reference.AdvanceRanking
                                            : reference.Ranking;
                                }

                                var rank = agentRanks.FirstOrDefault(x => x.Ranking == ranking);

                                return new AdminDashboardAgentPerformanceResult
                                {
                                    UserID = agent.UserID,
                                    Username = agent.Username,
                                    FullName = agent.Fullname ?? "",
                                    Ranking = ranking,
                                    RankCode = rank != null ? rank.RankCode : null,
                                    RankName = rank != null ? rank.RankName : null,
                                    PersonalSales = agent.PersonalSales,
                                    CompletedTrusts = agent.CompletedTrusts
                                };
                            })
                        .ToList();

                var summary =
                    new AdminDashboardSummaryResult
                    {
                        TotalTrustPlacement = totalTrustPlacement,
                        ThisMonthPlacement = thisMonthPlacement,
                        ActiveTrustValue = activeTrustValue,
                        ActiveTrustCount = activeTrustCount,
                        ApprovedCollection = approvedCollection,
                        ThisMonthApprovedCollection = thisMonthApprovedCollection,
                        TotalApplications = totalApplications,
                        ThisMonthApplications = thisMonthApplications,
                        CompletedTrusts = completedTrusts,
                        ThisMonthCompletedTrusts = thisMonthCompletedTrusts,
                        TotalAgents = totalAgents,
                        NewAgentsThisMonth = newAgentsThisMonth
                    };

                return new AdminDashboardResult
                {
                    Year = year,
                    Summary = summary,
                    PlacementTrend = placementTrend,
                    ApplicationPipeline = applicationPipeline,
                    PlacementVsCollection = placementVsCollection,
                    AgentNetwork = agentNetwork,
                    Lifecycle = lifecycle,
                    RequiresAttention = requiresAttention,
                    AgentPerformance = agentPerformance
                };
            }
        }
    }
}