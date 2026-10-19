using API_CPX.Class.Model.DTO.Promotion;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.Promotion
{
    public class PromotionValidationService
    {
        public const string WillMerchantID = "378459";

        internal static string Clean(string value)
        {
            return (value ?? "").Trim().ToUpperInvariant();
        }

        internal static decimal CalculateDiscount(string type, decimal configured, decimal original)
        {
            if (type == "AMOUNT")
                return Math.Min(original, configured);

            return Math.Min(original, Math.Round(original * configured / 100m, 2, MidpointRounding.AwayFromZero));
        }

        internal static PromotionValidationResult Invalid(string code, string message)
        {
            return new PromotionValidationResult
            {
                IsValid = false,
                Code = code,
                Message = message
            };
        }

        public async Task<PromotionValidationResult> ValidateAsync(string merchantId, PromotionValidationRequest request)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                return await ValidateAsync(db, merchantId, request);
            }
        }

        // Internal overload allows utilization to validate
        // within its existing database transaction.
        internal async Task<PromotionValidationResult> ValidateAsync(Sandbox_BasedEntities db, string merchantId, PromotionValidationRequest request)
        {
            if (merchantId != WillMerchantID)
                return Invalid("INVALID_MERCHANT", "Promotion is unavailable for this merchant.");

            if (request == null)
                return Invalid("INVALID_REQUEST", "Invalid promotion request.");

            string code = Clean(request.PromotionCode);
            string type = Clean(request.PromotionType);
            string willType = Clean(request.WillType);

            if (code.Length == 0)
                return Invalid("INVALID_CODE", "Promotion code is required.");

            if (type != "WILL" && type != "CUSTODY")
                return Invalid("INVALID_TYPE", "Invalid promotion type.");

            if (type == "WILL" && willType != "BASIC" && willType != "EXCLUSIVE" &&  willType != "PREMIUMS")
                return Invalid("INVALID_WILL_TYPE", "Invalid Will Type.");

            if (request.MemberID <= 0)
                return Invalid("INVALID_MEMBER", "Invalid member.");

            if (request.OriginalAmount < 0)
                return Invalid("INVALID_AMOUNT", "Original amount cannot be negative.");

            bool memberExists = await db.tbl_MemberInfo
                .AsNoTracking()
                .AnyAsync(x => x.RowID == request.MemberID && !x.IsDeleted && x.Status == 0);

            bool memberInWill = await db.tbl_Reference
                .AsNoTracking()
                .AnyAsync(x => x.MemberID == request.MemberID && x.MerchantID == merchantId && x.Status == 0);

            if (!memberExists || !memberInWill)
                return Invalid("INVALID_MEMBER", "Member is not active in theWill.");

            var promotion = await db.tbl_Promotion
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.PromotionCode == code);

            if (promotion == null || promotion.IsDeleted)
                return Invalid("NOT_FOUND", "Invalid promotion code.");

            if (!promotion.IsActive)
                return Invalid("INACTIVE", "Promotion is inactive.");

            if (promotion.PromotionType != type)
                return Invalid("TYPE_MISMATCH", "Promotion is not applicable to this service.");

            // Expiry is inclusive of the selected date.
            if (promotion.ExpiredDate.HasValue && promotion.ExpiredDate.Value.Date < DateTime.Now.Date)
                return Invalid("EXPIRED", "Promotion has expired.");

            if (promotion.RemainingBalance <= 0)
                return Invalid("NO_BALANCE", "Promotion has no remaining balance.");

            if (promotion.TargetMemberID.HasValue && promotion.TargetMemberID.Value != request.MemberID)
                return Invalid("NOT_ELIGIBLE", "Promotion is not available for this member.");

            if (type == "WILL")
            {
                bool allowed = await db.tbl_Promotion_WillType
                    .AsNoTracking()
                    .AnyAsync(x => x.PromotionID == promotion.RowID && x.WillType == willType);

                if (!allowed)
                    return Invalid("WILL_TYPE_NOT_ALLOWED", "Promotion does not apply to this Will Type.");
            }

            decimal discount = CalculateDiscount(promotion.DiscountType, promotion.DiscountAmount, request.OriginalAmount);

            return new PromotionValidationResult
            {
                IsValid = true,
                Code = "VALID",
                Message = "Promotion is valid.",
                PromotionID = promotion.RowID,
                PromotionCode = promotion.PromotionCode,
                DiscountType = promotion.DiscountType,
                ConfiguredDiscount = promotion.DiscountAmount,
                AppliedDiscount = discount,
                FinalAmount = request.OriginalAmount - discount,
                RemainingBalance = promotion.RemainingBalance
            };
        }
    }
}