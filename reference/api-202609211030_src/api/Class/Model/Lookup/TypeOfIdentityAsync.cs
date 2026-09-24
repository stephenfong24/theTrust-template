using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class TypeOfIdentityAsync : Base
    {
        private IEnumerable<TypeOfIdentityList> typeOfIdentityLists;

        public IEnumerable<TypeOfIdentityList> TypeOfIdentityLists
        {
            get { return typeOfIdentityLists; }
            set { typeOfIdentityLists = value; }
        }

        public async Task<bool> GetTypeOfIdentityList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var identityTypes = await dbR.tbl_Type_Of_Identity
                    .Where(a => a.Status == 0)
                    .OrderBy(a => a.Sort)
                    .Select(a => new TypeOfIdentityList
                    {
                        IdentityCode = a.Identity_Code,
                        IdentityName = a.Identity_Name
                    })
                    .ToListAsync();

                TypeOfIdentityLists = identityTypes;

                Message = "Success";
                return true;
            }
        }

        public class TypeOfIdentityList
        {
            public string IdentityCode { get; set; }

            public string IdentityName { get; set; }
        }
    }
}