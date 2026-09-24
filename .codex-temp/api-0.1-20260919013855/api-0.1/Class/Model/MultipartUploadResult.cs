namespace API_CPX.Class.Model
{
    public class MultipartUploadResult
    {
        public bool IsSuccess { get; set; }
        public string Code { get; set; }
        public string Message { get; set; }
        public string TempFilePath { get; set; }
        public string OriginalFileName { get; set; }
        public string ContentType { get; set; }
        public long FileSize { get; set; }
    }
}