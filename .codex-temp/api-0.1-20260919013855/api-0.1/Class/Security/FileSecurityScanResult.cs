namespace API_CPX.Class.Security
{
    public class FileSecurityScanResult
    {
        public bool IsSafe { get; set; }
        public string Code { get; set; }
        public string Message { get; set; }
        public string FileName { get; set; }
        public string Extension { get; set; }
        public long FileSize { get; set; }
        public string SHA256 { get; set; }
        public int? AntivirusExitCode { get; set; }
    }
}