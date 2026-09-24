using API_CPX.Class.Model;
using System;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace API_CPX.Class.Helper
{
    public static class MultipartUploadHelper
    {
        public static async Task<MultipartUploadResult> ReadSingleFileAsync(HttpRequestMessage request)
        {
            var result = new MultipartUploadResult {IsSuccess = false};

            try
            {
                if (request == null || request.Content == null || !request.Content.IsMimeMultipartContent())
                {
                    result.Code = "INVALID_MULTIPART";
                    result.Message = "Invalid upload request.";
                    return result;
                }

                string tempRootPath = ConfigurationManager.AppSettings["UploadScanTempPath"];

                if (string.IsNullOrWhiteSpace(tempRootPath))
                {
                    result.Code = "TEMP_PATH_NOT_CONFIGURED";
                    result.Message = "Upload scan temporary path is not configured.";
                    return result;
                }

                if (!Directory.Exists(tempRootPath))
                {
                    Directory.CreateDirectory(tempRootPath);
                }

                var provider = new MultipartFormDataStreamProvider(tempRootPath);

                await request.Content.ReadAsMultipartAsync(provider);

                if (provider.FileData == null || provider.FileData.Count == 0)
                {
                    result.Code = "FILE_NOT_FOUND";
                    result.Message = "Please select a file to upload.";
                    return result;
                }

                if (provider.FileData.Count > 1)
                {
                    foreach (var file in provider.FileData)
                    {
                        DeleteFileSafely(file.LocalFileName);
                    }

                    result.Code = "MULTIPLE_FILES_NOT_ALLOWED";
                    result.Message = "Only one file can be uploaded at a time.";
                    return result;
                }

                var fileData = provider.FileData.First();

                string tempFilePath = fileData.LocalFileName;

                string fileName =
                    fileData.Headers
                        .ContentDisposition
                        .FileName?
                        .Trim('"');

                string contentType =
                    fileData.Headers
                        .ContentType?
                        .MediaType;

                long fileSize = 0;

                if (File.Exists(tempFilePath))
                {
                    fileSize = new FileInfo(tempFilePath).Length;
                }

                result.IsSuccess = true;
                result.Code = "SUCCESS";
                result.Message = "Success";
                result.TempFilePath = tempFilePath;
                result.OriginalFileName = fileName;
                result.ContentType = contentType;
                result.FileSize = fileSize;
                return result;
            }
            catch
            {
                result.Code = "UPLOAD_READ_FAILED";
                result.Message = "Unable to read uploaded file.";
                return result;
            }
        }

        public static void DeleteFileSafely(string filePath)
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
    }
}