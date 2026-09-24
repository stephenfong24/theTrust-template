using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class TypeOfPropertyAsync : Base
    {
        private IEnumerable<TypeOfPropertyList> typeOfPropertyLists;

        public IEnumerable<TypeOfPropertyList> TypeOfPropertyLists
        {
            get { return typeOfPropertyLists; }
            set { typeOfPropertyLists = value; }
        }

        public async Task<bool> GetTypeOfPropertyList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var properties = await dbR.tbl_Type_Of_Property
                    .Where(a => a.Status == 0)
                    .OrderBy(a => a.Sort)
                    .Select(a => new TypeOfPropertyList
                    {
                        PropertyTypeCode = a.Property_Type_Code,
                        PropertyTypeName = a.Property_Type_Name
                    })
                    .ToListAsync();

                TypeOfPropertyLists = properties.OrderBy(a => a.PropertyTypeName).ToList();

                Message = "Success";
                return true;
            }
        }

        public class TypeOfPropertyList
        {
            public string PropertyTypeCode { get; set; }
            public string PropertyTypeName { get; set; }
        }
    }
}