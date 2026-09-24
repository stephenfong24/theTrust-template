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
    public class UpdateResource
    {
        public long ResourceID { get; set; }
        public long UserID { get; set; }
        public string MerchantID { get; set; }
        public string CategoryCode { get; set; }
        public string Description { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public string Url { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int Status { get; set; }
        public List<string> RoleCodes { get; set; }
        public string FileName { get; set; }
        public string FileType { get; set; }
        public string TempFilePath { get; set; }
        public string Message { get; set; }

        public async Task<bool> UpdateAsync()
        {
            UploadFileResult upload = null;

            using (var dbR = new Sandbox_BasedEntities())
            {
                var resource = await dbR.tbl_Resource.FirstOrDefaultAsync(a => a.RowID == ResourceID && a.MerchantID == MerchantID && a.IsDeleted == false);

                if (resource == null)
                {
                    Message = "Err : Resource not found.";
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
                    Message = "Err : Resource name is required.";
                    return false;
                }

                Name = Name.Trim();

                if (Name.Length > 200)
                {
                    Message = "Err : Resource name cannot exceed 200 characters.";
                    return false;
                }

                if (string.IsNullOrWhiteSpace(Type))
                {
                    Message = "Err : Resource type is required.";
                    return false;
                }

                Type = Type.Trim().ToUpperInvariant();

                if (Type != ResourceType.Content && Type != ResourceType.File && Type != ResourceType.Hyperlink && Type != ResourceType.EmbedVideo)
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
                    Message = "Err : Please select at least one role.";
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

                if (Type == ResourceType.File && !string.IsNullOrWhiteSpace(TempFilePath))
                {
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
                }

                if (Type == ResourceType.File && upload == null && string.IsNullOrWhiteSpace(resource.UploadedFile))
                {
                    Message = "Err : File is required.";
                    return false;
                }

                if (Type == ResourceType.Content && string.IsNullOrWhiteSpace(Description))
                {
                    Message = "Err : Description is required for content resource.";
                    return false;
                }

                if (Type == ResourceType.Hyperlink || Type == ResourceType.EmbedVideo)
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
                        resource.CategoryCode = CategoryCode;
                        resource.Name = Name;
                        resource.Type = Type;
                        resource.Status = Status;
                        resource.StartDate = StartDate;
                        resource.EndDate = EndDate;
                        resource.UpdatedAt = DateTime.Now;
                        resource.UpdatedBy = UserID.ToString();

                        if (Type == ResourceType.File)
                        {
                            resource.Url = null;

                            if (upload != null)
                            {
                                resource.FileUrl = upload.FileUrl;
                                resource.UploadedFile = upload.UploadedFile;
                                resource.OriginalFileName = FileName;
                                resource.StoredFileName = upload.StoredFileName;
                                resource.FileExtension = upload.Extension;
                                resource.ContentType = FileType;
                                resource.FileSize = upload.FileSize;
                                resource.FileUploadAuditID = upload.AuditID;
                            }
                        }
                        else
                        {
                            if (Type == ResourceType.Content)
                            {
                                resource.Description = Description;
                                resource.Url = null;
                                resource.FileUrl = null;
                                resource.UploadedFile = null;
                                resource.OriginalFileName = null;
                                resource.StoredFileName = null;
                                resource.FileExtension = null;
                                resource.ContentType = null;
                                resource.FileSize = null;
                                resource.FileUploadAuditID = null;
                            }
                            else
                            {
                                resource.Url = Url;
                                resource.FileUrl = null;
                                resource.UploadedFile = null;
                                resource.OriginalFileName = null;
                                resource.StoredFileName = null;
                                resource.FileExtension = null;
                                resource.ContentType = null;
                                resource.FileSize = null;
                                resource.FileUploadAuditID = null;
                            }
                        }

                        var existingRoles = await dbR.tbl_ResourceRole.Where(a => a.ResourceID == ResourceID).ToListAsync();
                        dbR.tbl_ResourceRole.RemoveRange(existingRoles);

                        foreach (var roleCode in RoleCodes)
                        {
                            dbR.tbl_ResourceRole.Add(new tbl_ResourceRole
                            {
                                ResourceID = ResourceID,
                                RoleCode = roleCode,
                                CreatedAt = DateTime.Now,
                                CreatedBy = UserID.ToString()
                            });
                        }

                        await dbR.SaveChangesAsync();

                        transaction.Commit();

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
                                "RESOURCE_UPDATE_FAILED",
                                "Resource record could not be updated."
                            );
                        }

                        Message = "Err : Unable to update resource.";
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