
using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.Promotion;
using API_CPX.Context;
using System;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.Promotion
{
    public class PromotionUtilizationService
    {
        private const string ErrorCode = "PROMOTION-UTILIZATION";

        private static BusinessException Error(string message)
        {
            return new BusinessException(message, ErrorCode);
        }

        private static PromotionUtilizationResult MapExisting(tbl_Promotion_UtilizationLog log)
        {
            return new PromotionUtilizationResult
            {
                LogID = log.RowID,
                PromotionID = log.PromotionID,
                PromotionCode = log.PromotionCode,
                OriginalAmount = log.OriginalAmount,
                DiscountAmount = log.DiscountAmount,
                FinalAmount = log.FinalAmount,
                RemainingBalance = log.BalanceAfter,
                AlreadyUtilized = true
            };
        }

        public async Task<PromotionUtilizationResult> UtilizeAsync(string merchantId, long actorMemberId, PromotionUtilizationRequest request)
        {
            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(IsolationLevel.Serializable))
            {
                var result = await UtilizeAsync(db, merchantId, actorMemberId, request);
                tx.Commit();
                return result;
            }
        }

        // Use this overload when the calling purchase service
        // already owns the database transaction.
        // Caller must commit/rollback the transaction.
        public async Task<PromotionUtilizationResult> UtilizeAsync(Sandbox_BasedEntities db, string merchantId, long actorMemberId, PromotionUtilizationRequest request)
        {
            if (merchantId != PromotionValidationService.WillMerchantID)
                throw Error("Invalid merchant.");

            if (request == null || request.MemberID <= 0 || actorMemberId <= 0 || request.ReferenceID <= 0 || string.IsNullOrWhiteSpace(request.ReferenceType))
                throw Error("Invalid utilization request.");

            string referenceType = PromotionValidationService.Clean(request.ReferenceType);

            if (referenceType.Length > 50 || !System.Text.RegularExpressions.Regex.IsMatch(referenceType, @"^[A-Z0-9_]+$"))
                throw Error("Invalid reference type.");

            string code = PromotionValidationService.Clean(request.PromotionCode);
            string promotionType = PromotionValidationService.Clean(request.PromotionType);
            string willType = PromotionValidationService.Clean(request.WillType);

            // Idempotency: inspect the business transaction first.
            var existing = await db.tbl_Promotion_UtilizationLog
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.ReferenceType == referenceType && x.ReferenceID == request.ReferenceID);

            if (existing != null)
            {
                // Reject a conflicting retry rather than
                // silently returning another voucher's result.
                if (existing.MemberID != request.MemberID ||
                    existing.PromotionCode != code ||
                    existing.PromotionType != promotionType ||
                    existing.WillType != (promotionType == "WILL" ? willType : null) ||
                    existing.OriginalAmount != request.OriginalAmount)
                    throw Error("This transaction already used a different promotion request.");

                return MapExisting(existing);
            }

            var validator = new PromotionValidationService();
            var validation = await validator.ValidateAsync(db, merchantId, request);

            if (!validation.IsValid)
                throw Error(validation.Message);

            var promotion = await db.tbl_Promotion
                .FirstOrDefaultAsync(x => x.RowID == validation.PromotionID.Value && x.MerchantID == merchantId && !x.IsDeleted);

            if (promotion == null)
                throw Error("Promotion not found.");

            // Recheck mutable promotion state while the
            // serializable transaction is active.
            if (!promotion.IsActive || promotion.RemainingBalance <= 0 || (promotion.ExpiredDate.HasValue && promotion.ExpiredDate.Value.Date < DateTime.Now.Date))
                throw Error("Promotion is no longer available.");

            // Recalculate from the locked promotion record.
            decimal discount = PromotionValidationService.CalculateDiscount(promotion.DiscountType, promotion.DiscountAmount, request.OriginalAmount);

            int before = promotion.RemainingBalance;
            int after = before - 1;

            promotion.RemainingBalance = after;
            promotion.UpdatedAt = DateTime.Now;
            promotion.UpdatedBy = actorMemberId;

            var log = new tbl_Promotion_UtilizationLog
            {
                PromotionID = promotion.RowID,
                MerchantID = merchantId,
                MemberID = request.MemberID,
                PromotionCode = promotion.PromotionCode,
                PromotionType = promotion.PromotionType,
                WillType = promotion.PromotionType == "WILL" ? willType : null,
                ReferenceType = referenceType,
                ReferenceID = request.ReferenceID,
                OriginalAmount = request.OriginalAmount,
                DiscountAmount = discount,
                FinalAmount = request.OriginalAmount - discount,
                BalanceBefore = before,
                BalanceAfter = after,
                CreatedAt = DateTime.Now,
                CreatedBy = actorMemberId
            };

            db.tbl_Promotion_UtilizationLog.Add(log);
            await db.SaveChangesAsync();

            return new PromotionUtilizationResult
            {
                LogID = log.RowID,
                PromotionID = promotion.RowID,
                PromotionCode = promotion.PromotionCode,
                OriginalAmount = log.OriginalAmount,
                DiscountAmount = discount,
                FinalAmount = log.FinalAmount,
                RemainingBalance = after,
                AlreadyUtilized = false
            };
        }
    }
}