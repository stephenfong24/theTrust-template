using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;

namespace API_CPX.Class.Service.TrustApplication.Step6
{
    public class TrustApplicationStep6Validator
    {
        public void Validate(TrustApplicationStep6Request request)
        {
            const string code = "SAVE-TRUST-APPLICATION-STEP-6";

            if (request == null)
            {
                throw new BusinessException("Invalid request.", code);
            }

            if (request.TrustID <= 0)
            {
                throw new BusinessException("Trust ID is required.", code);
            }
        }
    }
}