using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using System;
using System.Collections.Generic;
using System.Linq;

namespace API_CPX.Class.Service.TrustApplication.Step7
{
    public class TrustApplicationStep7Validator
    {
        public void Validate(
            TrustApplicationStep7Request request)
        {
            const string code =
                "SAVE-TRUST-APPLICATION-STEP-7";


            if (request == null)
            {
                throw new BusinessException(
                    "Invalid request.",
                    code);
            }


            if (request.TrustID <= 0)
            {
                throw new BusinessException(
                    "Trust ID is required.",
                    code);
            }


            if (request.CoBrokers == null)
            {
                request.CoBrokers =
                    new List<TrustApplicationCoBrokerRequest>();
            }


            // ============================================================
            // Co-Broker Is Optional
            // ============================================================

            if (!request.CoBrokers.Any())
            {
                return;
            }


            // ============================================================
            // Duplicate Email
            // ============================================================

            var duplicateEmails =
                request.CoBrokers
                    .Where(a =>
                        !string.IsNullOrWhiteSpace(
                            a.Email))
                    .GroupBy(a =>
                        a.Email.Trim(),
                        StringComparer.OrdinalIgnoreCase)
                    .Where(a =>
                        a.Count() > 1)
                    .Select(a =>
                        a.Key)
                    .ToList();


            if (duplicateEmails.Any())
            {
                throw new BusinessException(
                    "Duplicate co-broker email is not allowed.",
                    code);
            }


            // ============================================================
            // Validate Each Co-Broker
            // ============================================================

            foreach (var coBroker in
                request.CoBrokers)
            {
                if (string.IsNullOrWhiteSpace(
                    coBroker.Email))
                {
                    throw new BusinessException(
                        "Co-broker email is required.",
                        code);
                }


                if (!coBroker
                    .AllocationPercentage
                    .HasValue)
                {
                    throw new BusinessException(
                        "Co-broker allocation percentage is required.",
                        code);
                }


                if (coBroker.AllocationPercentage <= 0)
                {
                    throw new BusinessException(
                        "Co-broker allocation percentage must be greater than 0.",
                        code);
                }


                if (coBroker.AllocationPercentage > 100)
                {
                    throw new BusinessException(
                        "Co-broker allocation percentage cannot exceed 100%.",
                        code);
                }
            }


            // ============================================================
            // Total Allocation
            // ============================================================

            decimal totalAllocation =
                request.CoBrokers
                    .Sum(a =>
                        a.AllocationPercentage ?? 0);


            if (totalAllocation > 100)
            {
                throw new BusinessException(
                    "Total co-broker allocation cannot exceed 100%.",
                    code);
            }
        }
    }
}