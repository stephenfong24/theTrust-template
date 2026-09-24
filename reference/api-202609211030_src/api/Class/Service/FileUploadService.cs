using API_CPX.Class.Helper;
using API_CPX.Class.Model;
using API_CPX.Class.Security;
using API_CPX.Context;
using System;
using System.Configuration;
using System.Data.Entity;
using System.IO;
using System.Threading.Tasks;

namespace API_CPX.Class.Service
{
    public static class FileUploadService
    {
        public static async Task<UploadFileResult> UploadAsync(UploadFileRequest request)
        {
            var result = new UploadFileResult { IsSuccess = false };
            tbl_FileUploadAudit uploadAudit = null;
            bool fileMoved = false;
            string physicalFilePath = null;

            using (var dbR = new Sandbox_BasedEntities())
            {
                try
                {
                    // =================================================
                    // 1. Request Validation
                    // =================================================

                    if (request == null)
                    {
                        result.Code = "INVALID_REQUEST";
                        result.Message = "Invalid file upload request.";
                        return result;
                    }

                    if (string.IsNullOrWhiteSpace(request.TempFilePath) || !File.Exists(request.TempFilePath))
                    {
                        result.Code = "FILE_NOT_FOUND";
                        result.Message = "Uploaded temporary file cannot be found.";
                        return result;
                    }

                    if (request.SecurityPolicy == null)
                    {
                        result.Code = "INVALID_SECURITY_POLICY";
                        result.Message = "Invalid file security policy.";
                        return result;
                    }

                    if (string.IsNullOrWhiteSpace(request.OriginalFileName))
                    {
                        result.Code = "INVALID_FILE_NAME";
                        result.Message = "Invalid uploaded file name.";
                        return result;
                    }

                    if (string.IsNullOrWhiteSpace(request.ModuleCode))
                    {
                        result.Code = "INVALID_MODULE";
                        result.Message = "Invalid upload module.";
                        return result;
                    }

                    if (string.IsNullOrWhiteSpace(request.UploadType))
                    {
                        result.Code = "INVALID_UPLOAD_TYPE";
                        result.Message = "Invalid upload type.";
                        return result;
                    }

                    if (!IsValidSubFolder(request.SubFolder))
                    {
                        result.Code = "INVALID_UPLOAD_FOLDER";
                        result.Message = "Invalid upload destination.";
                        return result;
                    }

                    // =================================================
                    // 2. Configuration
                    // =================================================

                    string uploadRootPath = ConfigurationManager.AppSettings["UploadRootPath"];
                    string mediaUrl = AppSettingsHelper.MediaUrl;

                    if (string.IsNullOrWhiteSpace(uploadRootPath) || string.IsNullOrWhiteSpace(mediaUrl))
                    {
                        result.Code = "INVALID_CONFIGURATION";
                        result.Message = "Invalid upload system configuration.";
                        return result;
                    }

                    long actualFileSize = new FileInfo(request.TempFilePath).Length;

                    // =================================================
                    // 3. Create Audit Record
                    // =================================================

                    uploadAudit = new tbl_FileUploadAudit
                    {
                        MerchantID = request.MerchantID,
                        MemberID = request.UserID,
                        ModuleCode = request.ModuleCode,
                        UploadType = request.UploadType,
                        OriginalFileName = request.OriginalFileName,
                        FileExtension = Path.GetExtension(request.OriginalFileName)?.ToLowerInvariant(),
                        ContentType = request.ContentType,
                        FileSize = actualFileSize,
                        ScanStatus = 1,
                        ScanCode = "SCANNING",
                        ScanMessage = "File security scan started.",
                        CreatedAt = DateTime.Now,
                        CreatedBy = request.UserID.ToString()
                    };

                    dbR.tbl_FileUploadAudit.Add(uploadAudit);
                    await dbR.SaveChangesAsync();

                    result.AuditID = uploadAudit.RowID;

                    // =================================================
                    // 4. Security Scan
                    // =================================================

                    FileSecurityScanResult scanResult = await FileSecurityScanner.ScanAsync(
                        request.TempFilePath,
                        request.OriginalFileName,
                        request.SecurityPolicy
                    );

                    // =================================================
                    // 5. Scanner Returned No Result
                    // =================================================

                    if (scanResult == null)
                    {
                        uploadAudit.ScanStatus = 5;
                        uploadAudit.ScanCode = "SCAN_FAILED";
                        uploadAudit.ScanMessage = "Unable to complete file security scan.";

                        await dbR.SaveChangesAsync();

                        result.Code = uploadAudit.ScanCode;
                        result.Message = uploadAudit.ScanMessage;
                        return result;
                    }

                    // =================================================
                    // 6. Security Rejected
                    // =================================================

                    if (!scanResult.IsSafe)
                    {
                        uploadAudit.SHA256 = scanResult.SHA256;
                        uploadAudit.FileSize = scanResult.FileSize;
                        uploadAudit.FileExtension = scanResult.Extension;
                        uploadAudit.AntivirusExitCode = scanResult.AntivirusExitCode;
                        uploadAudit.ScanStatus = IsSystemScanError(scanResult.Code) ? 5 : 4;
                        uploadAudit.ScanCode = scanResult.Code;
                        uploadAudit.ScanMessage = scanResult.Message;

                        await dbR.SaveChangesAsync();

                        result.Code = scanResult.Code;
                        result.Message = scanResult.Message;
                        return result;
                    }

                    // =================================================
                    // 7. Scan Passed
                    // =================================================

                    uploadAudit.SHA256 = scanResult.SHA256;
                    uploadAudit.FileSize = scanResult.FileSize;
                    uploadAudit.FileExtension = scanResult.Extension;
                    uploadAudit.AntivirusExitCode = scanResult.AntivirusExitCode;
                    uploadAudit.ScanStatus = 2;
                    uploadAudit.ScanCode = "SAFE";
                    uploadAudit.ScanMessage = "File security scan passed.";

                    await dbR.SaveChangesAsync();

                    // =================================================
                    // 8. Prepare Permanent Folder
                    // =================================================

                    string dateFolder = DateTime.Now.ToString("yyyyMMdd");
                    string normalizedSubFolder = NormalizePhysicalSubFolder(request.SubFolder);
                    string physicalFolder = Path.Combine(uploadRootPath, normalizedSubFolder, dateFolder);

                    if (!Directory.Exists(physicalFolder))
                    {
                        Directory.CreateDirectory(physicalFolder);
                    }

                    // =================================================
                    // 9. Generate Server Filename
                    // =================================================

                    string extension = scanResult.Extension;
                    string newFileName = Guid.NewGuid().ToString("N").ToLowerInvariant() + extension;
                    physicalFilePath = Path.Combine(physicalFolder, newFileName);

                    // =================================================
                    // 10. Move Scanned File
                    // =================================================

                    File.Move(request.TempFilePath, physicalFilePath);
                    fileMoved = true;

                    // =================================================
                    // 11. Build Public Paths
                    // =================================================

                    string urlSubFolder = NormalizeUrlSubFolder(request.SubFolder);
                    string urlFolder = $"{urlSubFolder}/{dateFolder}";
                    string fileUrl = $"{mediaUrl.TrimEnd('/')}/{urlFolder}/{newFileName}";
                    string uploadedFile = $"/fileupload/{urlFolder}/{newFileName}";

                    // =================================================
                    // 12. Update Audit With Storage Information
                    // =================================================

                    uploadAudit.StoredFileName = newFileName;
                    uploadAudit.FileUrl = fileUrl.ToLowerInvariant();
                    uploadAudit.UploadedFile = uploadedFile.ToLowerInvariant();

                    await dbR.SaveChangesAsync();

                    // =================================================
                    // 13. Return To Calling Module
                    // =================================================

                    result.IsSuccess = true;
                    result.Code = "SAFE";
                    result.Message = "File security scan passed.";
                    result.AuditID = uploadAudit.RowID;
                    result.StoredFileName = newFileName;
                    result.FileUrl = uploadAudit.FileUrl;
                    result.UploadedFile = uploadAudit.UploadedFile;
                    result.PhysicalFilePath = physicalFilePath;
                    result.SHA256 = scanResult.SHA256;
                    result.FileSize = scanResult.FileSize;
                    result.Extension = scanResult.Extension;

                    return result;
                }
                catch (Exception)
                {
                    if (fileMoved)
                    {
                        DeleteFileSafely(physicalFilePath);
                    }

                    if (uploadAudit != null)
                    {
                        try
                        {
                            uploadAudit.ScanStatus = 5;
                            uploadAudit.ScanCode = "UPLOAD_ERROR";
                            uploadAudit.ScanMessage = "An unexpected error occurred while storing the uploaded file.";
                            uploadAudit.StoredFileName = null;
                            uploadAudit.FileUrl = null;
                            uploadAudit.UploadedFile = null;

                            await dbR.SaveChangesAsync();
                        }
                        catch
                        {
                        }
                    }

                    result.Code = "UPLOAD_ERROR";
                    result.Message = "Unable to complete file upload.";
                    return result;
                }
                finally
                {
                    DeleteFileSafely(request == null ? null : request.TempFilePath);
                }
            }
        }

        // =============================================================
        // Complete Upload
        // Called only AFTER module-specific DB save succeeds.
        // =============================================================

        public static async Task<bool> CompleteAsync(long auditID)
        {
            try
            {
                using (var dbR = new Sandbox_BasedEntities())
                {
                    var audit = await dbR.tbl_FileUploadAudit.FirstOrDefaultAsync(a => a.RowID == auditID);

                    if (audit == null)
                    {
                        return false;
                    }

                    audit.ScanStatus = 3;
                    audit.ScanCode = "COMPLETED";
                    audit.ScanMessage = "File uploaded and security scan completed successfully.";

                    await dbR.SaveChangesAsync();

                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        // =============================================================
        // Roll Back Uploaded File
        // =============================================================

        public static async Task<bool> FailAsync(
            long auditID,
            string physicalFilePath,
            string code,
            string message)
        {
            DeleteFileSafely(physicalFilePath);

            try
            {
                using (var dbR = new Sandbox_BasedEntities())
                {
                    var audit = await dbR.tbl_FileUploadAudit.FirstOrDefaultAsync(a => a.RowID == auditID);

                    if (audit == null)
                    {
                        return false;
                    }

                    audit.ScanStatus = 5;
                    audit.ScanCode = string.IsNullOrWhiteSpace(code) ? "MODULE_SAVE_FAILED" : code;
                    audit.ScanMessage = string.IsNullOrWhiteSpace(message)
                        ? "File security scan passed but the upload could not be completed."
                        : message;

                    audit.StoredFileName = null;
                    audit.FileUrl = null;
                    audit.UploadedFile = null;

                    await dbR.SaveChangesAsync();

                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        // =============================================================
        // Validate Sub Folder
        // =============================================================

        private static bool IsValidSubFolder(string subFolder)
        {
            if (string.IsNullOrWhiteSpace(subFolder))
            {
                return false;
            }

            if (Path.IsPathRooted(subFolder))
            {
                return false;
            }

            string normalized = subFolder.Replace("\\", "/");

            string[] segments = normalized.Split(
                new[] { '/' },
                StringSplitOptions.RemoveEmptyEntries
            );

            if (segments.Length == 0)
            {
                return false;
            }

            foreach (string segment in segments)
            {
                if (segment == "." || segment == "..")
                {
                    return false;
                }

                if (segment.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
                {
                    return false;
                }
            }

            return true;
        }

        private static string NormalizePhysicalSubFolder(string subFolder)
        {
            return subFolder
                .Replace('/', Path.DirectorySeparatorChar)
                .Replace('\\', Path.DirectorySeparatorChar)
                .Trim(Path.DirectorySeparatorChar);
        }

        private static string NormalizeUrlSubFolder(string subFolder)
        {
            return subFolder.Replace("\\", "/").Trim('/');
        }

        private static bool IsSystemScanError(string code)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return true;
            }

            switch (code.ToUpperInvariant())
            {
                case "SCAN_FAILED":
                case "ANTIVIRUS_UNAVAILABLE":
                case "ANTIVIRUS_SCAN_FAILED":
                case "FILE_NOT_FOUND":
                case "INVALID_SECURITY_POLICY":
                    return true;

                default:
                    return false;
            }
        }

        private static void DeleteFileSafely(string filePath)
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(filePath) && File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }
            catch
            {
                // Log if required.
            }
        }

        // =============================================================
        // Delete Existing Uploaded File
        // Used when a module intentionally removes an uploaded file.
        // =============================================================

        public static bool DeleteUploadedFile(string uploadedFile)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(uploadedFile))
                {
                    return true;
                }

                string uploadRootPath = ConfigurationManager.AppSettings["UploadRootPath"];

                if (string.IsNullOrWhiteSpace(uploadRootPath))
                {
                    return false;
                }

                // UploadedFile generated by UploadAsync:
                // /fileupload/{subfolder}/{dateFolder}/{filename}

                string normalizedUploadedFile = uploadedFile.Replace('\\', '/').Trim();
                const string prefix = "/fileupload/";

                if (!normalizedUploadedFile.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                // Remove "/fileupload/"
                string relativePath = normalizedUploadedFile.Substring(prefix.Length);
                relativePath = relativePath.Replace('/', Path.DirectorySeparatorChar);

                // =====================================================
                // Build physical path
                // =====================================================

                string fullUploadRoot = Path.GetFullPath(uploadRootPath).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
                string physicalFilePath = Path.GetFullPath(Path.Combine(fullUploadRoot, relativePath));

                // =====================================================
                // Security:
                // Never allow deletion outside UploadRootPath
                // =====================================================

                if (!physicalFilePath.StartsWith(fullUploadRoot, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                // File already missing = desired state already achieved.
                if (!File.Exists(physicalFilePath))
                {
                    return true;
                }

                DeleteFileSafely(physicalFilePath);

                return !File.Exists(physicalFilePath);
            }
            catch
            {
                return false;
            }
        }
    }
}