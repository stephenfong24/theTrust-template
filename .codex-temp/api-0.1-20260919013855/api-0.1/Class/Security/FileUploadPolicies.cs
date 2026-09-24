using System.Collections.Generic;

namespace API_CPX.Class.Security
{
    public static class FileUploadPolicies
    {
        /// <summary>
        /// Profile picture / avatar upload.
        /// Maximum size: 10 MB
        /// </summary>
        public static FileSecurityPolicy Avatar()
        {
            return new FileSecurityPolicy
            {
                MaxFileSize = 10 * 1024 * 1024,

                AllowedExtensions = new List<string>
                {
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".gif"
                },

                RequireAntivirusScan = true
            };
        }

        /// <summary>
        /// Resource module upload.
        /// Maximum size: 20 MB
        /// </summary>
        public static FileSecurityPolicy Resource()
        {
            return new FileSecurityPolicy
            {
                MaxFileSize = 5 * 1024 * 1024,

                AllowedExtensions = new List<string>
                {
                    ".pdf",
                    ".doc",
                    ".docx",
                    ".xls",
                    ".xlsx",
                    ".ppt",
                    ".pptx",
                    ".jpg",
                    ".jpeg",
                    ".png"
                },

                RequireAntivirusScan = true
            };
        }

        /// <summary>
        /// Trust Application supporting document upload.
        /// Maximum size: 5 MB
        /// </summary>
        public static FileSecurityPolicy TrustApplicationSupportingDocument()
        {
            return new FileSecurityPolicy
            {
                MaxFileSize = 5L * 1024 * 1024,

                AllowedExtensions = new List<string>
                {
                    ".pdf",
                    ".doc",
                    ".docx",
                    ".jpg",
                    ".jpeg",
                    ".png"
                },

                RequireAntivirusScan = true
            };
        }

        /// <summary>
        /// Will document upload.
        /// Maximum size: 30 MB
        /// </summary>
        public static FileSecurityPolicy WillDocument()
        {
            return new FileSecurityPolicy
            {
                MaxFileSize = 30 * 1024 * 1024,

                AllowedExtensions = new List<string>
                {
                    ".pdf",
                    ".doc",
                    ".docx",
                    ".jpg",
                    ".jpeg",
                    ".png"
                },

                RequireAntivirusScan = true
            };
        }
    }
}