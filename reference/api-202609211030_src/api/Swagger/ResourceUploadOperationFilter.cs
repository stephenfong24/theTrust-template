using Swashbuckle.Swagger;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http.Description;

namespace API_CPX.App_Start
{
    public class ResourceUploadOperationFilter : IOperationFilter
    {
        public void Apply(
            Operation operation,
            SchemaRegistry schemaRegistry,
            ApiDescription apiDescription)
        {
            string route = apiDescription.RelativePath?.ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(route))
            {
                return;
            }

            bool isCreate =
                route.StartsWith("api/resource/create");

            bool isUpdate =
                route.StartsWith("api/resource/update");

            if (!isCreate && !isUpdate)
            {
                return;
            }

            operation.consumes = new List<string>
            {
                "multipart/form-data"
            };

            operation.parameters =
                operation.parameters ?? new List<Parameter>();

            operation.parameters = operation.parameters
                .Where(a => a.@in != "body" && a.@in != "formData")
                .ToList();

            if (isUpdate)
            {
                operation.parameters.Add(new Parameter
                {
                    name = "ResourceID",
                    @in = "formData",
                    required = true,
                    type = "integer",
                    format = "int64",
                    description = "Resource ID"
                });
            }

            operation.parameters.Add(new Parameter
            {
                name = "CategoryCode",
                @in = "formData",
                required = true,
                type = "string",
                description = "Resource category code, e.g. MEMO"
            });

            operation.parameters.Add(new Parameter
            {
                name = "Name",
                @in = "formData",
                required = true,
                type = "string",
                description = "Resource name"
            });

            operation.parameters.Add(new Parameter
            {
                name = "Description",
                @in = "formData",
                required = false,
                type = "string",
                description = "Required when Type = CONTENT. Used for memo/text content."
            });

            operation.parameters.Add(new Parameter
            {
                name = "Type",
                @in = "formData",
                required = true,
                type = "string",
                @enum = new List<object>
                {
                    "CONTENT",
                    "FILE",
                    "HYPERLINK",
                    "EMBED_VIDEO"
                },
                description = "Resource type"
            });

            operation.parameters.Add(new Parameter
            {
                name = "Url",
                @in = "formData",
                required = false,
                type = "string",
                description = "Required for HYPERLINK or EMBED_VIDEO"
            });

            operation.parameters.Add(new Parameter
            {
                name = "RoleCodes",
                @in = "formData",
                required = true,
                type = "string",
                description = "Comma-separated role codes, e.g. SA,AD"
            });

            operation.parameters.Add(new Parameter
            {
                name = "Status",
                @in = "formData",
                required = true,
                type = "integer",
                format = "int32",
                description = "0 = Active, 4 = Inactive"
            });

            operation.parameters.Add(new Parameter
            {
                name = "StartDate",
                @in = "formData",
                required = false,
                type = "string",
                format = "date-time",
                description = "Optional visibility start date/time"
            });

            operation.parameters.Add(new Parameter
            {
                name = "EndDate",
                @in = "formData",
                required = false,
                type = "string",
                format = "date-time",
                description = "Optional visibility end date/time"
            });

            operation.parameters.Add(new Parameter
            {
                name = "File",
                @in = "formData",
                required = false,
                type = "file",
                description = isCreate
                    ? "Required when Type = FILE"
                    : "Optional replacement file when Type = FILE"
            });
        }
    }
}