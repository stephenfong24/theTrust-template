using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model;
using API_CPX.Class.Model.DTO.TrustApplication;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Security;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.IO;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.ReturnDocument
{
    public class TrustApplicationReturnDocumentServiceAsync
    {
        // ============================================================
        // Upload Return Document
        // ============================================================

        public async Task<TrustApplicationReturnDocumentResult> UploadAsync(
            string merchantId,
            long userId,
            string roleCode,
            long trustId,
            long generatedDocumentRowID,
            string documentName,
            DateTime returnDate,
            string remark,
            string originalFileName,
            string contentType,
            long fileSize,
            string tempFilePath)
        {
            const string code = "UPLOAD-TRUST-APPLICATION-RETURN-DOCUMENT";

            // ========================================================
            // 1. Basic Validation
            // ========================================================

            if (string.IsNullOrWhiteSpace(merchantId))
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("Invalid merchant ID.", code);
            }

            if (userId <= 0)
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("Invalid account ID.", code);
            }

            if (trustId <= 0)
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("Invalid Trust ID.", code);
            }

            if (generatedDocumentRowID <= 0)
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);

                throw new BusinessException(
                    "Invalid generated document ID.",
                    code);
            }

            roleCode = (roleCode ?? "").Trim().ToUpperInvariant();

            // ========================================================
            // 2. Role Permission
            //
            // Returned documents are internal documents.
            //
            // Allowed:
            // SA
            // AD
            // AC
            // OP
            // ========================================================

            if (!CanAccessReturnDocument(roleCode))
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("You are not allowed to upload Trust Application returned documents.", code);
            }

            // ========================================================
            // 3. File Validation
            //
            // Actual file size / extension / antivirus validation is
            // still performed centrally by FileUploadService.
            // ========================================================

            if (string.IsNullOrWhiteSpace(originalFileName))
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("Returned document is required.", code);
            }

            originalFileName = Path.GetFileName(originalFileName);

            if (string.IsNullOrWhiteSpace(originalFileName))
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("Invalid returned document file name.", code);
            }

            if (string.IsNullOrWhiteSpace(tempFilePath) || !File.Exists(tempFilePath))
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("Returned document file cannot be found.", code);
            }

            // ============================================================
            // Validate Document Name
            // ============================================================

            documentName = string.IsNullOrWhiteSpace(documentName) ? null : documentName.Trim();

            if (string.IsNullOrWhiteSpace(documentName))
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("Document name is required.", code);
            }

            if (documentName.Length > 200)
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("Document name cannot exceed 200 characters.", code);
            }

            // ============================================================
            // Validate Return Date
            // ============================================================

            if (returnDate == default(DateTime))
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("Return date is required.", code);
            }

            if (returnDate.Date > DateTime.Now.Date)
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("Return date cannot be in the future.", code);
            }

            // Store date only
            returnDate = returnDate.Date;

            // ============================================================
            // Validate Optional Remark
            // ============================================================

            remark = string.IsNullOrWhiteSpace(remark) ? null : remark.Trim();

            if (remark != null && remark.Length > 500)
            {
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                throw new BusinessException("Remark cannot exceed 500 characters.", code);
            }

            // ========================================================
            // 4. Validate Merchant / Member / Trust Application
            // ========================================================

            using (var db = new Sandbox_BasedEntities())
            {
                var merchant = await db.tbl_Merchant.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.Status == 0);

                if (merchant == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                    throw new BusinessException("Invalid merchant ID.", code);
                }

                var member = await db.tbl_MemberInfo.FirstOrDefaultAsync(x => x.RowID == userId && x.IsDeleted == false);

                if (member == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                    throw new BusinessException("Invalid account ID.", code);
                }

                var application =
                    await db.tbl_TrustApplication
                        .FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                if (application == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(tempFilePath);
                    throw new BusinessException("Trust application not found.", code);
                }

                // ====================================================
                // Validate Generated Document
                // ====================================================

                var generatedDocument =
                    await db.tbl_TrustApplication_GeneratedDocument
                        .FirstOrDefaultAsync(x =>
                            x.RowID == generatedDocumentRowID &&
                            x.TrustApplicationID == application.RowID);

                if (generatedDocument == null)
                {
                    MultipartUploadHelper.DeleteFileSafely(tempFilePath);

                    throw new BusinessException(
                        "Generated document not found for this Trust Application.",
                        code);
                }

                // ====================================================
                // 5. Centralized Security Policy
                // ====================================================

                var policy = FileUploadPolicies.TrustApplicationReturnDocument();

                // ====================================================
                // 6. Centralized Upload
                //
                // This handles:
                // - extension validation
                // - actual file size
                // - SHA256
                // - antivirus
                // - centralized audit
                // - permanent file storage
                // ====================================================

                var uploadResult =
                    await FileUploadService.UploadAsync(
                        new UploadFileRequest
                        {
                            UserID = userId,
                            MerchantID = merchantId,
                            ModuleCode = "TRUST_APPLICATION",
                            UploadType = "RETURN_DOCUMENT",
                            SubFolder = "trust-application/" + trustId + "/return-document",
                            OriginalFileName = originalFileName,
                            ContentType = contentType,
                            TempFilePath = tempFilePath,
                            SecurityPolicy = policy
                        });

                // ====================================================
                // 7. Upload Failed
                // ====================================================

                if (!uploadResult.IsSuccess)
                {
                    throw new BusinessException(uploadResult.Message, code);
                }

                // ====================================================
                // 8. Public Document GUID
                //
                // Same GUID is used by:
                //
                // tbl_TrustApplication_ReturnDocument.DocumentGuid
                // tbl_DocumentDownload.PublicID
                //
                // The client only receives this GUID.
                // ====================================================

                Guid documentGuid = Guid.NewGuid();

                try
                {
                    using (var transaction = db.Database.BeginTransaction())
                    {
                        try
                        {
                            DateTime now = DateTime.Now;

                            // =========================================
                            // 9. Build Secure Download Relative Path
                            //
                            // uploadResult.UploadedFile example:
                            //
                            // /fileupload/
                            // trust-application/7/return-document/
                            // 20261008/abc.pdf
                            //
                            // tbl_DocumentDownload.FilePath:
                            //
                            // trust-application/7/return-document/
                            // 20261008
                            // =========================================

                            string downloadFilePath = GetDownloadRelativeDirectory(uploadResult.UploadedFile, uploadResult.StoredFileName);

                            // =========================================
                            // 10. Return Document Business Record
                            // =========================================

                            var returnDocument =
                                new tbl_TrustApplication_ReturnDocument
                                {
                                    TrustApplicationID = application.RowID,
                                    GeneratedDocumentRowID = generatedDocumentRowID,
                                    DocumentGuid = documentGuid,
                                    DocumentName = documentName,
                                    ReturnDate = returnDate,
                                    Remark = remark,
                                    OriginalFileName = originalFileName,
                                    FileExtension = uploadResult.Extension,
                                    ContentType = contentType,
                                    FileSize = uploadResult.FileSize,
                                    FileUrl = uploadResult.FileUrl,
                                    UploadedFile = uploadResult.UploadedFile,
                                    StoredFileName = uploadResult.StoredFileName,
                                    SHA256 = uploadResult.SHA256,
                                    FileUploadAuditID = uploadResult.AuditID,
                                    IsActive = true,
                                    CreatedAt = now,
                                    CreatedBy = userId
                                };

                            db.tbl_TrustApplication_ReturnDocument.Add(returnDocument);

                            // =========================================
                            // Save first so RowID is available.
                            // =========================================

                            await db.SaveChangesAsync();

                            // =========================================
                            // 11. Secure Download Registry
                            //
                            // IMPORTANT:
                            // FilePath is RELATIVE.
                            // Never store PhysicalFilePath here.
                            // =========================================

                            var downloadDocument =
                                new tbl_DocumentDownload
                                {
                                    PublicID = documentGuid,
                                    MerchantID = merchantId,
                                    ModuleCode = "TRUST_RETURN_DOCUMENT",
                                    ReferenceID = application.RowID,
                                    DocumentType = "RETURN_DOCUMENT",
                                    DocumentName = documentName,
                                    OriginalFileName = originalFileName,
                                    StoredFileName = uploadResult.StoredFileName,
                                    FileExtension = uploadResult.Extension,
                                    ContentType = contentType,
                                    FileSize = uploadResult.FileSize,
                                    FilePath = downloadFilePath,
                                    SHA256 = uploadResult.SHA256,
                                    ExpiredAt = null,
                                    IsActive = true,
                                    CreatedAt = now,
                                    CreatedBy = userId
                                };

                            db.tbl_DocumentDownload.Add(downloadDocument);

                            // =========================================
                            // 12. Trust Application History
                            // =========================================

                            TrustApplicationHistoryHelper.Add(
                                db,
                                application.RowID,
                                "RETURN_DOCUMENT_UPLOADED",
                                "Returned Document Uploaded",
                                "Returned document \"" +
                                documentName +
                                "\" was uploaded.",
                                userId,
                                "RETURN_DOCUMENT",
                                returnDocument.RowID);

                            // =========================================
                            // 13. Update Application Audit
                            // =========================================

                            application.UpdatedAt = now;
                            application.UpdatedBy = userId;

                            // =========================================
                            // 14. Save
                            // =========================================

                            await db.SaveChangesAsync();

                            transaction.Commit();

                            // =========================================
                            // 15. Complete Centralized Upload Audit
                            // =========================================

                            bool uploadCompleted = await FileUploadService.CompleteAsync(uploadResult.AuditID);

                            if (!uploadCompleted)
                            {
                                // Do not fail the business transaction.
                                //
                                // The document + file have already been
                                // committed successfully.
                                //
                                // CompleteAsync only updates the upload
                                // audit status.
                            }

                            // =========================================
                            // 16. Result
                            // =========================================

                            return new TrustApplicationReturnDocumentResult
                            {
                                ReturnDocumentID = returnDocument.RowID,
                                GeneratedDocumentRowID = returnDocument.GeneratedDocumentRowID,
                                DocumentGuid = documentGuid,
                                DocumentName = returnDocument.DocumentName,
                                ReturnDate = (DateTime)returnDocument.ReturnDate,
                                Remark = returnDocument.Remark,
                                OriginalFileName = returnDocument.OriginalFileName,
                                FileExtension = returnDocument.FileExtension,
                                ContentType = returnDocument.ContentType,
                                FileSize = returnDocument.FileSize,
                                SHA256 = returnDocument.SHA256,
                                CreatedAt = returnDocument.CreatedAt,
                                CreatedBy = returnDocument.CreatedBy
                            };
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
                    }
                }
                catch (BusinessException)
                {
                    await FileUploadService.FailAsync(
                        uploadResult.AuditID,
                        uploadResult.PhysicalFilePath,
                        "TRUST_RETURN_DOCUMENT_SAVE_FAILED",
                        "Security scan passed but the Trust Application returned document could not be saved.");

                    throw;
                }
                catch (Exception ex)
                {
                    await FileUploadService.FailAsync(
                        uploadResult.AuditID,
                        uploadResult.PhysicalFilePath,
                        "TRUST_RETURN_DOCUMENT_SAVE_FAILED",
                        "Security scan passed but the Trust Application returned document could not be saved.");

                    throw new BusinessException("Unable to save Trust Application returned document.", code, ex);
                }
            }
        }

        // ============================================================
        // Soft Delete Return Document
        //
        // Soft deletes:
        // 1. tbl_TrustApplication_ReturnDocument
        // 2. tbl_DocumentDownload
        //
        // Physical file is intentionally NOT deleted.
        // Upload audit is intentionally NOT deleted.
        // ============================================================

        public async Task DeleteAsync(
            string merchantId,
            long userId,
            string roleCode,
            long trustId,
            Guid documentGuid)
        {
            const string code = "DELETE-TRUST-APPLICATION-RETURN-DOCUMENT";

            // ========================================================
            // 1. Basic Validation
            // ========================================================

            if (string.IsNullOrWhiteSpace(merchantId))
            {
                throw new BusinessException("Invalid merchant ID.", code);
            }

            if (userId <= 0)
            {
                throw new BusinessException("Invalid account ID.", code);
            }

            if (trustId <= 0)
            {
                throw new BusinessException("Invalid Trust ID.", code);
            }

            if (documentGuid == Guid.Empty)
            {
                throw new BusinessException("Invalid returned document.", code);
            }

            roleCode = (roleCode ?? "").Trim().ToUpperInvariant();

            // ========================================================
            // 2. Role Permission
            //
            // Same permission as upload/view.
            // ========================================================

            if (!CanAccessReturnDocument(roleCode))
            {
                throw new BusinessException("You are not allowed to delete Trust Application returned documents.", code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                // ====================================================
                // 3. Validate Current User
                // ====================================================

                var member = await db.tbl_MemberInfo.FirstOrDefaultAsync(x => x.RowID == userId && x.IsDeleted == false);

                if (member == null)
                {
                    throw new BusinessException("Invalid account ID.", code);
                }

                // ====================================================
                // 4. Validate Trust Application
                //
                // Merchant check is important:
                // trustId alone must not allow cross-merchant access.
                // ====================================================

                var application = await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                if (application == null)
                {
                    throw new BusinessException("Trust application not found.", code);
                }

                // ====================================================
                // 5. Find Active Return Document
                //
                // Match BOTH:
                // - TrustApplicationID
                // - DocumentGuid
                //
                // Therefore a GUID from another Trust cannot be deleted
                // through this Trust ID.
                // ====================================================

                var returnDocument =
                    await db.tbl_TrustApplication_ReturnDocument
                        .FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID && x.DocumentGuid == documentGuid && x.IsActive);

                if (returnDocument == null)
                {
                    throw new BusinessException("Returned document not found.", code);
                }

                // ====================================================
                // 6. Find Download Registry
                //
                // We deliberately verify:
                // - GUID
                // - Merchant
                // - Module
                // - Trust Application reference
                // - active state
                // ====================================================

                var downloadDocument =
                    await db.tbl_DocumentDownload
                        .FirstOrDefaultAsync(
                            x =>
                                x.PublicID == documentGuid &&
                                x.MerchantID == merchantId &&
                                x.ModuleCode == "TRUST_RETURN_DOCUMENT" &&
                                x.ReferenceID == application.RowID && x.IsActive);

                if (downloadDocument == null)
                {
                    throw new BusinessException("Returned document download record not found.", code);
                }

                // ====================================================
                // 7. Transaction
                // ====================================================

                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        DateTime now = DateTime.Now;

                        // =============================================
                        // Return Document
                        // =============================================

                        returnDocument.IsActive = false;
                        returnDocument.DeletedAt = now;
                        returnDocument.DeletedBy = userId;
                        returnDocument.UpdatedAt = now;
                        returnDocument.UpdatedBy = userId;

                        // =============================================
                        // Download Registry
                        //
                        // IMPORTANT:
                        // Disable the GUID immediately.
                        //
                        // Physical file remains untouched.
                        // =============================================

                        downloadDocument.IsActive = false;

                        // =============================================
                        // Trust Application History
                        // =============================================

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "RETURN_DOCUMENT_DELETED",
                            "Returned Document Deleted",
                            "Returned document \"" +
                            returnDocument.DocumentName +
                            "\" was deleted.",
                            userId,
                            "RETURN_DOCUMENT",
                            returnDocument.RowID);

                        // =============================================
                        // Application Audit Fields
                        // =============================================

                        application.UpdatedAt = now;
                        application.UpdatedBy = userId;

                        // =============================================
                        // Save
                        // =============================================

                        await db.SaveChangesAsync();

                        transaction.Commit();
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // Can Access Return Document
        // ============================================================

        private static bool CanAccessReturnDocument(string roleCode)
        {
            roleCode = (roleCode ?? "").Trim().ToUpperInvariant();

            return
                roleCode == "SA" ||
                roleCode == "AD" ||
                roleCode == "AC" ||
                roleCode == "OP";
        }

        // ============================================================
        // Get Download Relative Directory
        //
        // FileUploadService returns:
        //
        // /fileupload/trust-application/7/return-document/
        // 20261008/abc123.pdf
        //
        // DocumentDownloadService expects:
        //
        // FilePath:
        // trust-application/7/return-document/20261008
        //
        // StoredFileName:
        // abc123.pdf
        // ============================================================

        private static string GetDownloadRelativeDirectory(string uploadedFile, string storedFileName)
        {
            const string code = "UPLOAD-TRUST-APPLICATION-RETURN-DOCUMENT";

            if (string.IsNullOrWhiteSpace(uploadedFile) || string.IsNullOrWhiteSpace(storedFileName))
            {
                throw new BusinessException("Invalid uploaded document path.", code);
            }

            string normalized = uploadedFile.Replace("\\", "/").Trim();

            const string fileUploadPrefix = "/fileupload/";

            if (!normalized.StartsWith(fileUploadPrefix, StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessException("Invalid uploaded document path.", code);
            }

            string relativeFile = normalized.Substring(fileUploadPrefix.Length);
            relativeFile = relativeFile.Trim('/');
            int lastSlash = relativeFile.LastIndexOf('/');

            if (lastSlash <= 0)
            {
                throw new BusinessException("Invalid uploaded document path.", code);
            }

            string actualStoredFileName = relativeFile.Substring(lastSlash + 1);

            if (!string.Equals(actualStoredFileName, storedFileName, StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessException("Uploaded document path does not match the stored file.", code);
            }

            string relativeDirectory = relativeFile.Substring(0, lastSlash);

            if (string.IsNullOrWhiteSpace(relativeDirectory))
            {
                throw new BusinessException("Invalid uploaded document directory.", code);
            }

            return relativeDirectory;
        }
    }
}