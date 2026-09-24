using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using System;
using System.Collections.Generic;
using System.Linq;

namespace API_CPX.Class.Service.TrustApplication.Step4
{
    public class TrustApplicationStep4Validator
    {
        private const string Code = "SAVE-TRUST-APPLICATION-STEP-4";

        public void Validate(TrustApplicationStep4Request request)
        {
            if (request == null)
            {
                throw new BusinessException("Request is required.", Code);
            }

            if (request.TrustID <= 0)
            {
                throw new BusinessException("Trust ID is required.", Code);
            }

            if (request.AllocationType < 1 || request.AllocationType > 7)
            {
                throw new BusinessException("Invalid Allocation Type.", Code);
            }

            var mains = request.MainBeneficiaries ?? new List<TrustApplicationAllocationBeneficiaryRequest>();

            var substitutes = request.SubstituteBeneficiaries ?? new List<TrustApplicationAllocationBeneficiaryRequest>();

            ValidateDuplicateBeneficiaries(mains, substitutes);

            switch (request.AllocationType)
            {
                case 1:
                    ValidateType1(mains, substitutes);
                    break;

                case 2:
                    ValidateType2(mains, substitutes);
                    break;

                case 3:
                    ValidateType3(mains, substitutes);
                    break;

                case 4:
                    ValidateType4(mains, substitutes);
                    break;

                case 5:
                    ValidateType5(mains, substitutes);
                    break;

                case 6:
                    ValidateType6(mains, substitutes);
                    break;

                case 7:
                    ValidateType7(mains, substitutes);
                    break;
            }
        }

        // ============================================================
        // Type 1
        // 1 Main + 1 Substitute
        // ============================================================

        private void ValidateType1(List<TrustApplicationAllocationBeneficiaryRequest> mains, List<TrustApplicationAllocationBeneficiaryRequest> substitutes)
        {
            if (mains.Count != 1)
            {
                throw Error("Type 1 requires exactly one Main Beneficiary.");
            }

            if (substitutes.Count != 1)
            {
                throw Error("Type 1 requires exactly one Substitute Beneficiary.");
            }

            ValidateNoPercentage(mains);
            ValidateNoPercentage(substitutes);
        }

        // ============================================================
        // Type 2
        // 1 Main + multiple equal-share substitutes
        // ============================================================

        private void ValidateType2(List<TrustApplicationAllocationBeneficiaryRequest> mains, List<TrustApplicationAllocationBeneficiaryRequest> substitutes)
        {
            if (mains.Count != 1)
            {
                throw Error("Type 2 requires exactly one Main Beneficiary.");
            }

            if (substitutes.Count < 1)
            {
                throw Error("Type 2 requires at least one Substitute Beneficiary.");
            }

            ValidateNoPercentage(mains);
            ValidateNoPercentage(substitutes);
        }

        // ============================================================
        // Type 3
        // 1 Main + substitutes with specific %
        // ============================================================

        private void ValidateType3(List<TrustApplicationAllocationBeneficiaryRequest> mains, List<TrustApplicationAllocationBeneficiaryRequest> substitutes)
        {
            if (mains.Count != 1)
            {
                throw Error("Type 3 requires exactly one Main Beneficiary.");
            }

            if (substitutes.Count < 1)
            {
                throw Error("Type 3 requires at least one Substitute Beneficiary.");
            }

            ValidateNoPercentage(mains);

            ValidateSpecificAllocation(substitutes, "Substitute Beneficiary");
        }

        // ============================================================
        // Type 4
        // 1 Main + Trustee Company Substitute
        // ============================================================

        private void ValidateType4(List<TrustApplicationAllocationBeneficiaryRequest> mains, List<TrustApplicationAllocationBeneficiaryRequest> substitutes)
        {
            if (mains.Count != 1)
            {
                throw Error("Type 4 requires exactly one Main Beneficiary.");
            }

            if (substitutes.Count > 0)
            {
                throw Error("Type 4 uses Trustee Company as the Substitute Beneficiary.");
            }

            ValidateNoPercentage(mains);
        }

        // ============================================================
        // Type 5
        // Equal shares to multiple mains
        // ============================================================

        private void ValidateType5(List<TrustApplicationAllocationBeneficiaryRequest> mains, List<TrustApplicationAllocationBeneficiaryRequest> substitutes)
        {
            if (mains.Count < 1)
            {
                throw Error("Type 5 requires at least one Main Beneficiary.");
            }

            if (substitutes.Count > 0)
            {
                throw Error("Type 5 does not allow Substitute Beneficiaries.");
            }

            ValidateNoPercentage(mains);
        }

        // ============================================================
        // Type 6
        // Specific allocation among mains
        // ============================================================

        private void ValidateType6(List<TrustApplicationAllocationBeneficiaryRequest> mains, List<TrustApplicationAllocationBeneficiaryRequest> substitutes)
        {
            if (mains.Count < 1)
            {
                throw Error("Type 6 requires at least one Main Beneficiary.");
            }

            if (substitutes.Count > 0)
            {
                throw Error("Type 6 does not allow Substitute Beneficiaries.");
            }

            ValidateSpecificAllocation(mains, "Main Beneficiary");
        }

        // ============================================================
        // Type 7
        // 100% Trustee Company
        // ============================================================

        private void ValidateType7(List<TrustApplicationAllocationBeneficiaryRequest> mains, List<TrustApplicationAllocationBeneficiaryRequest> substitutes)
        {
            if (mains.Count > 0 || substitutes.Count > 0)
            {
                throw Error("Type 7 allocates 100% to Trustee Company and does not require beneficiary selection.");
            }
        }

        private void ValidateSpecificAllocation(List<TrustApplicationAllocationBeneficiaryRequest> beneficiaries, string description)
        {
            foreach (var beneficiary in beneficiaries)
            {
                if (!beneficiary.AllocationPercentage.HasValue)
                {
                    throw Error(description + " allocation percentage is required.");
                }

                if (beneficiary.AllocationPercentage.Value <= 0 || beneficiary.AllocationPercentage.Value > 100)
                {
                    throw Error(description + " allocation percentage must be greater than 0 and not more than 100.");
                }
            }

            decimal total = beneficiaries.Sum(x => x.AllocationPercentage.Value);

            if (Math.Abs(total - 100m) > 0.0001m)
            {
                throw Error(description + " allocations must total exactly 100%.");
            }
        }

        private void ValidateNoPercentage(List<TrustApplicationAllocationBeneficiaryRequest> beneficiaries)
        {
            if (beneficiaries.Any(x => x.AllocationPercentage.HasValue))
            {
                throw Error("Allocation Percentage is not applicable for the selected Allocation Type.");
            }
        }

        private void ValidateDuplicateBeneficiaries(List<TrustApplicationAllocationBeneficiaryRequest> mains, List<TrustApplicationAllocationBeneficiaryRequest> substitutes)
        {
            var all = mains.Concat(substitutes).Select(x => x.BeneficiaryID).ToList();

            if (all.Any(x => x <= 0))
            {
                throw Error("Invalid Beneficiary ID.");
            }

            if (all.Count != all.Distinct().Count())
            {
                throw Error("The same beneficiary cannot be selected more than once.");
            }
        }

        private BusinessException Error(string message)
        {
            return new BusinessException(message, Code);
        }
    }
}