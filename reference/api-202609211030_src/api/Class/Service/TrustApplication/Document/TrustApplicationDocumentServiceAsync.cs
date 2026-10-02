using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.Document;
using API_CPX.Class.Service.TrustApplication.Document.Generator;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Document
{
    public class TrustApplicationDocumentServiceAsync
    {
        private const string Code = "TRUST-APPLICATION-DOCUMENT";

        // ============================================================
        // Create Automatic Documents For Stage
        // ============================================================

        public async Task<List<long>> CreateAutomaticDocumentsAsync(Sandbox_BasedEntities db, tbl_TrustApplication application, string stage, long userId)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            if (application == null)
            {
                throw new ArgumentNullException(nameof(application));
            }

            if (string.IsNullOrWhiteSpace(stage))
            {
                throw new BusinessException("Document stage is required.", Code);
            }

            string normalizedStage = stage.Trim().ToUpperInvariant();
            DateTime now = DateTime.Now;

            // ========================================================
            // 1. Find Automatic Documents For Current Stage
            // ========================================================

            var documents =
                await db.tbl_TrustDocument
                    .Where(x => x.Status == 0 && x.AvailableStage == normalizedStage)
                    .OrderBy(x => x.GenerationOrder)
                    .ThenBy(x => x.Sort)
                    .ToListAsync();

            var generatedDocumentIds = new List<long>();

            // ========================================================
            // 2. Get Application Allocation Types
            // ========================================================

            var applicationAllocationTypes =
                await db.tbl_TrustApplication_BeneficiaryAllocation
                    .Where(x => x.TrustApplicationID == application.RowID)
                    .Select(x => x.AllocationType)
                    .Distinct()
                    .ToListAsync();

            // ========================================================
            // 3. Get Active Document Allocation Mappings
            // ========================================================

            var allocationMappings =
                await db.tbl_TrustDocumentAllocationMapping
                    .Where(x => x.IsActive)
                    .ToListAsync();

            // ========================================================
            // 2. Process Documents
            // ========================================================

            foreach (var document in documents)
            {
                // ====================================================
                // Allocation-Specific Document Filter
                // ====================================================

                var documentAllocationMappings =
                    allocationMappings
                        .Where(x => x.TrustDocumentID == document.RowID)
                        .ToList();

                if (documentAllocationMappings.Any())
                {
                    bool allocationMatched =
                        documentAllocationMappings.Any(mapping =>
                            applicationAllocationTypes.Any(allocationType =>
                                string.Equals(
                                    mapping.AllocationType?.Trim(),
                                    allocationType.ToString(),
                                    StringComparison.OrdinalIgnoreCase)));

                    if (!allocationMatched)
                    {
                        continue;
                    }
                }

                // ====================================================
                // 3. Prevent Duplicate Active Generation
                // ====================================================

                bool exists =
                    await db
                        .tbl_TrustApplication_GeneratedDocument
                        .AnyAsync(x => x.TrustApplicationID == application.RowID && x.TrustDocumentID == document.RowID && x.IsActive);

                if (exists)
                {
                    continue;
                }

                // ====================================================
                // 4. Get Current Effective Template
                // ====================================================

                var template =
                    await db.tbl_TrustDocumentTemplate
                        .Where(x =>
                            x.TrustDocumentID == document.RowID && x.IsActive && (x.EffectiveFrom == null || x.EffectiveFrom <= now) && (x.EffectiveTo == null || x.EffectiveTo >= now))
                        .OrderByDescending(x => x.EffectiveFrom)
                        .ThenByDescending(x => x.RowID)
                        .FirstOrDefaultAsync();

                if (template == null)
                {
                    throw new BusinessException("Active document template not found for " + document.DocumentName + ".", Code);
                }

                // ====================================================
                // 5. Create Generation Record
                // ====================================================

                var generated =
                    new tbl_TrustApplication_GeneratedDocument
                    {
                        TrustApplicationID = application.RowID,
                        TrustDocumentID = document.RowID,
                        TrustDocumentTemplateID = template.RowID,
                        GenerationStatus = "PENDING",
                        OriginalFileName = null,
                        FileExtension = null,
                        FileSize = null,
                        FileUrl = null,
                        GeneratedFile = null,
                        SHA256 = null,
                        GeneratedAt = null,
                        GeneratedBy = null,
                        ErrorMessage = null,
                        RetryCount = 0,
                        IsActive = true,
                        CreatedAt = now,
                        CreatedBy = userId,
                        UpdatedAt = null,
                        UpdatedBy = null
                    };

                db.tbl_TrustApplication_GeneratedDocument.Add(generated);

                // ====================================================
                // We need RowID for Hangfire later.
                // This is still inside caller's DB transaction.
                // ====================================================

                await db.SaveChangesAsync();
                generatedDocumentIds.Add(generated.RowID);
            }

            return generatedDocumentIds;
        }

        // ============================================================
        // Get Trust Application Documents
        // ============================================================

        public async Task<TrustApplicationDocumentListResult> GetDocumentsAsync(string merchantId, long userId, string roleCode, long trustId)
        {
            const string code = "GET-TRUST-APPLICATION-DOCUMENTS";

            if (string.IsNullOrWhiteSpace(merchantId))
            {
                throw new BusinessException("Merchant ID is required.", code);
            }

            if (string.IsNullOrWhiteSpace(roleCode))
            {
                throw new BusinessException("User role is required.", code);
            }

            roleCode = roleCode.Trim().ToUpperInvariant();

            using (var db = new Sandbox_BasedEntities())
            {
                // ========================================================
                // 1. Get Trust Application
                // ========================================================

                var application =
                    await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                if (application == null)
                {
                    throw new BusinessException("Trust Application not found.", code);
                }

                // ========================================================
                // 2. Application Access
                // ========================================================

                if (roleCode == "AG")
                {
                    if (application.MemberID != userId)
                    {
                        throw new BusinessException("You are not allowed to view documents for this Trust Application.", code);
                    }
                }
                else
                {
                    bool internalUser =
                        roleCode == "SA"
                        ||
                        roleCode == "AD"
                        ||
                        roleCode == "OP"
                        ||
                        roleCode == "AC";

                    if (!internalUser)
                    {
                        throw new BusinessException("You are not allowed to view documents for this Trust Application.", code);
                    }
                }

                // ========================================================
                // 3. Get Generated Documents
                // ========================================================

                var generatedDocuments =
                    await db.tbl_TrustApplication_GeneratedDocument
                        .Where(x => x.TrustApplicationID == application.RowID && x.IsActive).ToListAsync();

                if (!generatedDocuments.Any())
                {
                    return new TrustApplicationDocumentListResult
                    {
                        TrustID = application.TrustID,
                        TrustNo = application.TrustID.ToString("D4"),
                        ApplicationStatus = application.ApplicationStatus,
                        Documents = new List<TrustApplicationDocumentResult>()
                    };
                }

                // ========================================================
                // 4. Document IDs
                // ========================================================

                var documentIds = generatedDocuments.Select(x => x.TrustDocumentID).Distinct().ToList();

                // ========================================================
                // 5. Get Document Master
                // ========================================================

                var documentMasters = await db.tbl_TrustDocument.Where(x => documentIds.Contains(x.RowID)).ToListAsync();

                // ========================================================
                // 6. Get Role Permissions
                // ========================================================

                var permissions = await db.tbl_TrustDocumentRole.Where(x => documentIds.Contains(x.TrustDocumentID) && x.RoleCode == roleCode).ToListAsync();

                // ========================================================
                // 7. Build Result
                // ========================================================

                var result = new List<TrustApplicationDocumentResult>();

                foreach (var generated in generatedDocuments)
                {
                    var document = documentMasters.FirstOrDefault(x => x.RowID == generated.TrustDocumentID);

                    if (document == null)
                    {
                        continue;
                    }

                    var permission = permissions.FirstOrDefault(x => x.TrustDocumentID == document.RowID);

                    // ====================================================
                    // No permission / CanView false
                    // Do not expose the document.
                    // ====================================================

                    if (permission == null || !permission.CanView)
                    {
                        continue;
                    }

                    // ====================================================
                    // Can Download
                    //
                    // File must already be generated successfully.
                    // ====================================================

                    bool canDownload = permission.CanDownload && string.Equals(generated.GenerationStatus, "COMPLETED", StringComparison.OrdinalIgnoreCase);

                    result.Add(
                        new TrustApplicationDocumentResult
                        {
                            GeneratedDocumentID = generated.RowID,
                            TrustDocumentID = document.RowID,
                            DocumentCode = document.DocumentCode,
                            DocumentName = document.DocumentName,
                            Description = document.Description,
                            DocumentType = document.DocumentType,
                            AvailableStage = document.AvailableStage,
                            GenerationStatus = generated.GenerationStatus,
                            OriginalFileName = generated.OriginalFileName,
                            FileExtension = generated.FileExtension,
                            FileSize = generated.FileSize,
                            GeneratedAt = generated.GeneratedAt,
                            CanView = true,
                            CanDownload = canDownload,
                            ErrorMessage = generated.ErrorMessage
                        });
                }

                // ========================================================
                // 8. Sort
                // ========================================================

                var orderedResult =
                    result
                        .OrderBy(x =>
                        {
                            var master = documentMasters.FirstOrDefault(m => m.RowID == x.TrustDocumentID);
                            return master == null ? int.MaxValue : master.Sort;
                        })
                        .ThenBy(x => x.TrustDocumentID)
                        .ToList();

                // ========================================================
                // 9. Return
                // ========================================================

                return new TrustApplicationDocumentListResult
                {
                    TrustID = application.TrustID,
                    TrustNo = application.TrustID.ToString("D4"),
                    ApplicationStatus = application.ApplicationStatus,
                    Documents = orderedResult
                };
            }
        }

        public async Task<GeneratedPdfResult> GenerateDocumentForViewAsync(string merchantId, long userId, string roleCode, long trustId, string documentCode)
        {
            const string code = "VIEW-TRUST-APPLICATION-DOCUMENT";

            if (string.IsNullOrWhiteSpace(documentCode))
            {
                throw new BusinessException("Document code is required.", code);
            }

            roleCode = (roleCode ?? "").Trim().ToUpperInvariant();
            documentCode = documentCode.Trim().ToUpperInvariant();

            using (var db = new Sandbox_BasedEntities())
            {
                // ---------------------------------------------------------
                // Application
                // ---------------------------------------------------------

                var application = await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                if (application == null)
                {
                    throw new BusinessException("Trust Application not found.", code);
                }

                // ---------------------------------------------------------
                // Agent ownership
                // ---------------------------------------------------------

                if (roleCode == "AG" && application.MemberID != userId)
                {
                    throw new BusinessException("You are not allowed to view this document.", code);
                }

                // ---------------------------------------------------------
                // Document
                // ---------------------------------------------------------

                var document =
                    await db.tbl_TrustDocument
                        .FirstOrDefaultAsync(x => x.DocumentCode == documentCode && x.Status == 0);

                if (document == null)
                {
                    throw new BusinessException("Document configuration not found.", code);
                }

                // ---------------------------------------------------------
                // On-demand generation
                // ---------------------------------------------------------

                if (!document.GenerateOnDemand)
                {
                    throw new BusinessException("This document cannot be generated on demand.", code);
                }

                // ---------------------------------------------------------
                // Permission
                // ---------------------------------------------------------

                var permission =
                    await db.tbl_TrustDocumentRole
                        .FirstOrDefaultAsync(x => x.TrustDocumentID == document.RowID && x.RoleCode == roleCode);

                if (permission == null || !permission.CanView)
                {
                    throw new BusinessException("You are not allowed to view this document.", code);
                }

                // ---------------------------------------------------------
                // Template
                // ---------------------------------------------------------

                DateTime now = DateTime.Now;

                var template =
                    await db.tbl_TrustDocumentTemplate
                        .Where(
                            x =>
                                x.TrustDocumentID == document.RowID && x.IsActive &&
                                (x.EffectiveFrom == null || x.EffectiveFrom <= now) &&
                                (x.EffectiveTo == null || x.EffectiveTo >= now))
                        .OrderByDescending(x => x.EffectiveFrom)
                        .ThenByDescending(x => x.RowID)
                        .FirstOrDefaultAsync();

                if (template == null)
                {
                    throw new BusinessException("Active document template not found.", code);
                }

                // ---------------------------------------------------------
                // Generator
                // ---------------------------------------------------------

                var resolver = new TrustDocumentGeneratorResolver();
                var generator = resolver.Resolve(document.DocumentCode);

                return await generator.GenerateAsync(db, application, document, template, userId);
            }
        }

        // ============================================================
        // Synchronize Letter Of Wishes Document After Step 4 Update
        //
        // Used when SA / AD edits beneficiary allocation after
        // Letter of Wishes document records have already been created.
        //
        // PDF is generated on demand, therefore:
        // - same allocation type = keep existing document record
        // - changed allocation type = deactivate old LOW
        //                             and create new LOW
        // ============================================================

        public async Task SyncLetterOfWishesDocumentAsync(
            Sandbox_BasedEntities db,
            tbl_TrustApplication application,
            long userId)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            if (application == null)
            {
                throw new ArgumentNullException(nameof(application));
            }

            DateTime now = DateTime.Now;

            // ========================================================
            // 1. Current Allocation Type
            // ========================================================

            var allocation =
                await db.tbl_TrustApplication_BeneficiaryAllocation
                    .FirstOrDefaultAsync(
                        x => x.TrustApplicationID == application.RowID);

            if (allocation == null)
            {
                return;
            }

            string allocationType =
                allocation.AllocationType.ToString();

            // ========================================================
            // 2. Find Letter Of Wishes document required by the
            //    CURRENT allocation type.
            // ========================================================

            var mapping =
                await db.tbl_TrustDocumentAllocationMapping
                    .FirstOrDefaultAsync(
                        x =>
                            x.IsActive
                            && x.AllocationType == allocationType);

            if (mapping == null)
            {
                throw new BusinessException(
                    "Letter of Wishes document mapping was not found for Allocation Type "
                    + allocationType
                    + ".",
                    Code);
            }

            long requiredDocumentId =
                mapping.TrustDocumentID;

            // ========================================================
            // 3. Get all Letter Of Wishes document IDs
            //
            // Do NOT deactivate unrelated documents such as:
            // KYC, Trust Deed, Letter Engagement, etc.
            // ========================================================

            var letterOfWishesDocumentIds =
                await (
                    from document in db.tbl_TrustDocument
                    join documentMapping
                        in db.tbl_TrustDocumentAllocationMapping
                        on document.RowID
                        equals documentMapping.TrustDocumentID
                    where
                        document.Status == 0
                        && documentMapping.IsActive
                    select document.RowID
                )
                .Distinct()
                .ToListAsync();

            // ========================================================
            // 4. Existing ACTIVE Letter Of Wishes records
            // ========================================================

            var existingLowDocuments =
                await db.tbl_TrustApplication_GeneratedDocument
                    .Where(
                        x =>
                            x.TrustApplicationID == application.RowID
                            && x.IsActive
                            && letterOfWishesDocumentIds.Contains(
                                x.TrustDocumentID))
                    .ToListAsync();

            // ========================================================
            // 5. Deactivate obsolete Letter Of Wishes
            // ========================================================

            foreach (var generated in existingLowDocuments)
            {
                if (generated.TrustDocumentID != requiredDocumentId)
                {
                    generated.IsActive = false;
                    generated.UpdatedAt = now;
                    generated.UpdatedBy = userId;
                }
            }

            // ========================================================
            // 6. Required LOW already active?
            // ========================================================

            bool requiredAlreadyActive =
                existingLowDocuments.Any(
                    x =>
                        x.TrustDocumentID == requiredDocumentId
                        && x.IsActive);

            if (requiredAlreadyActive)
            {
                return;
            }

            // ========================================================
            // 7. Find current effective template
            // ========================================================

            var template =
                await db.tbl_TrustDocumentTemplate
                    .Where(
                        x =>
                            x.TrustDocumentID == requiredDocumentId
                            && x.IsActive
                            &&
                            (
                                x.EffectiveFrom == null
                                || x.EffectiveFrom <= now
                            )
                            &&
                            (
                                x.EffectiveTo == null
                                || x.EffectiveTo >= now
                            ))
                    .OrderByDescending(x => x.EffectiveFrom)
                    .ThenByDescending(x => x.RowID)
                    .FirstOrDefaultAsync();

            if (template == null)
            {
                throw new BusinessException(
                    "Active Letter of Wishes template was not found for Allocation Type "
                    + allocationType
                    + ".",
                    Code);
            }

            // ========================================================
            // 8. Create new active document record
            // ========================================================

            var generatedDocument =
                new tbl_TrustApplication_GeneratedDocument
                {
                    TrustApplicationID =
                        application.RowID,

                    TrustDocumentID =
                        requiredDocumentId,

                    TrustDocumentTemplateID =
                        template.RowID,

                    GenerationStatus =
                        "COMPLETED",

                    OriginalFileName =
                        null,

                    FileExtension =
                        null,

                    FileSize =
                        null,

                    FileUrl =
                        null,

                    GeneratedFile =
                        null,

                    SHA256 =
                        null,

                    GeneratedAt =
                        null,

                    GeneratedBy =
                        null,

                    ErrorMessage =
                        null,

                    RetryCount =
                        0,

                    IsActive =
                        true,

                    CreatedAt =
                        now,

                    CreatedBy =
                        userId,

                    UpdatedAt =
                        null,

                    UpdatedBy =
                        null
                };

            db.tbl_TrustApplication_GeneratedDocument.Add(
                generatedDocument);
        }
    }
}