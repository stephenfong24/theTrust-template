using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class TypeOfPaymentToTrusteeAsync : Base
    {
        private IEnumerable<TypeOfPaymentToTrusteeList> typeOfPaymentToTrusteeLists;

        public IEnumerable<TypeOfPaymentToTrusteeList> TypeOfPaymentToTrusteeLists
        {
            get { return typeOfPaymentToTrusteeLists; }
            set { typeOfPaymentToTrusteeLists = value; }
        }

        public async Task<bool> GetTypeOfPaymentToTrusteeList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var paymentTypes = await dbR.tbl_Type_Of_Payment_To_Trustee
                    .Where(a => a.Status == 0)
                    .OrderBy(a => a.Sort)
                    .Select(a => new TypeOfPaymentToTrusteeList
                    {
                        PaymentToTrusteeCode = a.Payment_To_Trustee_Code,
                        PaymentToTrusteeName = a.Payment_To_Trustee_Name
                    })
                    .ToListAsync();

                TypeOfPaymentToTrusteeLists = paymentTypes;

                Message = "Success";
                return true;
            }
        }

        public class TypeOfPaymentToTrusteeList
        {
            public string PaymentToTrusteeCode { get; set; }

            public string PaymentToTrusteeName { get; set; }
        }
    }
}