using API_CPX.Class.Security;

namespace API_CPX.Class.Model
{
    public class UploadFileRequest
    {
        public long UserID { get; set; }

        public string MerchantID { get; set; }

        public string ModuleCode { get; set; }

        public string UploadType { get; set; }

        /// <summary>
        /// Example:
        /// avatar
        /// trust/document
        /// will/document
        /// resource
        /// </summary>
        public string SubFolder { get; set; }

        public string OriginalFileName { get; set; }

        public string ContentType { get; set; }

        /// <summary>
        /// Physical quarantine file path.
        /// Example:
        /// D:\FileUploadTemp\BodyPart_xxx
        /// </summary>
        public string TempFilePath { get; set; }

        public FileSecurityPolicy SecurityPolicy { get; set; }
    }
}