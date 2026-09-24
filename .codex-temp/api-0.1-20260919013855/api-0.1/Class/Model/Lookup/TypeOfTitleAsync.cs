using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class TypeOfTitleAsync : Base
    {
        private IEnumerable<TypeOfTitleList> typeOfTitleLists;

        public IEnumerable<TypeOfTitleList> TypeOfTitleLists
        {
            get { return typeOfTitleLists; }
            set { typeOfTitleLists = value; }
        }

        public async Task<bool> GetTypeOfTitleList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var titleTypes = await dbR.tbl_Type_Of_Title
                    .Where(a => a.Status == 0)
                    .OrderBy(a => a.Sort)
                    .Select(a => new TypeOfTitleList
                    {
                        TitleTypeCode = a.Title_Type_Code,
                        TitleTypeName = a.Title_Type_Name
                    })
                    .ToListAsync();

                TypeOfTitleLists = titleTypes;

                Message = "Success";
                return true;
            }
        }

        public class TypeOfTitleList
        {
            public string TitleTypeCode { get; set; }

            public string TitleTypeName { get; set; }
        }
    }
}