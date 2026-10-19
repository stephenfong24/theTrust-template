using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO.Promotion;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.Promotion
{
    public class PromotionManagementService
    {
        private const string Code = "PROMOTION-MANAGEMENT";

        private const string WillMerchant = AppSettingsHelper.TheWillMerchantId;

        private static BusinessException Error(string message)
        {
            return new BusinessException(message, Code);
        }

        private static string Clean(string value)
        {
            return (value ?? "").Trim();
        }

        private static string Upper(string value)
        {
            return Clean(value).ToUpperInvariant();
        }

        private static void CheckMerchant(string merchantId)
        {
            if (merchantId != WillMerchant)
                throw Error("Invalid merchant.");
        }

        private static List<string> ValidateFields(string type, string name, int balance, string discountType, decimal discount, List<string> willTypes)
        {
            if (type != "WILL" && type != "CUSTODY")
                throw Error("Invalid promotion type.");

            if (string.IsNullOrWhiteSpace(name) ||
                name.Length > 200)
                throw Error("Invalid promotion name.");

            if (balance < 0)
                throw Error("Remaining balance cannot be negative.");

            if (discountType != "AMOUNT" && discountType != "PERCENTAGE")
                throw Error("Invalid discount type.");

            if (discount <= 0 || (discountType == "PERCENTAGE" && discount > 100))
                throw Error("Invalid discount amount.");

            var types = (willTypes ?? new List<string>()).Select(Upper).Distinct().ToList();

            if (type == "CUSTODY")
            {
                if (types.Count != 0)
                    throw Error("Custody promotions cannot specify Will Types.");

                return types;
            }

            if (types.Count == 0 || types.Any(x => x != "BASIC" && x != "EXCLUSIVE" && x != "PREMIUMS"))
                throw Error("Select valid Will Types.");

            return types;
        }

        private static async Task<long?> ResolveMemberAsync(Sandbox_BasedEntities db, string merchantId, string username)
        {
            username = Clean(username);

            if (username.Length == 0)
                return null;

            if (username.Length > 250)
                throw Error("Invalid target username.");

            var memberIds = await (
                from m in db.tbl_MemberInfo
                join r in db.tbl_Reference on m.RowID equals r.MemberID
                where m.Username == username && !m.IsDeleted && m.Status == 0 && r.MerchantID == merchantId && r.Status == 0
                select m.RowID
            ).Distinct().Take(2).ToListAsync();

            if (memberIds.Count != 1)
                throw Error("Target username was not found or is ambiguous.");

            return memberIds[0];
        }

        private static async Task<PromotionResult> MapAsync(Sandbox_BasedEntities db, tbl_Promotion p)
        {
            var types = await db.tbl_Promotion_WillType
                .AsNoTracking()
                .Where(x => x.PromotionID == p.RowID)
                .OrderBy(x => x.WillType)
                .Select(x => x.WillType)
                .ToListAsync();

            string username = null;

            if (p.TargetMemberID.HasValue)
            {
                username = await db.tbl_MemberInfo
                    .AsNoTracking()
                    .Where(x => x.RowID == p.TargetMemberID.Value)
                    .Select(x => x.Username)
                    .FirstOrDefaultAsync();
            }

            return new PromotionResult
            {
                RowID = p.RowID,
                PromotionType = p.PromotionType,
                PromotionName = p.PromotionName,
                PromotionCode = p.PromotionCode,
                RemainingBalance = p.RemainingBalance,
                DiscountType = p.DiscountType,
                DiscountAmount = p.DiscountAmount,
                TargetMemberID = p.TargetMemberID,
                TargetUsername = username,
                ExpiredDate = p.ExpiredDate,
                IsActive = p.IsActive,
                IsExpired = p.ExpiredDate.HasValue && p.ExpiredDate.Value.Date < DateTime.Now.Date,
                IsDeleted = p.IsDeleted,
                WillTypes = types,
                CreatedAt = p.CreatedAt,
                CreatedBy = p.CreatedBy,
                UpdatedAt = p.UpdatedAt,
                UpdatedBy = p.UpdatedBy
            };
        }

        public async Task<PromotionPagedResult> GetListAsync(string merchantId, PromotionListRequest request)
        {
            CheckMerchant(merchantId);
            request = request ?? new PromotionListRequest();

            int page = Math.Max(1, request.Page);
            int pageSize = request.PageSize <= 0 ? 20 : Math.Min(request.PageSize, 100);

            using (var db = new Sandbox_BasedEntities())
            {
                var query = db.tbl_Promotion
                    .AsNoTracking()
                    .Where(x => x.MerchantID == merchantId && !x.IsDeleted);

                string search = Clean(request.Search);
                if (search.Length > 0)
                {
                    query = query.Where(x => x.PromotionName.Contains(search) || x.PromotionCode.Contains(search));
                }

                string type = Upper(request.PromotionType);
                if (type.Length > 0)
                    query = query.Where(x => x.PromotionType == type);

                string discountType = Upper(request.DiscountType);
                if (discountType.Length > 0)
                    query = query.Where(x => x.DiscountType == discountType);

                string willType = Upper(request.WillType);
                if (willType.Length > 0)
                {
                    query = query.Where(x => db.tbl_Promotion_WillType.Any(w => w.PromotionID == x.RowID && w.WillType == willType));
                }

                if (request.IsActive.HasValue)
                    query = query.Where(x => x.IsActive == request.IsActive.Value);

                if (request.HasBalance.HasValue)
                {
                    query = request.HasBalance.Value ? query.Where(x => x.RemainingBalance > 0) : query.Where(x => x.RemainingBalance == 0);
                }

                DateTime today = DateTime.Now.Date;
                string expiry = Upper(request.ExpiredStatus);

                if (expiry == "EXPIRED")
                    query = query.Where(x => x.ExpiredDate.HasValue && x.ExpiredDate.Value < today);
                else if (expiry == "NOT_EXPIRED")
                    query = query.Where(x => !x.ExpiredDate.HasValue || x.ExpiredDate.Value >= today);
                else if (expiry == "NO_EXPIRY")
                    query = query.Where(x => !x.ExpiredDate.HasValue);

                string username = Clean(request.TargetUsername);
                if (username.Length > 0)
                {
                    query = query.Where(x =>
                        x.TargetMemberID.HasValue &&
                        db.tbl_MemberInfo.Any(m => m.RowID == x.TargetMemberID.Value && m.Username.Contains(username)));
                }

                int total = await query.CountAsync();
                string sort = Upper(request.SortBy);
                bool asc = Upper(request.SortDirection) == "ASC";

                switch (sort)
                {
                    case "PROMOTIONNAME":
                        query = asc
                            ? query.OrderBy(x => x.PromotionName).ThenBy(x => x.RowID)
                            : query.OrderByDescending(x => x.PromotionName).ThenByDescending(x => x.RowID);
                        break;

                    case "PROMOTIONCODE":
                        query = asc
                            ? query.OrderBy(x => x.PromotionCode).ThenBy(x => x.RowID)
                            : query.OrderByDescending(x => x.PromotionCode).ThenByDescending(x => x.RowID);
                        break;

                    case "REMAININGBALANCE":
                        query = asc
                            ? query.OrderBy(x => x.RemainingBalance).ThenBy(x => x.RowID)
                            : query.OrderByDescending(x => x.RemainingBalance).ThenByDescending(x => x.RowID);
                        break;

                    case "EXPIREDDATE":
                        query = asc
                            ? query.OrderBy(x => x.ExpiredDate).ThenBy(x => x.RowID)
                            : query.OrderByDescending(x => x.ExpiredDate).ThenByDescending(x => x.RowID);
                        break;

                    default:
                        query = asc
                            ? query.OrderBy(x => x.CreatedAt).ThenBy(x => x.RowID)
                            : query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.RowID);
                        break;
                }

                var rows = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var items = new List<PromotionResult>();

                foreach (var row in rows)
                    items.Add(await MapAsync(db, row));

                return new PromotionPagedResult
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalRecords = total,
                    TotalPages = (int)Math.Ceiling(total / (double)pageSize),
                    Items = items
                };
            }
        }

        public async Task<PromotionResult> GetAsync(string merchantId, long id)
        {
            CheckMerchant(merchantId);

            using (var db = new Sandbox_BasedEntities())
            {
                var p = await db.tbl_Promotion.AsNoTracking().FirstOrDefaultAsync(x => x.RowID == id && x.MerchantID == merchantId && !x.IsDeleted);

                if (p == null)
                    throw Error("Promotion not found.");

                return await MapAsync(db, p);
            }
        }

        public async Task<PromotionResult> CreateAsync(string merchantId, long userId, PromotionSaveRequest request)
        {
            CheckMerchant(merchantId);

            if (userId <= 0 || request == null)
                throw Error("Invalid request.");

            string type = Upper(request.PromotionType);
            string name = Clean(request.PromotionName);
            string discountType = Upper(request.DiscountType);
            string code = Upper(request.PromotionCode);

            if (!Regex.IsMatch(code, @"^[A-Z0-9]{1,50}$"))
                throw Error("Promotion code must contain only A-Z and 0-9.");

            var types = ValidateFields(
                type, name, request.RemainingBalance,
                discountType, request.DiscountAmount,
                request.WillTypes);

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(IsolationLevel.Serializable))
            {
                bool exists = await db.tbl_Promotion.AnyAsync(x => x.MerchantID == merchantId && x.PromotionCode == code);

                if (exists)
                    throw Error("Promotion code already exists.");

                long? memberId = await ResolveMemberAsync(db, merchantId, request.TargetUsername);

                var p = new tbl_Promotion
                {
                    MerchantID = merchantId,
                    PromotionType = type,
                    PromotionName = name,
                    PromotionCode = code,
                    RemainingBalance = request.RemainingBalance,
                    DiscountType = discountType,
                    DiscountAmount = request.DiscountAmount,
                    TargetMemberID = memberId,
                    ExpiredDate = request.ExpiredDate?.Date,
                    IsActive = request.IsActive,
                    IsDeleted = false,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId
                };

                db.tbl_Promotion.Add(p);
                await db.SaveChangesAsync();

                foreach (string willType in types)
                {
                    db.tbl_Promotion_WillType.Add(
                        new tbl_Promotion_WillType
                        {
                            PromotionID = p.RowID,
                            WillType = willType
                        });
                }

                await db.SaveChangesAsync();
                tx.Commit();

                return await MapAsync(db, p);
            }
        }

        public async Task<PromotionResult> UpdateAsync(string merchantId, long userId, long id, PromotionUpdateRequest request)
        {
            CheckMerchant(merchantId);

            if (userId <= 0 || request == null)
                throw Error("Invalid request.");

            string type = Upper(request.PromotionType);
            string name = Clean(request.PromotionName);
            string discountType = Upper(request.DiscountType);

            var types = ValidateFields(
                type, name, request.RemainingBalance,
                discountType, request.DiscountAmount,
                request.WillTypes);

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(IsolationLevel.Serializable))
            {
                var p = await db.tbl_Promotion.FirstOrDefaultAsync(x => x.RowID == id && x.MerchantID == merchantId && !x.IsDeleted);

                if (p == null)
                    throw Error("Promotion not found.");

                long? memberId = await ResolveMemberAsync(db, merchantId, request.TargetUsername);

                // PromotionCode is never updated.
                p.PromotionType = type;
                p.PromotionName = name;
                p.RemainingBalance = request.RemainingBalance;
                p.DiscountType = discountType;
                p.DiscountAmount = request.DiscountAmount;
                p.TargetMemberID = memberId;
                p.ExpiredDate = request.ExpiredDate?.Date;
                p.IsActive = request.IsActive;
                p.UpdatedAt = DateTime.Now;
                p.UpdatedBy = userId;

                var oldTypes = await db.tbl_Promotion_WillType.Where(x => x.PromotionID == id).ToListAsync();
                db.tbl_Promotion_WillType.RemoveRange(oldTypes);

                // Flush deletions before reinserting to avoid
                // conflicts with the unique (PromotionID, WillType).
                await db.SaveChangesAsync();

                foreach (string willType in types)
                {
                    db.tbl_Promotion_WillType.Add(
                        new tbl_Promotion_WillType
                        {
                            PromotionID = id,
                            WillType = willType
                        });
                }

                await db.SaveChangesAsync();
                tx.Commit();

                return await MapAsync(db, p);
            }
        }

        public async Task DeleteAsync(string merchantId, long userId, long id)
        {
            CheckMerchant(merchantId);

            if (userId <= 0)
                throw Error("Invalid user.");

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(IsolationLevel.Serializable))
            {
                var p = await db.tbl_Promotion.FirstOrDefaultAsync(x => x.RowID == id && x.MerchantID == merchantId && !x.IsDeleted);

                if (p == null)
                    throw Error("Promotion not found.");

                p.IsActive = false;
                p.IsDeleted = true;
                p.DeletedAt = DateTime.Now;
                p.DeletedBy = userId;
                p.UpdatedAt = DateTime.Now;
                p.UpdatedBy = userId;

                await db.SaveChangesAsync();
                tx.Commit();
            }
        }
    }
}