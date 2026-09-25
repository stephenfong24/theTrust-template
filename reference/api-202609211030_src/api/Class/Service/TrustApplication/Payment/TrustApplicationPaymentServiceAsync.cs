using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO.Payment;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Document;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Payment
{
    public class TrustApplicationPaymentServiceAsync
    {
        private const string Code = "TRUST-APPLICATION-PAYMENT";

        // ============================================================
        // Role Helpers
        // ============================================================

        private bool IsAgent(string roleCode)
        {
            return string.Equals(roleCode, "AG", StringComparison.OrdinalIgnoreCase);
        }

        private bool IsFinance(string roleCode)
        {
            return string.Equals(roleCode, "AC", StringComparison.OrdinalIgnoreCase);
        }

        private bool IsAdmin(string roleCode)
        {
            return
                string.Equals(
                    roleCode,
                    "SA",
                    StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(
                    roleCode,
                    "AD",
                    StringComparison.OrdinalIgnoreCase);
        }

        // ============================================================
        // Get Payment Information
        // ============================================================

        public async Task<TrustApplicationPaymentListResult> GetAsync(string merchantId, long userId, string roleCode, long trustId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                // ====================================================
                // 1. Get Trust Application
                // ====================================================

                var application =
                    await db.tbl_TrustApplication
                        .FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                if (application == null)
                {
                    throw new BusinessException("Trust application not found.", Code);
                }

                // ====================================================
                // 2. Permission
                // ====================================================

                if (IsAgent(roleCode))
                {
                    if (application.MemberID != userId)
                    {
                        throw new BusinessException("You are not allowed to view this Trust Application payment.", Code);
                    }
                }
                else if (!IsFinance(roleCode) && !IsAdmin(roleCode))
                {
                    throw new BusinessException("You are not allowed to view Trust Application payment.", Code);
                }

                // ====================================================
                // 3. Trust Asset
                // ====================================================

                var asset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

                if (asset == null)
                {
                    throw new BusinessException("Trust Application asset information not found.", Code);
                }

                if (asset.TrustAssetAmount <= 0M)
                {
                    throw new BusinessException("Trust Asset Amount is invalid.", Code);
                }

                decimal placement = asset.TrustAssetAmount;

                // ====================================================
                // 4. Payment Allocations
                // ====================================================

                var payments =
                    await db.tbl_TrustApplication_Payment
                        .Where(x => x.TrustApplicationID == application.RowID && x.IsActive)
                        .OrderBy(x => x.PaymentNo)
                        .ToListAsync();

                // ====================================================
                // 5. Active Payment Slips
                // ====================================================

                var paymentIds = payments.Select(x => x.RowID).ToList();

                var documents =
                    await db.tbl_TrustApplication_PaymentDocument
                        .Where(x => paymentIds.Contains(x.PaymentID) && x.IsActive)
                        .ToListAsync();

                // ====================================================
                // 6. Payment Summary
                // ====================================================

                var allocatedStatuses = new[]
                {
                    "PAYMENT_APPROVED",
                    "WAITING_PAYMENT",
                    "PENDING_APPROVAL"
                };

                decimal allocatedAmount = payments
                    .Where(x => x.IsActive && allocatedStatuses.Contains(x.PaymentStatus))
                    .Select(x => x.PaymentAmount)
                    .DefaultIfEmpty(0M)
                    .Sum();

                decimal unallocatedAmount = placement - allocatedAmount;

                if (unallocatedAmount < 0M)
                {
                    unallocatedAmount = 0M;
                }

                decimal submittedAmount =
                    payments
                        .Where(x => x.PaymentStatus == "PENDING_APPROVAL" || x.PaymentStatus == "PAYMENT_APPROVED")
                        .Select(x => x.PaymentAmount)
                        .DefaultIfEmpty(0M)
                        .Sum();

                decimal approvedAmount =
                    payments
                        .Where( x => x.PaymentStatus == "PAYMENT_APPROVED")
                        .Select(x => x.PaymentAmount)
                        .DefaultIfEmpty(0M)
                        .Sum();

                decimal pendingAmount =
                    payments
                        .Where(x => x.PaymentStatus == "PENDING_APPROVAL")
                        .Select(x => x.PaymentAmount)
                        .DefaultIfEmpty(0M)
                        .Sum();

                decimal remainingToSubmit = placement - submittedAmount;

                if (remainingToSubmit < 0M)
                {
                    remainingToSubmit = 0M;
                }

                decimal remainingToApprove = placement - approvedAmount;

                if (remainingToApprove < 0M)
                {
                    remainingToApprove = 0M;
                }

                // ====================================================
                // 7. Result
                // ====================================================

                return new TrustApplicationPaymentListResult
                {
                    TrustID = application.TrustID,
                    ApplicationStatus = application.ApplicationStatus,
                    TrustAssetAmount = placement,
                    AllocatedAmount = allocatedAmount,
                    UnallocatedAmount = unallocatedAmount,
                    PaymentSource = asset.PaymentSource,
                    PaymentSourceDetail = BuildPaymentSource(asset),
                    SubmittedAmount = submittedAmount,
                    ApprovedAmount = approvedAmount,
                    PendingAmount = pendingAmount,
                    RemainingToSubmit = remainingToSubmit,
                    RemainingToApprove = remainingToApprove,

                    Payments =
                        payments
                            .Select(
                                payment =>
                                {
                                    var document = documents.Where(x => x.PaymentID == payment.RowID).OrderByDescending(x => x.RowID).FirstOrDefault();

                                    return
                                        new TrustApplicationPaymentResult
                                        {
                                            PaymentID = payment.RowID,
                                            PaymentNo = payment.PaymentNo,
                                            PaymentAmount = payment.PaymentAmount,
                                            PaymentDate = payment.PaymentDate,
                                            ReferenceNo = payment.ReferenceNo,
                                            PaymentStatus = payment.PaymentStatus,
                                            FinanceRemark = payment.FinanceRemark,
                                            CreatedAt = payment.CreatedAt,
                                            ApprovedAt = payment.ApprovedAt,
                                            ApprovedBy = payment.ApprovedBy,
                                            Document =
                                                document == null
                                                    ? null
                                                    : new PaymentDocumentResult
                                                    {
                                                        PaymentDocumentID = document.RowID,
                                                        OriginalFileName = document.OriginalFileName,
                                                        FileUrl = document.FileUrl,
                                                        UploadedFile = document.UploadedFile,
                                                        FileSize = document.FileSize,
                                                        SHA256 = document.SHA256
                                                    }
                                        };
                                })
                            .ToList()
                };
            }
        }

        public async Task<TrustApplicationPaymentListResult> GetAsync(Sandbox_BasedEntities db, tbl_TrustApplication application)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            if (application == null)
            {
                throw new ArgumentNullException(nameof(application));
            }

            // ============================================================
            // 1. Trust Asset
            // ============================================================

            var asset =
                await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            // Payment information may not exist yet.
            // Do not throw an error when the application has not reached
            // the payment stage.
            if (asset == null)
            {
                return new TrustApplicationPaymentListResult
                {
                    TrustID = application.TrustID,
                    ApplicationStatus = application.ApplicationStatus,
                    TrustAssetAmount = 0M,
                    AllocatedAmount = 0M,
                    UnallocatedAmount = 0M,
                    PaymentSource = null,
                    PaymentSourceDetail = null,
                    SubmittedAmount = 0M,
                    ApprovedAmount = 0M,
                    PendingAmount = 0M,
                    RemainingToSubmit = 0M,
                    RemainingToApprove = 0M,
                    Payments = new List<TrustApplicationPaymentResult>()
                };
            }

            decimal placement = asset.TrustAssetAmount;

            // ============================================================
            // 2. Payment Allocations
            // ============================================================

            var payments =
                await db.tbl_TrustApplication_Payment.Where(x => x.TrustApplicationID == application.RowID).OrderBy(x => x.PaymentNo).ToListAsync();

            // ============================================================
            // 3. Active Payment Documents
            // ============================================================

            var paymentIds = payments.Select(x => x.RowID).ToList();
            var documents =
                await db.tbl_TrustApplication_PaymentDocument.Where(x => paymentIds.Contains(x.PaymentID)).ToListAsync();

            // ============================================================
            // 4. Payment Summary
            // ============================================================

            var allocatedStatuses = new[]
            {
                "PAYMENT_APPROVED",
                "WAITING_PAYMENT",
                "PENDING_APPROVAL"
            };

            decimal allocatedAmount = payments
                .Where(x => x.IsActive && allocatedStatuses.Contains(x.PaymentStatus))
                .Select(x => x.PaymentAmount)
                .DefaultIfEmpty(0M)
                .Sum();

            decimal unallocatedAmount = placement - allocatedAmount;

            if (unallocatedAmount < 0M)
            {
                unallocatedAmount = 0M;
            }

            decimal submittedAmount =
                payments.Where(x => x.PaymentStatus == "PENDING_APPROVAL" || x.PaymentStatus == "PAYMENT_APPROVED").Select(x => x.PaymentAmount).DefaultIfEmpty(0M).Sum();

            decimal approvedAmount =
                payments.Where(x => x.PaymentStatus == "PAYMENT_APPROVED").Select(x => x.PaymentAmount).DefaultIfEmpty(0M).Sum();

            decimal pendingAmount =
                payments.Where(x => x.PaymentStatus == "PENDING_APPROVAL").Select(x => x.PaymentAmount).DefaultIfEmpty(0M).Sum();

            decimal remainingToSubmit = placement - submittedAmount;

            if (remainingToSubmit < 0M)
            {
                remainingToSubmit = 0M;
            }

            decimal remainingToApprove = placement - approvedAmount;

            if (remainingToApprove < 0M)
            {
                remainingToApprove = 0M;
            }

            // ============================================================
            // 5. Result
            // ============================================================

            return new TrustApplicationPaymentListResult
            {
                TrustID = application.TrustID,
                ApplicationStatus = application.ApplicationStatus,
                TrustAssetAmount = placement,
                AllocatedAmount = allocatedAmount,
                UnallocatedAmount = unallocatedAmount,
                PaymentSource = asset.PaymentSource,
                PaymentSourceDetail = BuildPaymentSource(asset),
                SubmittedAmount = submittedAmount,
                ApprovedAmount = approvedAmount,
                PendingAmount = pendingAmount,
                RemainingToSubmit = remainingToSubmit,
                RemainingToApprove = remainingToApprove,
                Payments =
                    payments
                        .Select(
                            payment =>
                            {
                                var document =
                                    documents
                                        .Where(x => x.PaymentID == payment.RowID)
                                        .OrderByDescending(x => x.RowID).FirstOrDefault();

                                return
                                    new TrustApplicationPaymentResult
                                    {
                                        PaymentID = payment.RowID,
                                        PaymentNo = payment.PaymentNo,
                                        PaymentAmount = payment.PaymentAmount,
                                        PaymentDate =  payment.PaymentDate,
                                        ReferenceNo = payment.ReferenceNo,
                                        PaymentStatus = payment.PaymentStatus,
                                        FinanceRemark = payment.FinanceRemark,
                                        CreatedAt = payment.CreatedAt,
                                        ApprovedAt = payment.ApprovedAt,
                                        ApprovedBy = payment.ApprovedBy,
                                        Document =
                                            document == null ? null : new PaymentDocumentResult
                                                {
                                                    PaymentDocumentID = document.RowID,
                                                    OriginalFileName = document.OriginalFileName,
                                                    FileExtension = document.FileExtension,
                                                    FileUrl = document.FileUrl,
                                                    UploadedFile = document.UploadedFile,
                                                    FileSize = document.FileSize,
                                                    SHA256 = document.SHA256,
                                                    CreatedAt = document.CreatedAt,
                                                    CreatedBy = document.CreatedBy
                                                }
                                    };
                            })
                        .ToList()
            };
        }

        // ============================================================
        // Build Payment Source
        // ============================================================

        private PaymentSourceResult BuildPaymentSource(tbl_TrustApplication_TrustAsset asset)
        {
            var result = new PaymentSourceResult();
            string paymentSource = (asset.PaymentSource ?? string.Empty).Trim().ToUpperInvariant();

            // ========================================================
            // Third Party
            // ========================================================

            if (paymentSource == "THIRD_PARTY")
            {
                result.BankName = asset.ThirdPartyBankName;
                result.OtherBankName = asset.ThirdPartyOtherBankName;
                result.AccountHolder = asset.ThirdPartyBankAccountHolder;
                result.AccountNumber = asset.ThirdPartyBankAccountNumber;
                result.ThirdPartyName = asset.ThirdPartyName;
                result.ThirdPartyIdentityNo = asset.ThirdPartyIdentityNo;
                result.ThirdPartyRelationship = asset.ThirdPartyRelationship;
                result.ThirdPartyOtherRelationship = asset.ThirdPartyOtherRelationship;
                return result;
            }

            // ========================================================
            // Personal / Joint Account
            // ========================================================

            result.BankName = asset.SettlorBankName;
            result.OtherBankName = asset.SettlorOtherBankName;
            result.AccountHolder = asset.SettlorBankAccountHolder;
            result.AccountNumber = asset.SettlorBankAccountNumber;
            result.SwiftCode = asset.SettlorSwiftCode;
            result.BankAddress = asset.SettlorBankAddress;

            if (paymentSource == "JOINT_ACCOUNT")
            {
                result.JointAccountHolderName = asset.JointAccountHolderName;
            }

            return result;
        }

        // ============================================================
        // Create Payment Allocation
        //
        // Example:
        //
        // Trust Placement = RM50,000
        //
        // Payment 1 = RM20,000
        // Payment 2 = RM20,000
        // Payment 3 = RM10,000
        //
        // Total allocation MUST equal TrustAssetAmount.
        //
        // Initial Status:
        // WAITING_PAYMENT
        // ============================================================

        public async Task<TrustApplicationPaymentAllocationResult> CreateAllocationAsync(string merchantId, long userId, string roleCode, long trustId, TrustApplicationPaymentAllocationRequest request)
        {
            // ========================================================
            // 1. Permission
            // ========================================================

            if (!IsAgent(roleCode))
            {
                throw new BusinessException("Only Trust Representative can create payment allocation.", Code);
            }

            // ========================================================
            // 2. Request Validation
            // ========================================================

            if (request == null || request.Payments == null || !request.Payments.Any())
            {
                throw new BusinessException("At least one payment allocation is required.", Code);
            }

            if (request.Payments.Any(x => x.Amount <= 0M))
            {
                throw new BusinessException("Payment allocation amount must be greater than zero.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        // =============================================
                        // 3. Trust Application
                        // =============================================

                        var application = await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                        if (application == null)
                        {
                            throw new BusinessException("Trust Application not found.", Code);
                        }

                        // =============================================
                        // 4. Ownership
                        // =============================================

                        if (application.MemberID != userId)
                        {
                            throw new BusinessException("You are not allowed to create payment allocation for this Trust Application.", Code);
                        }

                        // =============================================
                        // 5. Application Status
                        // =============================================

                        if (!string.Equals(application.ApplicationStatus, "PENDING_PAYMENT_APPROVAL", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new BusinessException("Payment allocation can only be created when the Trust Application is pending payment approval.", Code);
                        }

                        // =============================================
                        // 6. Trust Asset
                        // =============================================

                        var asset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

                        if (asset == null)
                        {
                            throw new BusinessException("Trust Application asset information not found.", Code);
                        }

                        decimal placement = asset.TrustAssetAmount;

                        if (placement <= 0M)
                        {
                            throw new BusinessException("Trust Asset Amount must be greater than zero.", Code);
                        }

                        // =============================================
                        // 7. Allocation Total
                        // =============================================

                        decimal allocationTotal = request.Payments.Sum(x => x.Amount);

                        if (allocationTotal != placement)
                        {
                            throw new BusinessException("Total payment allocation must be equal to the Trust Asset Amount of RM " + placement.ToString("N2") + ".", Code);
                        }

                        // =============================================
                        // 8. Allocation Cannot Already Exist
                        // =============================================

                        bool allocationExists = await db.tbl_TrustApplication_Payment.AnyAsync(x => x.TrustApplicationID == application.RowID && x.IsActive);

                        if (allocationExists)
                        {
                            throw new BusinessException("Payment allocation has already been created for this Trust Application.", Code);
                        }

                        DateTime now = DateTime.Now;
                        int paymentNo = 1;

                        // =============================================
                        // 9. Create Allocation Records
                        // =============================================

                        foreach (var item in request.Payments)
                        {
                            var payment =
                                new tbl_TrustApplication_Payment
                                {
                                    TrustApplicationID = application.RowID,
                                    PaymentNo = paymentNo,
                                    PaymentAmount = item.Amount,
                                    PaymentDate = null,
                                    ReferenceNo = null,
                                    PaymentStatus = "WAITING_PAYMENT",
                                    FinanceRemark = null,
                                    ApprovedAt = null,
                                    ApprovedBy = null,
                                    IsActive = true,
                                    CreatedAt = now,
                                    CreatedBy = userId,
                                    UpdatedAt = null,
                                    UpdatedBy = null
                                };

                            db.tbl_TrustApplication_Payment.Add(payment);
                            paymentNo++;
                        }

                        application.UpdatedAt = now;
                        application.UpdatedBy = userId;

                        // =============================================
                        // 10. History
                        // =============================================

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "PAYMENT_ALLOCATION_CREATED",
                            "Payment Allocation Created",
                            request.Payments.Count + " payment allocation(s) created totalling RM " + allocationTotal.ToString("N2") + ".",
                            userId,
                            "APPLICATION",
                            application.RowID);

                        // =============================================
                        // 11. Save
                        // =============================================

                        await db.SaveChangesAsync();

                        // =============================================
                        // 11. Get Saved Allocations
                        // =============================================

                        var savedPayments =
                            await db.tbl_TrustApplication_Payment
                                .Where(x => x.TrustApplicationID == application.RowID && x.IsActive)
                                .OrderBy(x => x.PaymentNo)
                                .ToListAsync();

                        transaction.Commit();

                        // =============================================
                        // 12. Result
                        // =============================================

                        return
                            new TrustApplicationPaymentAllocationResult
                            {
                                TrustID = application.TrustID,
                                TrustAssetAmount = placement,
                                TotalAllocatedAmount = allocationTotal,
                                Payments =
                                    savedPayments
                                        .Select(
                                            x =>
                                                new TrustApplicationPaymentResult
                                                {
                                                    PaymentID = x.RowID,
                                                    PaymentNo = x.PaymentNo,
                                                    PaymentAmount = x.PaymentAmount,
                                                    PaymentDate = x.PaymentDate,
                                                    ReferenceNo = x.ReferenceNo,
                                                    PaymentStatus = x.PaymentStatus,
                                                    FinanceRemark = x.FinanceRemark,
                                                    CreatedAt = x.CreatedAt,
                                                    ApprovedAt = x.ApprovedAt,
                                                    ApprovedBy = x.ApprovedBy
                                                })
                                        .ToList()
                            };
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // Save Payment Allocation
        //
        // Replaces all active WAITING_PAYMENT allocations.
        //
        // Locked payment allocations are never modified:
        //
        // - PENDING_APPROVAL
        // - APPROVED
        //
        // Example:
        //
        // Trust Asset Amount = RM10,000
        //
        // Existing:
        // RM3,000 APPROVED
        // RM2,000 WAITING_PAYMENT
        // RM5,000 WAITING_PAYMENT
        //
        // Locked Amount:
        // RM3,000
        //
        // Available:
        // RM10,000 - RM3,000 = RM7,000
        //
        // User may replace the WAITING_PAYMENT allocations with:
        //
        // RM1,000
        // RM6,000
        //
        // Existing WAITING_PAYMENT records are soft-deactivated.
        // New WAITING_PAYMENT records are inserted.
        //
        // PaymentNo is never reused.
        // ============================================================

        public async Task<TrustApplicationPaymentAllocationResult> SaveAllocationAsync(
            string merchantId,
            long userId,
            string roleCode,
            long trustId,
            TrustApplicationPaymentAllocationAddRequest request)
        {
            // ========================================================
            // 1. Permission
            // ========================================================

            if (!IsAgent(roleCode))
            {
                throw new BusinessException(
                    "Only Trust Representative can save payment allocation.",
                    Code);
            }

            // ========================================================
            // 2. Request Validation
            // ========================================================

            if (request == null ||
                request.Payments == null ||
                !request.Payments.Any())
            {
                throw new BusinessException(
                    "At least one payment allocation is required.",
                    Code);
            }

            if (request.Payments.Any(x => x == null || x.Amount <= 0M))
            {
                throw new BusinessException(
                    "Each payment allocation amount must be greater than zero.",
                    Code);
            }

            decimal requestedAllocation =
                request.Payments.Sum(x => x.Amount);

            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction())
            {
                try
                {
                    // =================================================
                    // 3. Get Trust Application
                    // =================================================

                    var application =
                        await db.tbl_TrustApplication
                            .FirstOrDefaultAsync(
                                x =>
                                    x.MerchantID == merchantId &&
                                    x.TrustID == trustId);

                    if (application == null)
                    {
                        throw new BusinessException(
                            "Trust Application not found.",
                            Code);
                    }

                    // =================================================
                    // 4. Agent Can Only Manage Own Application
                    // =================================================

                    if (application.MemberID != userId)
                    {
                        throw new BusinessException(
                            "You are not allowed to manage payment allocation for this Trust Application.",
                            Code);
                    }

                    // =================================================
                    // 5. Application Must Be Pending Payment Approval
                    // =================================================

                    if (!string.Equals(
                            application.ApplicationStatus,
                            "PENDING_PAYMENT_APPROVAL",
                            StringComparison.OrdinalIgnoreCase))
                    {
                        throw new BusinessException(
                            "Payment allocation can only be changed when the Trust Application is pending payment approval.",
                            Code);
                    }

                    // =================================================
                    // 6. Get Trust Asset
                    // =================================================

                    var asset =
                        await db.tbl_TrustApplication_TrustAsset
                            .FirstOrDefaultAsync(
                                x =>
                                    x.TrustApplicationID ==
                                    application.RowID);

                    if (asset == null)
                    {
                        throw new BusinessException(
                            "Trust Application asset information not found.",
                            Code);
                    }

                    decimal placement = asset.TrustAssetAmount;

                    if (placement <= 0M)
                    {
                        throw new BusinessException(
                            "Trust Asset Amount must be greater than zero.",
                            Code);
                    }

                    // =================================================
                    // 7. Get All Active Payment Allocations
                    //
                    // CANCELLED records are excluded because
                    // CancelAllocationAsync sets IsActive = false.
                    // =================================================

                    var activePayments =
                        await db.tbl_TrustApplication_Payment
                            .Where(
                                x =>
                                    x.TrustApplicationID == application.RowID &&
                                    x.IsActive &&
                                    (
                                        x.PaymentStatus == "WAITING_PAYMENT" ||
                                        x.PaymentStatus == "PENDING_APPROVAL" ||
                                        x.PaymentStatus == "PAYMENT_APPROVED"
                                    ))
                            .OrderBy(x => x.PaymentNo)
                            .ToListAsync();

                    // =================================================
                    // 8. Calculate Current Allocated Amount
                    //
                    // Every ACTIVE payment allocation counts:
                    //
                    // WAITING_PAYMENT
                    // PENDING_APPROVAL
                    // PAYMENT_APPROVED
                    // REJECTED
                    //
                    // CANCELLED does not count because IsActive = false.
                    // =================================================

                    decimal allocatedAmount =
                        activePayments
                            .Select(x => x.PaymentAmount)
                            .DefaultIfEmpty(0M)
                            .Sum();

                    // =================================================
                    // 9. Calculate Unallocated Amount
                    // =================================================

                    decimal unallocatedAmount =
                        placement - allocatedAmount;

                    if (unallocatedAmount <= 0M)
                    {
                        throw new BusinessException(
                            "There is no remaining amount available for payment allocation.",
                            Code);
                    }

                    // =================================================
                    // 10. Validate Requested Allocation
                    //
                    // The newly submitted allocation must exactly fill
                    // the current UnallocatedAmount.
                    // =================================================

                    if (requestedAllocation != unallocatedAmount)
                    {
                        throw new BusinessException(
                            "Total payment allocation must equal the unallocated amount of RM " +
                            unallocatedAmount.ToString("N2") +
                            ".",
                            Code);
                    }

                    // =================================================
                    // 11. Get Highest PaymentNo
                    //
                    // IMPORTANT:
                    // Search ALL payment records, including inactive /
                    // cancelled records.
                    //
                    // PaymentNo must never be reused.
                    // =================================================

                    int maxPaymentNo =
                        await db.tbl_TrustApplication_Payment
                            .Where(
                                x =>
                                    x.TrustApplicationID ==
                                    application.RowID)
                            .Select(x => (int?)x.PaymentNo)
                            .MaxAsync()
                        ?? 0;

                    int nextPaymentNo = maxPaymentNo + 1;

                    DateTime now = DateTime.Now;

                    // =================================================
                    // 12. Insert New WAITING_PAYMENT Allocations
                    //
                    // IMPORTANT:
                    // Do NOT deactivate or modify existing allocations.
                    //
                    // These records are being ADDED to the currently
                    // unallocated amount.
                    // =================================================

                    foreach (var item in request.Payments)
                    {
                        var payment =
                            new tbl_TrustApplication_Payment
                            {
                                TrustApplicationID =
                                    application.RowID,

                                PaymentNo =
                                    nextPaymentNo,

                                PaymentAmount =
                                    item.Amount,

                                PaymentDate =
                                    null,

                                ReferenceNo =
                                    null,

                                PaymentStatus =
                                    "WAITING_PAYMENT",

                                FinanceRemark =
                                    null,

                                ApprovedAt =
                                    null,

                                ApprovedBy =
                                    null,

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

                        db.tbl_TrustApplication_Payment.Add(payment);

                        nextPaymentNo++;
                    }

                    // =================================================
                    // 13. Update Application Audit Fields
                    // =================================================

                    application.UpdatedAt = now;
                    application.UpdatedBy = userId;

                    // =================================================
                    // 14. Add Application History
                    // =================================================

                    string newAllocation =
                        string.Join(
                            ", ",
                            request.Payments.Select(
                                x =>
                                    "RM " +
                                    x.Amount.ToString("N2")));

                    TrustApplicationHistoryHelper.Add(
                        db,
                        application.RowID,
                        "PAYMENT_ALLOCATION_ADDED",
                        "Payment Allocation Added",
                        request.Payments.Count +
                            " payment allocation(s) added totalling RM " +
                            requestedAllocation.ToString("N2") +
                            ". New allocation: " +
                            newAllocation +
                            ".",
                        userId,
                        "APPLICATION",
                        application.RowID);

                    // =================================================
                    // 15. Save
                    // =================================================

                    await db.SaveChangesAsync();

                    // =================================================
                    // 16. Reload Final Active Payments
                    // =================================================

                    var savedPayments =
                        await db.tbl_TrustApplication_Payment
                            .Where(
                                x =>
                                    x.TrustApplicationID ==
                                        application.RowID &&
                                    x.IsActive)
                            .OrderBy(x => x.PaymentNo)
                            .ToListAsync();

                    // =================================================
                    // 17. Final Safety Validation
                    //
                    // Since this API requires the request to completely
                    // fill UnallocatedAmount, the final active total
                    // must equal the Trust Asset Amount.
                    // =================================================

                    decimal finalTotal =
                        savedPayments
                            .Select(x => x.PaymentAmount)
                            .DefaultIfEmpty(0M)
                            .Sum();

                    if (finalTotal != placement)
                    {
                        throw new BusinessException(
                            "Final payment allocation does not match the Trust Asset Amount.",
                            Code);
                    }

                    // =================================================
                    // 18. Commit
                    // =================================================

                    transaction.Commit();

                    // =================================================
                    // 19. Result
                    // =================================================

                    return
                        new TrustApplicationPaymentAllocationResult
                        {
                            TrustID =
                                application.TrustID,

                            TrustAssetAmount =
                                placement,

                            TotalAllocatedAmount =
                                finalTotal,

                            Payments =
                                savedPayments
                                    .Select(
                                        x =>
                                            new TrustApplicationPaymentResult
                                            {
                                                PaymentID = x.RowID,
                                                PaymentNo = x.PaymentNo,
                                                PaymentAmount = x.PaymentAmount,
                                                PaymentDate = x.PaymentDate,
                                                ReferenceNo = x.ReferenceNo,
                                                PaymentStatus = x.PaymentStatus,
                                                FinanceRemark = x.FinanceRemark,
                                                CreatedAt = x.CreatedAt,
                                                ApprovedAt = x.ApprovedAt,
                                                ApprovedBy = x.ApprovedBy
                                            })
                                    .ToList()
                        };
                }
                catch
                {
                    transaction.Rollback();
                    throw;
                }
            }
        }

        // ============================================================
        // Save Payment Slip
        //
        // IMPORTANT:
        //
        // This service does NOT physically upload the file.
        //
        // Your controller / FileUpload infrastructure uploads the
        // file first, then passes the resulting file information here.
        //
        // WAITING_PAYMENT -> PENDING_APPROVAL
        // REJECTED        -> PENDING_APPROVAL
        // ============================================================

        public async Task<TrustApplicationPaymentResult>
            SavePaymentSlipAsync(
                string merchantId,
                long userId,
                string roleCode,
                long trustId,
                long paymentId,
                DateTime paymentDate,
                string referenceNo,
                string originalFileName,
                string fileExtension,
                long fileSize,
                string fileUrl,
                string uploadedFile,
                string sha256)
        {
            // ========================================================
            // 1. Permission
            // ========================================================

            if (!IsAgent(roleCode))
            {
                throw new BusinessException("Only Trust Representative can upload payment slip.", Code);
            }

            // ========================================================
            // 2. Basic Validation
            // ========================================================

            if (paymentDate == DateTime.MinValue)
            {
                throw new BusinessException("Payment date is required.", Code);
            }

            if (paymentDate.Date > DateTime.Today)
            {
                throw new BusinessException("Payment date cannot be in the future.", Code);
            }

            if (string.IsNullOrWhiteSpace(originalFileName))
            {
                throw new BusinessException("Payment slip file name is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(fileExtension))
            {
                throw new BusinessException("Payment slip file extension is required.", Code);
            }

            if (fileSize <= 0)
            {
                throw new BusinessException("Payment slip file size is invalid.", Code);
            }

            if (string.IsNullOrWhiteSpace(fileUrl))
            {
                throw new BusinessException("Payment slip file URL is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(uploadedFile))
            {
                throw new BusinessException("Uploaded payment slip file is required.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        // =============================================
                        // 3. Trust Application
                        // =============================================

                        var application =
                            await db.tbl_TrustApplication
                                .FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                        if (application == null)
                        {
                            throw new BusinessException("Trust Application not found.", Code);
                        }

                        // =============================================
                        // 4. Ownership
                        // =============================================

                        if (application.MemberID != userId)
                        {
                            throw new BusinessException("You are not allowed to upload payment slip for this Trust Application.", Code);
                        }

                        // =============================================
                        // 5. Application Status
                        // =============================================

                        if (!string.Equals(application.ApplicationStatus, "PENDING_PAYMENT_APPROVAL", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new BusinessException("Payment slip cannot be uploaded because this Trust Application is no longer pending payment approval.", Code);
                        }

                        // =============================================
                        // 6. Payment Allocation
                        // =============================================

                        var payment =
                            await db.tbl_TrustApplication_Payment
                                .FirstOrDefaultAsync(x => x.RowID == paymentId && x.TrustApplicationID == application.RowID && x.IsActive);

                        if (payment == null)
                        {
                            throw new BusinessException("Payment allocation not found.", Code);
                        }

                        // =============================================
                        // 7. Status
                        //
                        // First upload:
                        // WAITING_PAYMENT
                        //
                        // Replacement after rejection:
                        // REJECTED
                        // =============================================

                        bool waitingPayment = string.Equals(payment.PaymentStatus, "WAITING_PAYMENT", StringComparison.OrdinalIgnoreCase);
                        bool rejected = string.Equals(payment.PaymentStatus, "REJECTED", StringComparison.OrdinalIgnoreCase);

                        if (!waitingPayment && !rejected)
                        {
                            throw new BusinessException("Payment slip can only be uploaded for a waiting or rejected payment.", Code);
                        }

                        DateTime now = DateTime.Now;

                        // =============================================
                        // 8. Deactivate Previous Slip
                        //
                        // PaymentDocument DOES NOT have UpdatedAt /
                        // UpdatedBy in the actual database schema.
                        // =============================================

                        var previousDocuments = await db.tbl_TrustApplication_PaymentDocument.Where(x => x.PaymentID == payment.RowID && x.IsActive).ToListAsync();

                        foreach (var previousDocument in previousDocuments)
                        {
                            previousDocument.IsActive = false;
                        }

                        // =============================================
                        // 9. Create New Payment Slip
                        //
                        // These are the EXACT columns available in
                        // tbl_TrustApplication_PaymentDocument.
                        // =============================================

                        var document =
                            new tbl_TrustApplication_PaymentDocument
                            {
                                PaymentID = payment.RowID,
                                OriginalFileName = originalFileName.Trim(),
                                FileExtension = fileExtension.Trim(),
                                FileSize = fileSize,
                                FileUrl = fileUrl.Trim(),
                                UploadedFile = uploadedFile.Trim(),
                                SHA256 = string.IsNullOrWhiteSpace(sha256) ? null : sha256.Trim(),
                                IsActive = true,
                                CreatedAt = now,
                                CreatedBy = userId
                            };

                        db.tbl_TrustApplication_PaymentDocument.Add(document);

                        // =============================================
                        // 10. Update Payment
                        // =============================================

                        payment.PaymentDate = paymentDate;
                        payment.ReferenceNo = string.IsNullOrWhiteSpace(referenceNo) ? null : referenceNo.Trim();
                        payment.PaymentStatus = "PENDING_APPROVAL";
                        payment.FinanceRemark = null;
                        payment.ApprovedAt = null;
                        payment.ApprovedBy = null;
                        payment.UpdatedAt = now;
                        payment.UpdatedBy = userId;
                        application.UpdatedAt = now;
                        application.UpdatedBy = userId;

                        // =============================================
                        // 11. History
                        // =============================================

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            rejected ? "PAYMENT_SLIP_RESUBMITTED" : "PAYMENT_SLIP_UPLOADED",
                            rejected ? "Payment Slip Resubmitted" : "Payment Slip Uploaded",
                            "Payment #" + payment.PaymentNo + " - RM " + payment.PaymentAmount.ToString("N2") + " submitted for approval.",
                            userId,
                            "PAYMENT",
                            payment.RowID,
                            rejected ? "REJECTED" : "WAITING_PAYMENT",
                            "PENDING_APPROVAL");

                        // =============================================
                        // 12. Save
                        // =============================================

                        await db.SaveChangesAsync();
                        transaction.Commit();

                        // =============================================
                        // 13. Result
                        // =============================================

                        return
                            new TrustApplicationPaymentResult
                            {
                                PaymentID = payment.RowID,
                                PaymentNo = payment.PaymentNo,
                                PaymentAmount = payment.PaymentAmount,
                                PaymentDate = payment.PaymentDate,
                                ReferenceNo = payment.ReferenceNo,
                                PaymentStatus = payment.PaymentStatus,
                                FinanceRemark = payment.FinanceRemark,
                                CreatedAt = payment.CreatedAt,
                                ApprovedAt = payment.ApprovedAt,
                                ApprovedBy = payment.ApprovedBy,
                                Document =
                                    new PaymentDocumentResult
                                    {
                                        PaymentDocumentID = document.RowID,
                                        OriginalFileName = document.OriginalFileName,
                                        FileUrl = document.FileUrl,
                                        UploadedFile = document.UploadedFile,
                                        FileSize = document.FileSize,
                                        SHA256 = document.SHA256
                                    }
                            };
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // Approve Payment
        //
        // PENDING_APPROVAL -> APPROVED
        //
        // When total APPROVED amount == TrustAssetAmount:
        //
        // Application:
        // PENDING_PAYMENT_APPROVAL -> PAYMENT_APPROVED
        // ============================================================

        public async Task<TrustApplicationPaymentResult> ApproveAsync(string merchantId, long userId, string roleCode, long trustId, long paymentId, TrustApplicationPaymentApprovalRequest request)
        {
            // ========================================================
            // 1. Permission
            // ========================================================

            if (!IsFinance(roleCode) && !IsAdmin(roleCode))
            {
                throw new BusinessException("You are not allowed to approve Trust Application payment.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        // =============================================
                        // 2. Trust Application
                        // =============================================

                        var application = await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                        if (application == null)
                        {
                            throw new BusinessException("Trust application not found.", Code);
                        }

                        // =============================================
                        // 3. Application Status
                        // =============================================

                        if (!string.Equals(application.ApplicationStatus, "PENDING_PAYMENT_APPROVAL", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new BusinessException("This Trust Application is not pending payment approval.", Code);
                        }

                        // =============================================
                        // 4. Payment
                        // =============================================

                        var payment =
                            await db.tbl_TrustApplication_Payment
                                .FirstOrDefaultAsync(x => x.RowID == paymentId && x.TrustApplicationID == application.RowID && x.IsActive);

                        if (payment == null)
                        {
                            throw new BusinessException("Payment record not found.", Code);
                        }

                        // =============================================
                        // 5. Status
                        // =============================================

                        if (!string.Equals(payment.PaymentStatus, "PENDING_APPROVAL", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new BusinessException("Only payment pending approval can be approved.", Code);
                        }

                        // =============================================
                        // 6. Payment Slip
                        // =============================================

                        bool slipExists =
                            await db.tbl_TrustApplication_PaymentDocument
                                .AnyAsync(x => x.PaymentID == payment.RowID && x.IsActive);

                        if (!slipExists)
                        {
                            throw new BusinessException("Payment slip is required before payment approval.", Code);
                        }

                        // =============================================
                        // 7. Payment Date
                        // =============================================

                        if (!payment.PaymentDate.HasValue)
                        {
                            throw new BusinessException("Payment date is required before payment approval.", Code);
                        }

                        // =============================================
                        // 8. Trust Asset
                        // =============================================

                        var asset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

                        if (asset == null)
                        {
                            throw new BusinessException("Trust Application asset information not found.", Code);
                        }

                        if (asset.TrustAssetAmount <= 0M)
                        {
                            throw new BusinessException("Trust Asset Amount is invalid.", Code);
                        }

                        decimal placement = asset.TrustAssetAmount;

                        // =============================================
                        // 9. Current Approved Total
                        // =============================================

                        decimal currentApprovedAmount =
                            await db.tbl_TrustApplication_Payment
                                .Where(x => x.TrustApplicationID == application.RowID && x.IsActive && x.PaymentStatus == "PAYMENT_APPROVED")
                                .Select(x => (decimal?)x.PaymentAmount)
                                .SumAsync()
                            ?? 0M;

                        decimal newApprovedAmount = currentApprovedAmount + payment.PaymentAmount;

                        if (newApprovedAmount > placement)
                        {
                            throw new BusinessException(
                                "Approved payment amount exceeds the Trust Asset Amount.",
                                Code);
                        }

                        // =============================================
                        // 10. Approve
                        // =============================================

                        DateTime now = DateTime.Now;
                        payment.PaymentStatus = "PAYMENT_APPROVED";
                        payment.FinanceRemark = string.IsNullOrWhiteSpace(request?.FinanceRemark) ? null : request.FinanceRemark.Trim();
                        payment.ApprovedAt = now;
                        payment.ApprovedBy = userId;
                        payment.UpdatedAt = now;
                        payment.UpdatedBy = userId;

                        // =============================================
                        // 11. Full Placement Approved
                        // =============================================

                        if (newApprovedAmount == placement)
                        {
                            // =========================================
                            // 11.1 Commencement Date
                            // =========================================

                            if (request == null || !request.CommencementDate.HasValue)
                            {
                                throw new BusinessException("Commencement Date is required when the full Trust Application payment is approved.", Code);
                            }

                            DateTime commencementDate = request.CommencementDate.Value.Date;

                            // =========================================
                            // 11.2 Trust Plan
                            // =========================================

                            var trustPlan = await db.tbl_TrustPlan.FirstOrDefaultAsync(x => x.ProductCode == application.ProductCode);

                            if (trustPlan == null)
                            {
                                throw new BusinessException("Trust Plan configuration not found.", Code);
                            }

                            if (trustPlan.FundManagementPeriod <= 0)
                            {
                                throw new BusinessException("Trust Plan Fund Management Period is invalid.", Code);
                            }

                            if (string.IsNullOrWhiteSpace(trustPlan.FundManagementPeriodUnit))
                            {
                                throw new BusinessException("Trust Plan Fund Management Period Unit is required.", Code);
                            }

                            // =========================================
                            // 11.3 Calculate Maturity Date
                            // =========================================

                            DateTime maturityDate = CalculateMaturityDate(commencementDate, trustPlan.FundManagementPeriod, trustPlan.FundManagementPeriodUnit);

                            // =========================================
                            // 11.4 Save Dates
                            // =========================================

                            application.PaymentApprovedAt = now;
                            application.PaymentApprovedBy = userId;
                            application.CommencementDate = commencementDate;
                            application.MaturityDate = maturityDate;

                            // =========================================
                            // Receipt Number
                            // =========================================

                            if (string.IsNullOrWhiteSpace(application.ReceiptNo))
                            {
                                var receiptNumberService = new TrustReceiptNumberService();
                                application.ReceiptNo = await receiptNumberService.GenerateAsync(db, now);
                            }

                            TrustApplicationHistoryHelper.Add(
                                db,
                                application.RowID,
                                "TRUST_COMMENCED",
                                "Trust Commenced",
                                "Commencement Date: " + commencementDate.ToString("dd MMM yyyy") + ". Maturity Date: " + maturityDate.ToString("dd MMM yyyy") + ".",
                                userId,
                                "APPLICATION",
                                application.RowID);

                            // =========================================
                            // 11.5 Application Status
                            // =========================================

                            TrustApplicationStatusHelper.ChangeStatus(db, application, "PAYMENT_APPROVED", userId, "Full Trust Application payment approved.");

                            // =========================================
                            // 11.6 History
                            // =========================================

                            TrustApplicationHistoryHelper.Add(
                                db,
                                application.RowID,
                                "PAYMENT_FULLY_APPROVED",
                                "Full Payment Approved",
                                "Full Trust placement of RM " + placement.ToString("N2") + " has been approved.",
                                userId,
                                "APPLICATION",
                                application.RowID,
                                "PENDING_PAYMENT_APPROVAL",
                                "PAYMENT_APPROVED");

                            // ====================================================
                            // 11.7 Create Receipt
                            // ====================================================

                            var documentService = new TrustApplicationDocumentServiceAsync();
                            await documentService.CreateAutomaticDocumentsAsync(db, application, "PAYMENT_APPROVED", userId);
                        }
                        else
                        {
                            application.UpdatedAt = now;
                            application.UpdatedBy = userId;
                        }

                        // =============================================
                        // History
                        // =============================================

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "PAYMENT_APPROVED",
                            "Payment Approved",
                            "Payment #" + payment.PaymentNo + " - RM " + payment.PaymentAmount.ToString("N2") + " was approved.",
                            userId,
                            "PAYMENT",
                            payment.RowID,
                            "PENDING_APPROVAL",
                            "PAYMENT_APPROVED");

                        // =============================================
                        // 12. Save
                        // =============================================

                        await db.SaveChangesAsync();
                        transaction.Commit();

                        // =============================================
                        // 13. Result
                        // =============================================

                        return
                            new TrustApplicationPaymentResult
                            {
                                PaymentID = payment.RowID,
                                PaymentNo = payment.PaymentNo,
                                PaymentAmount = payment.PaymentAmount,
                                PaymentDate = payment.PaymentDate,
                                ReferenceNo = payment.ReferenceNo,
                                PaymentStatus = payment.PaymentStatus,
                                FinanceRemark = payment.FinanceRemark,
                                CreatedAt = payment.CreatedAt,
                                ApprovedAt = payment.ApprovedAt,
                                ApprovedBy = payment.ApprovedBy
                            };
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // Reject Payment
        //
        // PENDING_APPROVAL -> REJECTED
        //
        // Keep current slip for audit/display.
        //
        // When AG uploads replacement:
        // old slip IsActive = false
        // new slip IsActive = true
        // payment -> PENDING_APPROVAL
        // ============================================================

        public async Task<TrustApplicationPaymentResult> RejectAsync(string merchantId, long userId, string roleCode, long trustId, long paymentId, TrustApplicationPaymentApprovalRequest request)
        {
            // ========================================================
            // 1. Permission
            // ========================================================

            if (!IsFinance(roleCode) && !IsAdmin(roleCode))
            {
                throw new BusinessException("You are not allowed to reject Trust Application payment.", Code);
            }

            // ========================================================
            // 2. Finance Remark
            // ========================================================

            if (request == null || string.IsNullOrWhiteSpace(request.FinanceRemark))
            {
                throw new BusinessException("Finance remark is required when rejecting payment.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        // =============================================
                        // 3. Trust Application
                        // =============================================

                        var application =
                            await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                        if (application == null)
                        {
                            throw new BusinessException("Trust application not found.", Code);
                        }

                        // =============================================
                        // 4. Application Status
                        // =============================================

                        if (!string.Equals(application.ApplicationStatus, "PENDING_PAYMENT_APPROVAL", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new BusinessException("This Trust Application is not pending payment approval.", Code);
                        }

                        // =============================================
                        // 5. Payment
                        // =============================================

                        var payment =
                            await db.tbl_TrustApplication_Payment
                                .FirstOrDefaultAsync(x => x.RowID == paymentId && x.TrustApplicationID == application.RowID && x.IsActive);

                        if (payment == null)
                        {
                            throw new BusinessException("Payment record not found.", Code);
                        }

                        // =============================================
                        // 6. Status
                        // =============================================

                        if (!string.Equals(payment.PaymentStatus, "PENDING_APPROVAL", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new BusinessException("Only payment pending approval can be rejected.", Code);
                        }

                        // =============================================
                        // 7. Active Slip Must Exist
                        // =============================================

                        bool slipExists = await db.tbl_TrustApplication_PaymentDocument.AnyAsync(x => x.PaymentID == payment.RowID && x.IsActive);

                        if (!slipExists)
                        {
                            throw new BusinessException("Payment slip is required before payment rejection.", Code);
                        }

                        // =============================================
                        // 8. Reject
                        // =============================================

                        DateTime now = DateTime.Now;
                        payment.IsActive = false;
                        payment.PaymentStatus = "REJECTED";
                        payment.FinanceRemark = request.FinanceRemark.Trim();
                        payment.ApprovedAt = null;
                        payment.ApprovedBy = null;
                        payment.UpdatedAt = now;
                        payment.UpdatedBy = userId;
                        application.UpdatedAt = now;
                        application.UpdatedBy = userId;

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "PAYMENT_REJECTED",
                            "Payment Rejected",
                            "Payment #" + payment.PaymentNo + " - RM " + payment.PaymentAmount.ToString("N2") + " was rejected. Reason: " + request.FinanceRemark.Trim(),
                            userId,
                            "PAYMENT",
                            payment.RowID,
                            "PENDING_APPROVAL",
                            "REJECTED");

                        // =============================================
                        // 9. Save
                        // =============================================

                        await db.SaveChangesAsync();
                        transaction.Commit();

                        // =============================================
                        // 10. Result
                        // =============================================

                        return
                            new TrustApplicationPaymentResult
                            {
                                PaymentID = payment.RowID,
                                PaymentNo = payment.PaymentNo,
                                PaymentAmount = payment.PaymentAmount,
                                PaymentDate = payment.PaymentDate,
                                ReferenceNo = payment.ReferenceNo,
                                PaymentStatus = payment.PaymentStatus,
                                FinanceRemark = payment.FinanceRemark,
                                CreatedAt = payment.CreatedAt,
                                ApprovedAt = payment.ApprovedAt,
                                ApprovedBy = payment.ApprovedBy
                            };
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        public async Task<TrustApplicationPaymentResult> CancelAllocationAsync(string merchantId, long userId, string roleCode, long trustId, long paymentId)
        {
            if (!IsAgent(roleCode))
            {
                throw new BusinessException("Only Trust Representative can cancel payment allocation.", Code);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        // =====================================================
                        // 1. Trust Application
                        // =====================================================

                        var application =
                            await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                        if (application == null)
                        {
                            throw new BusinessException("Trust Application not found.", Code);
                        }

                        // =====================================================
                        // 2. Ownership
                        // =====================================================

                        if (application.MemberID != userId)
                        {
                            throw new BusinessException("You are not allowed to cancel payment allocation for this Trust Application.", Code);
                        }

                        // =====================================================
                        // 3. Application Status
                        // =====================================================

                        if (!string.Equals(application.ApplicationStatus, "PENDING_PAYMENT_APPROVAL", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new BusinessException("Payment allocation can only be cancelled when the Trust Application is pending payment approval.", Code);
                        }

                        // =====================================================
                        // 4. Payment
                        // =====================================================

                        var payment =
                            await db.tbl_TrustApplication_Payment
                                .FirstOrDefaultAsync(x => x.RowID == paymentId && x.TrustApplicationID == application.RowID && x.IsActive);

                        if (payment == null)
                        {
                            throw new BusinessException("Payment allocation not found.", Code);
                        }

                        // =====================================================
                        // 5. APPROVED Payment Cannot Be Cancelled
                        // =====================================================

                        if (string.Equals(payment.PaymentStatus, "PAYMENT_APPROVED", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new BusinessException("Approved payment allocation cannot be cancelled.", Code);
                        }

                        // =====================================================
                        // 6. Store Previous Status
                        // =====================================================

                        string previousStatus = payment.PaymentStatus;
                        DateTime now = DateTime.Now;

                        // =====================================================
                        // 7. Deactivate Active Payment Slip
                        //
                        // tbl_TrustApplication_PaymentDocument does NOT have
                        // UpdatedAt / UpdatedBy.
                        //
                        // Therefore only set IsActive = false.
                        // =====================================================

                        var activeDocuments =
                            await db.tbl_TrustApplication_PaymentDocument
                                .Where(x => x.PaymentID == payment.RowID && x.IsActive).ToListAsync();

                        foreach (var document in activeDocuments)
                        {
                            document.IsActive = false;
                        }

                        // =====================================================
                        // 8. Soft Cancel Payment
                        // =====================================================

                        payment.PaymentStatus = "CANCELLED";
                        payment.IsActive = false;
                        payment.UpdatedAt = now;
                        payment.UpdatedBy = userId;
                        application.UpdatedAt = now;
                        application.UpdatedBy = userId;

                        // =====================================================
                        // 9. History
                        // =====================================================

                        TrustApplicationHistoryHelper.Add(
                            db,
                            application.RowID,
                            "PAYMENT_ALLOCATION_CANCELLED",
                            "Payment Allocation Cancelled",
                            "Payment #" + payment.PaymentNo + " - RM " + payment.PaymentAmount.ToString("N2") + " was cancelled.",
                            userId,
                            "PAYMENT",
                            payment.RowID,
                            previousStatus,
                            "CANCELLED");

                        // =====================================================
                        // 10. Save
                        // =====================================================

                        await db.SaveChangesAsync();
                        transaction.Commit();

                        // =====================================================
                        // 11. Result
                        // =====================================================

                        return new TrustApplicationPaymentResult
                        {
                            PaymentID = payment.RowID,
                            PaymentNo = payment.PaymentNo,
                            PaymentAmount = payment.PaymentAmount,
                            PaymentDate = payment.PaymentDate,
                            ReferenceNo = payment.ReferenceNo,
                            PaymentStatus = payment.PaymentStatus,
                            FinanceRemark = payment.FinanceRemark,
                            CreatedAt = payment.CreatedAt,
                            ApprovedAt = payment.ApprovedAt,
                            ApprovedBy = payment.ApprovedBy
                        };
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // ============================================================
        // Calculate Maturity Date
        // ============================================================

        private DateTime CalculateMaturityDate(DateTime commencementDate, int fundManagementPeriod, string fundManagementPeriodUnit)
        {
            if (fundManagementPeriod <= 0)
            {
                throw new BusinessException("Fund Management Period must be greater than zero.", Code);
            }

            if (string.IsNullOrWhiteSpace(fundManagementPeriodUnit))
            {
                throw new BusinessException("Fund Management Period Unit is required.", Code);
            }

            string unit = fundManagementPeriodUnit.Trim().ToUpperInvariant();

            switch (unit)
            {
                case "YEARS":
                    return commencementDate.AddYears(fundManagementPeriod).Date;

                case "MONTHS":
                    return commencementDate.AddMonths(fundManagementPeriod).Date;

                default:
                    throw new BusinessException("Unsupported Fund Management Period Unit: " + fundManagementPeriodUnit + ".", Code);
            }
        }
    }
}