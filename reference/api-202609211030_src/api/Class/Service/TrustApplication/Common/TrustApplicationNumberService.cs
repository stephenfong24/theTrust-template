using API_CPX.Class.Exceptions;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Common
{
    public class TrustApplicationNumberService
    {
        private const string Code = "TRUST-APPLICATION-NUMBER";

        public async Task<string> GetProductCategoryAsync(Sandbox_BasedEntities db, string merchantId, string productCode)
        {
            if (string.IsNullOrWhiteSpace(productCode))
                throw new BusinessException("ProductCode is required.", Code);

            string normalizedCode = productCode.Trim();

            var categories = await db.tbl_TrustPlan
                .AsNoTracking()
                .Where(x => x.ProductCode == normalizedCode && x.ProductStatus == "ACTIVE")
                .Select(x => x.ProductCategory)
                .Take(2)
                .ToListAsync();

            if (categories.Count != 1 || string.IsNullOrWhiteSpace(categories[0]))
            {
                throw new BusinessException("Invalid or ambiguous active trust product.", Code);
            }

            string category = categories[0].Trim();

            bool categoryExists = await db.tbl_TrustCategories
                .AsNoTracking()
                .AnyAsync(x => x.MerchantID == merchantId && x.CategoryID == category && x.Status == 0);

            if (!categoryExists)
            {
                throw new BusinessException("Trust product category is not active.", Code);
            }

            return category;
        }

        public async Task<long> AllocateAsync(Sandbox_BasedEntities db, string merchantId, string productCategory)
        {
            if (string.IsNullOrWhiteSpace(merchantId) || string.IsNullOrWhiteSpace(productCategory))
            {
                throw new BusinessException("Merchant and product category are required.", Code);
            }

            string category = productCategory.Trim();

            var sequence = await db.tbl_TrustApplication_NumberSequence
                .FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.ProductCategory == category);

            if (sequence == null)
            {
                // First application for a newly introduced category.
                // This insert must remain inside the caller's
                // Serializable transaction.
                sequence = new tbl_TrustApplication_NumberSequence
                {
                    MerchantID = merchantId,
                    ProductCategory = category,
                    LastNumber = 0
                };

                db.tbl_TrustApplication_NumberSequence.Add(sequence);
            }

            if (sequence.LastNumber == long.MaxValue)
            {
                throw new BusinessException("Trust numbering limit reached.", Code);
            }

            sequence.LastNumber++;

            // Flush the sequence update within the existing transaction.
            // This does not commit the transaction.
            await db.SaveChangesAsync();

            return sequence.LastNumber;
        }
    }
}