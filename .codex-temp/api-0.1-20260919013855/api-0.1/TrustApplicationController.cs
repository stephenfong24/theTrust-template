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

namespace API_CPX.Controllers
{
    [RoutePrefix("api/trust-application")]
    [JwtAuthorize]
    public class TrustApplicationController : ApiController
    {
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
            Request.Properties["AuditTile"] = "Trust Application Viewed";
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
            Request.Properties["AuditTile"] = "Trust Application Step 1 Saved";
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
            Request.Properties["AuditTile"] = "Trust Application Step 2 Saved";
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
            Request.Properties["AuditTile"] = "Trust Application Step 3 Saved";
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
            Request.Properties["AuditTile"] = "Trust Application Step 4 Saved";
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
            Request.Properties["AuditTile"] = "Trust Application Step 5 Saved";
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
            Request.Properties["AuditTile"] = "Trust Application Supporting Document Uploaded";
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
        // Step 6 - Save & Next
        // ============================================================

        [HttpPost]
        [Route("step-6")]
        public async Task<IHttpActionResult> SaveStep6(TrustApplicationStep6Request request)
        {
            const string code = "SAVE-TRUST-APPLICATION-STEP-6";
            Request.Properties["AuditTile"] = "Trust Application Step 6 Saved";
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
            Request.Properties["AuditTile"] = "Trust Application Step 7 Saved";
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
        public async Task<IHttpActionResult> Review(
            long trustId)
        {
            const string code =
                "GET-TRUST-APPLICATION-REVIEW";

            Request.Properties["AuditTile"] =
                "Trust Application Review";

            Request.Properties["AuditDescription"] =
                "Attempted to review Trust Application.";

            var identity = User.Identity as ClaimsIdentity;

            try
            {
                long userId =
                    Convert.ToInt64(
                        Request.Properties["UserID"]);

                string merchantId =
                    Convert.ToString(
                        Request.Properties["MerchantID"]);

                string roleCode =
                    identity?
                        .FindFirst(ClaimTypes.Role)?
                        .Value;

                var service =
                    new TrustApplicationReviewServiceAsync();

                var result =
                    await service.GetAsync(
                        merchantId,
                        userId,
                        roleCode,
                        trustId);

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
                throw new BusinessException(
                    ex.Message,
                    code,
                    ex);
            }
        }

        // ============================================================
        // Step 8 - Final Submit
        // ============================================================

        [HttpPost]
        [Route("submit")]
        public async Task<IHttpActionResult> Submit(
            SubmitTrustApplicationRequest request)
        {
            const string code = "SUBMIT-TRUST-APPLICATION";
            Request.Properties["AuditTile"] = "Trust Application Submitted";
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
            Request.Properties["AuditTile"] = "Malaysian IC Extraction";
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
                // source = TRUST_TRUST_BENEFICIARY
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
                    "TRUST_TRUST_BENEFICIARY"
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

                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

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

                var extractionService = new MalaysiaIcOcrService();
                MalaysiaIcOcrResult result =
                    await extractionService.ExtractAsync(
                        imageBytes,
                        contentType,
                        source,
                        userId,
                        merchantId);

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
        public async Task<IHttpActionResult> OcrExtractText()
        {
            Request.Properties["AuditTile"] = "OCR Text Extraction";
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
