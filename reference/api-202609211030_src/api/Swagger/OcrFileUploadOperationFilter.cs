using Swashbuckle.Swagger;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http.Description;

public class OcrFileUploadOperationFilter : IOperationFilter
{
    public void Apply(
        Operation operation,
        SchemaRegistry schemaRegistry,
        ApiDescription apiDescription)
    {
        if (apiDescription.RelativePath.ToLower().Contains("ocr-extract-text") || apiDescription.RelativePath.ToLower().Contains("extract-malaysia-ic"))
        {
            // =========================================================
            // Content Type
            // =========================================================

            operation.consumes = new List<string>
            {
                "multipart/form-data"
            };

            if (operation.parameters == null)
            {
                operation.parameters =
                    new List<Parameter>();
            }

            // =========================================================
            // File Upload
            // =========================================================

            if (!operation.parameters.Any(a =>
                a.name == "file"))
            {
                operation.parameters.Add(
                    new Parameter
                    {
                        name = "file",
                        @in = "formData",
                        description =
                            "IC " +
                            "Allowed: JPG, JPEG, PNG" +
                            "Maximum file size: 5 MB.",
                        required = true,
                        type = "file"
                    });
            }
        }
    }
}