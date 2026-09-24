using API_CPX.Class.Constant;
using API_CPX.Class.Security;
using API_CPX.Class.Service;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model.Resource
{
    public class CreateResource
    {
        public long UserID { get; set; }
        public string MerchantID { get; set; }
        public string CategoryCode { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Type { get; set; }
        public string Url { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int Status { get; set; }
        public List<string> RoleCodes { get; set; }
        public string FileName { get; set; }
        public string FileType { get; set; }
        public long FileSize { get; set; }
        public string TempFilePath { get; set; }
        public long ResourceID { get; set; }
        public string FileUrl { get; set; }
        public string UploadedFile { get; set; }
        public string Message { get; set; }

        public async Task<bool> CreateAsync()
        {
            UploadFileResult upload = null;

            using (var dbR = new Sandbox_BasedEntities())
            {
                var merchant = await dbR.tbl_Merchant.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.Status == 0);

                if (merchant == null)
                {
                    Message = "Err : Invalid merchant ID.";
                    return false;
                }

                var member = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);

                if (member == null)
                {
                    Message = "Err : Invalid account ID.";
                    return false;
                }

                if (string.IsNullOrWhiteSpace(CategoryCode))
                {
                    Message = "Err : Resource category is required.";
                    return false;
                }

                CategoryCode = CategoryCode.Trim().ToUpperInvariant();

                var category = await dbR.tbl_ResourceCategory.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.CategoryCode == CategoryCode && a.Status == 0 && a.IsDeleted == false);

                if (category == null)
                {
                    Message = "Err : Invalid resource category.";
                    return false;
                }

                if (string.IsNullOrWhiteSpace(Name))
                {
                    Message = "Resource name is required.";
                    return false;
                }

                Name = Name.Trim();

                if (Name.Length > 200)
                {
                    Message = "Resource name cannot exceed 200 characters.";
                    return false;
                }

                if (string.IsNullOrWhiteSpace(Type))
                {
                    Message = "Err : Resource type is required.";
                    return false;
                }

                Type = Type.Trim().ToUpperInvariant();

                if (Type != ResourceType.Content &&
                    Type != ResourceType.File &&
                    Type != ResourceType.Hyperlink &&
                    Type != ResourceType.EmbedVideo)
                {
                    Message = "Err : Invalid resource type.";
                    return false;
                }

                if (Status != 0 && Status != 4)
                {
                    Message = "Err : Invalid resource status.";
                    return false;
                }

                if (RoleCodes == null || RoleCodes.Count == 0)
                {
                    Message = "Please select at least one role.";
                    return false;
                }

                RoleCodes = RoleCodes.Where(a => !string.IsNullOrWhiteSpace(a)).Select(a => a.Trim().ToUpperInvariant()).Distinct().ToList();

                if (RoleCodes.Count == 0)
                {
                    Message = "Please select at least one role.";
                    return false;
                }

                if (StartDate.HasValue && EndDate.HasValue && EndDate.Value < StartDate.Value)
                {
                    Message = "End date must be later than start date.";
                    return false;
                }

                if (Type == ResourceType.File)
                {
                    if (string.IsNullOrWhiteSpace(TempFilePath))
                    {
                        Message = "File is required.";
                        return false;
                    }

                    var uploadRequest = new UploadFileRequest
                    {
                        MerchantID = MerchantID,
                        UserID = UserID,
                        ModuleCode = "RESOURCES",
                        UploadType = "RESOURCE",
                        SubFolder = "resources",
                        OriginalFileName = FileName,
                        ContentType = FileType,
                        TempFilePath = TempFilePath,
                        SecurityPolicy = FileUploadPolicies.Resource()
                    };

                    upload = await FileUploadService.UploadAsync(uploadRequest);

                    if (!upload.IsSuccess)
                    {
                        Message = upload.Message;
                        return false;
                    }

                    FileUrl = upload.FileUrl;
                    UploadedFile = upload.UploadedFile;
                    FileSize = upload.FileSize;
                }
                else if (Type == ResourceType.Content)
                {
                    if (string.IsNullOrWhiteSpace(Description))
                    {
                        Message = "Description is required for content resource.";
                        return false;
                    }

                    Description = Description.Trim();
                }
                else if (Type == ResourceType.Hyperlink ||
                         Type == ResourceType.EmbedVideo)
                {
                    if (!ValidateUrl())
                    {
                        return false;
                    }
                }

                using (var transaction = dbR.Database.BeginTransaction())
                {
                    try
                    {
                        var resource = new tbl_Resource
                        {
                            MerchantID = MerchantID,
                            PublicID = Guid.NewGuid(),
                            CategoryCode = CategoryCode,
                            Name = Name,
                            Description = Type == ResourceType.Content ? Description : null,
                            Type = Type,
                            FileUrl = upload?.FileUrl,
                            UploadedFile = upload?.UploadedFile,
                            OriginalFileName = upload != null ? FileName : null,
                            StoredFileName = upload?.StoredFileName,
                            FileExtension = upload?.Extension,
                            ContentType = upload != null ? FileType : null,
                            FileSize = upload?.FileSize,
                            FileUploadAuditID = upload?.AuditID,
                            Url = Type == ResourceType.Hyperlink || Type == ResourceType.EmbedVideo ? Url : null,
                            StartDate = StartDate,
                            EndDate = EndDate,
                            Status = Status,
                            CreatedAt = DateTime.Now,
                            CreatedBy = UserID.ToString(),
                            IsDeleted = false
                        };

                        dbR.tbl_Resource.Add(resource);
                        await dbR.SaveChangesAsync();

                        foreach (var roleCode in RoleCodes)
                        {
                            dbR.tbl_ResourceRole.Add(new tbl_ResourceRole
                            {
                                ResourceID = resource.RowID,
                                RoleCode = roleCode,
                                CreatedAt = DateTime.Now,
                                CreatedBy = UserID.ToString()
                            });
                        }

                        await dbR.SaveChangesAsync();

                        transaction.Commit();

                        ResourceID = resource.RowID;

                        if (upload != null)
                        {
                            await FileUploadService.CompleteAsync(upload.AuditID);
                        }

                        Message = "Success";
                        return true;
                    }
                    catch
                    {
                        transaction.Rollback();

                        if (upload != null)
                        {
                            await FileUploadService.FailAsync(
                                upload.AuditID,
                                upload.PhysicalFilePath,
                                "RESOURCE_SAVE_FAILED",
                                "Resource record could not be created."
                            );
                        }

                        Message = "Err : Unable to create resource.";
                        return false;
                    }
                }
            }
        }

        private bool ValidateUrl()
        {
            if (string.IsNullOrWhiteSpace(Url))
            {
                Message = "Err : URL is required.";
                return false;
            }

            Url = Url.Trim();

            Uri uri;

            if (!Uri.TryCreate(Url, UriKind.Absolute, out uri))
            {
                Message = "Err : Invalid URL.";
                return false;
            }

            if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            {
                Message = "Err : Only HTTP or HTTPS URL is allowed.";
                return false;
            }

            return true;
        }
    }
}