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
    public class FinanceDashboardServiceAsync
    {
        private const string PaymentPending = "PENDING_APPROVAL";
        private const string PaymentApproved = "PAYMENT_APPROVED";
        private const string PaymentRejected = "REJECTED";
        private const string DividendScheduled = "SCHEDULED";
        private const string DividendDue = "DUE";
        private const string DividendPaid = "PAID";
        private const string RedepositAsTrustAsset = "REDEPOSIT_AS_TRUST_ASSET";

        public async Task<FinanceDashboardResult> GetAsync(string merchantId, int year)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                DateTime now = DateTime.Now;
                DateTime today = now.Date;
                DateTime yearStart = new DateTime(year, 1, 1);
                DateTime nextYearStart = yearStart.AddYears(1);
                DateTime monthStart = new DateTime(now.Year, now.Month, 1);
                DateTime nextMonthStart = monthStart.AddMonths(1);
                DateTime upcomingEnd = today.AddDays(30);

                // ====================================================
                // Merchant Application IDs
                // ====================================================

                var merchantApplications = db.tbl_TrustApplication.Where(x => x.MerchantID == merchantId);

                // ====================================================
                // Payments
                // ====================================================

                var payments =
                    from payment in db.tbl_TrustApplication_Payment
                    join application in merchantApplications on payment.TrustApplicationID equals application.RowID
                    where payment.IsActive
                    select new
                    {
                        Payment = payment, Application = application
                    };

                // ====================================================
                // Approved Collection - Selected Year
                // ====================================================

                decimal approvedCollection =
                    await payments
                        .Where(x =>
                            x.Payment.PaymentStatus == PaymentApproved &&
                            x.Payment.ApprovedAt.HasValue && x.Payment.ApprovedAt.Value >= yearStart && x.Payment.ApprovedAt.Value < nextYearStart)
                        .Select(x => (decimal?)x.Payment.PaymentAmount)
                        .SumAsync() ?? 0M;

                // ====================================================
                // Collection This Month
                //
                // Current calendar month.
                // This is operational "now", not selected year.
                // ====================================================

                decimal collectionThisMonth =
                    await payments
                        .Where(x =>
                            x.Payment.PaymentStatus == PaymentApproved && x.Payment.ApprovedAt.HasValue &&
                            x.Payment.ApprovedAt.Value >= monthStart && x.Payment.ApprovedAt.Value < nextMonthStart)
                        .Select(x => (decimal?)x.Payment.PaymentAmount)
                        .SumAsync() ?? 0M;

                // ====================================================
                // Pending Payment
                // ====================================================

                int pendingPaymentCount = await payments.CountAsync(x => x.Payment.PaymentStatus == PaymentPending);

                decimal pendingPaymentAmount =
                    await payments
                        .Where(x => x.Payment.PaymentStatus == PaymentPending)
                        .Select(x => (decimal?)x.Payment.PaymentAmount)
                        .SumAsync() ?? 0M;

                // ====================================================
                // Collection Trend
                // ====================================================

                var collectionData =
                    await payments
                        .Where(x =>
                            x.Payment.PaymentStatus == PaymentApproved &&
                            x.Payment.ApprovedAt.HasValue && x.Payment.ApprovedAt.Value >= yearStart && x.Payment.ApprovedAt.Value < nextYearStart)
                        .GroupBy(x => x.Payment.ApprovedAt.Value.Month)
                        .Select(g => new
                        {
                            Month = g.Key,
                            Amount = g.Sum(x => x.Payment.PaymentAmount),
                            Count = g.Count()
                        })
                        .ToListAsync();

                var collectionTrend = new List<FinanceDashboardCollectionTrendResult>();

                for (int month = 1; month <= 12; month++)
                {
                    var item = collectionData.FirstOrDefault(x => x.Month == month);

                    collectionTrend.Add(
                        new FinanceDashboardCollectionTrendResult
                        {
                            Month = month,
                            MonthName = CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedMonthName(month),
                            Amount = item == null ? 0M : item.Amount,
                            ApprovedPayments = item == null ? 0 : item.Count
                        });
                }

                // ====================================================
                // Payment Overview
                //
                // Selected year is based on:
                // Pending  -> CreatedAt
                // Approved -> ApprovedAt
                // Rejected -> UpdatedAt
                //
                // This avoids mixing lifetime data into a
                // year-filtered dashboard.
                // ====================================================

                int paymentPendingOverview =
                    await payments
                        .CountAsync(x =>
                            x.Payment.PaymentStatus == PaymentPending && x.Payment.CreatedAt >= yearStart && x.Payment.CreatedAt < nextYearStart);

                int paymentApprovedOverview =
                    await payments
                        .CountAsync(x =>
                            x.Payment.PaymentStatus ==  PaymentApproved &&
                            x.Payment.ApprovedAt.HasValue && x.Payment.ApprovedAt.Value >= yearStart && x.Payment.ApprovedAt.Value < nextYearStart);

                int paymentRejectedOverview =
                    await payments
                        .CountAsync(x =>
                            x.Payment.PaymentStatus == PaymentRejected &&
                            x.Payment.UpdatedAt.HasValue && x.Payment.UpdatedAt.Value >= yearStart && x.Payment.UpdatedAt.Value < nextYearStart);

                // ====================================================
                // Payment Approval Queue
                //
                // Oldest pending payment first.
                // CreatedAt is used because this table does not have
                // a separate SubmittedAt column.
                // ====================================================

                var paymentQueueRaw =
                    await (
                        from payment in db.tbl_TrustApplication_Payment
                        join application in db.tbl_TrustApplication on payment.TrustApplicationID equals application.RowID
                        join personal in db.tbl_TrustApplication_PersonalDetail on application.RowID equals personal.TrustApplicationID
                        where application.MerchantID == merchantId && payment.IsActive && payment.PaymentStatus == PaymentPending
                        orderby payment.CreatedAt
                        select new
                        {
                            payment.RowID,
                            application.TrustID,
                            personal.FullName,
                            payment.PaymentAmount,
                            payment.CreatedAt
                        })
                        .Take(10).ToListAsync();

                var paymentIds = paymentQueueRaw.Select(x => x.RowID).ToList();

                var paymentDocuments =
                    await db.tbl_TrustApplication_PaymentDocument
                        .Where(x => paymentIds.Contains(x.PaymentID) && x.IsActive)
                        .Select(x => new
                        {
                            x.PaymentID, x.OriginalFileName
                        })
                        .ToListAsync();

                var paymentApprovalQueue =
                    paymentQueueRaw
                        .Select(x =>
                        {
                            var document = paymentDocuments.FirstOrDefault(d => d.PaymentID == x.RowID);

                            return
                                new FinanceDashboardPaymentQueueResult
                                {
                                    PaymentID = x.RowID,
                                    TrustID = x.TrustID,
                                    TrustNo = x.TrustID.ToString("D4"),
                                    SettlorName = x.FullName,
                                    SubmittedAmount = x.PaymentAmount,
                                    SubmittedAt = x.CreatedAt,
                                    WaitingDays = Math.Max(0, (today - x.CreatedAt.Date).Days),
                                    OriginalFileName = document == null ? null : document.OriginalFileName
                                };
                        })
                        .ToList();

                // ====================================================
                // Dividend Base Query
                //
                // Finance only handles TRANSFER_TO_BANK.
                // Redeposit schedules must not appear as Finance
                // transfer workload.
                // ====================================================

                var dividends =
                    from dividend in db.tbl_TrustApplication_DividendSchedule
                    join application in merchantApplications on dividend.TrustApplicationID equals application.RowID
                    where dividend.ReturnOption != RedepositAsTrustAsset
                    select new
                    {
                        Dividend = dividend, Application = application
                    };

                // ====================================================
                // Dividend Due
                // ====================================================

                int dividendDueCount = await dividends.CountAsync(x => x.Dividend.Status == DividendDue);

                decimal dividendDueAmount =
                    await dividends.Where(x => x.Dividend.Status == DividendDue).Select(x => (decimal?)x.Dividend.PayoutAmount).SumAsync() ?? 0M;

                // ====================================================
                // Overdue Dividend
                // ====================================================

                int overdueDividendCount = await dividends.CountAsync(x => x.Dividend.Status == DividendDue && x.Dividend.PayoutDate < today);

                // ====================================================
                // Upcoming 30 Days
                //
                // Scheduled only.
                // Due schedules are already represented by Due.
                // ====================================================

                int upcomingDividendCount =
                    await dividends
                        .CountAsync(x =>
                            x.Dividend.Status == DividendScheduled && x.Dividend.PayoutDate > today && x.Dividend.PayoutDate <= upcomingEnd);

                decimal upcomingDividendAmount =
                    await dividends
                        .Where(x =>
                            x.Dividend.Status == DividendScheduled && x.Dividend.PayoutDate > today && x.Dividend.PayoutDate <= upcomingEnd)
                        .Select(x => (decimal?)x.Dividend.PayoutAmount)
                        .SumAsync()
                        ?? 0M;

                // ====================================================
                // Paid This Month
                // ====================================================

                int paidThisMonthCount =
                    await dividends
                        .CountAsync(x =>
                            x.Dividend.Status == DividendPaid &&
                            x.Dividend.PaidAt.HasValue && x.Dividend.PaidAt.Value >= monthStart && x.Dividend.PaidAt.Value < nextMonthStart);

                decimal paidThisMonthAmount =
                    await dividends
                        .Where(x =>
                            x.Dividend.Status == DividendPaid &&
                            x.Dividend.PaidAt.HasValue && x.Dividend.PaidAt.Value >= monthStart && x.Dividend.PaidAt.Value < nextMonthStart)
                        .Select(x => (decimal?)x.Dividend.PayoutAmount)
                        .SumAsync()
                        ?? 0M;

                // ====================================================
                // Dividend Due Queue
                //
                // Due + overdue only.
                // Earliest payout date first.
                // ====================================================

                var dividendQueueRaw =
                    await (
                        from dividend in db.tbl_TrustApplication_DividendSchedule
                        join application in db.tbl_TrustApplication on dividend.TrustApplicationID equals application.RowID
                        join personal in db.tbl_TrustApplication_PersonalDetail on application.RowID equals personal.TrustApplicationID
                        where
                            application.MerchantID == merchantId &&
                            dividend.ReturnOption != RedepositAsTrustAsset && dividend.Status == DividendDue
                        orderby dividend.PayoutDate, dividend.RowID
                        select new
                        {
                            DividendScheduleID = dividend.RowID,
                            application.TrustID,
                            SettlorName = personal.FullName,
                            SettlorEmail = personal.Email,
                            dividend.PayoutDate,
                            dividend.PayoutAmount,
                            dividend.ScheduleNo,
                            dividend.ReturnYear,
                            dividend.PeriodNo,
                            dividend.Status
                        })
                        .Take(10)
                        .ToListAsync();

                var dividendDueQueue =
                    dividendQueueRaw
                        .Select(x =>
                            new FinanceDashboardDividendQueueResult
                            {
                                DividendScheduleID = x.DividendScheduleID,
                                TrustID = x.TrustID,
                                TrustNo = x.TrustID.ToString("D4"),
                                SettlorName = x.SettlorName,
                                SettlorEmail = x.SettlorEmail,
                                PayoutDate = x.PayoutDate,
                                Amount = x.PayoutAmount,
                                ScheduleNo = x.ScheduleNo,
                                ReturnYear = x.ReturnYear,
                                PeriodNo = x.PeriodNo,
                                Status = x.Status,
                                IsOverdue = x.PayoutDate < today
                            })
                        .ToList();

                // ====================================================
                // Result
                // ====================================================

                return new FinanceDashboardResult
                {
                    Year = year,
                    Summary =
                        new FinanceDashboardSummaryResult
                        {
                            ApprovedCollection = approvedCollection,
                            CollectionThisMonth = collectionThisMonth,
                            PendingPaymentApproval = pendingPaymentCount,
                            PendingPaymentAmount = pendingPaymentAmount,
                            DividendDue = dividendDueCount,
                            DividendDueAmount = dividendDueAmount
                        },
                    CollectionTrend = collectionTrend,
                    PaymentOverview =
                        new FinanceDashboardPaymentOverviewResult
                        {
                            Pending = paymentPendingOverview,
                            Approved = paymentApprovedOverview,
                            Rejected = paymentRejectedOverview
                        },
                    RequiresAttention =
                        new FinanceDashboardAttentionResult
                        {
                            PaymentPendingApproval = pendingPaymentCount,
                            DividendDue = dividendDueCount,
                            OverdueDividend = overdueDividendCount,
                            Total = pendingPaymentCount + dividendDueCount + overdueDividendCount
                        },
                    PaymentApprovalQueue = paymentApprovalQueue,
                    DividendWorkload =
                        new FinanceDashboardDividendWorkloadResult
                        {
                            DueCount = dividendDueCount,
                            DueAmount = dividendDueAmount,
                            Upcoming30DaysCount = upcomingDividendCount,
                            Upcoming30DaysAmount = upcomingDividendAmount,
                            PaidThisMonthCount = paidThisMonthCount,
                            PaidThisMonthAmount = paidThisMonthAmount
                        },
                    DividendDueQueue = dividendDueQueue
                };
            }
        }
    }
}