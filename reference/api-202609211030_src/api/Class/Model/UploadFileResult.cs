namespace API_CPX.Class.Model
{
    public class UploadFileResult
    {
        public bool IsSuccess { get; set; }
        public string Code { get; set; }
        public string Message { get; set; }
        public long AuditID { get; set; }
        public string StoredFileName { get; set; }
        public string FileUrl { get; set; }
        public string UploadedFile { get; set; }
        public string PhysicalFilePath { get; set; }
        public string SHA256 { get; set; }
        public long FileSize { get; set; }
        public string Extension { get; set; }
    }
}