using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.TrustApplication;
using System;

namespace API_CPX.Class.Service.TrustApplication.Step2
{
    public class TrustApplicationStep2Validator
    {
        private const string Code = "SAVE-TRUST-APPLICATION-STEP-2";

        public void Validate(TrustApplicationStep2Request request)
        {
            if (request == null)
            {
                throw new BusinessException("Request is required.", Code);
            }

            if (request.TrustID <= 0)
            {
                throw new BusinessException("Trust ID is required.", Code);
            }

            ValidateTrustAsset(request);
            ValidateSettlorBank(request);
            ValidateGuaranteedReturn(request);
            ValidatePaymentSource(request);
        }

        private void ValidateTrustAsset(TrustApplicationStep2Request request)
        {
            if (!request.TrustAssetAmount.HasValue || request.TrustAssetAmount.Value <= 0)
            {
                throw new BusinessException("Trust Asset Amount is required.", Code);
            }
        }

        private void ValidateSettlorBank(TrustApplicationStep2Request request)
        {
            if (string.IsNullOrWhiteSpace(request.SettlorBankName))
            {
                throw new BusinessException("Bank Name is required.", Code);
            }

            if (IsOther(request.SettlorBankName) && string.IsNullOrWhiteSpace(request.SettlorOtherBankName))
            {
                throw new BusinessException("Other Bank Name is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(request.SettlorBankAccountHolder))
            {
                throw new BusinessException("Bank Account Holder is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(request.SettlorBankAccountNumber))
            {
                throw new BusinessException("Bank Account Number is required.", Code);
            }
        }

        private void ValidateGuaranteedReturn(TrustApplicationStep2Request request)
        {
            if (string.IsNullOrWhiteSpace(request.GuaranteedReturnOption))
            {
                throw new BusinessException("Guaranteed Return option is required.", Code);
            }

            string value = request.GuaranteedReturnOption.Trim().ToUpperInvariant();

            if (value != "TRANSFER_TO_BANK" && value != "REDEPOSIT_AS_TRUST_ASSET")
            {
                throw new BusinessException("Invalid Guaranteed Return option.", Code);
            }
        }

        private void ValidatePaymentSource(TrustApplicationStep2Request request)
        {
            if (string.IsNullOrWhiteSpace(request.PaymentSource))
            {
                throw new BusinessException("Payment Source is required.", Code);
            }

            string paymentSource = request.PaymentSource.Trim().ToUpperInvariant();

            switch (paymentSource)
            {
                case "PERSONAL_ACCOUNT":
                    break;

                case "JOINT_ACCOUNT":

                    if (string.IsNullOrWhiteSpace(request.JointAccountHolderName))
                    {
                        throw new BusinessException("Joint Account Holder Name is required.", Code);
                    }

                    break;

                case "THIRD_PARTY":

                    ValidateThirdParty(request);
                    break;

                default:
                    throw new BusinessException("Invalid Payment Source.", Code);
            }
        }

        private void ValidateThirdParty(TrustApplicationStep2Request request)
        {
            if (string.IsNullOrWhiteSpace(request.ThirdPartyName))
            {
                throw new BusinessException("Third Party Name is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(request.ThirdPartyIdentityNo))
            {
                throw new BusinessException("Third Party NRIC / Passport / ID No. is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(request.ThirdPartyRelationship))
            {
                throw new BusinessException("Relationship is required.", Code);
            }

            if (IsOther(request.ThirdPartyRelationship) && string.IsNullOrWhiteSpace(request.ThirdPartyOtherRelationship))
            {
                throw new BusinessException("Other Relationship is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(request.ThirdPartyBankName))
            {
                throw new BusinessException("Third Party Bank Name is required.", Code);
            }

            if (IsOther(request.ThirdPartyBankName) && string.IsNullOrWhiteSpace(request.ThirdPartyOtherBankName))
            {
                throw new BusinessException("Other Bank Name is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(request.ThirdPartyBankAccountHolder))
            {
                throw new BusinessException("Third Party Bank Account Holder is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(request.ThirdPartyBankAccountNumber))
            {
                throw new BusinessException("Third Party Bank Account Number is required.", Code);
            }
        }

        private bool IsOther(string value)
        {
            return string.Equals(value, "OTHER", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "OTHERS", StringComparison.OrdinalIgnoreCase);
        }
    }
}