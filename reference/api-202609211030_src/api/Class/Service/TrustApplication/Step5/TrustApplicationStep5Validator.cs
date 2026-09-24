using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using System;

namespace API_CPX.Class.Service.TrustApplication.Step5
{
    public class TrustApplicationStep5Validator
    {
        private const string Code = "SAVE-TRUST-APPLICATION-STEP-5";

        public void Validate(TrustApplicationStep5Request request)
        {
            if (request == null)
            {
                throw new BusinessException("Request is required.", Code);
            }

            if (request.TrustID <= 0)
            {
                throw new BusinessException("Trust ID is required.", Code);
            }

            ValidateSigningMethod(request);

            ValidateSpecialCircumstance(request);
        }

        private void ValidateSigningMethod(TrustApplicationStep5Request request)
        {
            if (string.IsNullOrWhiteSpace(request.SigningMethod))
            {
                throw new BusinessException("Signing of Trust Deed method is required.", Code);
            }

            string signingMethod = request.SigningMethod.Trim().ToUpperInvariant();

            if (signingMethod != "SIGNATURE" && signingMethod != "THUMBPRINT")
            {
                throw new BusinessException("Invalid Signing of Trust Deed method.", Code);
            }
        }

        private void ValidateSpecialCircumstance(TrustApplicationStep5Request request)
        {
            if (string.IsNullOrWhiteSpace(request.SpecialCircumstance))
            {
                throw new BusinessException("Special Circumstances is required.", Code);
            }

            string circumstance = request.SpecialCircumstance.Trim().ToUpperInvariant();

            if (circumstance != "NONE" &&
                circumstance != "ILLITERATE" &&
                circumstance != "BLIND" &&
                circumstance != "LESS_PROFICIENT_IN_ENGLISH")
            {
                throw new BusinessException("Invalid Special Circumstances value.", Code);
            }

            if (circumstance == "NONE")
            {
                return;
            }

            ValidateReadOverDetails(request);
        }

        private void ValidateReadOverDetails(TrustApplicationStep5Request request)
        {
            if (string.IsNullOrWhiteSpace(request.ReadOverBy))
            {
                throw new BusinessException("Read over, explained and/or interpreted by is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(request.ReadOverIdentityNo))
            {
                throw new BusinessException("NRIC or Passport No. is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(request.LanguageOrDialect))
            {
                throw new BusinessException("Language or Dialect is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(request.RelationshipWithSettlor))
            {
                throw new BusinessException("Relationship with Settlor is required.", Code);
            }

            if (IsOther(request.RelationshipWithSettlor) && string.IsNullOrWhiteSpace(request.OtherRelationshipWithSettlor))
            {
                throw new BusinessException("Other Relationship with Settlor is required.", Code);
            }
        }

        private bool IsOther(string value)
        {
            return string.Equals(value, "OTHER", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "OTHERS", StringComparison.OrdinalIgnoreCase);
        }
    }
}