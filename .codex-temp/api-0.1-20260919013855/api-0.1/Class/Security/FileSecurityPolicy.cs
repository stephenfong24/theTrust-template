using System.Collections.Generic;

namespace API_CPX.Class.Security
{
    public class FileSecurityPolicy
    {
        public long MaxFileSize { get; set; }
        public List<string> AllowedExtensions { get; set; }
        public bool RequireAntivirusScan { get; set; }
        public FileSecurityPolicy()
        {
            AllowedExtensions =
                new List<string>();

            RequireAntivirusScan = true;
        }
    }
}