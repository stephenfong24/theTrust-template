using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class ReligionAsync : Base
    {
        private IEnumerable<ReligionList> religionLists;

        public IEnumerable<ReligionList> ReligionLists
        {
            get { return religionLists; }
            set { religionLists = value; }
        }

        public async Task<bool> GetReligionList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var religions = await dbR.tbl_Religion
                    .Where(a => a.Status == 0)
                    .OrderBy(a => a.Sort)
                    .Select(a => new ReligionList
                    {
                        ReligionCode = a.Religion_Code,
                        ReligionName = a.Religion_Name
                    })
                    .ToListAsync();

                ReligionLists = religions;

                Message = "Success";
                return true;
            }
        }

        public class ReligionList
        {
            public string ReligionCode { get; set; }

            public string ReligionName { get; set; }
        }
    }
}