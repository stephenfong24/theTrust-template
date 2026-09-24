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

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/trust-payment")]
    [JwtAuthorize]
    public class TrustPaymentController : ApiController
    {
        /// <summary>
        /// Get Trust Application Payment Details
        /// </summary>
        /// <remarks>
        /// Retrieves the Trust Application payment information including
        /// Trust Asset Amount, payment source details, submitted payments,
        /// payment slips, payment statuses, approved amount, pending amount,
        /// and remaining payment amounts.
        /// </remarks>

        [HttpGet]
        [Route("{trustId:long}/payment")]
        public async Task<IHttpActionResult> GetPayment(long trustId)
        {
            const string code = "GET-TRUST-APPLICATION-PAYMENT";
            Request.Properties["AuditTitle"] = "Trust Application Payment Viewed";
            Request.Properties["AuditDescription"] = "Attempted to retrieve Trust Application payment information.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationPaymentServiceAsync();
                var result = await service.GetAsync(merchantId, userId, roleCode, trustId);

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
                throw new BusinessException("Unable to retrieve Trust Application payment information.", code, ex);
            }
        }

        /// <summary>
        /// Create Trust Application Payment Allocation
        /// </summary>
        /// <remarks>
        /// Allows the Trust Representative to create the payment allocation
        /// for a Trust Application.
        ///
        /// The application must be in PENDING_PAYMENT_APPROVAL status.
        ///
        /// The total allocated amount must be exactly equal to the
        /// Trust Asset Amount.
        ///
        /// Example:
        /// Trust Asset Amount: RM50,000
        /// Payment 1: RM20,000
        /// Payment 2: RM20,000
        /// Payment 3: RM10,000
        ///
        /// Each payment allocation is created with WAITING_PAYMENT status.
        /// No payment date, reference number, or payment slip is required
        /// when the allocation is created.
        ///
        /// Payment slips are uploaded separately for each payment allocation.
        /// </remarks>

        [HttpPost]
        [Route("{trustId:long}/payment/allocation/initialize")]
        public async Task<IHttpActionResult> CreatePaymentAllocation(long trustId, TrustApplicationPaymentAllocationRequest request)
        {
            const string code = "CREATE-TRUST-APPLICATION-PAYMENT-ALLOCATION";
            Request.Properties["AuditTitle"] = "Trust Application Payment Allocation Created";
            Request.Properties["AuditDescription"] = "Attempted to create Trust Application payment allocation.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationPaymentServiceAsync();
                var result = await service.CreateAllocationAsync(merchantId, userId, roleCode, trustId, request);

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
                throw new BusinessException("Unable to create Trust Application payment allocation.", code, ex);
            }
        }

        /// <summary>
        /// Save Trust Application Payment Allocation
        /// </summary>
        /// <remarks>
        /// Creates or replaces the editable payment allocations for a
        /// Trust Application.
        ///
        /// Only WAITING_PAYMENT allocations are replaceable.
        ///
        /// Existing APPROVED and PENDING_APPROVAL allocations are locked
        /// and will remain unchanged.
        ///
        /// The total new allocation must exactly equal the remaining
        /// allocatable amount:
        ///
        /// Trust Asset Amount - Locked Active Payment Amount
        ///
        /// Existing WAITING_PAYMENT allocations are soft-deactivated and
        /// new WAITING_PAYMENT allocations are created.
        ///
        /// Existing PaymentNo values are never reused.
        /// </remarks>
        [HttpPost]
        [Route("{trustId:long}/payment/allocation")]
        public async Task<IHttpActionResult> SavePaymentAllocation(long trustId, TrustApplicationPaymentAllocationAddRequest request)
        {
            const string code = "SAVE-TRUST-APPLICATION-PAYMENT-ALLOCATION";
            Request.Properties["AuditTitle"] = "Trust Application Payment Allocation Saved";
            Request.Properties["AuditDescription"] = "Attempted to save Trust Application payment allocation.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationPaymentServiceAsync();
                var result = await service.SaveAllocationAsync(merchantId, userId, roleCode, trustId, request);

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
                throw new BusinessException("Unable to save Trust Application payment allocation.", code, ex);
            }
        }

        /// <summary>
        /// Upload Trust Application Payment Slip
        /// </summary>
        /// <remarks>
        /// Allows the Trust Representative to submit payment information
        /// and upload a payment slip for an existing payment allocation.
        ///
        /// The application must be in PENDING_PAYMENT_APPROVAL status.
        ///
        /// The payment allocation must be in WAITING_PAYMENT or REJECTED
        /// status.
        ///
        /// Payment date and payment slip are required. Reference number
        /// is optional.
        ///
        /// When the upload is successful, the payment allocation status
        /// is changed to PENDING_APPROVAL for Finance/Admin review.
        ///
        /// If a previously rejected payment is resubmitted, the previous
        /// payment slip is deactivated and the newly uploaded payment slip
        /// becomes the active payment document.
        ///
        /// The payment allocation amount cannot be changed by this API.
        /// </remarks>

        [HttpPost]
        [Route("{trustId:long}/payment/{paymentId:long}/slip")]
        public async Task<IHttpActionResult> UploadPaymentSlip(long trustId, long paymentId)
        {
            const string code = "UPLOAD-TRUST-APPLICATION-PAYMENT-SLIP";
            Request.Properties["AuditTitle"] = "Trust Application Payment Slip Uploaded";
            Request.Properties["AuditDescription"] = "Attempted to upload Trust Application payment slip.";
            string tempFilePath = null;
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                // ============================================================
                // 1. Logged-in User
                // ============================================================

                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                // ============================================================
                // 2. Validate Multipart
                // ============================================================

                if (!Request.Content.IsMimeMultipartContent())
                {
                    throw new BusinessException("Multipart form-data is required.", code);
                }

                // ============================================================
                // 3. Read Multipart
                //
                // Same approach used by Resource Add/Update API.
                // ============================================================

                var provider = new MultipartMemoryStreamProvider();
                await Request.Content.ReadAsMultipartAsync(provider);

                // ============================================================
                // 4. Variables
                // ============================================================

                DateTime? paymentDate = null;
                string referenceNo = null;
                HttpContent fileContent = null;

                // ============================================================
                // 5. Read Form Fields + File
                // ============================================================

                foreach (var content in provider.Contents)
                {
                    string fieldName = content.Headers.ContentDisposition.Name?.Trim('"');
                    string fileName = content.Headers.ContentDisposition.FileName?.Trim('"');

                    // ========================================================
                    // File
                    // ========================================================

                    if (!string.IsNullOrWhiteSpace(fileName))
                    {
                        if (fileContent != null)
                        {
                            throw new BusinessException("Only one payment slip can be uploaded at a time.", code);
                        }

                        fileContent = content;
                        continue;
                    }

                    // ========================================================
                    // Normal Form Field
                    // ========================================================

                    string value = await content.ReadAsStringAsync();

                    switch (fieldName?.Trim().ToLowerInvariant())
                    {
                        case "paymentdate":

                            if (!DateTime.TryParse(value, out DateTime parsedPaymentDate))
                            {
                                throw new BusinessException("Invalid payment date.", code);
                            }
                            paymentDate = parsedPaymentDate;
                            break;

                        case "referenceno":

                            referenceNo = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
                            break;
                    }
                }

                // ============================================================
                // 6. Validate Payment Date
                // ============================================================

                if (!paymentDate.HasValue)
                {
                    throw new BusinessException("Payment date is required.", code);
                }

                // ============================================================
                // 7. Validate Payment Slip
                // ============================================================

                if (fileContent == null)
                {
                    throw new BusinessException("Payment slip is required.", code);
                }

                // ============================================================
                // 8. Get File Information
                // ============================================================

                string originalFileName = fileContent.Headers.ContentDisposition.FileName?.Trim('"');
                originalFileName = Path.GetFileName(originalFileName);
                string contentType = fileContent.Headers.ContentType?.MediaType;

                if (string.IsNullOrWhiteSpace(originalFileName))
                {
                    throw new BusinessException("Invalid payment slip file name.", code);
                }

                // ============================================================
                // 9. Read File
                //
                // Same approach as Resource API.
                // ============================================================

                byte[] fileBytes = await fileContent.ReadAsByteArrayAsync();

                if (fileBytes == null || fileBytes.Length == 0)
                {
                    throw new BusinessException("Uploaded payment slip is empty.", code);
                }

                // ============================================================
                // 10. Create Temporary File
                //
                // Do NOT perform extension / file security validation here.
                // FileUploadService will handle that centrally.
                // ============================================================

                string tempRoot = ConfigurationManager.AppSettings["UploadScanTempPath"];

                if (string.IsNullOrWhiteSpace(tempRoot))
                {
                    throw new BusinessException("Upload scan temporary path is not configured.", code);
                }

                if (!Directory.Exists(tempRoot))
                {
                    Directory.CreateDirectory(tempRoot);
                }

                tempFilePath = Path.Combine(tempRoot, Guid.NewGuid().ToString("N") + ".tmp");

                using (var stream = new FileStream(tempFilePath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, true))
                {
                    await stream.WriteAsync(fileBytes, 0, fileBytes.Length);
                }

                // ============================================================
                // 11. Prepare Centralized FileUpload
                // ============================================================

                var fileUpload =
                    new FileUpload
                    {
                        UserID = userId,
                        MerchantID = merchantId,
                        RoleCode = roleCode,
                        TrustID = trustId,
                        PaymentID = paymentId,
                        FileName = originalFileName,
                        FileType = contentType,
                        FileSize = fileBytes.LongLength,
                        TempFilePath = tempFilePath,
                        UploadType = "PAYMENT_SLIP"
                    };

                // ============================================================
                // - set payment to PENDING_APPROVAL
                // ============================================================

                bool success = await fileUpload.UploadTrustApplicationPaymentSlipAsync(paymentDate.Value, referenceNo);

                if (!success)
                {
                    throw new BusinessException(fileUpload.Message, code);
                }

                // ============================================================
                // 13. FileUploadService has taken ownership of the temp file.
                // ============================================================

                tempFilePath = null;

                // ============================================================
                // 14. Return
                // ============================================================

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        TrustID = trustId,
                        PaymentID = paymentId,
                        PaymentDocumentID = fileUpload.PaymentDocumentID,
                        PaymentStatus = "PENDING_APPROVAL",
                        Document = new
                        {
                            OriginalFileName = fileUpload.FileName,
                            FileUrl = fileUpload.FileUrl,
                            UploadedFile = fileUpload.UploadedFile,
                            FileSize = fileUpload.FileSize,
                            SHA256 = fileUpload.FileSHA256
                        }
                    }
                });
            }
            catch (BusinessException)
            {
                // ============================================================
                // Delete temp file if it has not already been moved/removed
                // by centralized FileUploadService.
                // ============================================================

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

                throw new BusinessException("Unable to upload Trust Application payment slip.", code, ex);
            }
        }

        /// <summary>
        /// Cancel Trust Application Payment Allocation
        /// </summary>
        /// <remarks>
        /// Soft-cancels an unused payment allocation.
        ///
        /// Only NOT APPROVED allocations with / without an uploaded payment slip
        /// can be cancelled.
        /// </remarks>

        [HttpDelete]
        [Route("{trustId:long}/payment/{paymentId:long}/delete")]
        public async Task<IHttpActionResult> CancelPaymentAllocation(long trustId, long paymentId)
        {
            const string code = "CANCEL-TRUST-APPLICATION-PAYMENT-ALLOCATION";
            Request.Properties["AuditTitle"] = "Trust Application Payment Allocation Cancelled";
            Request.Properties["AuditDescription"] = "Attempted to cancel Trust Application payment allocation.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationPaymentServiceAsync();
                var result = await service.CancelAllocationAsync(merchantId, userId, roleCode, trustId, paymentId);

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
                throw new BusinessException("Unable to cancel Trust Application payment allocation.", code, ex);
            }
        }

        /// <summary>
        /// Approve Trust Application Payment
        /// </summary>
        /// <remarks>
        /// Allows Account/Finance or an authorized administrator to approve
        /// a pending Trust Application payment.
        ///
        /// After approval, the API recalculates the total approved amount.
        /// When the total approved amount equals the Trust Asset Amount,
        /// the Trust Application status is automatically changed to
        /// PAYMENT_APPROVED.
        /// </remarks>

        [HttpPost]
        [Route("{trustId:long}/payment/{paymentId:long}/approve")]
        [JwtAuthorize(Roles = "SA,AD,AC")]
        public async Task<IHttpActionResult> ApprovePayment(long trustId, long paymentId, TrustApplicationPaymentApprovalRequest request)
        {
            const string code = "APPROVE-TRUST-APPLICATION-PAYMENT";
            Request.Properties["AuditTitle"] = "Trust Application Payment Approved";
            Request.Properties["AuditDescription"] = "Attempted to approve Trust Application payment.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationPaymentServiceAsync();
                var result = await service.ApproveAsync(merchantId, userId, roleCode, trustId, paymentId, request);

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
                throw new BusinessException("Unable to approve Trust Application payment.", code, ex);
            }
        }

        /// <summary>
        /// Reject Trust Application Payment
        /// </summary>
        /// <remarks>
        /// Allows Account/Finance or an authorized administrator to reject
        /// a pending Trust Application payment.
        ///
        /// A Finance remark is required when rejecting a payment.
        /// The rejected payment amount is excluded from the active submitted
        /// amount, allowing the Trust Representative to submit a replacement
        /// payment.
        /// </remarks>

        [HttpPost]
        [Route("{trustId:long}/payment/{paymentId:long}/reject")]
        [JwtAuthorize(Roles = "SA,AD,AC")]
        public async Task<IHttpActionResult> RejectPayment(long trustId, long paymentId, TrustApplicationPaymentApprovalRequest request)
        {
            const string code = "REJECT-TRUST-APPLICATION-PAYMENT";
            Request.Properties["AuditTitle"] = "Trust Application Payment Rejected";
            Request.Properties["AuditDescription"] = "Attempted to reject Trust Application payment.";
            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
                string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;

                var service = new TrustApplicationPaymentServiceAsync();
                var result = await service.RejectAsync(merchantId, userId, roleCode, trustId, paymentId, request);

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
                throw new BusinessException("Unable to reject Trust Application payment.", code, ex);
            }
        }
    }
}