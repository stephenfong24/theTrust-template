using API_CPX.Class.Helper;
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
                    var application = await commonService.GetApplicationForStepUpdateAsync(db, merchantId, userId, roleCode, request.TrustID);

                    if (commonService.IsAgent(roleCode))
                    {
                        commonService.ValidateStepAccess(application, 6, roleCode);
                    }

                    // Supporting Documents are OPTIONAL.
                    // Therefore no document record is required here

                    commonService.CompleteStepSave(application, 6, userId, roleCode);

                    // ====================================================
                    // Step 7 - Co-Broker Temporarily Disabled
                    //
                    // After Step 6 Save & Next, skip Step 7 and proceed
                    // directly to Step 8 - Review.
                    // ====================================================

                    if (application.CurrentStep < 8)
                    {
                        application.CurrentStep = 8;
                    }

                    // ====================================================
                    // Trust Application History
                    // ====================================================

                    TrustApplicationHistoryHelper.Add(
                        db,
                        application.RowID,
                        "STEP_6_COMPLETED",
                        "Step 6 Completed",
                        "Supporting Documents step was completed.",
                        userId,
                        "APPLICATION",
                        application.RowID);

                    // ====================================================
                    // Save
                    // ====================================================

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