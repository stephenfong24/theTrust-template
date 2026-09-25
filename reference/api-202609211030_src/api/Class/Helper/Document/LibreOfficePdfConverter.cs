using System;
using System.Diagnostics;
using System.IO;

namespace API_CPX.Class.Helper.Document
{
    public static class LibreOfficePdfConverter
    {
        private const int TimeoutMilliseconds = 120000;

        // =========================================================
        // DOCX -> PDF
        // Used by Booking Form and other Word templates
        // =========================================================
        public static byte[] ConvertDocxToPdf(byte[] docxBytes)
        {
            return ConvertToPdf(
                docxBytes,
                ".docx",
                "writer_pdf_Export");
        }

        // =========================================================
        // XLSX -> PDF
        // Used by Official Receipt
        // =========================================================
        public static byte[] ConvertXlsxToPdf(byte[] xlsxBytes)
        {
            return ConvertToPdf(
                xlsxBytes,
                ".xlsx",
                "calc_pdf_Export");
        }

        // =========================================================
        // Centralized LibreOffice conversion
        // =========================================================
        private static byte[] ConvertToPdf(byte[] sourceBytes, string inputExtension, string pdfFilter)
        {
            if (sourceBytes == null || sourceBytes.Length == 0)
            {
                throw new ArgumentException("Source document is empty.", nameof(sourceBytes));
            }

            if (string.IsNullOrWhiteSpace(inputExtension))
            {
                throw new ArgumentException("Input extension is required.", nameof(inputExtension));
            }

            if (string.IsNullOrWhiteSpace(pdfFilter))
            {
                throw new ArgumentException("PDF filter is required.", nameof(pdfFilter));
            }

            // =====================================================
            // 1. LibreOffice executable
            // =====================================================

            string libreOfficePath = GetLibreOfficePath();

            if (!File.Exists(libreOfficePath))
            {
                throw new FileNotFoundException("LibreOffice executable was not found.", libreOfficePath);
            }

            // =====================================================
            // 2. Create isolated temporary working directory
            // =====================================================

            string jobId = Guid.NewGuid().ToString("N");
            string jobPath = Path.Combine(Path.GetTempPath(), "TrustDocumentGeneration", jobId);

            Directory.CreateDirectory(jobPath);

            try
            {
                // =================================================
                // 3. Source file
                //
                // document.docx
                // OR
                // document.xlsx
                // =================================================

                string inputPath = Path.Combine(jobPath, "document" + inputExtension);

                File.WriteAllBytes(inputPath, sourceBytes);

                // =================================================
                // 4. Expected output
                // =================================================

                string outputPath = Path.Combine(jobPath, "document.pdf");

                // =================================================
                // 5. Separate LibreOffice profile
                //
                // Important when multiple documents are generated
                // concurrently.
                // =================================================

                string profilePath = Path.Combine(jobPath, "lo-profile");
                Directory.CreateDirectory(profilePath);
                string profileUri = new Uri(profilePath).AbsoluteUri;

                // =================================================
                // 6. LibreOffice arguments
                // =================================================

                string arguments =
                    "--headless " +
                    "--nologo " +
                    "--nodefault " +
                    "--nofirststartwizard " +
                    "-env:UserInstallation=\"" +
                    profileUri +
                    "\" " +
                    "--convert-to \"pdf:" +
                    pdfFilter +
                    "\" " +
                    "--outdir \"" +
                    jobPath +
                    "\" " +
                    "\"" +
                    inputPath +
                    "\"";

                // =================================================
                // 7. Execute LibreOffice
                // =================================================

                var startInfo =
                    new ProcessStartInfo
                    {
                        FileName = libreOfficePath,
                        Arguments = arguments,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        WorkingDirectory = jobPath
                    };

                string standardOutput;
                string standardError;

                using (var process = new Process())
                {
                    process.StartInfo = startInfo;
                    process.Start();

                    standardOutput = process.StandardOutput.ReadToEnd();
                    standardError = process.StandardError.ReadToEnd();

                    bool completed = process.WaitForExit(TimeoutMilliseconds);

                    if (!completed)
                    {
                        try
                        {
                            process.Kill();
                        }
                        catch
                        {
                            // Ignore kill failure.
                        }

                        throw new Exception("LibreOffice PDF conversion timed out.");
                    }

                    if (process.ExitCode != 0)
                    {
                        throw new Exception(
                            "LibreOffice PDF conversion failed. " +
                            "ExitCode: " +
                            process.ExitCode +
                            ". Error: " +
                            standardError +
                            ". Output: " +
                            standardOutput);
                    }
                }

                // =================================================
                // 8. Verify PDF generated
                // =================================================

                if (!File.Exists(outputPath))
                {
                    throw new Exception(
                        "LibreOffice completed but the PDF " +
                        "file was not generated. " +
                        "Output: " +
                        standardOutput +
                        ". Error: " +
                        standardError);
                }

                // =================================================
                // 9. Read generated PDF
                // =================================================

                byte[] pdfBytes = File.ReadAllBytes(outputPath);

                if (pdfBytes.Length == 0)
                {
                    throw new Exception("Generated PDF file is empty.");
                }

                return pdfBytes;
            }
            finally
            {
                // =================================================
                // 10. Clean temporary files
                // =================================================

                try
                {
                    if (Directory.Exists(jobPath))
                    {
                        Directory.Delete(jobPath, true);
                    }
                }
                catch
                {
                    // Do not fail document generation just because
                    // temporary cleanup failed.
                }
            }
        }

        // =========================================================
        // Resolve LibreOffice executable
        // =========================================================
        private static string GetLibreOfficePath()
        {
            // You can later move this to Web.config.
            return @"C:\Program Files\LibreOffice\program\soffice.exe";
        }
    }
}