using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Step1;
using API_CPX.Class.Service.TrustApplication.Step2;
using API_CPX.Class.Service.TrustApplication.Step3;
using API_CPX.Class.Service.TrustApplication.Step4;
using API_CPX.Class.Service.TrustApplication.Step5;
using System;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web.Http;
using API_CPX.Class.Model;
using API_CPX.Class.Service.TrustApplication.Step6;
using API_CPX.Class.Service.TrustApplication.Step7;
using API_CPX.Class.Service.TrustApplication.Step8;
using API_CPX.Class.Service.TrustApplication.Query;
using API_CPX.Class.Service.TrustApplication;
using System.Linq;
using API_CPX.Class.Service.TrustApplication.List;
using API_CPX.Class.Service.TrustApplication.Payment;
using System.Globalization;
using API_CPX.Class.Model.DTO.Payment;
using API_CPX.Class.Service.TrustApplication.Document;
using System.IO;
using System.Configuration;
using API_CPX.Class.Model.DTO.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Workflow;
using API_CPX.Class.Service.TrustApplication.History;
using API_CPX.Class.Service.TrustApplication.Delete;

namespace API_CPX.Controllers
{
    [RoutePrefix("api/trust-application")]
    [JwtAuthorize]
    public class TrustApplicationController : ApiController
    {
        // ============================================================
        // Get Trust Application History
        //
        // AG:
        // - Own Trust Application only
        //
        // SA / AD / OP / AC:
        // - Can view Trust Application history
        // ============================================================

        [HttpGet]
        [Route("{trustId:long}/history")]
        public async Task<IHttpActionResult> GetTrustApplicationHistory(long trustId)
        {
            const string code = "GET-TRUST-APPLICATION-HISTORY";
            Request.Properties["AuditTitle"] = "Trust Application History Viewed";
            Request.Properties["AuditDescription"] = "Attempted to retrieve Trust Application history.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationHistoryServiceAsync();
                var result = await service.GetHistoryAsync(merchantId, userId, roleCode, trustId);

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = result
                    });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to retrieve Trust Application history.", code, ex);
            }
        }

        // ============================================================
        // Get Trust Application Documents
        // ============================================================

        [HttpGet]
        [Route("{trustId:long}/documents")]
        public async Task<IHttpActionResult> GetDocuments(long trustId)
        {
            const string code = "GET-TRUST-APPLICATION-DOCUMENTS";
            Request.Properties["AuditTitle"] = "Trust Application Documents Viewed";
            Request.Properties["AuditDescription"] = "Attempted to retrieve Trust Application documents.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationDocumentServiceAsync();
                var result = await service.GetDocumentsAsync(merchantId, userId, roleCode, trustId);

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = result
                    });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to retrieve Trust Application documents.", code, ex);
            }
        }

        // ============================================================
        // Get Trust Application
        //
        // AG:
        // - own Trust Application only
        // - DRAFT / submitted
        //
        // SA / AD:
        // - submitted/non-DRAFT Trust Application
        //
        // Returns all saved Step 1 - Step 7 information.
        // ============================================================

        [HttpGet]
        [Route("{trustId:long}")]
        public async Task<IHttpActionResult> GetTrustApplication(long trustId)
        {
            const string code = "GET-TRUST-APPLICATION";
            Request.Properties["AuditTitle"] = "Trust Application Viewed";
            Request.Properties["AuditDescription"] = "Attempted to retrieve Trust Application information.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationQueryServiceAsync();
                var result = await service.GetAsync(merchantId, userId, roleCode, trustId);

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = result
                    });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to retrieve Trust Application.", code, ex);
            }
        }

        // ============================================================
        // Step 1 - Personal Details
        // Create new Trust Application / Update existing Step 1
        // ============================================================

        [HttpPost]
        [Route("step-1")]
        public async Task<IHttpActionResult> SaveStep1(TrustApplicationStep1Request request)
        {
            const string code = "SAVE-TRUST-APPLICATION-STEP-1";
            Request.Properties["AuditTitle"] = "Trust Application Step 1 Saved";
            Request.Properties["AuditDescription"] = "Attempted to save Trust Application Step 1.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationStep1ServiceAsync();
                var result = await service.SaveAsync(merchantId, userId, roleCode, request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = result
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code, ex);
            }
        }

        // ============================================================
        // Step 2 - Trust Asset
        // ============================================================

        [HttpPost]
        [Route("step-2")]
        public async Task<IHttpActionResult> SaveStep2(TrustApplicationStep2Request request)
        {
            const string code = "SAVE-TRUST-APPLICATION-STEP-2";
            Request.Properties["AuditTitle"] = "Trust Application Step 2 Saved";
            Request.Properties["AuditDescription"] = "Attempted to save Trust Application Step 2.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationStep2ServiceAsync();
                var result = await service.SaveAsync(merchantId, userId, roleCode, request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = result
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code, ex);
            }
        }

        // ============================================================
        // Step 3 - Beneficiaries Details
        // ============================================================

        [HttpPost]
        [Route("step-3")]
        public async Task<IHttpActionResult> SaveStep3(TrustApplicationStep3Request request)
        {
            const string code = "SAVE-TRUST-APPLICATION-STEP-3";
            Request.Properties["AuditTitle"] = "Trust Application Step 3 Saved";
            Request.Properties["AuditDescription"] = "Attempted to save Trust Application Beneficiaries.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationStep3ServiceAsync();
                var result = await service.SaveAsync(merchantId, userId, roleCode, request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = result
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code, ex);
            }
        }

        // ============================================================
        // Step 4 - Beneficiary Allocations
        // ============================================================

        [HttpPost]
        [Route("step-4")]
        public async Task<IHttpActionResult> SaveStep4(TrustApplicationStep4Request request)
        {
            const string code = "SAVE-TRUST-APPLICATION-STEP-4";
            Request.Properties["AuditTitle"] = "Trust Application Step 4 Saved";
            Request.Properties["AuditDescription"] = "Attempted to save Trust Application Beneficiary Allocations.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationStep4ServiceAsync();
                var result = await service.SaveAsync(merchantId, userId, roleCode, request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = result
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code, ex);
            }
        }

        // ============================================================
        // Step 5 - Execution of Trust Deed
        // ============================================================

        [HttpPost]
        [Route("step-5")]
        public async Task<IHttpActionResult> SaveStep5(TrustApplicationStep5Request request)
        {
            const string code = "SAVE-TRUST-APPLICATION-STEP-5";
            Request.Properties["AuditTitle"] = "Trust Application Step 5 Saved";
            Request.Properties["AuditDescription"] = "Attempted to save Trust Application Execution of Trust Deed.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationStep5ServiceAsync();
                var result = await service.SaveAsync(merchantId, userId, roleCode, request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = result
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code, ex);
            }
        }

        // ============================================================
        // Step 6 - Upload Supporting Document
        // ============================================================

        [HttpPost]
        [Route("supporting-document")]
        public async Task<IHttpActionResult> UploadSupportingDocument(long trustId)
        {
            const string code = "UPLOAD-TRUST-APPLICATION-SUPPORTING-DOCUMENT";
            Request.Properties["AuditTitle"] = "Trust Application Supporting Document Uploaded";
            Request.Properties["AuditDescription"] = "Attempted to upload Trust Application supporting document.";
            string tempFilePath = null;
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                // ========================================================
                // Logged-in user
                // ========================================================

                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                // ========================================================
                // Validate multipart
                // ========================================================

                if (!Request.Content.IsMimeMultipartContent())
                {
                    throw new BusinessException("Multipart form-data is required.", code);
                }

                // ========================================================
                // Read Uploaded File
                //
                // Use your existing MultipartUploadHelper implementation.
                // ========================================================

                var multipart = await MultipartUploadHelper.ReadSingleFileAsync(Request);

                if (multipart == null || !multipart.IsSuccess)
                {
                    throw new BusinessException(
                        multipart?.Message
                            ?? "Supporting document is required.",
                        multipart?.Code
                            ?? code);
                }

                tempFilePath = multipart.TempFilePath;

                // ========================================================
                // Reusable FileUpload model
                // ========================================================

                var fileUpload =
                    new FileUpload
                    {
                        UserID = userId,
                        MerchantID = merchantId,
                        RoleCode = roleCode,
                        TrustID = trustId,
                        FileName = multipart.OriginalFileName,
                        FileType = multipart.ContentType,
                        FileSize = multipart.FileSize,
                        TempFilePath = multipart.TempFilePath
                    };

                // ========================================================
                // Actual secure upload
                // ========================================================

                bool success = await fileUpload.UploadTrustApplicationSupportingDocumentAsync();

                if (!success)
                {
                    throw new BusinessException(fileUpload.Message, code);
                }

                // Generic upload now owns/moved the temp file.
                tempFilePath = null;

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        SupportingDocumentID = fileUpload.SupportingDocumentID,
                        TrustID = trustId,
                        OriginalFileName = fileUpload.FileName,
                        FileSize = fileUpload.FileSize,
                        FileSHA256 = fileUpload.FileSHA256,
                        FileUrl = fileUpload.FileUrl,
                        UploadedFile = fileUpload.UploadedFile
                    }
                });
            }
            catch (BusinessException)
            {
                if (!string.IsNullOrWhiteSpace(tempFilePath))
                {
                    MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                }

                throw;
            }
            catch (Exception ex)
            {
                if (!string.IsNullOrWhiteSpace(tempFilePath))
                {
                    MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                }

                throw new BusinessException("Unable to upload supporting document.", code, ex);
            }
        }

        // ============================================================
        // Step 6 - Remove Supporting Document
        // ============================================================

        [HttpDelete]
        [Route("supporting-document/{supportingDocumentId:long}")]
        public async Task<IHttpActionResult> RemoveSupportingDocument(long supportingDocumentId)
        {
            const string code = "REMOVE-TRUST-APPLICATION-SUPPORTING-DOCUMENT";
            Request.Properties["AuditTitle"] = "Trust Application Supporting Document Removed";
            Request.Properties["AuditDescription"] = "Attempted to remove Trust Application supporting document.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationSupportingDocumentServiceAsync();
                await service.RemoveAsync(merchantId, userId, roleCode, supportingDocumentId);

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = new
                        {
                            SupportingDocumentID = supportingDocumentId
                        }
                    });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to remove supporting document.", code, ex);
            }
        }

        // ============================================================
        // Step 6 - Save & Next
        // ============================================================

        [HttpPost]
        [Route("step-6")]
        public async Task<IHttpActionResult> SaveStep6(TrustApplicationStep6Request request)
        {
            const string code = "SAVE-TRUST-APPLICATION-STEP-6";
            Request.Properties["AuditTitle"] = "Trust Application Step 6 Saved";
            Request.Properties["AuditDescription"] = "Attempted to save Trust Application Step 6.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationStep6ServiceAsync();
                var result = await service.SaveAsync(merchantId, userId, roleCode, request);

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = result
                    });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code, ex);
            }
        }

        // ============================================================
        // Step 7 - Co-Broker
        // ============================================================

        [HttpPost]
        [Route("step-7")]
        public async Task<IHttpActionResult> SaveStep7(TrustApplicationStep7Request request)
        {
            const string code = "SAVE-TRUST-APPLICATION-STEP-7";
            Request.Properties["AuditTitle"] = "Trust Application Step 7 Saved";
            Request.Properties["AuditDescription"] = "Attempted to save Trust Application Step 7.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationStep7ServiceAsync();
                var result = await service.SaveAsync(merchantId, userId, roleCode, request);

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = result
                    });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code, ex);
            }
        }

        // ============================================================
        // Step 8 - Review
        // ============================================================

        [HttpGet]
        [Route("{trustId:long}/review")]
        public async Task<IHttpActionResult> Review(long trustId)
        {
            const string code = "GET-TRUST-APPLICATION-REVIEW";
            Request.Properties["AuditTitle"] = "Trust Application Review";
            Request.Properties["AuditDescription"] = "Attempted to review Trust Application.";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                var identity = User.Identity as ClaimsIdentity;
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationReviewServiceAsync();
                var result = await service.GetAsync(merchantId, userId, roleCode, trustId);

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = result
                    });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code, ex);
            }
        }

        // ============================================================
        // Step 8 - Final Submit
        // ============================================================

        [HttpPost]
        [Route("submit")]
        public async Task<IHttpActionResult> Submit(SubmitTrustApplicationRequest request)
        {
            const string code = "SUBMIT-TRUST-APPLICATION";
            Request.Properties["AuditTitle"] = "Trust Application Submitted";
            Request.Properties["AuditDescription"] = "Attempted to submit Trust Application.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationSubmitServiceAsync();
                var result = await service.SubmitAsync(merchantId, userId, roleCode, request);

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = result
                    });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code, ex);
            }
        }

        // ============================================================
        // Submit Trust Application for Admin Approval
        //
        // PAYMENT_APPROVED -> PENDING_ADMIN_APPROVAL
        //
        // Roles:
        // AC = Account / Finance
        // AD = Admin
        // SA = Super Admin
        // ============================================================

        [HttpPost]
        [Route("{trustId:long}/submit-admin-approval")]
        [JwtAuthorize(Roles = "SA,AD,AC")]
        public async Task<IHttpActionResult> SubmitAdminApproval(long trustId, TrustApplicationWorkflowRequest request)
        {
            const string code = "SUBMIT-TRUST-APPLICATION-ADMIN-APPROVAL";
            Request.Properties["AuditTitle"] = "Submit Trust Application for Admin Approval";
            Request.Properties["AuditDescription"] = "Submit Trust Application from Payment Approved to Pending Admin Approval.";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                var identity = User.Identity as ClaimsIdentity;
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationWorkflowServiceAsync();
                var result = await service.SubmitForAdminApprovalAsync(merchantId, userId, roleCode, trustId, request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Trust Application submitted for Admin approval successfully.",
                    Code = code,
                    Data = result
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to submit Trust Application for Admin approval.", code, ex);
            }
        }

        // ============================================================
        // Admin Approve Trust Application
        //
        // PENDING_ADMIN_APPROVAL -> SENT_OUT
        //
        // This action also generates documents configured for
        // ADMIN_APPROVED.
        //
        // Roles:
        // AD = Admin
        // SA = Super Admin
        // ============================================================

        [HttpPost]
        [Route("{trustId:long}/admin-approve")]
        [JwtAuthorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> AdminApprove(long trustId, TrustApplicationWorkflowRequest request)
        {
            const string code = "ADMIN-APPROVE-TRUST-APPLICATION";
            Request.Properties["AuditTitle"] = "Admin Approve Trust Application";
            Request.Properties["AuditDescription"] = "Approve Trust Application and change status to Sent Out.";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                var identity = User.Identity as ClaimsIdentity;
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationWorkflowServiceAsync();
                var result = await service.AdminApproveAsync(merchantId, userId, roleCode, trustId, request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Trust Application approved successfully.",
                    Code = code,
                    Data = result
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to approve Trust Application.", code, ex);
            }
        }

        // ============================================================
        // Submit Trust Application for Stamping
        //
        // SENT_OUT -> STAMPING
        //
        // Roles:
        // OP = Operation
        // AD = Admin
        // SA = Super Admin
        // ============================================================

        [HttpPost]
        [Route("{trustId:long}/submit-stamping")]
        [JwtAuthorize(Roles = "SA,AD,OP")]
        public async Task<IHttpActionResult> SubmitStamping(long trustId, TrustApplicationWorkflowRequest request)
        {
            const string code = "SUBMIT-TRUST-APPLICATION-STAMPING";
            Request.Properties["AuditTitle"] = "Submit Trust Application for Stamping";
            Request.Properties["AuditDescription"] = "Submit Trust Application from Sent Out to Stamping.";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                var identity = User.Identity as ClaimsIdentity;
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationWorkflowServiceAsync();
                var result = await service.SubmitForStampingAsync(merchantId, userId, roleCode, trustId, request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Trust Application submitted for stamping successfully.",
                    Code = code,
                    Data = result
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to submit Trust Application for stamping.", code, ex);
            }
        }

        // ============================================================
        // Complete Trust Application
        //
        // STAMPING -> COMPLETED
        //
        // Later:
        // - Generate commission payout
        // - Generate dividend payout schedule
        //
        // Roles:
        // OP = Operation
        // AD = Admin
        // SA = Super Admin
        // ============================================================

        [HttpPost]
        [Route("{trustId:long}/complete")]
        [JwtAuthorize(Roles = "SA,AD,OP")]
        public async Task<IHttpActionResult> Complete(long trustId, TrustApplicationWorkflowRequest request)
        {
            const string code = "COMPLETE-TRUST-APPLICATION";
            Request.Properties["AuditTitle"] = "Complete Trust Application";
            Request.Properties["AuditDescription"] = "Complete Trust Application after stamping.";

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                var identity = User.Identity as ClaimsIdentity;
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationWorkflowServiceAsync();
                var result = await service.CompleteAsync(merchantId, userId, roleCode, trustId, request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Trust Application completed successfully.",
                    Code = code,
                    Data = result
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException("Unable to complete Trust Application.", code, ex);
            }
        }

        [HttpPost]
        [Route("{trustId:long}/reject")]
        [JwtAuthorize(Roles = "SA,AD,OP,AC")]
        public async Task<IHttpActionResult> Reject(
            long trustId,
            TrustApplicationWorkflowRequest request)
        {
            const string code =
                "REJECT-TRUST-APPLICATION";

            Request.Properties["AuditTitle"] =
                "Reject Trust Application";

            Request.Properties["AuditDescription"] =
                "Reject Trust Application before completion.";

            try
            {
                long userId =
                    Convert.ToInt64(
                        Request.Properties["UserID"]);

                string merchantId =
                    Convert.ToString(
                        Request.Properties["MerchantID"]);

                var identity =
                    User.Identity as ClaimsIdentity;

                string roleCode =
                    identity?
                        .FindFirst(ClaimTypes.Role)?
                        .Value;

                var service =
                    new TrustApplicationWorkflowServiceAsync();

                var result =
                    await service.RejectAsync(
                        merchantId,
                        userId,
                        roleCode,
                        trustId,
                        request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Trust Application rejected successfully.",
                    Code = code,
                    Data = result
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(
                    "Unable to reject Trust Application.",
                    code,
                    ex);
            }
        }

        [HttpPost]
        [Route("{trustId:long}/early-withdraw")]
        [JwtAuthorize(Roles = "SA,AD,OP")]
        public async Task<IHttpActionResult> EarlyWithdraw(
            long trustId,
            TrustApplicationWorkflowRequest request)
        {
            const string code =
                "EARLY-WITHDRAW-TRUST-APPLICATION";

            Request.Properties["AuditTitle"] =
                "Early Withdraw Trust Application";

            Request.Properties["AuditDescription"] =
                "Early withdraw a completed Trust Application.";

            try
            {
                long userId =
                    Convert.ToInt64(
                        Request.Properties["UserID"]);

                string merchantId =
                    Convert.ToString(
                        Request.Properties["MerchantID"]);

                var identity =
                    User.Identity as ClaimsIdentity;

                string roleCode =
                    identity?
                        .FindFirst(ClaimTypes.Role)?
                        .Value;

                var service =
                    new TrustApplicationWorkflowServiceAsync();

                var result =
                    await service.EarlyWithdrawAsync(
                        merchantId,
                        userId,
                        roleCode,
                        trustId,
                        request);

                return Ok(new
                {
                    Status = 0,
                    Message = "Trust Application early withdrawn successfully.",
                    Code = code,
                    Data = result
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(
                    "Unable to early withdraw Trust Application.",
                    code,
                    ex);
            }
        }

        // ============================================================
        // Delete Draft Trust Application
        //
        // Soft Delete:
        // DRAFT -> DELETED
        //
        // AG:
        // - Own application only.
        //
        // SA / AD:
        // - Any accessible Draft application.
        // ============================================================

        [HttpDelete]
        [Route("{trustId:long}")]
        public async Task<IHttpActionResult> DeleteDraftTrustApplication(long trustId)
        {
            const string code = "DELETE-DRAFT-TRUST-APPLICATION";
            Request.Properties["AuditTitle"] = "Delete Draft Trust Application";
            Request.Properties["AuditDescription"] = "Delete Draft Trust Application " + trustId.ToString("D4") + ".";

            var identity = User.Identity as ClaimsIdentity;
            long userId = Convert.ToInt64(Request.Properties["UserID"]);
            string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
            string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

            var service = new TrustApplicationDeleteServiceAsync();
            await service.DeleteAsync(merchantId, userId, roleCode, trustId);

            return Ok(
                new
                {
                    Status = 0,
                    Message = "Draft Trust Application deleted successfully.",
                    Code = code,
                    Date = (object)null
                });
        }

        [HttpGet]
        [Route("list")]
        public async Task<IHttpActionResult> GetApplicationList(
            int page = 1,
            int pageSize = 10,
            string search = null,
            string productCode = null,
            string applicationStatus = null,
            string agentSearch = null,
            DateTime? createdFrom = null,
            DateTime? createdTo = null,
            DateTime? submittedFrom = null,
            DateTime? submittedTo = null,
            string sortBy = "CREATED_AT",
            string sortDirection = "DESC")
        {
            try
            {
                var identity = User.Identity as ClaimsIdentity;
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var request =
                    new TrustApplicationListRequest
                    {
                        Page = page,
                        PageSize = pageSize,
                        Search = search,
                        ProductCode = productCode,
                        ApplicationStatus = applicationStatus,
                        AgentSearch = agentSearch,
                        CreatedFrom = createdFrom,
                        CreatedTo = createdTo,
                        SubmittedFrom = submittedFrom,
                        SubmittedTo = submittedTo,
                        SortBy = sortBy,
                        SortDirection = sortDirection
                    };

                var service = new TrustApplicationListServiceAsync();
                var result = await service.GetAsync(merchantId, userId, roleCode, request);

                return Ok(
                    new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "TRUST-APPLICATION-LIST",
                        Data = result
                    });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpPost]
        [JwtAuthorize]
        [Route("extract-malaysia-ic")]
        public async Task<IHttpActionResult> ExtractMalaysiaIc()
        {
            Request.Properties["AuditTitle"] = "Malaysian IC Extraction";
            Request.Properties["AuditDescription"] = "Attempted to extract Malaysian IC information.";
            const string code = "EXTRACT-MALAYSIA-IC";

            try
            {
                if (!Request.Content.IsMimeMultipartContent())
                {
                    throw new BusinessException("Please upload a valid IC image.", code);
                }

                var provider = await Request.Content.ReadAsMultipartAsync();

                // =========================================================
                // Step 2
                // Get source
                //
                // Expected multipart field:
                // source = TRUST_APPLICANT
                // source = TRUST_BENEFICIARY
                // source = TRUST_CARETAKER
                // source = AGENT_KYC
                // etc.
                // =========================================================

                var sourceContent =
                    provider.Contents.FirstOrDefault(
                        x =>
                            x.Headers.ContentDisposition != null &&
                            string.Equals(
                                x.Headers.ContentDisposition.Name
                                    ?.Trim('"'),
                                "source",
                                StringComparison.OrdinalIgnoreCase));

                if (sourceContent == null)
                {
                    throw new BusinessException(
                        "IC extraction source is required.",
                        code);
                }

                string source =
                    await sourceContent.ReadAsStringAsync();

                // =========================================================
                // TEMPORARY TESTING SOURCE
                // =========================================================

                source =
                    source?.Trim();

                if (string.IsNullOrWhiteSpace(source))
                {
                    throw new BusinessException(
                        "IC extraction source is required.",
                        code);
                }

                string[] allowedSources =
                {
                    "TRUST_APPLICANT",
                    "TRUST_BENEFICIARY",
                    "TRUST_CARETAKER",
                    "AGENT_KYC"
                };

                if (!allowedSources.Contains(
                    source,
                    StringComparer.OrdinalIgnoreCase))
                {
                    throw new BusinessException(
                        "Invalid IC extraction source.",
                        code);
                }

                // Store source consistently in database.
                source = source.ToUpperInvariant();

                // =========================================================
                // Step 3
                // Get logged-in UserID / MerchantID
                //
                // JwtAuthorize already places these values into
                // Request.Properties.
                // =========================================================

                var identity = User.Identity as ClaimsIdentity;
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                // =========================================================
                // Step 4
                // Find uploaded image
                // =========================================================

                var file = provider.Contents.FirstOrDefault(x => x.Headers.ContentDisposition != null && !string.IsNullOrWhiteSpace(x.Headers.ContentDisposition.FileName));

                if (file == null)
                {
                    throw new BusinessException("IC image is required.", code);
                }

                // =========================================================
                // Step 5
                // Validate MIME type
                // =========================================================

                string contentType = file.Headers.ContentType?.MediaType;

                string[] allowedTypes =
                {
                    "image/jpeg",
                    "image/png"
                };

                if (string.IsNullOrWhiteSpace(contentType) || !allowedTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
                {
                    throw new BusinessException("Only JPG and PNG images are allowed.", code);
                }

                // =========================================================
                // Step 6
                // Read image into memory
                //
                // No physical image storage.
                // Nothing is written to disk.
                // =========================================================

                byte[] imageBytes = await file.ReadAsByteArrayAsync();

                if (imageBytes == null || imageBytes.Length == 0)
                {
                    throw new BusinessException("Uploaded IC image is empty.", code);
                }

                const int maxFileSize = 5 * 1024 * 1024;

                if (imageBytes.Length > maxFileSize)
                {
                    throw new BusinessException("IC image cannot exceed 5MB.", code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "EXTRACT-MALAYSIA-IC",
                    Data = new
                    {
                        IsValidIC = true,
                        DocumentType = "MALAYSIA_NRIC",
                        ICNumber = new
                        {
                            Value = "810220086059",
                            Confidence = 0.99
                        },
                        Name = new
                        {
                            Value = "FONG HUANG LIANG",
                            Confidence = 0.99
                        },
                        Postcode = new
                        {
                            Value = "36000",
                            Confidence = 0.99
                        },
                        City = new
                        {
                            Value = "Telok Intan",
                            Confidence = 0.98
                        },
                        State = new
                        {
                            Value = "Perak",
                            Confidence = 0.99
                        },
                        Address1 = new
                        {
                            Value = "LOT 45 NO 244",
                            Confidence = 0.98
                        },
                        Address2 = new
                        {
                            Value = "JALAN WOO SAIK HONG",
                            Confidence = 0.98
                        }
                    }
                });

                // =========================================================
                // Step 7
                // OpenAI Vision
                //
                // Pass:
                // - image
                // - content type
                // - source
                // - logged-in UserID
                // - MerchantID
                // =========================================================

                var extractionService = new OpenAiIcExtractionService();
                MalaysiaIcOcrResult result = await extractionService.ExtractMalaysiaIcAsync(imageBytes, contentType, source, userId, merchantId);

                // =========================================================
                // Document validation
                // =========================================================

                if (result == null || !result.IsValidIC)
                {
                    throw new BusinessException("The uploaded image is not a valid Malaysian IC.", code);
                }

                if (result.ICNumber == null || string.IsNullOrWhiteSpace(result.ICNumber.Value))
                {
                    throw new BusinessException("Unable to reliably read the IC number.", code);
                }

                // =========================================================
                // Normalize IC
                // =========================================================

                string normalizedIc = MalaysiaIcValidator.Normalize(result.ICNumber.Value);

                // =========================================================
                // IMPORTANT:
                // OpenAI is NOT the final authority.
                // Validate NRIC in .NET.
                // =========================================================

                if (!MalaysiaIcValidator.IsValid(normalizedIc))
                {
                    throw new BusinessException("The extracted IC number is invalid.", code);
                }

                result.ICNumber.Value = normalizedIc;
                Request.Properties["AuditDescription"] = "Malaysian IC information extracted successfully.";

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = result
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception)
            {
                // Do NOT return OpenAI response,
                // Base64 image, IC number, name,
                // address or exception details.

                throw new BusinessException("Unable to process the Malaysian IC image.", code);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("ocr-extract-text")]
        private async Task<IHttpActionResult> OcrExtractText()
        {
            Request.Properties["AuditTitle"] = "OCR Text Extraction";
            Request.Properties["AuditDescription"] = "Attempted to extract text from an uploaded image using OCR.";
            const string code = "OCR-EXTRACT-TEXT";

            try
            {
                // ============================================================
                // Validate Multipart Request
                // ============================================================

                if (!Request.Content.IsMimeMultipartContent())
                {
                    throw new BusinessException("Please upload a valid image.", code);
                }

                var provider = await Request.Content.ReadAsMultipartAsync();

                // ============================================================
                // Get Uploaded File
                // ============================================================

                var file =
                    provider.Contents.FirstOrDefault(x =>
                        x.Headers.ContentDisposition != null &&
                        !string.IsNullOrWhiteSpace(
                            x.Headers.ContentDisposition.FileName));

                if (file == null)
                {
                    throw new BusinessException("Image is required.", code);
                }

                // ============================================================
                // Validate Content Type
                // ============================================================

                string contentType = file.Headers.ContentType?.MediaType;

                string[] allowedTypes =
                {
                    "image/jpeg",
                    "image/png"
                };

                if (string.IsNullOrWhiteSpace(contentType) || !allowedTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
                {
                    throw new BusinessException("Only JPG and PNG images are allowed.", code);
                }

                // ============================================================
                // Read Image Into Memory
                // ============================================================

                byte[] imageBytes = await file.ReadAsByteArrayAsync();

                if (imageBytes == null || imageBytes.Length == 0)
                {
                    throw new BusinessException("Uploaded image is empty.", code);
                }

                // ============================================================
                // Validate File Size - Maximum 10 MB
                // ============================================================

                const int maxFileSize = 10 * 1024 * 1024;

                if (imageBytes.Length > maxFileSize)
                {
                    throw new BusinessException("Image cannot exceed 10MB.", code);
                }

                // ============================================================
                // Tesseract OCR Only
                // ============================================================

                var ocrService = new TesseractOcrService();
                TesseractOcrResult result = ocrService.ExtractText(imageBytes);

                if (result == null || string.IsNullOrWhiteSpace(result.Text))
                {
                    throw new BusinessException("Unable to extract text from the uploaded image.", code);
                }

                // ============================================================
                // Success
                // ============================================================

                Request.Properties["AuditDescription"] = "Text extracted successfully using OCR.";

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        Text = result.Text,
                        Confidence = result.Confidence
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception)
            {
                throw new BusinessException("Unable to process the uploaded image.", code);
            }
        }
    }
}