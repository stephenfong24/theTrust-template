using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.ComplimentaryBenefit
{
    public class TrustApplicationComplimentaryBenefitServiceAsync
    {
        public async Task SyncAsync(
            Sandbox_BasedEntities db,
            long trustApplicationId,
            string productCode,
            decimal trustAssetAmount,
            long userId)
        {
            DateTime now = DateTime.Now;

            // ========================================================
            // Get Trust Plan
            // ========================================================

            var plan = await db.tbl_TrustPlan.FirstOrDefaultAsync(x => x.ProductCode == productCode);

            if (plan == null)
            {
                return;
            }

            // ========================================================
            // Soft delete current active complimentary benefit
            //
            // We always clear the previous qualification first.
            // If the new placement still qualifies, a new snapshot
            // record will be inserted below.
            // ========================================================

            var existingRecords =
                await db.tbl_TrustApplication_ComplimentaryBenefit
                    .Where(x => x.TrustApplicationID == trustApplicationId && x.IsActive)
                    .ToListAsync();

            foreach (var existing in existingRecords)
            {
                existing.IsActive = false;
                existing.UpdatedAt = now;
                existing.UpdatedBy = userId;
            }

            // ========================================================
            // Complimentary Benefits Disabled
            // ========================================================

            if (!plan.HasComplimentaryBenefits)
            {
                return;
            }

            // ========================================================
            // Find Qualified Benefit
            //
            // MinimumPlacement <= placement
            //
            // MaximumPlacement:
            // NULL = unlimited
            // otherwise placement must be <= maximum
            // ========================================================

            var benefit =
                await db.tbl_TrustPlanBenefit
                    .Where(x =>
                        x.TrustPlanID == plan.RowID && trustAssetAmount >= x.MinimumPlacement &&
                        (
                            !x.MaximumPlacement.HasValue || trustAssetAmount <= x.MaximumPlacement.Value
                        ))
                    .OrderBy(x => x.Sequence)
                    .FirstOrDefaultAsync();

            // ========================================================
            // No Complimentary Benefit Qualified
            // ========================================================

            if (benefit == null)
            {
                return;
            }

            // ========================================================
            // Insert Qualification Snapshot
            // ========================================================

            var record =
                new tbl_TrustApplication_ComplimentaryBenefit
                {
                    TrustApplicationID = trustApplicationId,
                    TrustPlanBenefitID = benefit.RowID,
                    QualifiedPlacementAmount = trustAssetAmount,
                    MinimumPlacement = benefit.MinimumPlacement,
                    MaximumPlacement = benefit.MaximumPlacement,
                    BenefitName = benefit.BenefitName,
                    BenefitValue = benefit.BenefitValue,
                    FulfilmentMethod = benefit.FulfilmentMethod,
                    IsActive = true,
                    CreatedAt = now,
                    CreatedBy = userId
                };

            db.tbl_TrustApplication_ComplimentaryBenefit.Add(record);
        }
    }
}