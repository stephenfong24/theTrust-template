using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.Resource;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/resource")]
    [JwtAuthorize]
    public class ResourceController : ApiController
    {
        [HttpGet]
        [Route("categories")]
        [Authorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> Categories()
        {
            Request.Properties["AuditTitle"] = "Resource Categories Viewed";
            Request.Properties["AuditDescription"] = "Requested the available resource categories.";
            const string code = "RESOURCE-CATEGORIES";

            string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

            using (var dbR = new Sandbox_BasedEntities())
            {
                var data = await dbR.tbl_ResourceCategory
                    .Where(a =>
                        a.MerchantID == merchantId &&
                        a.Status == 0 &&
                        a.IsDeleted == false)
                    .OrderBy(a => a.Sort)
                    .Select(a => new
                    {
                        a.RowID,
                        a.CategoryCode,
                        a.CategoryName
                    })
                    .ToListAsync();

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
        }

        [HttpGet]
        [Route("list")]
        public async Task<IHttpActionResult> List(string categoryCode)
        {
            Request.Properties["AuditTitle"] = "Resource Viewed";
            Request.Properties["AuditDescription"] = "Requested the available resources listing.";
            const string code = "RESOURCE-LIST";
            var identity = User.Identity as ClaimsIdentity;

            string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
            string roleCode = identity?.FindFirst(ClaimTypes.Role)?.Value;
            DateTime now = DateTime.Now;

            using (var dbR = new Sandbox_BasedEntities())
            {
                var query =
                    from r in dbR.tbl_Resource
                    join rr in dbR.tbl_ResourceRole
                        on r.RowID equals rr.ResourceID
                    join c in dbR.tbl_ResourceCategory
                        on new
                        {
                            r.MerchantID,
                            r.CategoryCode
                        }
                        equals new
                        {
                            c.MerchantID,
                            c.CategoryCode
                        }
                    where
                        r.MerchantID == merchantId &&
                        r.Status == 0 &&
                        r.IsDeleted == false &&
                        rr.RoleCode == roleCode &&
                        c.Status == 0 &&
                        c.IsDeleted == false &&
                        (!r.StartDate.HasValue || r.StartDate <= now) &&
                        (!r.EndDate.HasValue || r.EndDate >= now)
                    select new
                    {
                        r.RowID,
                        r.CategoryCode,
                        c.CategoryName,
                        r.Name,
                        r.Description,
                        r.Type,
                        r.FileUrl,
                        r.UploadedFile,
                        r.OriginalFileName,
                        r.Url,
                        r.StartDate,
                        r.EndDate,
                        r.CreatedAt
                    };

                if (!string.IsNullOrWhiteSpace(categoryCode))
                {
                    string category = categoryCode.Trim().ToUpperInvariant();
                    query = query.Where(a => a.CategoryCode == category);
                }

                var data = await query.OrderByDescending(a => a.CreatedAt).ToListAsync();

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
        }

        [HttpGet]
        [Route("manage/list")]
        [Authorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> ManageList(string categoryCode)
        {
            Request.Properties["AuditTitle"] = "Resource Management Viewed";
            Request.Properties["AuditDescription"] = "Requested the resource management listing.";
            const string code = "MANAGE-RESOURCE-LIST";

            string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
            DateTime now = DateTime.Now;

            using (var dbR = new Sandbox_BasedEntities())
            {
                var resources = await (
                    from r in dbR.tbl_Resource
                    join c in dbR.tbl_ResourceCategory
                        on new
                        {
                            r.MerchantID,
                            r.CategoryCode
                        }
                        equals new
                        {
                            c.MerchantID,
                            c.CategoryCode
                        }
                    where
                        r.MerchantID == merchantId &&
                        r.CategoryCode == categoryCode &&
                        r.IsDeleted == false
                    orderby r.CreatedAt descending
                    select new
                    {
                        r.RowID,
                        r.CategoryCode,
                        c.CategoryName,
                        r.Name,
                        r.Description,
                        r.Type,
                        r.FileUrl,
                        r.UploadedFile,
                        r.OriginalFileName,
                        r.Url,
                        r.StartDate,
                        r.EndDate,
                        r.CreatedAt,
                        r.Status
                    })
                    .ToListAsync();

                var resourceIDs = resources
                    .Select(a => a.RowID)
                    .ToList();

                var roleMappings = await dbR.tbl_ResourceRole
                    .Where(a => resourceIDs.Contains(a.ResourceID))
                    .ToListAsync();

                var data = resources.Select(r => new
                {
                    r.RowID,
                    r.CategoryCode,
                    r.CategoryName,
                    r.Name,
                    r.Description,
                    r.Type,
                    r.FileUrl,
                    r.Url,
                    r.StartDate,
                    r.EndDate,
                    r.Status,
                    r.CreatedAt,

                    ScheduleStatus =
                        !r.StartDate.HasValue &&
                        !r.EndDate.HasValue
                            ? "ALWAYS"
                            : r.StartDate.HasValue &&
                              r.StartDate > now
                                ? "SCHEDULED"
                                : r.EndDate.HasValue &&
                                  r.EndDate < now
                                    ? "EXPIRED"
                                    : "PUBLISHED",

                    RoleCodes = roleMappings
                        .Where(a => a.ResourceID == r.RowID)
                        .Select(a => a.RoleCode)
                        .ToList()
                })
                .ToList();

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
        }

        [HttpGet]
        [Route("manage/{id:long}")]
        [Authorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> Detail(long id)
        {
            Request.Properties["AuditTitle"] = "Resource Details Viewed";
            Request.Properties["AuditDescription"] = "Requested resource details.";
            const string code = "RESOURCE-DETAIL";

            string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

            using (var dbR = new Sandbox_BasedEntities())
            {
                var resource = await (
                    from r in dbR.tbl_Resource
                    join c in dbR.tbl_ResourceCategory
                        on new
                        {
                            r.MerchantID,
                            r.CategoryCode
                        }
                        equals new
                        {
                            c.MerchantID,
                            c.CategoryCode
                        }
                    where
                        r.RowID == id &&
                        r.MerchantID == merchantId &&
                        r.IsDeleted == false
                    select new
                    {
                        r.RowID,
                        r.CategoryCode,
                        c.CategoryName,
                        r.Name,
                        r.Description,
                        r.Type,
                        r.FileUrl,
                        r.UploadedFile,
                        r.OriginalFileName,
                        r.StoredFileName,
                        r.FileExtension,
                        r.ContentType,
                        r.FileSize,
                        r.FileUploadAuditID,
                        r.Url,
                        r.StartDate,
                        r.EndDate,
                        r.Status,
                        r.CreatedAt,
                        r.CreatedBy,
                        r.UpdatedAt,
                        r.UpdatedBy
                    })
                    .FirstOrDefaultAsync();

                if (resource == null)
                {
                    throw new BusinessException("Resource not found.", code);
                }

                var roles = await dbR.tbl_ResourceRole
                    .Where(a => a.ResourceID == id)
                    .Select(a => a.RoleCode)
                    .ToListAsync();

                var data = new
                {
                    resource.RowID,
                    resource.CategoryCode,
                    resource.CategoryName,
                    resource.Name,
                    resource.Description,
                    resource.Type,
                    resource.FileUrl,
                    resource.UploadedFile,
                    resource.OriginalFileName,
                    resource.StoredFileName,
                    resource.FileExtension,
                    resource.ContentType,
                    resource.FileSize,
                    resource.FileUploadAuditID,
                    resource.Url,
                    resource.StartDate,
                    resource.EndDate,
                    resource.Status,
                    RoleCodes = roles,
                    resource.CreatedAt,
                    resource.CreatedBy,
                    resource.UpdatedAt,
                    resource.UpdatedBy
                };

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
        }

        [HttpPost]
        [Route("create")]
        [Authorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> Create()
        {
            Request.Properties["AuditTitle"] = "Resource Creation";
            Request.Properties["AuditDescription"] = "Attempted to create a new resource.";
            const string code = "CREATE-RESOURCE";

            string tempFilePath = null;

            try
            {
                var form = await ReadResourceFormAsync(false);
                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                var roles = ParseRoles(form.RoleCodes);

                var m = new CreateResource
                {
                    UserID = userId,
                    MerchantID = merchantId,
                    CategoryCode = form.CategoryCode,
                    Description = form.Description,
                    Name = form.Name,
                    Type = form.Type,
                    Url = form.Url,
                    Status = form.Status,
                    StartDate = form.StartDate,
                    EndDate = form.EndDate,
                    RoleCodes = roles
                };

                if (string.Equals(form.Type, "FILE", StringComparison.OrdinalIgnoreCase))
                {
                    if (form.FileContent == null)
                    {
                        throw new BusinessException("Please select a file.", code);
                    }

                    tempFilePath = await PrepareFileAsync(form.FileContent, m);
                }

                bool success = await m.CreateAsync();

                if (!success)
                {
                    throw new BusinessException(m.Message, code);
                }

                var data = new
                {
                    m.ResourceID,
                    m.FileUrl,
                    m.UploadedFile
                };

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                DeleteTempFile(tempFilePath);
                throw;
            }
            catch
            {
                DeleteTempFile(tempFilePath);
                throw new BusinessException("Unable to create resource.", code);
            }
        }

        [HttpPost]
        [Route("update")]
        [Authorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> Update()
        {
            Request.Properties["AuditTitle"] = "Resource Update";
            Request.Properties["AuditDescription"] = "Attempted to update resource information.";
            const string code = "UPDATE-RESOURCE";

            string tempFilePath = null;

            try
            {
                var form = await ReadResourceFormAsync(true);

                if (form.ResourceID <= 0)
                {
                    throw new BusinessException("Invalid resource ID.", code);
                }

                long userId = Convert.ToInt64(Request.Properties["UserID"]);
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                var roles = ParseRoles(form.RoleCodes);

                var m = new UpdateResource
                {
                    ResourceID = form.ResourceID,
                    UserID = userId,
                    MerchantID = merchantId,
                    CategoryCode = form.CategoryCode,
                    Description = form.Description,
                    Name = form.Name,
                    Type = form.Type,
                    Url = form.Url,
                    Status = form.Status,
                    StartDate = form.StartDate,
                    EndDate = form.EndDate,
                    RoleCodes = roles
                };

                if (form.FileContent != null)
                {
                    tempFilePath = await PrepareFileAsync(form.FileContent, m);
                }

                bool success = await m.UpdateAsync();

                if (!success)
                {
                    throw new BusinessException(m.Message, code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code
                });
            }
            catch (BusinessException)
            {
                DeleteTempFile(tempFilePath);
                throw;
            }
            catch
            {
                DeleteTempFile(tempFilePath);
                throw new BusinessException("Unable to update resource.", code);
            }
        }

        [HttpPost]
        [Route("delete")]
        [Authorize(Roles = "SA,AD")]
        public async Task<IHttpActionResult> Delete(long id)
        {
            Request.Properties["AuditTitle"] = "Resource Removal";
            Request.Properties["AuditDescription"] = "Attempted to remove a resource.";
            const string code = "DELETE-RESOURCE";

            var m = new DeleteResource
            {
                ResourceID = id,
                UserID = Convert.ToInt64(Request.Properties["UserID"]),
                MerchantID = Convert.ToString(Request.Properties["MerchantID"])
            };

            bool success = await m.DeleteAsync();

            if (!success)
            {
                throw new BusinessException(
                    m.Message,
                    code
                );
            }

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = code
            });
        }

        private async Task<ResourceMultipartForm> ReadResourceFormAsync(bool includeResourceID)
        {
            if (!Request.Content.IsMimeMultipartContent())
            {
                throw new BusinessException("Invalid form data.", "RESOURCE-FORM");
            }

            var provider = new MultipartMemoryStreamProvider();

            await Request.Content.ReadAsMultipartAsync(provider);

            var form = new ResourceMultipartForm();

            foreach (var content in provider.Contents)
            {
                string fieldName = content.Headers.ContentDisposition.Name?.Trim('"');
                string fileName = content.Headers.ContentDisposition.FileName?.Trim('"');

                if (!string.IsNullOrWhiteSpace(fileName))
                {
                    form.FileContent = content;
                    continue;
                }

                string value =
                    await content.ReadAsStringAsync();

                switch (fieldName?.ToLowerInvariant())
                {
                    case "resourceid":
                        if (includeResourceID)
                        {
                            long.TryParse(
                                value,
                                out long resourceID
                            );

                            form.ResourceID = resourceID;
                        }
                        break;

                    case "categorycode":
                        form.CategoryCode = value;
                        break;

                    case "name":
                        form.Name = value;
                        break;

                    case "description":
                        form.Description = value;
                        break;

                    case "type":
                        form.Type = value;
                        break;

                    case "url":
                        form.Url = value;
                        break;

                    case "rolecodes":
                        form.RoleCodes = value;
                        break;

                    case "status":
                        int.TryParse(
                            value,
                            out int status
                        );

                        form.Status = status;
                        break;

                    case "startdate":
                        if (DateTime.TryParse(
                            value,
                            out DateTime start))
                        {
                            form.StartDate = start;
                        }
                        break;

                    case "enddate":
                        if (DateTime.TryParse(
                            value,
                            out DateTime end))
                        {
                            form.EndDate = end;
                        }
                        break;
                }
            }

            return form;
        }

        private static List<string> ParseRoles(string roleCodes)
        {
            if (string.IsNullOrWhiteSpace(roleCodes))
            {
                return new List<string>();
            }

            return roleCodes
                .Split(',')
                .Select(a => a.Trim().ToUpperInvariant())
                .Where(a => !string.IsNullOrWhiteSpace(a))
                .Distinct()
                .ToList();
        }

        private static async Task<string> PrepareFileAsync(HttpContent fileContent, CreateResource model)
        {
            string fileName = fileContent.Headers.ContentDisposition.FileName?.Trim('"');
            string contentType = fileContent.Headers.ContentType?.MediaType;

            byte[] fileBytes = await fileContent.ReadAsByteArrayAsync();

            if (fileBytes == null || fileBytes.Length == 0)
            {
                throw new Exception("Uploaded file is empty.");
            }

            string tempFilePath =  await CreateTempFileAsync(fileBytes);

            model.FileName = Path.GetFileName(fileName);
            model.FileType = contentType;
            model.FileSize = fileBytes.LongLength;
            model.TempFilePath = tempFilePath;
            return tempFilePath;
        }

        private static async Task<string> PrepareFileAsync(HttpContent fileContent, UpdateResource model)
        {
            string fileName = fileContent.Headers.ContentDisposition.FileName?.Trim('"');
            string contentType = fileContent.Headers.ContentType?.MediaType;

            byte[] fileBytes = await fileContent.ReadAsByteArrayAsync();

            if (fileBytes == null || fileBytes.Length == 0)
            {
                throw new Exception("Uploaded file is empty.");
            }

            string tempFilePath = await CreateTempFileAsync(fileBytes);

            model.FileName = Path.GetFileName(fileName);
            model.FileType = contentType;
            model.TempFilePath = tempFilePath;
            return tempFilePath;
        }

        private static async Task<string> CreateTempFileAsync(byte[] fileBytes)
        {
            string tempRoot = ConfigurationManager.AppSettings["UploadScanTempPath"];

            if (string.IsNullOrWhiteSpace(tempRoot))
            {
                throw new Exception("UploadScanTempPath is not configured.");
            }

            if (!Directory.Exists(tempRoot))
            {
                Directory.CreateDirectory(tempRoot);
            }

            string tempFilePath = Path.Combine(tempRoot, Guid.NewGuid().ToString("N") + ".tmp");

            using (var stream = new FileStream(tempFilePath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, true))
            {
                await stream.WriteAsync(fileBytes, 0, fileBytes.Length);
            }

            return tempFilePath;
        }

        private static void DeleteTempFile(string filePath)
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(filePath) && File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }
            catch
            {
            }
        }
    }
}