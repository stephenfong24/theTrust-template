using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class FuneralMethodAsync : Base
    {
        private IEnumerable<FuneralMethodList> funeralMethodLists;

        public IEnumerable<FuneralMethodList> FuneralMethodLists
        {
            get { return funeralMethodLists; }
            set { funeralMethodLists = value; }
        }

        public async Task<bool> GetFuneralMethodList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var funeralMethods = await dbR.tbl_Funeral_Method
                    .Where(a => a.Status == 0)
                    .OrderBy(a => a.Sort)
                    .Select(a => new FuneralMethodList
                    {
                        FuneralCode = a.Funeral_Code,
                        FuneralName = a.Funeral_Name
                    })
                    .ToListAsync();

                FuneralMethodLists = funeralMethods;

                Message = "Success";
                return true;
            }
        }

        public class FuneralMethodList
        {
            public string FuneralCode { get; set; }

            public string FuneralName { get; set; }
        }
    }
}