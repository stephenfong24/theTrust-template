using API_CPX.Class.Helper;
using API_CPX.Class.Security;
using API_CPX.Class.Service;
using API_CPX.Class.Service.TrustApplication.Payment;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class FileUpload : UploadResponse
    {
        public long UserID { get; set; }
        public string MerchantID { get; set; }
        public string FileName { get; set; }
        public string FileType { get; set; }
        public long FileSize { get; set; }
        public string UploadType { get; set; }
        public string TempFilePath { get; set; }
        public string FileSHA256 { get; set; }
        public Guid PublicID { get; set; }
        public long TrustID { get; set; }
        public long SupportingDocumentID { get; set; }
        public string RoleCode { get; set; }
        public long PaymentID { get; set; }
        public long PaymentDocumentID { get; set; }
        public decimal PaymentAmount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string ReferenceNo { get; set; }

        public async Task<bool> UploadAvatarAsync()
        {
            Status = 0;

            using (var dbR = new Sandbox_BasedEntities())
            {
                // =====================================================
                // 1. Validate Merchant
                // =====================================================

                var merchant = await dbR.tbl_Merchant.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.Status == 0);

                if (merchant == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Err : Invalid merchant ID";
                    return false;
                }

                // =====================================================
                // 2. Validate Member
                // =====================================================

                var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);

                if (memInfo == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Err : Invalid account ID";
                    return false;
                }

                // =====================================================
                // 3. Avatar Security Policy
                // =====================================================

                var policy =
                    new FileSecurityPolicy
                    {
                        MaxFileSize = 5L * 1024 * 1024,
                        AllowedExtensions =
                            new List<string>
                            {
                                ".png",
                                ".jpg",
                                ".jpeg"
                            },
                        RequireAntivirusScan = true
                    };

                // =====================================================
                // 4. Generic File Upload
                // =====================================================

                var uploadResult =
                    await FileUploadService
                        .UploadAsync(
                            new UploadFileRequest
                            {
                                UserID = UserID,
                                MerchantID = MerchantID,
                                ModuleCode = "PROFILE",
                                UploadType = "AVATAR",
                                SubFolder = "avatar",
                                OriginalFileName = FileName,
                                ContentType = FileType,
                                TempFilePath = TempFilePath, 
                                SecurityPolicy = policy
                            }
                        );

                if (!uploadResult.IsSuccess)
                {
                    Status = 4;
                    Message = uploadResult.Message;
                    return false;
                }

                FileUrl = uploadResult.FileUrl;
                UploadedFile = uploadResult.UploadedFile;
                FileSHA256 = uploadResult.SHA256;
                FileSize = uploadResult.FileSize;

                // =====================================================
                // 5. Avatar Specific DB Transaction
                // =====================================================

                try
                {
                    using (var transaction = dbR.Database.BeginTransaction())
                    {
                        try
                        {
                            var avatar = await dbR.tbl_MemberInfo_Avatar.FirstOrDefaultAsync(a => a.MemberID == UserID && a.Status == 0);

                            if (avatar != null)
                            {
                                avatar.Status = 4;
                            }

                            dbR.tbl_MemberInfo_Avatar.Add(new tbl_MemberInfo_Avatar
                                {
                                    MemberID = UserID,
                                    FielUrl = AppSettingsHelper.MediaUrl.TrimEnd('/'),
                                    Avatar = UploadedFile,
                                    CreatedAt = DateTime.Now,
                                    CreatedBy = UserID.ToString(),
                                    Status = 0
                                }
                            );

                            await dbR.SaveChangesAsync();
                            transaction.Commit();
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
                    }
                }
                catch (Exception ex)
                {
                    // =================================================
                    // Business DB failed.
                    // Remove already scanned/stored physical file.
                    // =================================================

                    await FileUploadService
                        .FailAsync(
                            uploadResult.AuditID,
                            uploadResult.PhysicalFilePath,
                            "AVATAR_SAVE_FAILED",
                            "Security scan passed but the profile picture could not be saved."
                        );

                    Status = 4;
                    Message = ex.Message;
                    return false;
                }

                // =====================================================
                // 6. Entire Operation Completed
                // =====================================================

                await FileUploadService.CompleteAsync(uploadResult.AuditID);
                Message = "Success";
                return true;
            }
        }

        // =============================================================
        // KYC Document Upload
        // =============================================================

        public async Task<bool> UploadKycDocumentAsync()
        {
            Status = 0;

            using (var dbR = new Sandbox_BasedEntities())
            {
                // =====================================================
                // 1. Validate Merchant
                // =====================================================

                var merchant = await dbR.tbl_Merchant.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.Status == 0);
                if (merchant == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Err : Invalid merchant ID";
                    return false;
                }

                // =====================================================
                // 2. Validate KYC Upload Type
                // =====================================================

                string uploadType = (UploadType ?? "").Trim().ToUpperInvariant();
                string subFolder;

                switch (uploadType)
                {
                    case "NRIC_FRONT":
                        subFolder = "kyc/nric";
                        break;
                    case "NRIC_BACK":
                        subFolder = "kyc/nric";
                        break;
                    case "PASSPORT":
                        subFolder = "kyc/passport";
                        break;
                    case "SSM_CERT":
                        subFolder = "kyc/ssm";
                        break;
                    default:
                        MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                        Status = 4;
                        Message = "Invalid KYC document type.";
                        return false;
                }

                // =====================================================
                // 3. KYC File Security Policy
                // =====================================================

                var policy = new FileSecurityPolicy
                    {
                        MaxFileSize = 5L * 1024 * 1024,
                        AllowedExtensions = new List<string>
                            {
                                ".png",
                                ".jpg",
                                ".jpeg"
                            },
                        RequireAntivirusScan = true
                    };

                // =====================================================
                // 4. Generic File Upload
                //
                // Member does not exist yet.
                // UserID = 0 for pre-registration upload.
                // =====================================================

                var uploadResult = await FileUploadService
                        .UploadAsync(new UploadFileRequest
                            {
                                UserID = 0,
                                MerchantID = MerchantID,
                                ModuleCode = "KYC",
                                UploadType = uploadType,
                                SubFolder = subFolder,
                                OriginalFileName = FileName,
                                ContentType = FileType,
                                TempFilePath = TempFilePath,
                                SecurityPolicy = policy
                            }
                        );

                if (!uploadResult.IsSuccess)
                {
                    Status = 4;
                    Message = uploadResult.Message;
                    return false;
                }

                FileUrl = uploadResult.FileUrl;
                UploadedFile = uploadResult.UploadedFile;
                FileSHA256 = uploadResult.SHA256;
                FileSize = uploadResult.FileSize;

                // =====================================================
                // 5. Save Registration Upload Reference
                // =====================================================

                try
                {
                    using (var transaction =
                        dbR.Database.BeginTransaction())
                    {
                        try
                        {
                            // =================================================
                            // tbl_log_FileUpload
                            // =================================================

                            var uploadLog = new tbl_log_FileUpload
                                {
                                    PublicID = Guid.NewGuid(),
                                    UploadedFile = UploadedFile,
                                    CreatedAt = DateTime.Now,
                                    ExpiredAt = DateTime.Now.AddHours(24),
                                    MemberID = UserID,
                                    Status = 0
                                };

                            dbR.tbl_log_FileUpload.Add(uploadLog);
                            await dbR.SaveChangesAsync();

                            // =================================================
                            // Get SQL-generated PublicID
                            // =================================================

                            PublicID = uploadLog.PublicID;
                            transaction.Commit();
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
                    }
                }
                catch (Exception ex)
                {
                    // =================================================
                    // Business DB failed.
                    //
                    // File was already:
                    // - validated
                    // - scanned
                    // - stored
                    //
                    // Mark audit as failed and remove physical file.
                    // =================================================

                    await FileUploadService
                        .FailAsync(
                            uploadResult.AuditID,
                            uploadResult.PhysicalFilePath, "KYC_SAVE_FAILED", 
                            "Security scan passed but the KYC document could not be saved.");

                    Status = 4;
                    Message = ex.Message;
                    return false;
                }

                // =====================================================
                // 6. Entire Operation Completed
                // =====================================================

                await FileUploadService.CompleteAsync(uploadResult.AuditID);

                Message =  "Success";
                return true;
            }
        }

        // =============================================================
        // Trust Application Supporting Document Upload
        // =============================================================

        public async Task<bool> UploadTrustApplicationSupportingDocumentAsync()
        {
            Status = 0;

            using (var dbR = new Sandbox_BasedEntities())
            {
                // =====================================================
                // 1. Validate Merchant
                // =====================================================

                var merchant = await dbR.tbl_Merchant.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.Status == 0);

                if (merchant == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Err : Invalid merchant ID";
                    return false;
                }

                // =====================================================
                // 2. Validate Member
                // =====================================================

                var member = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);

                if (member == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Err : Invalid account ID";
                    return false;
                }

                // =====================================================
                // 3. Validate Trust Application
                // =====================================================

                var application = await dbR.tbl_TrustApplication.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.TrustID == TrustID);

                if (application == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Trust application not found.";
                    return false;
                }

                // =====================================================
                // 4. Permission
                // =====================================================

                bool isAgent = string.Equals(RoleCode, "AG", StringComparison.OrdinalIgnoreCase);

                bool isAdmin =
                    string.Equals(RoleCode, "SA", StringComparison.OrdinalIgnoreCase)
                    ||
                    string.Equals(RoleCode, "AD", StringComparison.OrdinalIgnoreCase);


                if (!isAgent && !isAdmin)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "You are not allowed to upload Trust Application supporting documents.";
                    return false;
                }

                // =====================================================
                // AG
                // =====================================================

                if (isAgent)
                {
                    if (application.MemberID != UserID)
                    {
                        MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                        Status = 4;
                        Message = "You are not allowed to update this Trust Application.";
                        return false;
                    }

                    if (!string.Equals(application.ApplicationStatus, "DRAFT", StringComparison.OrdinalIgnoreCase))
                    {
                        MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                        Status = 4;
                        Message = "Submitted Trust Applications can no longer be edited by the Agent.";
                        return false;
                    }

                    if (application.LastCompletedStep < 5)
                    {
                        MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                        Status = 4;
                        Message = "Please complete Step 5 before uploading supporting documents.";
                        return false;
                    }
                }

                // =====================================================
                // SA / AD
                // =====================================================

                if (isAdmin)
                {
                    if (string.Equals(application.ApplicationStatus, "DRAFT", StringComparison.OrdinalIgnoreCase))
                    {
                        MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                        Status = 4;
                        Message = "Draft Trust Applications can only be edited by the Trust Agent.";
                        return false;
                    }
                }

                // =====================================================
                // 8. Security Policy
                // =====================================================

                var policy = FileUploadPolicies.TrustApplicationSupportingDocument();

                // =====================================================
                // 9. Generic File Upload
                // =====================================================

                var uploadResult =
                    await FileUploadService
                        .UploadAsync(
                            new UploadFileRequest
                            {
                                UserID = UserID,
                                MerchantID = MerchantID,
                                ModuleCode = "TRUST_APPLICATION",
                                UploadType = "SUPPORTING_DOCUMENT",
                                SubFolder = "trust-application/" + TrustID + "/supporting-document",
                                OriginalFileName = FileName,
                                ContentType = FileType,
                                TempFilePath = TempFilePath,
                                SecurityPolicy = policy
                            });

                // =====================================================
                // 10. Upload Failed
                // =====================================================

                if (!uploadResult.IsSuccess)
                {
                    Status = 4;
                    Message = uploadResult.Message;
                    return false;
                }

                // =====================================================
                // 11. Store Upload Result
                // =====================================================

                FileUrl = uploadResult.FileUrl;
                UploadedFile = uploadResult.UploadedFile;
                FileSHA256 = uploadResult.SHA256;
                FileSize = uploadResult.FileSize;

                // =====================================================
                // 12. Save Business Record
                // =====================================================

                try
                {
                    using (var transaction = dbR.Database.BeginTransaction())
                    {
                        try
                        {
                            DateTime now = DateTime.Now;

                            // =========================================
                            // Insert
                            // =========================================

                            var document =
                                new tbl_TrustApplication_SupportingDocument
                                {
                                    TrustApplicationID = application.RowID,
                                    OriginalFileName = FileName,
                                    FileExtension = uploadResult.Extension.TrimStart('.'),
                                    FileSize = uploadResult.FileSize,
                                    FileUrl = uploadResult.FileUrl,
                                    UploadedFile = uploadResult.UploadedFile,
                                    SHA256 = uploadResult.SHA256,
                                    IsActive = true,
                                    CreatedAt = now,
                                    CreatedBy = UserID
                                };
                            dbR.tbl_TrustApplication_SupportingDocument.Add(document);

                            // =====================================================
                            // Application History
                            // =====================================================

                            TrustApplicationHistoryHelper.Add(
                                dbR,
                                application.RowID,
                                "SUPPORTING_DOCUMENT_UPLOADED",
                                "Supporting Document Uploaded",
                                "Supporting document \"" + FileName + "\" was uploaded.",
                                UserID,
                                "SUPPORTING_DOCUMENT",
                                document.RowID);

                            // =====================================================
                            // Update Application
                            // =====================================================

                            application.UpdatedAt = now;
                            application.UpdatedBy = UserID;
                            await dbR.SaveChangesAsync();

                            SupportingDocumentID = document.RowID;
                            transaction.Commit();
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
                    }
                }
                catch (Exception ex)
                {
                    // =================================================
                    // Physical upload succeeded but business DB failed.
                    // =================================================

                    await FileUploadService
                        .FailAsync(
                            uploadResult.AuditID,
                            uploadResult.PhysicalFilePath,
                            "TRUST_APPLICATION_DOCUMENT_SAVE_FAILED",
                            "Security scan passed but the Trust Application supporting document could not be saved."
                        );

                    Status = 4;
                    Message = ex.Message;
                    return false;
                }


                // =====================================================
                // 13. Complete Upload
                // =====================================================

                await FileUploadService.CompleteAsync(uploadResult.AuditID);
                Message = "Success";
                return true;
            }
        }

        // =============================================================
        // Payment Document Upload
        // =============================================================

        public async Task<bool> UploadTrustApplicationPaymentAsync()
        {
            Status = 0;

            using (var dbR = new Sandbox_BasedEntities())
            {
                // =====================================================
                // 1. Validate Merchant
                // =====================================================

                var merchant = await dbR.tbl_Merchant.FirstOrDefaultAsync(x => x.MerchantID == MerchantID && x.Status == 0);
                if (merchant == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Err : Invalid merchant ID";
                    return false;
                }

                // =====================================================
                // 2. Validate Member
                // =====================================================

                var member = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(x => x.RowID == UserID && x.IsDeleted == false);
                if (member == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Err : Invalid account ID";
                    return false;
                }

                // =====================================================
                // 3. Validate Application
                // =====================================================

                var application = await dbR.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == MerchantID && x.TrustID == TrustID);
                if (application == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Trust application not found.";
                    return false;
                }

                // =====================================================
                // 4. Agent Only
                // =====================================================

                bool isAgent = string.Equals(RoleCode, "AG", StringComparison.OrdinalIgnoreCase);
                if (!isAgent)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Only the Trust Agent is allowed to submit payment.";
                    return false;
                }

                if (application.MemberID != UserID)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "You are not allowed to submit payment for this Trust Application.";
                    return false;
                }

                // =====================================================
                // 5. Application must be waiting for payment
                // =====================================================

                if (!string.Equals(application.ApplicationStatus, "PENDING_PAYMENT_APPROVAL", StringComparison.OrdinalIgnoreCase))
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "This Trust Application is not pending payment approval.";
                    return false;
                }

                // =====================================================
                // 6. Validate payment
                // =====================================================

                if (PaymentAmount <= 0)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Payment amount must be greater than zero.";
                    return false;
                }

                if (PaymentDate == default(DateTime))
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Payment date is required.";
                    return false;
                }

                if (PaymentDate.Date > DateTime.Now.Date)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Payment date cannot be in the future.";
                    return false;
                }

                // =====================================================
                // 7. Get Trust Asset
                // =====================================================

                var trustAsset = await dbR.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);
                if (trustAsset == null || trustAsset.TrustAssetAmount <= 0)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Trust Application asset information is incomplete.";
                    return false;
                }

                decimal trustAssetAmount = trustAsset.TrustAssetAmount;

                // =====================================================
                // 8. Calculate current submitted amount
                //
                // REJECTED does not reserve the amount.
                // =====================================================

                decimal submittedAmount =
                    await dbR.tbl_TrustApplication_Payment
                        .Where(
                            x => x.TrustApplicationID == application.RowID && x.IsActive &&
                                (
                                    x.PaymentStatus == "PENDING" || x.PaymentStatus == "APPROVED"
                                ))
                        .Select(x => (decimal?)x.PaymentAmount)
                        .SumAsync() ?? 0M;

                if (submittedAmount + PaymentAmount > trustAssetAmount)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Total submitted payment exceeds the Trust Asset Amount.";
                    return false;
                }

                // =====================================================
                // 9. File Security Policy
                // =====================================================

                var policy = FileUploadPolicies.TrustApplicationPaymentSlip();

                // =====================================================
                // 10. Centralized file upload
                // =====================================================

                var uploadResult =
                    await FileUploadService.UploadAsync(
                        new UploadFileRequest
                        {
                            UserID = UserID,
                            MerchantID = MerchantID,
                            ModuleCode = "TRUST_APPLICATION_PAYMENT",
                            UploadType = "PAYMENT_SLIP",
                            SubFolder = "trust-application/" + TrustID + "/payment",
                            OriginalFileName = FileName,
                            ContentType = FileType,
                            TempFilePath = TempFilePath,
                            SecurityPolicy = policy
                        });

                if (!uploadResult.IsSuccess)
                {
                    Status = 4;
                    Message = uploadResult.Message;
                    return false;
                }

                FileUrl = uploadResult.FileUrl;
                UploadedFile = uploadResult.UploadedFile;
                FileSHA256 = uploadResult.SHA256;
                FileSize = uploadResult.FileSize;

                // =====================================================
                // 11. Save payment + document
                // =====================================================

                try
                {
                    using (var transaction = dbR.Database.BeginTransaction())
                    {
                        try
                        {
                            DateTime now = DateTime.Now;

                            // =============================================
                            // Generate PaymentNo
                            // =============================================

                            int paymentNo =
                                await dbR.tbl_TrustApplication_Payment
                                    .Where(x => x.TrustApplicationID == application.RowID)
                                    .Select(x => (int?)x.PaymentNo)
                                    .MaxAsync() ?? 0;

                            paymentNo++;

                            // =============================================
                            // Payment
                            // =============================================

                            var payment =
                                new tbl_TrustApplication_Payment
                                {
                                    TrustApplicationID = application.RowID,
                                    PaymentNo = paymentNo,
                                    PaymentAmount = PaymentAmount,
                                    PaymentDate = PaymentDate,
                                    ReferenceNo = string.IsNullOrWhiteSpace(ReferenceNo) ? null : ReferenceNo.Trim(),
                                    PaymentStatus = "PENDING",
                                    FinanceRemark = null,
                                    ApprovedAt = null,
                                    ApprovedBy = null,
                                    IsActive = true,
                                    CreatedAt = now,
                                    CreatedBy = UserID
                                };

                            dbR.tbl_TrustApplication_Payment.Add(payment);
                            await dbR.SaveChangesAsync();

                            // =============================================
                            // Payment Slip
                            // =============================================

                            var document =
                                new tbl_TrustApplication_PaymentDocument
                                {
                                    PaymentID = payment.RowID,
                                    OriginalFileName = FileName,
                                    FileExtension = uploadResult.Extension.TrimStart('.'),
                                    FileSize = uploadResult.FileSize,
                                    FileUrl = uploadResult.FileUrl,
                                    UploadedFile = uploadResult.UploadedFile,
                                    SHA256 = uploadResult.SHA256,
                                    IsActive = true,
                                    CreatedAt = now,
                                    CreatedBy = UserID
                                };

                            dbR.tbl_TrustApplication_PaymentDocument.Add(document);
                            application.UpdatedAt = now;
                            application.UpdatedBy = UserID;
                            await dbR.SaveChangesAsync();

                            PaymentID = payment.RowID;
                            PaymentDocumentID = document.RowID;
                            transaction.Commit();
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
                    }
                }
                catch
                {
                    await FileUploadService.FailAsync(
                        uploadResult.AuditID,
                        uploadResult.PhysicalFilePath,
                        "PAYMENT_SAVE_FAILED",
                        "Security scan passed but the payment could not be saved.");

                    Status = 4;
                    Message = "Unable to save Trust Application payment.";
                    return false;
                }

                // =====================================================
                // 12. Complete upload audit
                // =====================================================

                await FileUploadService.CompleteAsync(uploadResult.AuditID);
                Message = "Success";
                return true;
            }
        }

        // =============================================================
        // Trust Application Payment Slip Upload
        // =============================================================

        public async Task<bool> UploadTrustApplicationPaymentSlipAsync(DateTime paymentDate, string referenceNo)
        {
            Status = 0;

            using (var dbR = new Sandbox_BasedEntities())
            {
                // =====================================================
                // 1. Validate Merchant
                // =====================================================

                var merchant = await dbR.tbl_Merchant.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.Status == 0);

                if (merchant == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Err : Invalid merchant ID";
                    return false;
                }

                // =====================================================
                // 2. Validate Member
                // =====================================================

                var member = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);

                if (member == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Err : Invalid account ID";
                    return false;
                }

                // =====================================================
                // 3. Validate Role
                // =====================================================

                bool isAgent = string.Equals(RoleCode, "AG", StringComparison.OrdinalIgnoreCase);

                if (!isAgent)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Only Trust Representative can upload payment slip.";
                    return false;
                }

                // =====================================================
                // 4. Validate Trust Application
                // =====================================================

                var application =
                    await dbR.tbl_TrustApplication
                        .FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.TrustID == TrustID);

                if (application == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Trust Application not found.";
                    return false;
                }

                // =====================================================
                // 5. Validate Ownership
                // =====================================================

                if (application.MemberID != UserID)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "You are not allowed to upload payment slip for this Trust Application.";
                    return false;
                }

                // =====================================================
                // 6. Validate Application Status
                // =====================================================

                if (!string.Equals(application.ApplicationStatus, "PENDING_PAYMENT_APPROVAL", StringComparison.OrdinalIgnoreCase))
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "This Trust Application is not pending payment approval.";
                    return false;
                }

                // =====================================================
                // 7. Validate Payment Allocation
                // =====================================================

                var payment =
                    await dbR.tbl_TrustApplication_Payment
                        .FirstOrDefaultAsync(a => a.RowID == PaymentID && a.TrustApplicationID == application.RowID && a.IsActive);

                if (payment == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Payment allocation not found.";
                    return false;
                }

                // =====================================================
                // 8. Validate Payment Status
                // =====================================================

                bool waitingPayment = string.Equals(payment.PaymentStatus, "WAITING_PAYMENT", StringComparison.OrdinalIgnoreCase);
                bool rejected = string.Equals(payment.PaymentStatus, "REJECTED", StringComparison.OrdinalIgnoreCase);

                if (!waitingPayment && !rejected)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Payment slip can only be uploaded for a waiting or rejected payment.";
                    return false;
                }

                // =====================================================
                // 9. Payment Date
                // =====================================================

                if (paymentDate == DateTime.MinValue)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Payment date is required.";
                    return false;
                }

                if (paymentDate.Date > DateTime.Today)
                {
                    MultipartUploadHelper.DeleteFileSafely(TempFilePath);
                    Status = 4;
                    Message = "Payment date cannot be in the future.";
                    return false;
                }

                // =====================================================
                // 10. Security Policy
                // =====================================================

                var policy = FileUploadPolicies.TrustApplicationPaymentSlip();

                // =====================================================
                // 11. Centralized File Upload
                // =====================================================

                var uploadResult =
                    await FileUploadService
                        .UploadAsync(
                            new UploadFileRequest
                            {
                                UserID = UserID,
                                MerchantID = MerchantID,
                                ModuleCode = "TRUST_APPLICATION",
                                UploadType = "PAYMENT_SLIP",
                                SubFolder = "trust-application/" + TrustID + "/payment-slip",
                                OriginalFileName = FileName,
                                ContentType = FileType,
                                TempFilePath = TempFilePath,
                                SecurityPolicy = policy
                            });

                // =====================================================
                // 12. Upload Failed
                // =====================================================

                if (!uploadResult.IsSuccess)
                {
                    Status = 4;
                    Message = uploadResult.Message;
                    return false;
                }

                // =====================================================
                // 13. Store Upload Result
                // =====================================================

                FileUrl = uploadResult.FileUrl;
                UploadedFile = uploadResult.UploadedFile;
                FileSHA256 = uploadResult.SHA256;
                FileSize = uploadResult.FileSize;

                // =====================================================
                // 14. Save Payment Business Record
                // =====================================================

                try
                {
                    var paymentService = new TrustApplicationPaymentServiceAsync();

                    var result =
                        await paymentService.SavePaymentSlipAsync(
                            MerchantID,
                            UserID,
                            RoleCode,
                            TrustID,
                            PaymentID,
                            paymentDate,
                            referenceNo,
                            FileName,
                            uploadResult.Extension.TrimStart('.'),
                            uploadResult.FileSize,
                            uploadResult.FileUrl,
                            uploadResult.UploadedFile,
                            uploadResult.SHA256);

                    PaymentDocumentID = result.Document.PaymentDocumentID;
                }
                catch (Exception ex)
                {
                    // =================================================
                    // Physical upload succeeded but payment DB save
                    // failed.
                    //
                    // Mark centralized upload audit as failed and remove
                    // the physical file.
                    // =================================================

                    await FileUploadService
                        .FailAsync(
                            uploadResult.AuditID,
                            uploadResult.PhysicalFilePath,
                            "TRUST_APPLICATION_PAYMENT_SLIP_SAVE_FAILED",
                            "Security scan passed but the Trust Application payment slip could not be saved.");

                    Status = 4;
                    Message = ex.Message;
                    return false;
                }

                // =====================================================
                // 15. Complete Centralized Upload
                // =====================================================

                await FileUploadService.CompleteAsync(uploadResult.AuditID);
                Message = "Success";
                return true;
            }
        }
    }
}