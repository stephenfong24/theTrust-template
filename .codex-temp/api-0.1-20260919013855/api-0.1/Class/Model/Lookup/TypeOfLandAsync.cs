using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class TypeOfLandAsync : Base
    {
        private IEnumerable<TypeOfLandList> typeOfLandLists;

        public IEnumerable<TypeOfLandList> TypeOfLandLists
        {
            get { return typeOfLandLists; }
            set { typeOfLandLists = value; }
        }

        public async Task<bool> GetTypeOfLandList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var lands = await dbR.tbl_Type_Of_Land
                    .Where(a => a.Status == 0)
                    .Select(a => new TypeOfLandList
                    {
                        LandCode = a.Land_Code,
                        LandName = a.Land_Name
                    })
                    .ToListAsync();

                TypeOfLandLists = lands.OrderBy(a => a.LandName).ToList();
                Message = "Success";
                return true;
            }
        }

        public class TypeOfLandList
        {
            public string LandCode { get; set; }
            public string LandName { get; set; }
        }
    }
}