using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class UnitTrustAccountTypeAsync : Base
    {
        private IEnumerable<UnitTrustAccountTypeList> unitTrustAccountTypeLists;

        public IEnumerable<UnitTrustAccountTypeList> UnitTrustAccountTypeLists
        {
            get { return unitTrustAccountTypeLists; }
            set { unitTrustAccountTypeLists = value; }
        }

        public async Task<bool> GetUnitTrustAccountTypeList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var accountTypes = await dbR.tbl_UnitTrust_Account_Type
                    .Where(a => a.Status == 0)
                    .OrderBy(a => a.Sort)
                    .Select(a => new UnitTrustAccountTypeList
                    {
                        AccountTypeCode = a.Account_Type_Code,
                        AccountTypeName = a.Account_Type_Name
                    })
                    .ToListAsync();

                UnitTrustAccountTypeLists = accountTypes;

                Message = "Success";
                return true;
            }
        }

        public class UnitTrustAccountTypeList
        {
            public string AccountTypeCode { get; set; }

            public string AccountTypeName { get; set; }
        }
    }
}