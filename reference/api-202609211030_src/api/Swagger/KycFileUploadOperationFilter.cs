using Swashbuckle.Swagger;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http.Description;

public class KycFileUploadOperationFilter : IOperationFilter
{
    public void Apply(Operation operation, SchemaRegistry schemaRegistry, ApiDescription apiDescription)
    {
        if(apiDescription.RelativePath.ToLower().Contains("upload-agent-kyc"))
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
            // Remove Auto Generated documentType If Required
            // =========================================================

            var documentTypeParameter = operation.parameters.FirstOrDefault(a => a.name == "documentType");
            if (documentTypeParameter != null)
            {
                documentTypeParameter.description = "KYC document type: NRIC_FRONT, NRIC_BACK, PASSPORT, SSM_CERT";
                documentTypeParameter.required = true;
            }

            // =========================================================
            // File Upload Button
            // =========================================================

            if (!operation.parameters.Any(a => a.name == "file"))
            {
                operation.parameters.Add(
                    new Parameter
                    {
                        name = "file",
                        @in = "formData",
                        description = "KYC document image. Allowed: JPG, JPEG, PNG. Maximum size: 5 MB.",
                        required = true,
                        type = "file"
                    });
            }
        }

        if (apiDescription.RelativePath.ToLower().Contains("upload-kyc"))
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
            // Remove Auto Generated documentType If Required
            // =========================================================

            var documentTypeParameter = operation.parameters.FirstOrDefault(a => a.name == "documentType");
            if (documentTypeParameter != null)
            {
                documentTypeParameter.description = "KYC document type: NRIC_FRONT, NRIC_BACK, PASSPORT, SSM_CERT";
                documentTypeParameter.required = true;
            }

            // =========================================================
            // File Upload Button
            // =========================================================

            if (!operation.parameters.Any(a => a.name == "file"))
            {
                operation.parameters.Add(
                    new Parameter
                    {
                        name = "file",
                        @in = "formData",
                        description = "KYC document image. Allowed: JPG, JPEG, PNG. Maximum size: 5 MB.",
                        required = true,
                        type = "file"
                    });
            }
        }
    }
}