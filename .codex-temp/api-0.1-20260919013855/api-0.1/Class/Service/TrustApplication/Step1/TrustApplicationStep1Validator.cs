using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.TrustApplication;
using System;
using System.Linq;

namespace API_CPX.Class.Service.TrustApplication.Step1
{
    public class TrustApplicationStep1Validator
    {
        private const string Code = "SAVE-TRUST-APPLICATION-STEP-1";

        public void Validate(TrustApplicationStep1Request request)
        {
            if (request == null)
                throw new BusinessException("Invalid request.", Code);

            if (string.IsNullOrWhiteSpace(request.FullName))
                throw new BusinessException( "Full name is required.", Code);

            if (string.IsNullOrWhiteSpace(request.IdentityType))
                throw new BusinessException("Type of identity is required.", Code);

            if (string.IsNullOrWhiteSpace(request.IdentityNo))
                throw new BusinessException("Identity number is required.", Code);

            if (string.IsNullOrWhiteSpace(request.Nationality))
                throw new BusinessException("Nationality is required.", Code);

            if (string.IsNullOrWhiteSpace(request.Gender))
                throw new BusinessException("Gender is required.", Code);

            if (!request.DateOfBirth.HasValue)
                throw new BusinessException("Date of birth is required.", Code);

            if (string.IsNullOrWhiteSpace(request.Email))
                throw new BusinessException("Email is required.", Code);

            if (string.IsNullOrWhiteSpace(request.ContactNo))
                throw new BusinessException("Contact number is required.", Code);

            if (string.IsNullOrWhiteSpace(request.AddressLine1))
                throw new BusinessException("Address Line 1 is required.", Code);

            if (string.IsNullOrWhiteSpace(request.Postcode))
                throw new BusinessException("Postcode is required.", Code);

            if (string.IsNullOrWhiteSpace(request.City))
                throw new BusinessException("City is required.", Code);

            if (string.IsNullOrWhiteSpace(request.State))
                throw new BusinessException("State is required.", Code);

            if (string.IsNullOrWhiteSpace(request.Country))
                throw new BusinessException("Country is required.", Code);

            if (!request.IsUSTaxPayer.HasValue)
                throw new BusinessException("US tax declaration is required.", Code);

            if (!request.HasOtherTaxResidence.HasValue)
                throw new BusinessException("Tax residence declaration is required.", Code);

            ValidateTax(request);

            if (string.IsNullOrWhiteSpace(request.AnnualIncomeCode))
                throw new BusinessException("Annual income is required.", Code);

            if (string.IsNullOrWhiteSpace(request.NetWorthCode))
                throw new BusinessException("Total net worth is required.", Code);

            if (request.SourceOfFunds == null || !request.SourceOfFunds.Any())
                throw new BusinessException("At least one source of funds is required.", Code);

            if (request.SourceOfFunds.Any(x => string.IsNullOrWhiteSpace(x.SourceCode)))
                throw new BusinessException("Invalid source of funds.", Code);

            if (request.SourceOfFunds.Any(x => string.Equals(x.SourceCode, "OTHER", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(x.OtherDescription)))
            {
                throw new BusinessException("Please specify the other source of funds.", Code);
            }

            if (string.IsNullOrWhiteSpace(request.ProductCode))
            {
                throw new BusinessException("Trust product is required.", Code);
            }
        }

        private void ValidateTax(TrustApplicationStep1Request request)
        {
            if (request.HasOtherTaxResidence != true)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(request.TaxResidenceCountry))
            {
                throw new BusinessException("Country / jurisdiction of tax residence is required.", Code);
            }

            bool hasTin = !string.IsNullOrWhiteSpace(request.TaxIdentificationNo);

            bool hasReason = !string.IsNullOrWhiteSpace(request.TINUnavailableReason);

            if (!hasTin && !hasReason)
            {
                throw new BusinessException("TIN or reason for unavailable TIN is required.", Code);
            }

            if (hasTin && hasReason)
            {
                throw new BusinessException("TIN unavailable reason should not be supplied when TIN is available.", Code);
            }

            if (string.Equals(request.TINUnavailableReason, "UNABLE_TO_PROVIDE", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(request.TINUnavailableExplanation))
            {
                throw new BusinessException("Explanation for unavailable TIN is required.", Code);
            }
        }
    }
}