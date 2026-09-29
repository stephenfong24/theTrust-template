using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper.Document;
using API_CPX.Class.Model.DTO.Document;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Service.TrustApplication.Document.Generator
{
    public class TrustDeedDocumentGenerator : ITrustDocumentGenerator
    {
        private const string Code = "GENERATE-TRUST-DEED";

        public bool CanHandle(string documentCode)
        {
            return string.Equals(
                documentCode,
                "TRUST_DEED",
                StringComparison.OrdinalIgnoreCase);
        }

        public async Task<GeneratedPdfResult> GenerateAsync(
            Sandbox_BasedEntities db,
            tbl_TrustApplication application,
            tbl_TrustDocument document,
            tbl_TrustDocumentTemplate template,
            long userId)
        {
            if (db == null)
                throw new ArgumentNullException(nameof(db));

            if (application == null)
                throw new ArgumentNullException(nameof(application));

            if (document == null)
                throw new ArgumentNullException(nameof(document));

            if (template == null)
                throw new ArgumentNullException(nameof(template));

            // =====================================================
            // 1. Settlor
            // =====================================================

            var personal =
                await db.tbl_TrustApplication_PersonalDetail
                    .FirstOrDefaultAsync(
                        x => x.TrustApplicationID == application.RowID);

            if (personal == null)
            {
                throw new BusinessException(
                    "Trust Application personal details not found.",
                    Code);
            }

            // =====================================================
            // 2. Trust Asset
            // =====================================================

            var trustAsset =
                await db.tbl_TrustApplication_TrustAsset
                    .FirstOrDefaultAsync(
                        x => x.TrustApplicationID == application.RowID);

            if (trustAsset == null)
            {
                throw new BusinessException(
                    "Trust Application asset information not found.",
                    Code);
            }

            // =====================================================
            // 3. Trust Plan
            // =====================================================

            var plan =
                await db.tbl_TrustPlan
                    .FirstOrDefaultAsync(
                        x => x.ProductCode == application.ProductCode);

            if (plan == null)
            {
                throw new BusinessException(
                    "Trust Product configuration not found.",
                    Code);
            }

            // =====================================================
            // 4. Beneficiaries
            // =====================================================

            var beneficiaries =
                await db.tbl_TrustApplication_Beneficiary
                    .Where(
                        x =>
                            x.TrustApplicationID == application.RowID
                            && x.IsActive)
                    .OrderBy(x => x.RowID)
                    .ToListAsync();

            if (!beneficiaries.Any())
            {
                throw new BusinessException(
                    "Trust Application beneficiary information not found.",
                    Code);
            }

            // =====================================================
            // 5. Relationship master
            // =====================================================

            var relationshipCodes =
                beneficiaries
                    .Where(x => !string.IsNullOrWhiteSpace(x.RelationshipCode))
                    .Select(x => x.RelationshipCode)
                    .Distinct()
                    .ToList();

            var relationships =
                await db.tbl_Relationship
                    .Where(
                        x =>
                            relationshipCodes.Contains(x.Relationship_Code)
                            && x.Status == 0)
                    .ToListAsync();

            // Example later:
            //
            // DateTime deedDate = DateTime.Now;
            // string returnDate = deedDate.ToString("dd MMMM yyyy");

            // =====================================================
            // 7. Build Beneficiary Models
            // =====================================================

            var beneficiaryModels =
                beneficiaries
                    .Select(
                        (beneficiary, index) =>
                        {
                            string relationship = "";

                            if (IsOther(beneficiary.RelationshipCode))
                            {
                                relationship =
                                    beneficiary.OtherRelationship ?? "";
                            }
                            else
                            {
                                var relationshipMaster =
                                    relationships.FirstOrDefault(
                                        x =>
                                            string.Equals(
                                                x.Relationship_Code,
                                                beneficiary.RelationshipCode,
                                                StringComparison.OrdinalIgnoreCase));

                                relationship =
                                    relationshipMaster != null
                                        ? relationshipMaster.Relationship_Name
                                        : beneficiary.RelationshipCode;
                            }

                            return new TrustDeedBeneficiaryDocumentModel
                            {
                                No = index + 1,

                                Name =
                                    beneficiary.FullName ?? "",

                                IdentityNo =
                                    beneficiary.IdentityNo ?? "",

                                Address =
                                    BuildAddress(
                                        beneficiary.AddressLine1,
                                        beneficiary.AddressLine2,
                                        beneficiary.City,
                                        beneficiary.Postcode,
                                        beneficiary.State,
                                        beneficiary.Country),

                                Relationship =
                                    relationship ?? ""
                            };
                        })
                    .ToList();

            // =====================================================
            // 8. Build Document Model
            // =====================================================

            var model =
                new TrustDeedDocumentModel
                {
                    SettlorFullName =
                        personal.FullName ?? "",

                    SettlorIdentityNo =
                        personal.IdentityNo ?? "",

                    SettlorAddress =
                        BuildAddress(
                            personal.AddressLine1,
                            personal.AddressLine2,
                            personal.City,
                            personal.Postcode,
                            personal.State,
                            personal.Country),

                    TrustPlanName =
                        plan.ProductName ?? "",

                    CommenceDate =
                        application.CommencementDate.HasValue
                            ? application.CommencementDate.Value.ToString("dd MMMM yyyy")
                            : "",

                    TrustPlacement =
                        trustAsset.TrustAssetAmount,

                    TrustPlacementWord =
                        MalaysiaCurrencyWordsHelper.ToWords(
                            trustAsset.TrustAssetAmount),

                    Beneficiaries =
                        beneficiaryModels
                };

            // =====================================================
            // 9. Normal Placeholders
            // =====================================================

            var placeholders =
                new Dictionary<string, string>
                {
                    {
                        "{{SETTLOR_FULL_NAME}}",
                        model.SettlorFullName ?? ""
                    },
                    {
                        "{{SETTLOR_IDENTITY_ID}}",
                        model.SettlorIdentityNo ?? ""
                    },
                    {
                        "{{SETTLOR_ADDRESS}}",
                        model.SettlorAddress ?? ""
                    },
                    {
                        "{{TRUST_PLAN_NAME}}",
                        model.TrustPlanName ?? ""
                    },
                    {
                        "{{COMMENCE_DATE}}",
                        model.CommenceDate ?? ""
                    },
                    {
                        "{{TRUST_PLACEMENT}}",
                        model.TrustPlacement.ToString("N2")
                    },
                    {
                        "{{TRUST_PLACEMENT_WORD}}",
                        model.TrustPlacementWord ?? ""
                    }
                };

            // =====================================================
            // 10. Template
            // =====================================================

            string templatePath =
                ResolveTemplatePath(template.TemplatePath);

            // =====================================================
            // 11. Replace normal placeholders + beneficiary rows
            // =====================================================

            byte[] populatedDocx =
                DocxPlaceholderHelper.ReplacePlaceholdersWithBeneficiaries(
                    templatePath,
                    placeholders,
                    model.Beneficiaries);

            // =====================================================
            // 12. DOCX -> PDF
            // =====================================================

            byte[] pdf =
                LibreOfficePdfConverter.ConvertDocxToPdf(
                    populatedDocx);

            // =====================================================
            // 13. Return
            // =====================================================

            return new GeneratedPdfResult
            {
                Content = pdf,
                ContentType = "application/pdf",
                DocumentCode = document.DocumentCode,
                FileName =
                    DocumentFileNameHelper.Build(
                        template.OutputFileNameFormat,
                        application.TrustID,
                        document.DocumentCode)
            };
        }

        private static string BuildAddress(
            string address1,
            string address2,
            string city,
            string postcode,
            string state,
            string country)
        {
            var parts = new List<string>();

            if (!string.IsNullOrWhiteSpace(address1))
                parts.Add(address1.Trim());

            if (!string.IsNullOrWhiteSpace(address2))
                parts.Add(address2.Trim());

            if (!string.IsNullOrWhiteSpace(city))
                parts.Add(city.Trim());

            if (!string.IsNullOrWhiteSpace(postcode))
                parts.Add(postcode.Trim());

            if (!string.IsNullOrWhiteSpace(state))
                parts.Add(state.Trim());

            if (!string.IsNullOrWhiteSpace(country))
                parts.Add(country.Trim());

            return string.Join(", ", parts);
        }

        private static bool IsOther(string value)
        {
            return
                string.Equals(
                    value,
                    "OTHER",
                    StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(
                    value,
                    "OTHERS",
                    StringComparison.OrdinalIgnoreCase);
        }

        private static string ResolveTemplatePath(string relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                throw new BusinessException(
                    "Document template path is not configured.",
                    Code);
            }

            relativePath =
                relativePath
                    .Replace("\\", "/")
                    .TrimStart('/');

            string physicalPath =
                HttpContext.Current.Server.MapPath(
                    "~/" + relativePath);

            if (!File.Exists(physicalPath))
            {
                throw new BusinessException(
                    "Document template file not found.",
                    Code);
            }

            return physicalPath;
        }
    }
}