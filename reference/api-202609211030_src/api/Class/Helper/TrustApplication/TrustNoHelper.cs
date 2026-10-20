using API_CPX.Context;
using System;
using System.Globalization;

namespace API_CPX.Class.Helper.TrustApplication
{
    public static class TrustNoHelper
    {
        public static string Format(string productCategory, long productTrustNo, DateTime? createdAt)
        {
            if (string.IsNullOrWhiteSpace(productCategory))
                throw new ArgumentException("Product category is required.", nameof(productCategory));

            if (productTrustNo <= 0)
                throw new ArgumentOutOfRangeException(nameof(productTrustNo));

            /*
            return string.Format(
                CultureInfo.InvariantCulture,
                "{0}/{1:D4}/{2:yyyy}",
                productCategory.Trim(),
                productTrustNo,
                createdAt);
            */
            return FormatNumber(productTrustNo);
        }

        public static string Format(tbl_TrustApplication application)
        {
            if (application == null)
                throw new ArgumentNullException(nameof(application));

            return FormatNumber(application.ProductTrustNo);
            //return Format(application.ProductCategory, application.ProductTrustNo, application.CreatedAt);
        }

        public static string FormatNumber(long productTrustNo)
        {
            if (productTrustNo <= 0)
                throw new ArgumentOutOfRangeException(nameof(productTrustNo));

            return productTrustNo.ToString("D4", CultureInfo.InvariantCulture);
        }
    }
}