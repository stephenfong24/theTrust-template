using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Step6
{
    public class TrustApplicationSupportingDocumentServiceAsync
    {
        public async Task RemoveAsync(
            string merchantId,
            long userId,
            string roleCode,
            long supportingDocumentId)
        {
            const string code =
                "REMOVE-TRUST-APPLICATION-SUPPORTING-DOCUMENT";

            if (supportingDocumentId <= 0)
            {
                throw new BusinessException(
                    "Invalid supporting document.",
                    code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                // =====================================================
                // 1. Find Supporting Document
                // =====================================================

                var document =
                    await db.tbl_TrustApplication_SupportingDocument
                        .FirstOrDefaultAsync(
                            x =>
                                x.RowID == supportingDocumentId &&
                                x.IsActive);

                if (document == null)
                {
                    throw new BusinessException(
                        "Supporting document not found.",
                        code);
                }

                // =====================================================
                // 2. Find Trust Application
                // =====================================================

                var application =
                    await db.tbl_TrustApplication
                        .FirstOrDefaultAsync(
                            x =>
                                x.RowID == document.TrustApplicationID &&
                                x.MerchantID == merchantId);

                if (application == null)
                {
                    throw new BusinessException(
                        "Trust application not found.",
                        code);
                }

                // =====================================================
                // 3. Role Permission
                // =====================================================

                bool isAgent =
                    string.Equals(
                        roleCode,
                        "AG",
                        StringComparison.OrdinalIgnoreCase);

                bool isAdmin =
                    string.Equals(
                        roleCode,
                        "SA",
                        StringComparison.OrdinalIgnoreCase)
                    ||
                    string.Equals(
                        roleCode,
                        "AD",
                        StringComparison.OrdinalIgnoreCase);

                if (!isAgent && !isAdmin)
                {
                    throw new BusinessException(
                        "You are not allowed to remove Trust Application supporting documents.",
                        code);
                }

                // =====================================================
                // 4. Agent Permission
                //
                // Same rule currently used by your upload API.
                // =====================================================

                if (isAgent)
                {
                    if (application.MemberID != userId)
                    {
                        throw new BusinessException(
                            "You are not allowed to update this Trust Application.",
                            code);
                    }

                    if (!string.Equals(
                        application.ApplicationStatus,
                        "DRAFT",
                        StringComparison.OrdinalIgnoreCase))
                    {
                        throw new BusinessException(
                            "Submitted Trust Applications can no longer be edited by the Agent.",
                            code);
                    }
                }

                // =====================================================
                // 5. SA / AD Permission
                //
                // Match your current supporting-document upload rule.
                // =====================================================

                if (isAdmin)
                {
                    if (string.Equals(
                        application.ApplicationStatus,
                        "DRAFT",
                        StringComparison.OrdinalIgnoreCase))
                    {
                        throw new BusinessException(
                            "Draft Trust Applications can only be edited by the Trust Agent.",
                            code);
                    }
                }

                // =====================================================
                // 6. Soft Delete + History
                // =====================================================

                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        DateTime now = DateTime.Now;

                        string originalFileName = document.OriginalFileName;
                        string uploadedFile = document.UploadedFile;

                        // =====================================================
                        // Physically remove uploaded file
                        // =====================================================

                        bool fileDeleted = FileUploadService.DeleteUploadedFile(uploadedFile);

                        if (!fileDeleted)
                        {
                            throw new BusinessException("Unable to remove the uploaded supporting document file.", code);
                        }

                        // =============================================
                        // Soft delete
                        // =============================================

                        document.IsActive = false;
                        document.DeletedAt = now;
                        document.DeletedBy = userId;
                        document.UpdatedAt = now;
                        document.UpdatedBy = userId;

                        // =============================================
                        // Update application
                        // =============================================

                        application.UpdatedAt = now;
                        application.UpdatedBy = userId;

                        // =============================================
                        // Application History
                        // =============================================

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "SUPPORTING_DOCUMENT_REMOVED",
                            "Supporting Document Removed",
                            "Supporting document \"" +
                            originalFileName +
                            "\" was removed.",
                            userId,
                            "SUPPORTING_DOCUMENT",
                            document.RowID);

                        // =============================================
                        // Save
                        // =============================================

                        await db.SaveChangesAsync();

                        transaction.Commit();
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }
    }
}