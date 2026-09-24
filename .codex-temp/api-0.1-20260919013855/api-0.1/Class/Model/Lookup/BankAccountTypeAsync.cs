using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class BankAccountTypeAsync : Base
    {
        private IEnumerable<BankAccountTypeList> bankAccountTypeLists;

        public IEnumerable<BankAccountTypeList> BankAccountTypeLists
        {
            get { return bankAccountTypeLists; }
            set { bankAccountTypeLists = value; }
        }

        public async Task<bool> GetBankAccountTypeList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var accountTypes = await dbR.tbl_Bank_Account_Type
                    .Where(a => a.Status == 0)
                    .OrderBy(a => a.Sort)
                    .Select(a => new BankAccountTypeList
                    {
                        BankAccountTypeCode = a.BankAccountType_Code,
                        BankAccountTypeName = a.BankAccountType_Name
                    })
                    .ToListAsync();

                BankAccountTypeLists = accountTypes.ToList();

                Message = "Success";
                return true;
            }
        }

        public class BankAccountTypeList
        {
            public string BankAccountTypeCode { get; set; }

            public string BankAccountTypeName { get; set; }
        }
    }
}