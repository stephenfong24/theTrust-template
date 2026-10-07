using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.DocumentDownload;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Service.DocumentDownload
{
    public class DocumentDownloadServiceAsync
    {
        // ============================================================
        // Get Documents By Module
        // ============================================================

        public async Task<List<DocumentDownloadListResult>> GetDocumentsAsync(string merchantId, long userId, string roleCode, string moduleCode)
        {
            const string code = "GET-DOCUMENT-DOWNLOAD-LIST";

            // ========================================================
            // Module Code
            // ========================================================

            moduleCode = (moduleCode ?? "").Trim().ToUpperInvariant();

            if (string.IsNullOrWhiteSpace(moduleCode))
            {
                throw new BusinessException("Document module is required.", code);
            }

            if (!IsValidModuleCode(moduleCode))
            {
                throw new BusinessException("Invalid document module.", code);
            }

            roleCode = (roleCode ?? "").Trim().ToUpperInvariant();

            using (var db = new Sandbox_BasedEntities())
            {
                // ====================================================
                // Validate Module Access
                // ====================================================

                await ValidateModuleListingAccessAsync(moduleCode, userId, roleCode);

                // ====================================================
                // Documents
                // ====================================================

                var now = DateTime.Now;

                return await db.tbl_DocumentDownload
                    .Where(x =>
                        x.MerchantID == merchantId &&
                        x.ModuleCode == moduleCode &&
                        x.IsActive &&
                        (
                            !x.ExpiredAt.HasValue || x.ExpiredAt.Value > now
                        ))
                    .OrderBy(x => x.RowID)
                    .Select(x =>
                        new DocumentDownloadListResult
                        {
                            ModuleCode = x.ModuleCode,
                            DocumentGuid = x.PublicID,
                            DocumentType = x.DocumentType,
                            DocumentName = x.DocumentName,
                            FileName = x.OriginalFileName,
                            FileExtension = x.FileExtension
                        })
                    .ToListAsync();
            }
        }

        // ============================================================
        // Get Document For Download
        // ============================================================

        public async Task<DocumentDownloadFileResult> GetFileAsync(string merchantId, long userId, string roleCode, string moduleCode, Guid documentGuid)
        {
            const string code = "DOCUMENT-DOWNLOAD";

            // ========================================================
            // Validate Module Code
            // ========================================================

            moduleCode = (moduleCode ?? "").Trim().ToUpperInvariant();

            if (string.IsNullOrWhiteSpace(moduleCode))
            {
                throw new BusinessException("Document module is required.", code);
            }

            if (!IsValidModuleCode(moduleCode))
            {
                throw new BusinessException("Invalid document module.", code);
            }

            // ========================================================
            // Validate GUID
            // ========================================================

            if (documentGuid == Guid.Empty)
            {
                throw new BusinessException("Invalid document identifier.", code);
            }

            roleCode = (roleCode ?? "").Trim().ToUpperInvariant();

            using (var db = new Sandbox_BasedEntities())
            {
                // ====================================================
                // Find Document
                //
                // IMPORTANT:
                // ModuleCode + PublicID are both required.
                // ====================================================

                var document =
                    await db.tbl_DocumentDownload
                        .FirstOrDefaultAsync(x =>
                            x.PublicID == documentGuid &&
                            x.ModuleCode == moduleCode &&
                            x.MerchantID == merchantId &&
                            x.IsActive);

                if (document == null)
                {
                    throw new BusinessException("Document not found.", code);
                }

                // ====================================================
                // Expiry
                // ====================================================

                if (document.ExpiredAt.HasValue && document.ExpiredAt.Value <= DateTime.Now)
                {
                    throw new BusinessException("This document is no longer available.", code);
                }

                // ====================================================
                // Module Access
                // ====================================================

                await ValidateModuleAccessAsync(moduleCode, document.ReferenceID, merchantId, userId, roleCode);

                // ====================================================
                // Extension
                // ====================================================

                string extension = (document.FileExtension ?? "").Trim().ToLowerInvariant();

                if (!IsAllowedExtension(extension))
                {
                    throw new BusinessException("Unsupported document type.", code);
                }

                // ====================================================
                // Physical File
                // ====================================================

                string physicalPath = ResolvePhysicalPath(document.FilePath, document.StoredFileName);

                // ============================================================
                // Validate Actual File Extension
                // ============================================================

                string actualExtension = Path.GetExtension(physicalPath).ToLowerInvariant();

                if (!string.Equals(extension, actualExtension, StringComparison.OrdinalIgnoreCase))
                {
                    throw new BusinessException("Document file type does not match the registered file type.", code);
                }

                // ============================================================
                // File Exists
                // ============================================================

                if (!File.Exists(physicalPath))
                {
                    throw new BusinessException("Document file not found.", code);
                }

                // ====================================================
                // Download Filename
                // ====================================================

                string fileName = Path.GetFileName(document.OriginalFileName);

                if (string.IsNullOrWhiteSpace(fileName))
                {
                    fileName = "document" + extension;
                }

                // ====================================================
                // Actual File Size
                // ====================================================

                var fileInfo = new FileInfo(physicalPath);

                // ====================================================
                // Result
                // ====================================================

                return new DocumentDownloadFileResult
                {
                    PhysicalPath = physicalPath,
                    FileName = fileName,
                    ContentType = GetContentType(extension),
                    FileSize = fileInfo.Length
                };
            }
        }

        // ============================================================
        // Module Access Validation
        // ============================================================

        // ============================================================
        // Module Access Validation
        // ============================================================

        private async Task ValidateModuleAccessAsync(
            string moduleCode,
            long? referenceId,
            string merchantId,
            long userId,
            string roleCode)
        {
            const string code =
                "DOCUMENT-DOWNLOAD";

            switch (moduleCode)
            {
                // ====================================================
                // Trust Withdrawal
                // ====================================================

                case "TRUST_WITHDRAWAL":
                    {
                        if (roleCode != "SA" &&
                            roleCode != "AD" &&
                            roleCode != "OP" &&
                            roleCode != "AC" &&
                            roleCode != "AG")
                        {
                            throw new BusinessException(
                                "You are not allowed to download this document.",
                                code);
                        }

                        return;
                    }

                // ====================================================
                // Trust Returned Document
                //
                // Internal roles only.
                // ====================================================

                case "TRUST_RETURN_DOCUMENT":
                    {
                        if (roleCode != "SA" &&
                            roleCode != "AD" &&
                            roleCode != "OP" &&
                            roleCode != "AC")
                        {
                            throw new BusinessException(
                                "You are not allowed to download this document.",
                                code);
                        }

                        if (!referenceId.HasValue ||
                            referenceId.Value <= 0)
                        {
                            throw new BusinessException(
                                "Invalid Trust Application document.",
                                code);
                        }

                        // ================================================
                        // Verify the referenced Trust Application still
                        // belongs to the current Merchant.
                        //
                        // Do not trust the download registry alone.
                        // ================================================

                        using (
                            var db =
                                new Sandbox_BasedEntities())
                        {
                            bool applicationExists =
                                await db.tbl_TrustApplication
                                    .AnyAsync(
                                        x =>
                                            x.RowID ==
                                                referenceId.Value &&
                                            x.MerchantID ==
                                                merchantId);

                            if (!applicationExists)
                            {
                                throw new BusinessException(
                                    "Trust application not found.",
                                    code);
                            }
                        }

                        return;
                    }

                default:

                    throw new BusinessException(
                        "Unsupported document module.",
                        code);
            }
        }

        // ============================================================
        // Module Listing Access
        // ============================================================

        private Task ValidateModuleListingAccessAsync(
            string moduleCode,
            long userId,
            string roleCode)
        {
            const string code =
                "GET-DOCUMENT-DOWNLOAD-LIST";

            switch (moduleCode)
            {
                // ====================================================
                // Trust Withdrawal
                // ====================================================

                case "TRUST_WITHDRAWAL":
                    {
                        if (roleCode != "SA" &&
                            roleCode != "AD" &&
                            roleCode != "OP" &&
                            roleCode != "AC" &&
                            roleCode != "AG")
                        {
                            throw new BusinessException(
                                "You are not allowed to access this document module.",
                                code);
                        }

                        return Task.CompletedTask;
                    }

                // ====================================================
                // Trust Returned Document
                // ====================================================

                case "TRUST_RETURN_DOCUMENT":
                    {
                        if (roleCode != "SA" &&
                            roleCode != "AD" &&
                            roleCode != "OP" &&
                            roleCode != "AC")
                        {
                            throw new BusinessException(
                                "You are not allowed to access this document module.",
                                code);
                        }

                        return Task.CompletedTask;
                    }

                default:

                    throw new BusinessException(
                        "Unsupported document module.",
                        code);
            }
        }

        // ============================================================
        // Allowed Extensions
        // ============================================================

        private static bool IsAllowedExtension(
            string extension)
        {
            switch (extension)
            {
                // PDF
                case ".pdf":

                // Word
                case ".doc":
                case ".docx":

                // Excel
                case ".xls":
                case ".xlsx":

                // Image
                case ".jpg":
                case ".jpeg":
                case ".png":
                case ".gif":

                    return true;

                default:

                    return false;
            }
        }

        // ============================================================
        // Content Type
        // ============================================================

        private static string GetContentType(
            string extension)
        {
            switch (extension)
            {
                // ====================================================
                // PDF
                // ====================================================

                case ".pdf":

                    return "application/pdf";

                // ====================================================
                // Microsoft Word
                // ====================================================

                case ".doc":

                    return "application/msword";

                case ".docx":

                    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

                // ====================================================
                // Microsoft Excel
                // ====================================================

                case ".xls":

                    return "application/vnd.ms-excel";

                case ".xlsx":

                    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                // ====================================================
                // Images
                // ====================================================

                case ".jpg":
                case ".jpeg":

                    return "image/jpeg";

                case ".png":

                    return "image/png";

                case ".gif":

                    return "image/gif";

                // ====================================================
                // Fallback
                // ====================================================

                default:

                    return "application/octet-stream";
            }
        }

        // ============================================================
        // Resolve Physical Path
        // ============================================================

        private static string ResolvePhysicalPath(string filePath, string storedFileName)
        {
            const string code = "DOCUMENT-DOWNLOAD";

            if (string.IsNullOrWhiteSpace(filePath) || string.IsNullOrWhiteSpace(storedFileName))
            {
                throw new BusinessException("Invalid document file.", code);
            }

            // ============================================================
            // File Name
            // ============================================================

            storedFileName = Path.GetFileName(storedFileName);

            // ============================================================
            // Upload Root
            // ============================================================

            string uploadRootPath = ConfigurationManager.AppSettings["UploadRootPath"];

            if (string.IsNullOrWhiteSpace(uploadRootPath))
            {
                throw new BusinessException("Document storage configuration is invalid.", code);
            }

            string allowedRoot = Path.GetFullPath(uploadRootPath).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

            // ============================================================
            // Normalize DB File Path
            // ============================================================

            string normalizedFilePath = filePath.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar).Trim(Path.DirectorySeparatorChar);

            // ============================================================
            // Resolve Physical Path
            // ============================================================

            string physicalPath = Path.GetFullPath(Path.Combine(allowedRoot, normalizedFilePath, storedFileName));

            // ============================================================
            // Root Protection
            // ============================================================

            if (!physicalPath.StartsWith(allowedRoot, StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessException("Invalid document file path.", code);
            }

            return physicalPath;
        }

        private static bool IsValidModuleCode(string moduleCode)
        {
            if (string.IsNullOrWhiteSpace(moduleCode))
                return false;

            return moduleCode.All(c =>
                (c >= 'A' && c <= 'Z') ||
                (c >= '0' && c <= '9') ||
                c == '_');
        }
    }
}