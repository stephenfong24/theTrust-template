using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class TypeOfExecutorAsync : Base
    {
        private IEnumerable<TypeOfExecutorList> typeOfExecutorLists;

        public IEnumerable<TypeOfExecutorList> TypeOfExecutorLists
        {
            get { return typeOfExecutorLists; }
            set { typeOfExecutorLists = value; }
        }

        public async Task<bool> GetTypeOfExecutorList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var executorTypes = await dbR.tbl_Type_Of_Executor
                    .Where(a => a.Status == 0)
                    .OrderBy(a => a.Sort)
                    .Select(a => new TypeOfExecutorList
                    {
                        ExecutorCode = a.Executor_Code,
                        ExecutorName = a.Executor_Name
                    })
                    .ToListAsync();

                TypeOfExecutorLists = executorTypes;

                Message = "Success";
                return true;
            }
        }

        public class TypeOfExecutorList
        {
            public string ExecutorCode { get; set; }

            public string ExecutorName { get; set; }
        }
    }
}