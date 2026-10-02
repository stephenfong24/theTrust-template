using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.DocumentDownload
{
    public class DocumentDownloadListResult
    {
        public string ModuleCode { get; set; }
        public Guid DocumentGuid { get; set; }
        public string DocumentType { get; set; }
        public string DocumentName { get; set; }
        public string FileName { get; set; }
        public string FileExtension { get; set; }
    }
}