using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Model
{
    public class BankAsync : Base
    {
        private IEnumerable<BankList> bankLists;

        public IEnumerable<BankList> BankLists
        {
            get { return bankLists; }
            set { bankLists = value; }
        }

        public async Task<bool> GetBankList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var bank = await dbR.tbl_Master_BankList
                    .Where(a => a.Status == 0)
                    .Select(a => new BankList
                    {
                        id = a.RowID,
                        BankName = a.BankName,
                        BankDescription = a.BankNameDetail.ToUpper()
                    })
                    .ToListAsync();

                BankLists = bank
                    .OrderBy(a => a.BankDescription)
                    .ToList();

                Message = "Success";
                return true;
            }
        }

        public class BankList
        {
            public long id { get; set; }
            public string BankName { get; set; }
            public string BankDescription { get; set; }
        }
    }
}