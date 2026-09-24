using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Context;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Step6
{
    public class TrustApplicationStep6ServiceAsync
    {
        private readonly TrustApplicationCommonService commonService;

        private readonly TrustApplicationStep6Validator validator;

        public TrustApplicationStep6ServiceAsync()
        {
            commonService = new TrustApplicationCommonService();
            validator = new TrustApplicationStep6Validator();
        }

        public async Task<TrustApplicationStepResult> SaveAsync(string merchantId, long userId, string roleCode, TrustApplicationStep6Request request)
        {
            validator.Validate(request);

            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction())
            {
                try
                {
                    var application = await commonService.GetDraftApplicationForAgentUpdateAsync(db, merchantId, userId, roleCode, request.TrustID);

                    commonService.ValidateStepAccess(application, 6, roleCode);

                    // Supporting Documents are OPTIONAL.
                    //
                    // Therefore:
                    // no document record is required here.

                    commonService.UpdateProgress( application, 6, userId);
                    await db.SaveChangesAsync();
                    transaction.Commit();
                    return commonService.ToResult(application);
                }
                catch
                {
                    transaction.Rollback();
                    throw;
                }
            }
        }
    }
}