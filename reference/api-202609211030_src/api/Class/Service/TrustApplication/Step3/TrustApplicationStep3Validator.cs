using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.TrustApplication;
using System;
using System.Collections.Generic;
using System.Linq;

namespace API_CPX.Class.Service.TrustApplication.Step3
{
    public class TrustApplicationStep3Validator
    {
        private const string Code = "SAVE-TRUST-APPLICATION-STEP-3";

        public void Validate(TrustApplicationStep3Request request)
        {
            if (request == null)
            {
                throw new BusinessException("Request is required.", Code);
            }

            if (request.TrustID <= 0)
            {
                throw new BusinessException("Trust ID is required.", Code);
            }

            // ============================================================
            // Caretaker Distribution
            // ============================================================

            if (request.CaretakerDistribution != null && request.CaretakerDistribution.Enabled)
            {
                // ========================================================
                // Main Caretaker - Mandatory
                // ========================================================

                if (request.CaretakerDistribution.Main == null)
                {
                    throw new BusinessException("Main caretaker information is required.", Code);
                }

                if (string.IsNullOrWhiteSpace(request.CaretakerDistribution.Main.Name))
                {
                    throw new BusinessException("Main caretaker name is required.", Code);
                }

                if (string.IsNullOrWhiteSpace(request.CaretakerDistribution.Main.IdentityNo))
                {
                    throw new BusinessException("Main caretaker identity number is required.", Code);
                }

                if (string.IsNullOrWhiteSpace(request.CaretakerDistribution.Main.ContactNo))
                {
                    throw new BusinessException("Main caretaker contact number is required.", Code);
                }

                // ========================================================
                // Substitute Caretaker - Optional
                // If any field is entered, all fields are required
                // ========================================================

                var substitute = request.CaretakerDistribution.Substitute;

                bool hasSubstitute =
                    substitute != null &&
                    (
                        !string.IsNullOrWhiteSpace(substitute.Name) ||
                        !string.IsNullOrWhiteSpace(substitute.IdentityNo) ||
                        !string.IsNullOrWhiteSpace(substitute.ContactNo)
                    );

                if (hasSubstitute)
                {
                    if (string.IsNullOrWhiteSpace(substitute.Name))
                    {
                        throw new BusinessException("Substitute caretaker name is required.", Code);
                    }

                    if (string.IsNullOrWhiteSpace(substitute.IdentityNo))
                    {
                        throw new BusinessException("Substitute caretaker identity number is required.", Code);
                    }

                    if (string.IsNullOrWhiteSpace(substitute.ContactNo))
                    {
                        throw new BusinessException("Substitute caretaker contact number is required.", Code);
                    }

                    if (!Validation.IsValidPhone(substitute.ContactNo))
                    {
                        throw new BusinessException("Please enter a valid substitute caretaker contact number.", Code);
                    }
                }
            }

            // ========================================================
            // Minimum 1 Beneficiary
            // ========================================================

            if (request.Beneficiaries == null || request.Beneficiaries.Count == 0)
            {
                throw new BusinessException("At least one beneficiary is required.", Code);
            }

            // ========================================================
            // Prevent duplicate BeneficiaryID
            // ========================================================

            var duplicateIds = request.Beneficiaries.Where(x => x.BeneficiaryID.HasValue).GroupBy(x => x.BeneficiaryID.Value).Where(x => x.Count() > 1).Select(x => x.Key).ToList();
            if (duplicateIds.Any())
            {
                throw new BusinessException("Duplicate beneficiary detected.", Code);
            }

            // ========================================================
            // Validate Each Beneficiary
            // ========================================================

            for (int i = 0; i < request.Beneficiaries.Count; i++)
            {
                var beneficiary = request.Beneficiaries[i];
                ValidateBeneficiary(beneficiary, i + 1);
            }

            // ========================================================
            // Validate Minor Distribution ONCE for whole application
            // ========================================================

            ValidateMinorDistribution(request);
        }

        private void ValidateBeneficiary(TrustApplicationBeneficiaryRequest beneficiary, int beneficiaryNumber)
        {
            if (beneficiary == null)
            {
                throw Error(beneficiaryNumber, "Beneficiary information is required.");
            }

            // ========================================================
            // Identity
            // ========================================================

            if (string.IsNullOrWhiteSpace(beneficiary.FullName))
            {
                throw Error(beneficiaryNumber, "Full Name is required.");
            }

            if (string.IsNullOrWhiteSpace(beneficiary.IdentityType))
            {
                throw Error(beneficiaryNumber, "Type of Identity is required.");
            }

            if (string.IsNullOrWhiteSpace(beneficiary.IdentityNo))
            {
                throw Error(beneficiaryNumber, "NRIC / Passport / ID No. is required.");
            }

            if (string.IsNullOrWhiteSpace(beneficiary.Nationality))
            {
                throw Error(beneficiaryNumber, "Nationality is required.");
            }

            // ========================================================
            // Individual Beneficiary
            // ========================================================

            string identityType = beneficiary.IdentityType.Trim().ToUpperInvariant();

            if (identityType != "COMPANY_ID")
            {
                if (string.IsNullOrWhiteSpace(beneficiary.Gender))
                {
                    throw Error(beneficiaryNumber, "Gender is required.");
                }

                if (!beneficiary.DateOfBirth.HasValue)
                {
                    throw Error(beneficiaryNumber, "Date of Birth is required.");
                }

                if (beneficiary.DateOfBirth.Value.Date > DateTime.Today)
                {
                    throw Error(beneficiaryNumber, "Date of Birth cannot be a future date.");
                }

                // ========================================================
                // Malaysia NRIC Date of Birth Validation
                // ========================================================

                if (string.Equals(beneficiary.IdentityType, "NRIC", StringComparison.OrdinalIgnoreCase))
                {
                    ValidateMalaysiaNricDateOfBirth(beneficiary.IdentityNo, beneficiary.DateOfBirth.Value, beneficiaryNumber);
                }
            }

            if (string.IsNullOrWhiteSpace(beneficiary.Email))
            {
                throw Error(beneficiaryNumber, "Email is required.");
            }

            if (!Validation.IsValidEmail(beneficiary.Email))
            {
                throw Error(beneficiaryNumber, "Email is not in valid format.");
            }

            if (string.IsNullOrWhiteSpace(beneficiary.ContactNo))
            {
                throw Error(beneficiaryNumber, "Contact number is required.");
            }

            if (!Validation.IsValidPhone(beneficiary.ContactNo))
            {
                throw Error(beneficiaryNumber, "Contact number is invalid.");
            }

            if (!Validation.isValidIC(beneficiary.IdentityNo))
            {
                throw Error(beneficiaryNumber, "Invalid identification number. Please enter letters and numbers only, without spaces or special characters.");
            }

            // ========================================================
            // Relationship
            // ========================================================

            if (string.IsNullOrWhiteSpace(beneficiary.RelationshipCode))
            {
                throw Error(beneficiaryNumber, "Relationship is required.");
            }

            if (IsOther(beneficiary.RelationshipCode) && string.IsNullOrWhiteSpace(beneficiary.OtherRelationship))
            {
                throw Error(beneficiaryNumber, "Other Relationship is required.");
            }

            // ========================================================
            // Address
            // ========================================================

            if (string.IsNullOrWhiteSpace(beneficiary.AddressLine1))
            {
                throw Error(beneficiaryNumber, "Address Line 1 is required.");
            }

            if (string.IsNullOrWhiteSpace(beneficiary.Postcode))
            {
                throw Error(beneficiaryNumber, "Postcode is required.");
            }

            if (string.IsNullOrWhiteSpace(beneficiary.City))
            {
                throw Error(beneficiaryNumber, "City is required.");
            }

            if (string.IsNullOrWhiteSpace(beneficiary.State))
            {
                throw Error(beneficiaryNumber, "State is required.");
            }

            if (string.IsNullOrWhiteSpace(beneficiary.Country))
            {
                throw Error(beneficiaryNumber, "Country is required.");
            }

            // ========================================================
            // Tax
            // ========================================================

            ValidateTax(beneficiary, beneficiaryNumber);
        }

        private void ValidateMinorDistribution(TrustApplicationStep3Request request)
        {
            // ========================================================
            // Check whether application contains at least one
            // NRIC / PASSPORT beneficiary below 18 years old
            // ========================================================

            bool hasMinorBeneficiary =
                request.Beneficiaries.Any(x => x != null && IsIndividualIdentityType(x.IdentityType) && x.DateOfBirth.HasValue && IsMinor(x.DateOfBirth.Value));

            // ========================================================
            // No minor beneficiary
            // Minor distribution is not required
            // ========================================================

            if (!hasMinorBeneficiary)
            {
                return;
            }

            // ========================================================
            // At least one minor exists
            // Minor distribution is required ONCE
            // ========================================================

            if (request.MinorDistribution == null)
            {
                throw new BusinessException("Minor distribution instruction is required because the application contains a beneficiary below 18 years old.", Code);
            }

            bool distributeToGuardian = request.MinorDistribution.DistributeToGuardian;

            bool holdByTrustee = request.MinorDistribution.HoldByTrusteeCompany;

            // ========================================================
            // Exactly one option must be selected
            // ========================================================

            if (distributeToGuardian == holdByTrustee)
            {
                throw new BusinessException("Please select either distribute to guardian or hold by Trustee Company.", Code);
            }

            // ========================================================
            // Trustee Company requires Release Age
            // ========================================================

            if (holdByTrustee)
            {
                if (!request.MinorDistribution.ReleaseAge.HasValue)
                {
                    throw new BusinessException("Release age is required when distribution is held by Trustee Company.", Code);
                }

                if (request.MinorDistribution.ReleaseAge.Value <= 18)
                {
                    throw new BusinessException("Release age must be above 18.", Code);
                }
            }

            // ========================================================
            // Guardian does not use Release Age
            // ========================================================

            if (distributeToGuardian && request.MinorDistribution.ReleaseAge.HasValue)
            {
                throw new BusinessException("Release age is not applicable when distribution is made to the guardian.", Code);
            }
        }

        private void ValidateTax(TrustApplicationBeneficiaryRequest beneficiary, int beneficiaryNumber)
        {
            if (!beneficiary.IsUSTaxPayer.HasValue)
            {
                throw Error(beneficiaryNumber, "US tax declaration is required.");
            }

            if (!beneficiary.HasOtherTaxResidence.HasValue)
            {
                throw Error(beneficiaryNumber, "Other tax residence declaration is required.");
            }

            if (!beneficiary.HasOtherTaxResidence.Value)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(beneficiary.TaxResidenceCountry))
            {
                throw Error(beneficiaryNumber, "Country / Jurisdiction of Tax Residence is required.");
            }

            if (beneficiary.HasOtherTaxResidence.Value != true)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(beneficiary.TaxIdentificationNo))
            {
                throw new BusinessException("Tax Identification Number is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(beneficiary.TINUnavailableReason))
            {
                throw Error(beneficiaryNumber, "TIN or a reason for unavailable TIN is required.");
            }

            string reason = beneficiary.TINUnavailableReason.Trim().ToUpperInvariant();

            string[] allowedReasons =
            {
                "TIN_NOT_ISSUED",
                "UNABLE_TO_PROVIDE",
                "TIN_NOT_REQUIRED"
            };

            if (!allowedReasons.Contains(reason))
            {
                throw Error(beneficiaryNumber, "Invalid TIN unavailable reason.");
            }

            if (reason == "UNABLE_TO_PROVIDE" && string.IsNullOrWhiteSpace(beneficiary.TINUnavailableExplanation))
            {
                throw Error(beneficiaryNumber, "Explanation for unavailable TIN is required.");
            }
        }

        private void ValidateMalaysiaNricDateOfBirth(string identityNo, DateTime dateOfBirth, int beneficiaryNumber)
        {
            if (string.IsNullOrWhiteSpace(identityNo))
            {
                return;
            }

            // Support:
            // 900101145678
            // 900101-14-5678
            string nric = identityNo.Replace("-", "").Trim();

            // Malaysian NRIC must contain 12 digits
            if (nric.Length != 12 || !nric.All(char.IsDigit))
            {
                throw Error(beneficiaryNumber, "Invalid Malaysian NRIC format.");
            }

            // First 6 digits = YYMMDD
            string dobPart = nric.Substring(0, 6);

            if (!int.TryParse(
                    dobPart.Substring(0, 2),
                    out int yy) ||
                !int.TryParse(
                    dobPart.Substring(2, 2),
                    out int mm) ||
                !int.TryParse(
                    dobPart.Substring(4, 2),
                    out int dd))
            {
                throw Error(beneficiaryNumber, "Invalid date of birth in Malaysian NRIC.");
            }

            // Validate that MM/DD represents a real calendar date
            try
            {
                new DateTime(dateOfBirth.Year, mm, dd);
            }
            catch (ArgumentOutOfRangeException)
            {
                throw Error(beneficiaryNumber, "Invalid date of birth in Malaysian NRIC.");
            }

            // Compare YYMMDD from NRIC with beneficiary DOB
            int expectedYY = dateOfBirth.Year % 100;

            if (yy != expectedYY || mm != dateOfBirth.Month || dd != dateOfBirth.Day)
            {
                throw Error(beneficiaryNumber, "Date of Birth does not match the Malaysian NRIC.");
            }
        }

        private BusinessException Error(int beneficiaryNumber, string message)
        {
            return new BusinessException("Beneficiary " + beneficiaryNumber + ": " + message, Code);
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