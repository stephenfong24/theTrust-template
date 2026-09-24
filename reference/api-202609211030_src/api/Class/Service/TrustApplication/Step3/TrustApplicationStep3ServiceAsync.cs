using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Step3
{
    public class TrustApplicationStep3ServiceAsync
    {
        private readonly TrustApplicationStep3Validator validator;
        private readonly TrustApplicationCommonService commonService;

        public TrustApplicationStep3ServiceAsync()
        {
            validator = new TrustApplicationStep3Validator();
            commonService = new TrustApplicationCommonService();
        }

        public async Task<TrustApplicationStepResult> SaveAsync(string merchantId, long userId, string roleCode, TrustApplicationStep3Request request)
        {
            validator.Validate(request);

            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction())
            {
                try
                {
                    // ====================================================
                    // Get Application
                    // ====================================================

                    var application = await commonService.GetApplicationForStepUpdateAsync(db, merchantId, userId, roleCode, request.TrustID);

                    // ====================================================
                    // Must Complete Step 2
                    // ====================================================

                    if (commonService.IsAgent(roleCode))
                    {
                        commonService.ValidateStepAccess(application, 3, roleCode);
                    }

                    // ====================================================
                    // Save Caretaker Distribution
                    // ====================================================

                    await SaveCaretakerDistributionAsync(db, application.RowID, userId, request.CaretakerDistribution);

                    application.HasCaretakerDistribution = request.CaretakerDistribution != null && request.CaretakerDistribution.Enabled;

                    // ====================================================
                    // Save Beneficiaries
                    // ====================================================

                    await SaveBeneficiariesAsync(db, application.RowID, userId, request.Beneficiaries);

                    // ====================================================
                    // Minor Distribution
                    // ====================================================

                    await SaveMinorDistributionAsync(
                        db,
                        application.RowID,
                        userId,
                        request);

                    // ====================================================
                    // Update Application Progress
                    // ====================================================

                    commonService.CompleteStepSave(application, 3, userId, roleCode);

                    // ====================================================
                    // Trust Application History
                    // ====================================================

                    TrustApplicationHistoryHelper.Add(
                        db,
                        application.RowID,
                        "STEP_3_UPDATED",
                        "Step 3 Updated",
                        "Beneficiary, caretaker and minor distribution information was updated.",
                        userId,
                        "APPLICATION",
                        application.RowID);

                    await db.SaveChangesAsync();
                    transaction.Commit();

                    return commonService.ToResult(application);
                }
                catch
                {
                    transaction.Rollback();
                    throw;
                }
            }
        }

        private async Task SaveBeneficiariesAsync(Sandbox_BasedEntities db, long trustApplicationId, long userId, List<TrustApplicationBeneficiaryRequest> requests)
        {
            var existingBeneficiaries = await db.tbl_TrustApplication_Beneficiary.Where(x => x.TrustApplicationID == trustApplicationId).ToListAsync();

            // ========================================================
            // IDs submitted by React
            // ========================================================

            var submittedIds = requests.Where(x => x.BeneficiaryID.HasValue).Select(x => x.BeneficiaryID.Value).ToList();

            // ========================================================
            // Validate Submitted Beneficiary IDs
            // ========================================================

            foreach (long beneficiaryId in submittedIds)
            {
                bool exists = existingBeneficiaries.Any(x => x.RowID == beneficiaryId);
                if (!exists)
                {
                    throw new BusinessException("Invalid Beneficiary ID: " + beneficiaryId + ".", "SAVE-TRUST-APPLICATION-STEP-3");
                }
            }

            // ========================================================
            // Mark Removed Beneficiaries Inactive
            // ========================================================

            foreach (var existing in existingBeneficiaries)
            {
                if (existing.IsActive && !submittedIds.Contains(existing.RowID))
                {
                    existing.IsActive = false;
                    existing.UpdatedAt = DateTime.Now;
                    existing.UpdatedBy = userId;
                }
            }

            // ========================================================
            // Insert / Update
            // ========================================================

            foreach (var request in requests)
            {
                tbl_TrustApplication_Beneficiary beneficiary;
                bool isNew = !request.BeneficiaryID.HasValue;

                if (isNew)
                {
                    beneficiary =
                        new tbl_TrustApplication_Beneficiary
                        {
                            TrustApplicationID = trustApplicationId,
                            IsActive = true,
                            CreatedAt = DateTime.Now,
                            CreatedBy = userId
                        };

                    db.tbl_TrustApplication_Beneficiary.Add(beneficiary);
                }
                else
                {
                    beneficiary = existingBeneficiaries.First(x => x.RowID == request.BeneficiaryID.Value);
                    beneficiary.IsActive = true;
                    beneficiary.UpdatedAt = DateTime.Now;
                    beneficiary.UpdatedBy = userId;
                }

                MapBeneficiary(beneficiary, request);
            }
        }

        private async Task SaveCaretakerDistributionAsync(Sandbox_BasedEntities db, long trustApplicationId, long userId, TrustApplicationCaretakerDistributionRequest request)
        {
            var existingCaretakers = await db.tbl_TrustApplication_Caretaker.Where(x => x.TrustApplicationID == trustApplicationId).ToListAsync();

            // ========================================================
            // Distribution Disabled
            // ========================================================

            if (request == null || !request.Enabled)
            {
                foreach (var existing in existingCaretakers)
                {
                    if (existing.IsActive)
                    {
                        existing.IsActive = false;
                        existing.UpdatedAt = DateTime.Now;
                        existing.UpdatedBy = userId;
                    }
                }
                return;
            }

            // ========================================================
            // Main Caretaker
            // ========================================================

            SaveCaretaker(db, existingCaretakers, trustApplicationId, userId, "MAIN", request.Main);

            // ========================================================
            // Substitute Caretaker
            // ========================================================

            bool hasSubstitute =
                request.Substitute != null &&
                (
                    !string.IsNullOrWhiteSpace(request.Substitute.Name) ||
                    !string.IsNullOrWhiteSpace(request.Substitute.IdentityNo) ||
                    !string.IsNullOrWhiteSpace(request.Substitute.ContactNo)
                );

            if (hasSubstitute)
            {
                SaveCaretaker(db, existingCaretakers, trustApplicationId, userId, "SUBSTITUTE", request.Substitute);
            }
            else
            {
                var existingSubstitute = existingCaretakers.FirstOrDefault(x => x.CaretakerType == "SUBSTITUTE");

                if (existingSubstitute != null &&
                    existingSubstitute.IsActive)
                {
                    existingSubstitute.IsActive = false;
                    existingSubstitute.UpdatedAt = DateTime.Now;
                    existingSubstitute.UpdatedBy = userId;
                }
            }
        }

        private void SaveCaretaker(Sandbox_BasedEntities db, List<tbl_TrustApplication_Caretaker> existingCaretakers, long trustApplicationId, long userId, string caretakerType, TrustApplicationCaretakerRequest request)
        {
            var caretaker = existingCaretakers.FirstOrDefault(x => x.CaretakerType == caretakerType);

            if (caretaker == null)
            {
                caretaker =
                    new tbl_TrustApplication_Caretaker
                    {
                        TrustApplicationID = trustApplicationId,
                        CaretakerType = caretakerType,
                        IsActive = true,
                        CreatedAt = DateTime.Now,
                        CreatedBy = userId
                    };

                db.tbl_TrustApplication_Caretaker.Add(caretaker);
            }
            else
            {
                caretaker.IsActive = true;
                caretaker.UpdatedAt = DateTime.Now;
                caretaker.UpdatedBy = userId;
            }

            caretaker.FullName = Clean(request.Name);
            caretaker.IdentityNo = Clean(request.IdentityNo);
            caretaker.ContactNo = Clean(request.ContactNo);
        }

        private async Task SaveMinorDistributionAsync(Sandbox_BasedEntities db, long trustApplicationId, long userId, TrustApplicationStep3Request request)
        {
            // ========================================================
            // Check whether there is at least one minor beneficiary
            //
            // Only:
            // - NRIC
            // - PASSPORT
            //
            // Age must be below 18
            // ========================================================

            bool hasMinorBeneficiary = request.Beneficiaries.Any(x => x != null && IsIndividualIdentityType(x.IdentityType) && x.DateOfBirth.HasValue && IsMinor(x.DateOfBirth.Value));

            // ========================================================
            // Get existing Minor Distribution
            // One application can only have one record
            // ========================================================

            var existing = await db.tbl_TrustApplication_MinorDistribution.FirstOrDefaultAsync(x => x.TrustApplicationID == trustApplicationId);

            // ========================================================
            // No minor beneficiary
            //
            // If previously had a minor but user changed/removed it,
            // remove the old Minor Distribution record.
            // ========================================================

            if (!hasMinorBeneficiary)
            {
                if (existing != null)
                {
                    db.tbl_TrustApplication_MinorDistribution.Remove(existing);
                }
                return;
            }

            // ========================================================
            // Minor exists.
            // Validator should already guarantee this is not null.
            // ========================================================

            if (request.MinorDistribution == null)
            {
                throw new BusinessException("Minor distribution instruction is required.", "SAVE-TRUST-APPLICATION-STEP-3");
            }

            string distributionMethod;

            if (request.MinorDistribution.DistributeToGuardian)
            {
                distributionMethod = "GUARDIAN";
            }
            else if (request.MinorDistribution.HoldByTrusteeCompany)
            {
                distributionMethod = "TRUSTEE_HOLD";
            }
            else
            {
                throw new BusinessException("Minor distribution method is required.", "SAVE-TRUST-APPLICATION-STEP-3");
            }

            // ========================================================
            // INSERT
            // ========================================================

            if (existing == null)
            {
                existing =
                    new tbl_TrustApplication_MinorDistribution
                    {
                        TrustApplicationID = trustApplicationId,
                        DistributionMethod = distributionMethod,
                        ReleaseAge = distributionMethod == "TRUSTEE_HOLD" ? request.MinorDistribution.ReleaseAge : null,
                        CreatedAt = DateTime.Now,
                        CreatedBy = userId
                    };

                db.tbl_TrustApplication_MinorDistribution.Add(existing);
                return;
            }

            // ========================================================
            // UPDATE
            // ========================================================

            existing.DistributionMethod = distributionMethod;
            existing.ReleaseAge = distributionMethod == "TRUSTEE_HOLD" ? request.MinorDistribution.ReleaseAge : null;
            existing.UpdatedAt = DateTime.Now;
            existing.UpdatedBy = userId;
        }

        private void MapBeneficiary(tbl_TrustApplication_Beneficiary entity, TrustApplicationBeneficiaryRequest request)
        {
            // ========================================================
            // Identity
            // ========================================================

            entity.FullName = Clean(request.FullName);
            entity.IdentityType = CleanUpper(request.IdentityType);
            entity.IdentityNo = Clean(request.IdentityNo);
            entity.Nationality = Clean(request.Nationality);

            if (string.Equals(entity.IdentityType, "COMPANY_ID", StringComparison.OrdinalIgnoreCase))
            {
                entity.Gender = null;
                entity.DateOfBirth = null;
            }
            else
            {
                entity.Gender = CleanUpper(request.Gender);
                entity.DateOfBirth = request.DateOfBirth;
            }

            entity.Email = Clean(request.Email);
            entity.ContactNo = Clean(request.ContactNo);

            // ========================================================
            // Relationship
            // ========================================================

            entity.RelationshipCode = CleanUpper(request.RelationshipCode);
            entity.OtherRelationship = IsOther(request.RelationshipCode) ? Clean(request.OtherRelationship) : null;

            // ========================================================
            // Address
            // ========================================================

            entity.AddressLine1 = Clean(request.AddressLine1);
            entity.AddressLine2 = Clean(request.AddressLine2);
            entity.Postcode = Clean(request.Postcode);
            entity.City = Clean(request.City);
            entity.State = Clean(request.State);
            entity.Country = Clean(request.Country);

            // ========================================================
            // Tax
            // ========================================================

            entity.IsUSTaxPayer = request.IsUSTaxPayer.Value;
            entity.HasOtherTaxResidence = request.HasOtherTaxResidence.Value;

            if (!request.HasOtherTaxResidence.Value)
            {
                entity.TaxResidenceCountry = null;
                entity.TaxIdentificationNo = null;
                entity.TINUnavailableReason = null;
                entity.TINUnavailableExplanation = null;
            }
            else
            {
                entity.TaxResidenceCountry = Clean(request.TaxResidenceCountry);
                entity.TaxIdentificationNo = Clean(request.TaxIdentificationNo);
                entity.TINUnavailableReason = CleanUpper(request.TINUnavailableReason);
                entity.TINUnavailableExplanation = string.Equals(request.TINUnavailableReason, "UNABLE_TO_PROVIDE", StringComparison.OrdinalIgnoreCase) ? Clean(request.TINUnavailableExplanation) : null;
            }
        }

        private string Clean(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private string CleanUpper(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();
        }

        private bool IsOther(string value)
        {
            return string.Equals(value, "OTHER", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "OTHERS", StringComparison.OrdinalIgnoreCase);
        }

        private bool IsMinor(DateTime dateOfBirth)
        {
            DateTime today = DateTime.Today;

            int age = today.Year - dateOfBirth.Year;

            if (dateOfBirth.Date > today.AddYears(-age))
            {
                age--;
            }

            return age < 18;
        }

        private bool IsIndividualIdentityType(string identityType)
        {
            return
                string.Equals(
                    identityType,
                    "NRIC",
                    StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(
                    identityType,
                    "PASSPORT",
                    StringComparison.OrdinalIgnoreCase);
        }
    }
}