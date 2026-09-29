using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.TrustPlan;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Commission
{
    public class TrustCommissionSourceServiceAsync
    {
        private const string Code = "TRUST-COMMISSION-SOURCE";

        // ============================================================
        // Register Commission Source
        //
        // PURPOSE:
        //
        // This service DOES NOT calculate commission.
        //
        // It only registers a completed Trust Application as a
        // commission source for later scheduled processing.
        //
        // Actual commission calculation will be performed by:
        //
        // USP_TrustCommission_DailyCutoff
        //      ↓
        // USP_TrustCommission_ProcessOneOff
        //
        // IMPORTANT:
        //
        // Commission configuration MUST come from the frozen
        // Trust Plan Snapshot.
        //
        // Do NOT query the current Trust Plan commission tables here,
        // because the Trust Plan may be changed after the application
        // has been completed.
        // ============================================================

        public async Task RegisterAsync(Sandbox_BasedEntities db, tbl_TrustApplication application, TrustPlanDetailsResponse frozenPlan, tbl_TrustApplication_PlanSnapshot snapshot, DateTime completedAt)
        {
            // ========================================================
            // 1. Validate Database Context
            // ========================================================

            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            // ========================================================
            // 2. Validate Trust Application
            // ========================================================

            if (application == null)
            {
                throw new BusinessException("Trust Application is required.", Code);
            }

            if (application.RowID <= 0)
            {
                throw new BusinessException("Invalid Trust Application.", Code);
            }

            if (application.TrustID <= 0)
            {
                throw new BusinessException("Invalid Trust ID.", Code);
            }

            if (string.IsNullOrWhiteSpace(application.MerchantID))
            {
                throw new BusinessException("Merchant ID is required.", Code);
            }

            if (string.IsNullOrWhiteSpace(application.ProductCode))
            {
                throw new BusinessException("Product Code is required.", Code);
            }

            if (application.MemberID <= 0)
            {
                throw new BusinessException("Selling Agent is required.", Code);
            }

            // ========================================================
            // Validate Selected Network
            // ========================================================

            if (!application.ReferenceID.HasValue || application.ReferenceID.Value <= 0)
            {
                throw new BusinessException("Trust Application selected Reference is required.", Code);
            }

            string networkType = NormalizeCode(application.NetworkType);

            if (networkType != "W" && networkType != "V")
            {
                throw new BusinessException("Trust Application Network Type must be W or V.", Code);
            }

            if (string.IsNullOrWhiteSpace(application.ReferralCode))
            {
                throw new BusinessException("Trust Application Referral Code is required.", Code);
            }

            var selectedReference =
                await db.tbl_Reference
                    .FirstOrDefaultAsync(x =>
                        x.RowID == application.ReferenceID.Value &&
                        x.MemberID == application.MemberID &&
                        x.MerchantID == application.MerchantID &&
                        x.Status == 0);

            if (selectedReference == null)
            {
                throw new BusinessException("The selected Trust Application Reference is invalid.", Code);
            }

            // ========================================================
            // 3. Validate Frozen Trust Plan
            //
            // IMPORTANT:
            //
            // This must be the TrustPlanDetailsResponse deserialized
            // from tbl_TrustApplication_PlanSnapshot.
            //
            // Never load the current Trust Plan here.
            // ========================================================

            if (frozenPlan == null)
            {
                throw new BusinessException("Frozen Trust Plan is required.", Code);
            }

            if (frozenPlan.Steps == null)
            {
                throw new BusinessException("Frozen Trust Plan configuration is invalid.", Code);
            }

            // ========================================================
            // 4. Validate Plan Snapshot
            // ========================================================

            if (snapshot == null)
            {
                throw new BusinessException("Trust Plan Snapshot is required.", Code);
            }

            if (snapshot.RowID <= 0)
            {
                throw new BusinessException("Invalid Trust Plan Snapshot.", Code);
            }

            if (snapshot.TrustApplicationID != application.RowID)
            {
                throw new BusinessException("Trust Plan Snapshot does not belong to this Trust Application.", Code);
            }

            // ========================================================
            // 5. Get Frozen Commission Configuration
            //
            // Step 7:
            //
            // Enabled
            // Method
            // Configuration
            //
            // Current supported method:
            //
            // ONE_OFF_COMMISSION
            // ========================================================

            var commissionConfiguration = frozenPlan.Steps.Step7CommissionConfiguration;

            // ========================================================
            // No Commission Configuration
            //
            // If this product has no commission configuration,
            // there is nothing to register.
            // ========================================================

            if (commissionConfiguration == null)
            {
                return;
            }

            // ========================================================
            // Commission Disabled
            //
            // Disabled commission should NOT create a commission
            // source record.
            // ========================================================

            if (!commissionConfiguration.Enabled)
            {
                return;
            }

            // ========================================================
            // 6. Validate Commission Method
            // ========================================================

            string commissionMethod = NormalizeCode(commissionConfiguration.Method);

            if (string.IsNullOrWhiteSpace(commissionMethod))
            {
                throw new BusinessException("Commission Method is missing from the frozen Trust Plan.", Code);
            }

            // ========================================================
            // IMPORTANT:
            //
            // Do NOT check:
            //
            // application.ProductCode == "MYTRUST"
            //
            // Commission calculation is method-based.
            //
            // Current:
            //
            // ONE_OFF_COMMISSION
            //
            // Future:
            //
            // MONTHLY_RECURRING_COMMISSION
            // YEARLY_COMMISSION
            // MULTI_YEAR_TIERED_COMMISSION
            // HYBRID_COMMISSION
            //
            // The stored procedure dispatcher will determine which
            // processor handles the source.
            // ========================================================

            // ========================================================
            // 7. Get Frozen Commission Rules
            //
            // Step 8:
            //
            // CalculationBasis
            // RankDetermination
            // ========================================================

            var commissionRules = frozenPlan.Steps.Step8CommissionRules;

            if (commissionRules == null)
            {
                throw new BusinessException("Commission Rules are missing from the frozen Trust Plan.", Code);
            }

            string calculationBasis = NormalizeCode(commissionRules.CalculationBasis);
            string rankDetermination = NormalizeCode(commissionRules.RankDetermination);

            if (string.IsNullOrWhiteSpace(calculationBasis))
            {
                throw new BusinessException("Commission Calculation Basis is missing from the frozen Trust Plan.", Code);
            }

            if (string.IsNullOrWhiteSpace(rankDetermination))
            {
                throw new BusinessException("Commission Rank Determination is missing from the frozen Trust Plan.", Code);
            }

            // ========================================================
            // 8. Check Existing Commission Source
            //
            // One Trust Application must only have ONE commission
            // source.
            //
            // The database should ALSO have:
            //
            // UNIQUE (TrustApplicationID)
            //
            // This check is for normal application flow.
            // The UNIQUE constraint remains the final protection
            // against concurrency.
            // ========================================================

            bool sourceExists = await db.tbl_TrustCommissionSource.AnyAsync(x => x.TrustApplicationID == application.RowID);

            if (sourceExists)
            {
                return;
            }

            // ========================================================
            // 9. Get Trust Asset
            //
            // Commission placement amount comes from:
            //
            // tbl_TrustApplication_TrustAsset.TrustAssetAmount
            //
            // linked using:
            //
            // TrustApplicationID = application.RowID
            // ========================================================

            var trustAsset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (trustAsset == null)
            {
                throw new BusinessException("Trust Asset is missing.", Code);
            }

            if (trustAsset.TrustAssetAmount <= 0)
            {
                throw new BusinessException("Trust Asset Amount must be greater than zero.", Code);
            }

            // ========================================================
            // 10. Create Commission Source
            //
            // IMPORTANT:
            //
            // We freeze the information required by the future
            // commission processor.
            //
            // We do NOT calculate:
            //
            // - recipient
            // - rank
            // - commission rate
            // - commission amount
            // - overriding
            //
            // Those belong to the scheduled commission processor.
            // ========================================================

            var source =
                new tbl_TrustCommissionSource
                {
                    // ================================================
                    // Merchant
                    // ================================================

                    MerchantID = application.MerchantID.Trim(),

                    // ================================================
                    // Trust Application
                    // ================================================

                    TrustApplicationID = application.RowID,
                    TrustID = application.TrustID,
                    ProductCode = application.ProductCode.Trim(),

                    // ================================================
                    // Selling Agent
                    // ================================================

                    SellingMemberID = application.MemberID,
                    ReferenceID = application.ReferenceID.Value,
                    NetworkType = networkType,
                    ReferralCode = application.ReferralCode.Trim(),

                    // ================================================
                    // Placement
                    //
                    // Freeze completed Trust Asset Amount.
                    // ================================================

                    PlacementAmount = trustAsset.TrustAssetAmount,

                    // ================================================
                    // Frozen Plan
                    //
                    // The stored procedure will use this SnapshotID
                    // to read PlanConfigurationJson.
                    // ================================================

                    PlanSnapshotID = snapshot.RowID,

                    // ================================================
                    // Commission Configuration
                    // ================================================

                    CommissionMethod = commissionMethod,
                    CalculationBasis = calculationBasis,
                    RankDetermination = rankDetermination,

                    // ================================================
                    // Trust Completed Date
                    //
                    // This is the business date that generated the
                    // commission entitlement.
                    // ================================================

                    CompletedAt = completedAt,

                    // ================================================
                    // Processing
                    // ================================================

                    ProcessingStatus = "COMPLETED",
                    ProcessedAt = null,
                    RetryCount = 0,
                    LastAttemptAt =  null,
                    LastError = null,

                    // ================================================
                    // Audit
                    // ================================================

                    CreatedAt = completedAt
                };

            // ========================================================
            // 11. Add Commission Source
            //
            // IMPORTANT:
            //
            // DO NOT call SaveChangesAsync() here.
            //
            // TrustApplicationWorkflowServiceAsync.CompleteAsync()
            // owns the database transaction.
            //
            // That transaction should save:
            //
            // - Trust Plan Snapshot
            // - Dividend Schedule
            // - Commission Source
            // - COMPLETED status
            // - Documents
            //
            // together.
            // ========================================================

            db.tbl_TrustCommissionSource.Add(source);
        }

        // ============================================================
        // Normalize Code
        //
        // Examples:
        //
        // "one_off_commission"
        //      ->
        // "ONE_OFF_COMMISSION"
        //
        // " rank_at_completed "
        //      ->
        // "RANK_AT_COMPLETED"
        // ============================================================

        private static string NormalizeCode(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            return value.Trim().ToUpperInvariant();
        }
    }
}