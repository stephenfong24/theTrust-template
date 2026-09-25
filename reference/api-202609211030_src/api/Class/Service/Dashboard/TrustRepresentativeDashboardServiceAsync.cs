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
    public class TrustRepresentativeDashboardServiceAsync
    {
        public async Task<TrustRepresentativeDashboardResult> GetAsync(string merchantId, long userId, int year)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                // account

                var reference = await db.tbl_Reference.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.MemberID == userId);

                int ranking = 0;
                string rankCode = null;
                string rankName = null;

                if (reference != null)
                {
                    ranking = reference.AdvanceRanking > reference.Ranking ? reference.AdvanceRanking : reference.Ranking;

                    if (ranking > 0)
                    {
                        var rank = await db.tbl_AgentRank.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.Ranking == ranking);
                        if (rank != null)
                        {
                            rankCode = rank.RankCode;
                            rankName = rank.RankName;
                        }
                    }
                }

                // personal trust application

                var applications =
                    await db.tbl_TrustApplication
                        .Where(x => x.MerchantID == merchantId && x.MemberID == userId)
                        .Select(
                            x => new
                            {
                                x.RowID, x.TrustID, x.ProductCode, x.ApplicationStatus, x.CreatedAt, x.UpdatedAt, 
                                x.CommencementDate, x.MaturityDate
                            })
                        .ToListAsync();

                var applicationIds = applications.Select(x => x.RowID).ToList();

                var assets =
                    await db.tbl_TrustApplication_TrustAsset
                        .Where(x => applicationIds.Contains(x.TrustApplicationID))
                        .Select(x => new {x.TrustApplicationID, x.TrustAssetAmount})
                        .ToListAsync();

                var personalSalesStatuses = new[]
                {
                    "COMPLETED",
                    "EARLY_WITHDRAWN",
                    "MATURED"
                };

                var personalSalesApplicationIds =
                    applications
                        .Where(x => personalSalesStatuses.Contains(x.ApplicationStatus))
                        .Select(x => x.RowID)
                        .ToHashSet();

                decimal personalSales =
                    assets
                        .Where(x => personalSalesApplicationIds.Contains(x.TrustApplicationID))
                        .Sum(x => x.TrustAssetAmount);

                // 12 months personal sales

                var yearStart = new DateTime(year, 1, 1);
                var nextYearStart = yearStart.AddYears(1);

                var completedEvents =
                    await db.tbl_TrustApplication_StatusHistory
                        .Where(
                            x =>
                                applicationIds.Contains(x.TrustApplicationID) &&
                                x.NewStatus == "COMPLETED" &&
                                x.ChangedAt >= yearStart && x.ChangedAt < nextYearStart)
                        .Select(
                            x => new
                            {
                                x.TrustApplicationID,
                                x.ChangedAt
                            })
                        .ToListAsync();

                var salesTrend = new List<DashboardMonthlySalesResult>();

                for (int month = 1; month <= 12; month++)
                {
                    var monthApplicationIds = completedEvents.Where(x => x.ChangedAt.Month == month).Select(x => x.TrustApplicationID).Distinct().ToList();

                    decimal amount = assets.Where(x => monthApplicationIds.Contains(x.TrustApplicationID)).Sum(x => x.TrustAssetAmount);

                    salesTrend.Add(
                        new DashboardMonthlySalesResult
                        {
                            Month = month,
                            MonthName = CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedMonthName(month),
                            Amount = amount,
                            CompletedTrusts = monthApplicationIds.Count
                        });
                }

                // annual personal sales

                var annualCompletedIds = completedEvents.Select(x => x.TrustApplicationID).Distinct().ToList();

                decimal annualPersonalSales = assets.Where(x => annualCompletedIds.Contains(x.TrustApplicationID)).Sum(x => x.TrustAssetAmount);

                // active trust value

                var activeApplicationIds = applications.Where(x => x.ApplicationStatus == "COMPLETED").Select(x => x.RowID).ToList();

                decimal activeTrustValue = assets.Where(x => activeApplicationIds.Contains(x.TrustApplicationID)).Sum(x => x.TrustAssetAmount);

                int activeTrustCount = activeApplicationIds.Count;

                // completed trust count

                int completedTrusts =
                    applications.Count(
                        x =>
                            x.ApplicationStatus == "COMPLETED" ||
                            x.ApplicationStatus == "MATURED" ||
                            x.ApplicationStatus == "EARLY_WITHDRAWN");

                // application trust donut

                int draft = applications.Count(x => x.ApplicationStatus == "DRAFT");

                int pendingPayment = applications.Count(x => x.ApplicationStatus == "PENDING_PAYMENT_APPROVAL");

                int processing =
                    applications.Count(
                        x =>
                            x.ApplicationStatus == "PAYMENT_APPROVED" ||
                            x.ApplicationStatus == "PENDING_ADMIN_APPROVAL" ||
                            x.ApplicationStatus == "SENT_OUT" ||
                            x.ApplicationStatus == "STAMPING");

                int completed = applications.Count(x => x.ApplicationStatus == "COMPLETED");

                int matured = applications.Count(x => x.ApplicationStatus == "MATURED");

                int earlyWithdrawn = applications.Count(x => x.ApplicationStatus == "EARLY_WITHDRAWN");

                int rejected = applications.Count(x => x.ApplicationStatus == "REJECTED");

                var applicationStatus =
                    new DashboardApplicationStatusResult
                    {
                        Total = applications.Count,
                        Draft = draft,
                        PendingPayment = pendingPayment,
                        Processing = processing,
                        Completed = completed,
                        Matured = matured,
                        EarlyWithdrawn = earlyWithdrawn,
                        Rejected = rejected
                    };

                // commission card
                // return ZERO now as the module is under development stage

                var commission =
                    new DashboardCommissionSummaryResult
                    {
                        Available = false,
                        TotalEarned = 0M,
                        ThisMonth = 0M,
                        Pending = 0M
                    };

                // direct downline

                int directDownline = await db.tbl_MemberUnit_Trust.CountAsync(x => x.unitSponsor == userId && x.isDeleted != true);

                // action required

                var payments =
                    await db.tbl_TrustApplication_Payment
                        .Where(
                            x =>
                                applicationIds.Contains(x.TrustApplicationID) && x.IsActive)
                        .Select(
                            x => new
                            {
                                x.TrustApplicationID, x.PaymentStatus
                            })
                        .ToListAsync();

                int draftApplications = applications.Count(x => x.ApplicationStatus == "DRAFT");

                int awaitingPayment =
                    payments
                        .Where(x => x.PaymentStatus == "WAITING_PAYMENT")
                        .Select(x => x.TrustApplicationID)
                        .Distinct()
                        .Count();

                int paymentPendingApproval =
                    payments
                        .Where(x => x.PaymentStatus == "PENDING_APPROVAL")
                        .Select(x => x.TrustApplicationID)
                        .Distinct()
                        .Count();

                var actionRequired =
                    new DashboardActionRequiredResult
                    {
                        DraftApplications = draftApplications,
                        AwaitingPayment = awaitingPayment,
                        PaymentPendingApproval = paymentPendingApproval,
                        Total = draftApplications + awaitingPayment + paymentPendingApproval
                    };

                // resent application

                var recentApplications = applications.OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt).Take(5).ToList();

                var recentApplicationIds = recentApplications.Select(x => x.RowID).ToList();

                var recentPersonalDetails =
                    await db.tbl_TrustApplication_PersonalDetail
                        .Where(x => recentApplicationIds.Contains(x.TrustApplicationID))
                        .Select(x => new
                        {
                            x.TrustApplicationID,
                            x.FullName
                        })
                        .ToListAsync();

                var recentResults =
                    recentApplications
                        .Select(
                            x =>
                            {
                                var asset = assets.FirstOrDefault(a => a.TrustApplicationID == x.RowID);

                                var personalDetail = recentPersonalDetails.FirstOrDefault(p => p.TrustApplicationID == x.RowID);

                                return new DashboardRecentApplicationResult
                                {
                                    TrustID = x.TrustID,
                                    ProductCode = x.ProductCode,
                                    SettlorName = personalDetail != null ? personalDetail.FullName : "",
                                    TrustAssetAmount = asset != null ? asset.TrustAssetAmount : 0M,
                                    ApplicationStatus = x.ApplicationStatus,
                                    CreatedAt = x.CreatedAt,
                                    UpdatedAt = x.UpdatedAt
                                };
                            })
                        .ToList();

                // rank progress

                decimal personalSalesTarget = 100000M;

                decimal remaining = Math.Max(0M, personalSalesTarget - annualPersonalSales);

                decimal progress =
                    personalSalesTarget <= 0
                        ? 0M
                        : Math.Min(100M, Math.Round(annualPersonalSales / personalSalesTarget * 100M, 2));

                var rankProgress =
                    new DashboardRankProgressResult
                    {
                        Ranking = ranking,
                        RankCode = rankCode,
                        RankName = rankName,
                        PersonalSales = annualPersonalSales,
                        PersonalSalesTarget = personalSalesTarget,
                        PersonalSalesRemaining = remaining,
                        ProgressPercentage = progress
                    };

                return new TrustRepresentativeDashboardResult
                {
                    Year = year,
                    Summary =
                        new TrustRepresentativeSummaryResult
                        {
                            PersonalSales = annualPersonalSales,
                            ActiveTrustValue = activeTrustValue,
                            ActiveTrustCount = activeTrustCount,
                            CompletedTrusts = completedTrusts,
                            Ranking = ranking,
                            RankCode = rankCode,
                            RankName = rankName
                        },
                    PersonalSalesTrend = salesTrend,
                    RankProgress = rankProgress,
                    ApplicationStatus = applicationStatus,
                    Commission = commission,
                    Network =
                        new DashboardNetworkSummaryResult
                        {
                            DirectDownline = directDownline
                        },
                    ActionRequired = actionRequired,
                    RecentApplications = recentResults
                };
            }
        }
    }
}