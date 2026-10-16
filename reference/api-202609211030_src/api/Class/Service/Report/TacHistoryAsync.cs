using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.Report
{
    public class TacHistoryAsync
    {
        public async Task<object> GetHistoryAsync(
            string merchantId,
            int page,
            int pageSize,
            string search,
            string type,
            string sentMethod,
            int? status,
            DateTime? dateFrom,
            DateTime? dateTo)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                if (string.IsNullOrWhiteSpace(merchantId))
                    throw new ArgumentException("MerchantID is required.");

                page = Math.Max(1, page);
                pageSize = Math.Max(1, Math.Min(100, pageSize));

                if ((long)(page - 1) * pageSize > int.MaxValue)
                    throw new ArgumentException("Pagination range is too large.");

                search = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
                type = string.IsNullOrWhiteSpace(type) ? null : type.Trim();
                sentMethod = string.IsNullOrWhiteSpace(sentMethod) ? null : sentMethod.Trim();

                var query = db.tbl_TAC.AsNoTracking().Where(x => x.MerchantID == merchantId);

                if (search != null)
                {
                    query = query.Where(x => x.ReceiverAddress.Contains(search));
                }

                // TAC type filter
                if (type != null)
                {
                    query = query.Where(x => x.Type == type);
                }

                // Sent method filter
                if (sentMethod != null)
                {
                    query = query.Where(x => x.SentMethod == sentMethod);
                }

                // Status filter
                if (status.HasValue)
                {
                    query = query.Where(x => x.Status == status.Value);
                }

                // Created date from
                if (dateFrom.HasValue)
                {
                    DateTime startDate = dateFrom.Value.Date;
                    query = query.Where(x => x.CreatedAt >= startDate);
                }

                // Created date to (inclusive)
                if (dateTo.HasValue)
                {
                    DateTime endDate = dateTo.Value.Date;

                    if (endDate == DateTime.MaxValue.Date)
                        throw new ArgumentException("Invalid dateTo value.");

                    DateTime endExclusive = endDate.AddDays(1);
                    query = query.Where(x => x.CreatedAt < endExclusive);
                }

                int totalRecords = await query.CountAsync();

                var records = await
                    (
                        from tac in query
                        join member in db.tbl_MemberInfo.AsNoTracking() on tac.MemberID equals (long?)member.RowID into memberJoin
                        from member in memberJoin.DefaultIfEmpty()
                        orderby tac.CreatedAt descending, tac.RowID descending
                        select new
                        {
                            tac.RowID,
                            tac.MerchantID,
                            tac.MemberID,
                            FullName = tac.MemberID > 0 ? member.Fullname : null,
                            Email = tac.MemberID > 0 ? member.Email : null,
                            tac.SentMethod,
                            tac.ReceiverAddress,
                            tac.Type,
                            OTPCode = tac.Code,
                            tac.IP,
                            tac.CreatedAt,
                            tac.ExpiredAt,
                            tac.UpdatedAt,
                            tac.Status
                        }
                    )
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                return new
                {
                    Records = records,
                    Pagination = new
                    {
                        Page = page,
                        PageSize = pageSize,
                        TotalRecords = totalRecords,
                        TotalPages = (int)Math.Ceiling(totalRecords / (double)pageSize)
                    }
                };
            }
        }
    }
}
