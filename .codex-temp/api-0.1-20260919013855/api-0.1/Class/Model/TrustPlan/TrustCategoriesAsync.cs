using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Model
{
    public class TrustCategoriesAsync
    {
        public IEnumerable<TrustCategoryItem> TrustCategory { get; set; }

        public async Task<IEnumerable<TrustCategoryItem>> GetTrustCategoryListAsync(string MerchantId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                var query = db.tbl_TrustCategories.Where(x => x.MerchantID == MerchantId && x.Status == 0);

                return await query
                    .OrderBy(x => x.Sort)
                    .Select(x => new TrustCategoryItem
                    {
                        CategoryID = x.CategoryID,
                        CategoryName = x.CategoryName
                    })
                    .ToListAsync();
            }
        }
    }

    public class TrustCategoryItem
    {
        public string CategoryID { get; set; }
        public string CategoryName { get; set; }
    }
}