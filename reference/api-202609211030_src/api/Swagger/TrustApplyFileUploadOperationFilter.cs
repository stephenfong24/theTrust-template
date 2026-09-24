using Swashbuckle.Swagger;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http.Description;

public class TrustApplyFileUploadOperationFilter : IOperationFilter
{
    public void Apply(
        Operation operation,
        SchemaRegistry schemaRegistry,
        ApiDescription apiDescription)
    {
        if (apiDescription.RelativePath
            .ToLower()
            .Contains("supporting-document"))
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
                            "Supporting document file. " +
                            "Allowed: PDF, JPG, JPEG, PNG, DOCX and XLSX. " +
                            "Maximum file size: 5 MB.",
                        required = false,
                        type = "file"
                    });
            }
        }
    }
}