using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;

namespace API_CPX.Class.Service.TrustApplication.Step8
{
    public class TrustApplicationSubmitValidator
    {
        public void Validate(
            SubmitTrustApplicationRequest request)
        {
            const string code =
                "SUBMIT-TRUST-APPLICATION";


            if (request == null)
            {
                throw new BusinessException(
                    "Invalid request.",
                    code);
            }


            if (request.TrustID <= 0)
            {
                throw new BusinessException(
                    "Trust ID is required.",
                    code);
            }
        }
    }
}