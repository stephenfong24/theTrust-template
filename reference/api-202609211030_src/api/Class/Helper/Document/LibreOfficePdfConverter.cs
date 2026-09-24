using System;
using System.Configuration;
using System.Diagnostics;
using System.IO;

namespace API_CPX.Class.Helper.Document
{
    public static class LibreOfficePdfConverter
    {
        public static byte[] ConvertDocxToPdf(byte[] docxBytes)
        {
            if (docxBytes == null || docxBytes.Length == 0)
            {
                throw new ArgumentException("DOCX content is empty.", nameof(docxBytes));
            }

            string libreOfficePath = ConfigurationManager.AppSettings["LibreOfficePath"];
            string tempRootPath = ConfigurationManager.AppSettings["DocumentGenerationTempPath"];
            int timeoutSeconds = 60;
            int.TryParse(ConfigurationManager.AppSettings["LibreOfficeConversionTimeoutSeconds"], out timeoutSeconds);

            if (timeoutSeconds <= 0)
            {
                timeoutSeconds = 60;
            }

            if (string.IsNullOrWhiteSpace(libreOfficePath))
            {
                throw new InvalidOperationException("LibreOfficePath is not configured.");
            }

            if (!File.Exists(libreOfficePath))
            {
                throw new FileNotFoundException("LibreOffice executable was not found.", libreOfficePath);
            }

            if (string.IsNullOrWhiteSpace(tempRootPath))
            {
                throw new InvalidOperationException("DocumentGenerationTempPath is not configured.");
            }

            if (!Directory.Exists(tempRootPath))
            {
                Directory.CreateDirectory(tempRootPath);
            }

            string jobId = Guid.NewGuid().ToString("N");
            string jobPath = Path.Combine(tempRootPath, jobId);
            Directory.CreateDirectory(jobPath);
            string inputPath = Path.Combine(jobPath, "document.docx");
            string outputPath = Path.Combine(jobPath, "document.pdf");

            /*
             * Give every conversion its own LibreOffice
             * user profile.
             *
             * This is important when multiple API requests
             * generate documents at the same time.
             */

            string profilePath = Path.Combine(jobPath, "lo-profile");
            Directory.CreateDirectory(profilePath);

            try
            {
                File.WriteAllBytes(inputPath, docxBytes);

                string profileUri = new Uri(profilePath).AbsoluteUri;

                string arguments =
                    "--headless " +
                    "--nologo " +
                    "--nodefault " +
                    "--nofirststartwizard " +
                    "-env:UserInstallation=\"" +
                    profileUri +
                    "\" " +
                    "--convert-to pdf:writer_pdf_Export " +
                    "--outdir \"" +
                    jobPath +
                    "\" " +
                    "\"" +
                    inputPath +
                    "\"";

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

                using (var process =
                    new Process())
                {
                    process.StartInfo = startInfo;
                    process.Start();

                    standardOutput = process.StandardOutput.ReadToEnd();
                    standardError = process.StandardError.ReadToEnd();

                    bool completed = process.WaitForExit(timeoutSeconds * 1000);

                    if (!completed)
                    {
                        try
                        {
                            process.Kill();
                        }
                        catch
                        {
                            // Ignore cleanup error.
                        }

                        throw new TimeoutException("LibreOffice PDF conversion timed out.");
                    }

                    if (process.ExitCode != 0)
                    {
                        throw new InvalidOperationException(
                            "LibreOffice PDF conversion failed. " +
                            "ExitCode: " +
                            process.ExitCode +
                            ". Error: " +
                            standardError +
                            ". Output: " +
                            standardOutput);
                    }
                }

                if (!File.Exists(outputPath))
                {
                    throw new FileNotFoundException(
                        "LibreOffice did not generate the expected PDF. " +
                        "Output: " +
                        standardOutput +
                        ". Error: " +
                        standardError,
                        outputPath);
                }

                byte[] pdfBytes = File.ReadAllBytes(outputPath);

                if (pdfBytes.Length == 0)
                {
                    throw new InvalidOperationException("Generated PDF is empty.");
                }

                return pdfBytes;
            }
            finally
            {
                try
                {
                    if (Directory.Exists(jobPath))
                    {
                        Directory.Delete(jobPath, true);
                    }
                }
                catch
                {
                    /*
                     * Do not fail the document request merely
                     * because temporary-file cleanup failed.
                     *
                     * We can log this later.
                     */
                }
            }
        }
    }
}