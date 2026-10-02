using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.DocumentDownload
{
    public class DocumentDownloadFileResult
    {
        public string PhysicalPath { get; set; }
        public string FileName { get; set; }
        public string ContentType { get; set; }
        public long FileSize { get; set; }
    }
}