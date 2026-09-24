using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class FileUploadAuditListAsync
    {
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }

        private IEnumerable<FileUploadAuditList> fileUploadAuditLists;

        public IEnumerable<FileUploadAuditList> FileUploadAuditLists
        {
            get { return fileUploadAuditLists; }
            set { fileUploadAuditLists = value; }
        }

        public async Task<IEnumerable<FileUploadAuditList>> GetFileUploadAuditListAsync(
            string merchantId,
            int page,
            int pageSize,
            string search = null,
            string moduleCode = null,
            string uploadType = null,
            int? scanStatus = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                if (page <= 0)
                    page = 1;

                if (pageSize <= 0)
                    pageSize = 10;

                var query =
                    from audit in dbR.tbl_FileUploadAudit
                    join member in dbR.tbl_MemberInfo on audit.MemberID equals member.RowID into memberJoin
                    from member in memberJoin.DefaultIfEmpty()
                    where audit.MerchantID == merchantId
                    select new
                    {
                        audit.RowID,
                        audit.MerchantID,
                        audit.MemberID,
                        audit.ModuleCode,
                        audit.UploadType,
                        audit.OriginalFileName,
                        audit.StoredFileName,
                        audit.FileExtension,
                        audit.ContentType,
                        audit.FileSize,
                        audit.SHA256,
                        audit.ScanStatus,
                        audit.ScanCode,
                        audit.ScanMessage,
                        audit.AntivirusExitCode,
                        audit.FileUrl,
                        audit.UploadedFile,
                        audit.CreatedAt,
                        audit.CreatedBy,
                        MemberName = member.Fullname,
                        MemberUsername = member.Username
                    };

                // Search filename / member
                if (!string.IsNullOrWhiteSpace(search))
                {
                    search = search.Trim();

                    query = query.Where(x =>
                        x.OriginalFileName.Contains(search) ||
                        x.StoredFileName.Contains(search) ||
                        x.MemberName.Contains(search) ||
                        x.MemberUsername.Contains(search));
                }

                // Module filter
                if (!string.IsNullOrWhiteSpace(moduleCode))
                {
                    query = query.Where(x => x.ModuleCode == moduleCode);
                }

                // Upload type filter
                if (!string.IsNullOrWhiteSpace(uploadType))
                {
                    query = query.Where(x => x.UploadType == uploadType);
                }

                // Scan status filter
                if (scanStatus.HasValue)
                {
                    query = query.Where(x => x.ScanStatus == scanStatus.Value);
                }

                // Date from
                if (dateFrom.HasValue)
                {
                    DateTime fromDate = dateFrom.Value.Date;
                    query = query.Where(x => x.CreatedAt >= fromDate);
                }

                // Date to - include entire selected day
                if (dateTo.HasValue)
                {
                    DateTime nextDate = dateTo.Value.Date.AddDays(1);
                    query = query.Where(x => x.CreatedAt < nextDate);
                }

                TotalRecords = await query.CountAsync();

                TotalPages = (int)Math.Ceiling((decimal)TotalRecords / pageSize);

                var result = await query
                    .OrderByDescending(x => x.CreatedAt)
                    .ThenByDescending(x => x.RowID)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                FileUploadAuditLists = result
                    .Select((x, index) => new FileUploadAuditList
                    {
                        Id = ((page - 1) * pageSize) + index + 1,
                        RowID = x.RowID,
                        MerchantID = x.MerchantID,
                        MemberID = x.MemberID,
                        MemberName = x.MemberName,
                        MemberUsername = x.MemberUsername,
                        ModuleCode = x.ModuleCode,
                        UploadType = x.UploadType,
                        OriginalFileName = x.OriginalFileName,
                        StoredFileName = x.StoredFileName,
                        FileExtension = x.FileExtension,
                        ContentType = x.ContentType,
                        FileSize = x.FileSize,
                        FileSizeDisplay = FormatFileSize(x.FileSize),
                        SHA256 = x.SHA256,
                        ScanStatus = x.ScanStatus,
                        ScanStatusName = GetScanStatusName(x.ScanStatus),
                        ScanCode = x.ScanCode,
                        ScanMessage = x.ScanMessage,
                        AntivirusExitCode = x.AntivirusExitCode,
                        FileUrl = x.FileUrl,
                        UploadedFile = x.UploadedFile,
                        CreatedAt = x.CreatedAt,
                        CreatedBy = x.CreatedBy
                    })
                    .ToList();

                return FileUploadAuditLists;
            }
        }

        private string GetScanStatusName(int scanStatus)
        {
            switch (scanStatus)
            {
                case 0:
                    return "Pending";

                case 1:
                    return "Scanning";

                case 9:
                    return "Clean";

                case -1:
                    return "Blocked";

                case -2:
                    return "Scan Failed";

                default:
                    return "Unknown";
            }
        }

        private string FormatFileSize(long? fileSize)
        {
            if (!fileSize.HasValue)
                return "-";

            double size = fileSize.Value;

            if (size < 1024)
                return size.ToString("0") + " B";

            if (size < 1024 * 1024)
                return (size / 1024).ToString("0.00") + " KB";

            if (size < 1024 * 1024 * 1024)
                return (size / (1024 * 1024)).ToString("0.00") + " MB";

            return (size / (1024 * 1024 * 1024)).ToString("0.00") + " GB";
        }

        public class FileUploadAuditList
        {
            public long Id { get; set; }
            public long RowID { get; set; }
            public string MerchantID { get; set; }
            public long? MemberID { get; set; }
            public string MemberName { get; set; }
            public string MemberUsername { get; set; }
            public string ModuleCode { get; set; }
            public string UploadType { get; set; }
            public string OriginalFileName { get; set; }
            public string StoredFileName { get; set; }
            public string FileExtension { get; set; }
            public string ContentType { get; set; }
            public long? FileSize { get; set; }
            public string FileSizeDisplay { get; set; }
            public string SHA256 { get; set; }
            public int ScanStatus { get; set; }
            public string ScanStatusName { get; set; }
            public string ScanCode { get; set; }
            public string ScanMessage { get; set; }
            public int? AntivirusExitCode { get; set; }
            public string FileUrl { get; set; }
            public string UploadedFile { get; set; }
            public DateTime CreatedAt { get; set; }
            public string CreatedBy { get; set; }
        }
    }
}