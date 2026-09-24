using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Common
{
    public class TrustApplicationCommonService
    {
        public async Task<tbl_TrustApplication> GetApplicationAsync(Sandbox_BasedEntities db, string merchantId, long trustId)
        {
            var application = await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);
            if (application == null)
            {
                throw new BusinessException("Trust application not found.", "TRUST-APPLICATION");
            }

            return application;
        }

        // =============================================================
        // Agent - Draft Application Update
        // =============================================================

        public async Task<tbl_TrustApplication> GetApplicationForStepUpdateAsync(Sandbox_BasedEntities db, string merchantId, long userId, string roleCode, long trustId)
        {
            const string code = "TRUST-APPLICATION";
            var application = await GetApplicationAsync(db, merchantId, trustId);

            // =========================================================
            // Agent
            //
            // Can only update:
            // - own application
            // - DRAFT
            // =========================================================

            if (IsAgent(roleCode))
            {
                if (application.MemberID != userId)
                {
                    throw new BusinessException("You are not allowed to update this Trust Application.", code);
                }

                if (!string.Equals(application.ApplicationStatus, "DRAFT", StringComparison.OrdinalIgnoreCase))
                {
                    throw new BusinessException("Submitted Trust Applications can no longer be edited by the Agent.", code);
                }

                return application;
            }

            // =========================================================
            // Superadmin / Admin
            //
            // Can only update submitted/non-DRAFT application.
            // No ownership restriction.
            // =========================================================

            if (IsAdmin(roleCode))
            {
                if (string.Equals(application.ApplicationStatus, "DRAFT", StringComparison.OrdinalIgnoreCase))
                {
                    throw new BusinessException("Draft Trust Applications can only be edited by the Trust Agent.", code);
                }

                return application;
            }

            // =========================================================
            // Other roles
            // =========================================================

            throw new BusinessException("You are not allowed to update this Trust Application.", code);
        }

        public async Task<tbl_TrustApplication> GetDraftApplicationForAgentUpdateAsync(Sandbox_BasedEntities db, string merchantId, long userId, string roleCode, long trustId)
        {
            const string code = "TRUST-APPLICATION";

            // =========================================================
            // Agent Only
            // =========================================================

            if (!IsAgent(roleCode))
            {
                throw new BusinessException("Only Trust Agents are allowed to update a draft Trust Application.", code);
            }

            // =========================================================
            // Get Application
            // =========================================================

            var application = await GetApplicationAsync(db, merchantId, trustId);

            // =========================================================
            // Must Be Owner
            // =========================================================

            if (application.MemberID != userId)
            {
                throw new BusinessException("You are not allowed to update this Trust Application.", code);
            }

            // =========================================================
            // Must Be DRAFT
            // =========================================================

            if (!string.Equals(application.ApplicationStatus, "DRAFT", StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessException("Submitted Trust Applications can no longer be edited by the Agent.", code);
            }

            return application;
        }

        // =============================================================
        // Agent - Draft Read
        //
        // Used by Step 8 Review.
        // =============================================================

        public async Task<tbl_TrustApplication> GetDraftApplicationForAgentReadAsync(Sandbox_BasedEntities db, string merchantId, long userId, string roleCode, long trustId)
        {
            const string code = "TRUST-APPLICATION";

            if (!IsAgent(roleCode))
            {
                throw new BusinessException("Only Trust Agents are allowed to access the Trust Application wizard.", code);
            }

            var application = await GetApplicationAsync(db, merchantId, trustId);

            if (application.MemberID != userId)
            {
                throw new BusinessException("You are not allowed to access this Trust Application.", code);
            }

            if (!string.Equals(application.ApplicationStatus, "DRAFT", StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessException("This Trust Application has already been submitted.", code);
            }

            return application;
        }

        public async Task<tbl_TrustApplication> GetApplicationForFormReadAsync(Sandbox_BasedEntities db, string merchantId, long userId, string roleCode, long trustId)
        {
            const string code = "GET-TRUST-APPLICATION";
            var application = await GetApplicationAsync(db, merchantId, trustId);

            // =========================================================
            // Agent
            //
            // Agent can read his own application.
            //
            // Allow both:
            // DRAFT  -> continue/edit wizard
            // ACTIVE -> view submitted application
            //
            // Save APIs still control whether modification is allowed.
            // =========================================================

            if (IsAgent(roleCode))
            {
                if (application.MemberID != userId)
                {
                    throw new BusinessException("You are not allowed to view this Trust Application.", code);
                }
                return application;
            }

            // =========================================================
            // Superadmin / Admin
            //
            // Admin edit flow is for submitted/non-DRAFT applications.
            // =========================================================

            if (IsAdmin(roleCode))
            {
                if (string.Equals(application.ApplicationStatus, "DRAFT", StringComparison.OrdinalIgnoreCase))
                {
                    //throw new BusinessException("Draft Trust Applications can only be accessed by the Trust Agent.", code);
                }
                return application;
            }

            // =========================================================
            // Other roles
            // =========================================================

            throw new BusinessException("You are not allowed to view this Trust Application.", code);
        }

        public void ValidateStepAccess(tbl_TrustApplication application, int requestedStep, string roleCode)
        {
            // =========================================================
            // Wizard Is Agent Only
            // =========================================================

            if (!IsAgent(roleCode))
            {
                throw new BusinessException("The Trust Application wizard is only available to Trust Agents.", "TRUST-APPLICATION-STEP-ACCESS");
            }

            if (requestedStep <= 1)
            {
                return;
            }

            int requiredCompletedStep = requestedStep - 1;

            if (application.LastCompletedStep < requiredCompletedStep)
            {
                throw new BusinessException("Please complete Step " + requiredCompletedStep + " before proceeding to Step " + requestedStep + ".", "TRUST-APPLICATION-STEP-ACCESS");
            }
        }

        public void UpdateProgress(tbl_TrustApplication application, int completedStep, long userId)
        {
            if (application.LastCompletedStep < completedStep)
            {
                application.LastCompletedStep = completedStep;
            }

            int nextStep = completedStep < 8 ? completedStep + 1 : 8;

            if (application.CurrentStep < nextStep)
            {
                application.CurrentStep = nextStep;
            }

            application.UpdatedAt = DateTime.Now;
            application.UpdatedBy = userId;
        }

        public void CompleteStepSave(tbl_TrustApplication application, int completedStep, long userId, string roleCode)
        {
            if (IsAgent(roleCode))
            {
                UpdateProgress(application, completedStep, userId);
                return;
            }

            if (IsAdmin(roleCode))
            {
                application.UpdatedAt = DateTime.Now;
                application.UpdatedBy = userId;
                return;
            }

            throw new BusinessException("You are not allowed to update this Trust Application.", "TRUST-APPLICATION");
        }

        public bool IsAgent(string roleCode)
        {
            return string.Equals(roleCode, "AG", StringComparison.OrdinalIgnoreCase);
        }

        public bool IsAdmin(string roleCode)
        {
            return
                string.Equals(
                    roleCode,
                    "SA",
                    StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(
                    roleCode,
                    "AD",
                    StringComparison.OrdinalIgnoreCase);
        }

        public TrustApplicationStepResult ToResult(tbl_TrustApplication application)
        {
            return new TrustApplicationStepResult
            {
                TrustApplicationID = application.RowID,
                TrustID = application.TrustID,
                TrustNo = application.TrustID.ToString("D4"),
                ApplicationStatus = application.ApplicationStatus,
                CurrentStep = application.CurrentStep,
                LastCompletedStep = application.LastCompletedStep
            };
        }
    }
}