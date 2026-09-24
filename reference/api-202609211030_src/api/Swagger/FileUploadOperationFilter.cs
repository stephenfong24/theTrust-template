using Swashbuckle.Swagger;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http.Description;

public class FileUploadOperationFilter : IOperationFilter
{
    public void Apply(Operation operation, SchemaRegistry schemaRegistry, ApiDescription apiDescription)
    {
        if (apiDescription.RelativePath.ToLower().Contains("upload-avatar"))
        {
            operation.consumes = new List<string>
            {
                "multipart/form-data"
            };

            if (operation.parameters == null)
            {
                operation.parameters = new List<Parameter>();
            }

            operation.parameters.Add(new Parameter
            {
                name = "file",
                @in = "formData",
                description = "Profile avatar image",
                required = true,
                type = "file"
            });
        }
    }
}