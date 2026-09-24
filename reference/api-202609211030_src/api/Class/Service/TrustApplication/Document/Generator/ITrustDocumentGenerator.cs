using API_CPX.Class.Model.DTO.Document;
using API_CPX.Context;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Document.Generator
{
    public interface ITrustDocumentGenerator
    {
        bool CanHandle(string documentCode);

        Task<GeneratedPdfResult> GenerateAsync(
            Sandbox_BasedEntities db,
            tbl_TrustApplication application,
            tbl_TrustDocument document,
            tbl_TrustDocumentTemplate template,
            long userId);
    }
}