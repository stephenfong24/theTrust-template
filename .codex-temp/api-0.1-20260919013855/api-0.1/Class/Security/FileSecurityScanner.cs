using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;

namespace API_CPX.Class.Security
{
    public static class FileSecurityScanner
    {
        public static async Task<FileSecurityScanResult> ScanAsync(string tempFilePath, string originalFileName, FileSecurityPolicy policy)
        {
            var result = new FileSecurityScanResult
            {
                IsSafe = false,
                FileName = originalFileName
            };

            try
            {
                // =====================================================
                // 1. Validate Arguments
                // =====================================================

                if (string.IsNullOrWhiteSpace(tempFilePath) || !File.Exists(tempFilePath))
                {
                    result.Code = "FILE_NOT_FOUND";
                    result.Message = "The uploaded file cannot be found.";
                    return result;
                }

                if (policy == null)
                {
                    result.Code = "INVALID_SECURITY_POLICY";
                    result.Message = "Invalid file security policy.";
                    return result;
                }

                // =====================================================
                // 2. Get Actual File Size
                // =====================================================

                var fileInfo = new FileInfo(tempFilePath);

                result.FileSize = fileInfo.Length;

                if (result.FileSize <= 0)
                {
                    result.Code = "FILE_EMPTY";
                    result.Message = "The uploaded file is empty.";
                    return result;
                }

                // =====================================================
                // 3. Validate File Size
                // =====================================================

                if (policy.MaxFileSize > 0 && result.FileSize > policy.MaxFileSize)
                {
                    result.Code = "FILE_TOO_LARGE";
                    result.Message = "The uploaded file exceeds the allowed file size.";
                    return result;
                }

                // =====================================================
                // 4. Validate Original File Name
                // =====================================================

                if (string.IsNullOrWhiteSpace(originalFileName))
                {
                    result.Code = "INVALID_FILE_NAME";
                    result.Message = "Invalid uploaded file name.";
                    return result;
                }

                string extension = Path.GetExtension(originalFileName)?.ToLowerInvariant();
                result.Extension = extension;

                if (string.IsNullOrWhiteSpace(extension))
                {
                    result.Code = "INVALID_FILE_EXTENSION";
                    result.Message = "Invalid file extension.";
                    return result;
                }

                // =====================================================
                // 5. Validate Extension Against Policy
                // =====================================================

                if (policy.AllowedExtensions == null || !policy.AllowedExtensions.Any(a => string.Equals(a, extension, StringComparison.OrdinalIgnoreCase)))
                {
                    result.Code = "EXTENSION_NOT_ALLOWED";
                    result.Message = "The uploaded file type is not allowed.";
                    return result;
                }

                // =====================================================
                // 6. Validate File Signature
                // =====================================================

                bool validSignature = await ValidateFileSignatureAsync(tempFilePath, extension);

                if (!validSignature)
                {
                    result.Code = "INVALID_FILE_SIGNATURE";
                    result.Message = "The uploaded file content does not match its file type.";
                    return result;
                }

                // =====================================================
                // 7. Additional DOCX Validation
                // =====================================================

                if (extension == ".docx")
                {
                    bool validDocx = ValidateDocxStructure(tempFilePath);

                    if (!validDocx)
                    {
                        result.Code = "INVALID_DOCX";
                        result.Message = "The uploaded Word document is invalid.";
                        return result;
                    }
                }

                // =====================================================
                // 8. Calculate SHA-256
                // =====================================================

                result.SHA256 = await CalculateSHA256Async(tempFilePath);

                // =====================================================
                // 9. Windows Defender Antivirus
                // =====================================================

                if (policy.RequireAntivirusScan)
                {
                    var antivirusResult = await ScanWithWindowsDefenderAsync(tempFilePath);

                    result.AntivirusExitCode =  antivirusResult.AntivirusExitCode;

                    if (!antivirusResult.IsSafe)
                    {
                        result.Code = antivirusResult.Code;
                        result.Message = antivirusResult.Message;
                        return result;
                    }
                }

                // =====================================================
                // 10. Passed
                // =====================================================

                result.IsSafe = true;
                result.Code = "SAFE";
                result.Message = "File security scan passed.";
                return result;
            }
            catch (Exception)
            {
                result.IsSafe = false;
                result.Code = "SCAN_FAILED";
                result.Message = "Unable to complete file security scan.";
                return result;
            }
        }

        // =============================================================
        // File Signature
        // =============================================================

        private static async Task<bool> ValidateFileSignatureAsync(string filePath, string extension)
        {
            byte[] header = new byte[16];

            int bytesRead;

            using (var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, true))
            {
                bytesRead = await stream.ReadAsync(header, 0, header.Length);
            }

            if (bytesRead <= 0)
            {
                return false;
            }

            switch (extension)
            {
                // JPEG
                case ".jpg":
                case ".jpeg":

                    return bytesRead >= 3 &&
                           header[0] == 0xFF &&
                           header[1] == 0xD8 &&
                           header[2] == 0xFF;

                // PNG
                case ".png":

                    return bytesRead >= 8 &&
                           header[0] == 0x89 &&
                           header[1] == 0x50 &&
                           header[2] == 0x4E &&
                           header[3] == 0x47 &&
                           header[4] == 0x0D &&
                           header[5] == 0x0A &&
                           header[6] == 0x1A &&
                           header[7] == 0x0A;

                // GIF87a / GIF89a
                case ".gif":

                    if (bytesRead < 6)
                    {
                        return false;
                    }

                    bool gif87 =
                        header[0] == 0x47 &&
                        header[1] == 0x49 &&
                        header[2] == 0x46 &&
                        header[3] == 0x38 &&
                        header[4] == 0x37 &&
                        header[5] == 0x61;

                    bool gif89 =
                        header[0] == 0x47 &&
                        header[1] == 0x49 &&
                        header[2] == 0x46 &&
                        header[3] == 0x38 &&
                        header[4] == 0x39 &&
                        header[5] == 0x61;

                    return gif87 || gif89;

                // PDF
                case ".pdf":

                    return bytesRead >= 5 &&
                           header[0] == 0x25 &&
                           header[1] == 0x50 &&
                           header[2] == 0x44 &&
                           header[3] == 0x46 &&
                           header[4] == 0x2D;

                // Old Word .doc
                case ".doc":

                    return bytesRead >= 8 &&
                           header[0] == 0xD0 &&
                           header[1] == 0xCF &&
                           header[2] == 0x11 &&
                           header[3] == 0xE0 &&
                           header[4] == 0xA1 &&
                           header[5] == 0xB1 &&
                           header[6] == 0x1A &&
                           header[7] == 0xE1;

                // DOCX = ZIP / OpenXML
                case ".docx":

                    return bytesRead >= 4 &&
                           header[0] == 0x50 &&
                           header[1] == 0x4B &&
                           (
                               (header[2] == 0x03 &&
                                header[3] == 0x04)
                               ||
                               (header[2] == 0x05 &&
                                header[3] == 0x06)
                               ||
                               (header[2] == 0x07 &&
                                header[3] == 0x08)
                           );

                default:
                    return false;
            }
        }

        // =============================================================
        // Validate DOCX structure
        // =============================================================

        private static bool ValidateDocxStructure(string filePath)
        {
            try
            {
                using (var archive = ZipFile.OpenRead(filePath))
                {
                    bool hasContentTypes =
                        archive.Entries.Any(a =>
                            string.Equals(
                                a.FullName,
                                "[Content_Types].xml",
                                StringComparison.OrdinalIgnoreCase));

                    bool hasWordDocument =
                        archive.Entries.Any(a =>
                            string.Equals(
                                a.FullName,
                                "word/document.xml",
                                StringComparison.OrdinalIgnoreCase));

                    return hasContentTypes && hasWordDocument;
                }
            }
            catch
            {
                return false;
            }
        }

        // =============================================================
        // SHA-256
        // =============================================================

        private static async Task<string> CalculateSHA256Async(string filePath)
        {
            using (var sha256 = SHA256.Create())
            {
                using (var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, true))
                {
                    byte[] hash = await Task.Run(() => sha256.ComputeHash(stream));

                    return BitConverter
                        .ToString(hash)
                        .Replace("-", "")
                        .ToLowerInvariant();
                }
            }
        }

        // =============================================================
        // Windows Defender
        // =============================================================

        private static async Task<FileSecurityScanResult> ScanWithWindowsDefenderAsync(string filePath)
        {
            try
            {
                string defenderPath =  FindWindowsDefenderExecutable();

                if (string.IsNullOrWhiteSpace(defenderPath))
                {
                    return new FileSecurityScanResult
                    {
                        IsSafe = false,
                        Code = "ANTIVIRUS_UNAVAILABLE",
                        Message = "Antivirus security scanner is unavailable."
                    };
                }

                var startInfo =
                    new ProcessStartInfo
                    {
                        FileName = defenderPath,
                        Arguments = "-Scan -ScanType 3 -File \"" + filePath + "\" -DisableRemediation",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    };

                using (var process = new Process())
                {
                    process.StartInfo = startInfo;

                    process.Start();

                    Task<string> outputTask = process.StandardOutput.ReadToEndAsync();

                    Task<string> errorTask = process.StandardError.ReadToEndAsync();

                    await Task.Run(() => process.WaitForExit());

                    string output = await outputTask;

                    string error = await errorTask;

                    int exitCode = process.ExitCode;

                    if (exitCode == 0)
                    {
                        return new FileSecurityScanResult
                        {
                            IsSafe = true,
                            Code = "SAFE",
                            Message = "Antivirus scan passed.",
                            AntivirusExitCode = exitCode
                        };
                    }

                    /*
                     * IMPORTANT:
                     *
                     * Do not automatically assume every non-zero
                     * Defender exit code means malware.
                     *
                     * Some non-zero results can indicate:
                     * - scanner problem
                     * - configuration problem
                     * - service unavailable
                     * - command execution problem
                     *
                     * The exact result mapping should be verified
                     * against the Microsoft Defender version deployed
                     * on your production Windows Server.
                     *
                     * From a security perspective we FAIL CLOSED:
                     * if Defender does not confirm success,
                     * the upload is not accepted.
                     */

                    return new FileSecurityScanResult
                    {
                        IsSafe = false,
                        Code = "ANTIVIRUS_SCAN_FAILED",
                        Message = "The uploaded file did not pass the antivirus scan.",
                        AntivirusExitCode = exitCode
                    };
                }
            }
            catch (Exception)
            {
                return new FileSecurityScanResult
                {
                    IsSafe = false,
                    Code = "ANTIVIRUS_SCAN_FAILED",
                    Message =  "Unable to complete antivirus scan."
                };
            }
        }

        // =============================================================
        // Find Defender
        // =============================================================

        private static string FindWindowsDefenderExecutable()
        {
            // Newer Windows Defender platform versions are normally
            // installed under ProgramData.

            string platformPath =
                Path.Combine(
                    Environment.GetFolderPath(
                        Environment.SpecialFolder.CommonApplicationData),
                    "Microsoft",
                    "Windows Defender",
                    "Platform"
                );

            try
            {
                if (Directory.Exists(platformPath))
                {
                    var directories = Directory.GetDirectories(platformPath).OrderByDescending(a => a).ToList();

                    foreach (string directory in directories)
                    {
                        string path = Path.Combine(directory, "MpCmdRun.exe");
                        if (File.Exists(path))
                        {
                            return path;
                        }
                    }
                }
            }
            catch
            {
                // Try fallback.
            }

            // Older/fallback installation path

            string fallback =
                Path.Combine(
                    Environment.GetFolderPath(
                        Environment.SpecialFolder.ProgramFiles),
                    "Windows Defender",
                    "MpCmdRun.exe"
                );

            if (File.Exists(fallback))
            {
                return fallback;
            }

            return null;
        }
    }
}