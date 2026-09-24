using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class TypeOfAssetAllocationAsync : Base
    {
        private IEnumerable<TypeOfAssetAllocationList> typeOfAssetAllocationLists;

        public IEnumerable<TypeOfAssetAllocationList> TypeOfAssetAllocationLists
        {
            get { return typeOfAssetAllocationLists; }
            set { typeOfAssetAllocationLists = value; }
        }

        public async Task<bool> GetTypeOfAssetAllocationList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var assetAllocationTypes = await dbR.tbl_Type_Of_Asset_Allocation
                    .Where(a => a.Status == 0)
                    .OrderBy(a => a.Sort)
                    .Select(a => new TypeOfAssetAllocationList
                    {
                        AssetAllocationCode = a.Asset_Allocation_Code,
                        AssetAllocationName = a.Asset_Allocation_Name
                    })
                    .ToListAsync();

                TypeOfAssetAllocationLists = assetAllocationTypes;

                Message = "Success";
                return true;
            }
        }

        public class TypeOfAssetAllocationList
        {
            public string AssetAllocationCode { get; set; }

            public string AssetAllocationName { get; set; }
        }
    }
}