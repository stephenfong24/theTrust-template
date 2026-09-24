using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.TrustPlan;
using API_CPX.Context;
using API_CPX.Services.TrustPlan;
using Newtonsoft.Json;
using System;
using System.Data.Entity;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Snapshot
{
    public class TrustApplicationPlanSnapshotServiceAsync
    {
        private const string Code = "TRUST-APPLICATION-PLAN-SNAPSHOT";

        private const int SnapshotVersion = 1;

        public async Task<tbl_TrustApplication_PlanSnapshot> CreateSnapshotAsync(Sandbox_BasedEntities db, tbl_TrustApplication application, string merchantId, long userId)
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
            // 1. Prevent duplicate snapshot
            // ============================================================

            var existingSnapshot =
                await db.tbl_TrustApplication_PlanSnapshot
                    .FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (existingSnapshot != null)
            {
                return existingSnapshot;
            }

            // ============================================================
            // 2. Validate Product Code
            // ============================================================

            if (string.IsNullOrWhiteSpace(application.ProductCode))
            {
                throw new BusinessException("Trust Application Product Code is missing.", Code);
            }

            // ============================================================
            // 3. Get complete Trust Plan configuration
            //
            // Reuse existing internal function.
            // DO NOT call your own HTTP API.
            // ============================================================

            var trustPlanService = new TrustPlanServiceAsync();
            var planDetails = await trustPlanService.GetTrustProductDetailsAsync(application.ProductCode, merchantId);

            if (planDetails == null)
            {
                throw new BusinessException("Unable to retrieve Trust Plan configuration.", Code);
            }

            // ============================================================
            // 4. Serialize the Data object
            //
            // planDetails itself is the Data returned by your API.
            // We do not store Status / Message / Code.
            // ============================================================

            string json = JsonConvert.SerializeObject(planDetails, Formatting.None);

            if (string.IsNullOrWhiteSpace(json))
            {
                throw new BusinessException( "Unable to serialize Trust Plan configuration.", Code);
            }

            // ============================================================
            // 5. Generate SHA-256
            // ============================================================

            string snapshotHash = GenerateSha256(json);

            // ============================================================
            // 6. Create immutable snapshot
            // ============================================================

            var snapshot =
                new tbl_TrustApplication_PlanSnapshot
                {
                    TrustApplicationID = application.RowID,
                    ProductCode = application.ProductCode,
                    SnapshotVersion = SnapshotVersion,
                    PlanConfigurationJson = json,
                    SnapshotHash = snapshotHash,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId
                };

            db.tbl_TrustApplication_PlanSnapshot.Add(snapshot);

            // IMPORTANT:
            //
            // Do NOT call SaveChangesAsync() here.
            //
            // CompleteAsync() owns the transaction and will
            // save:
            //
            // - snapshot
            // - status
            // - generated documents
            //
            // together.

            return snapshot;
        }

        public async Task<tbl_TrustApplication_PlanSnapshot> GetSnapshotAsync(Sandbox_BasedEntities db, long trustApplicationId)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            var snapshot = await db.tbl_TrustApplication_PlanSnapshot.FirstOrDefaultAsync(x => x.TrustApplicationID == trustApplicationId);
            if (snapshot == null)
            {
                throw new BusinessException("Trust Application Plan Snapshot not found.", Code);
            }

            return snapshot;
        }

        public async Task<TrustPlanDetailsResponse> GetSnapshotConfigurationAsync(Sandbox_BasedEntities db, long trustApplicationId)
        {
            var snapshot = await GetSnapshotAsync(db, trustApplicationId);

            if (string.IsNullOrWhiteSpace(snapshot.PlanConfigurationJson))
            {
                throw new BusinessException("Trust Application Plan Snapshot configuration is empty.", Code);
            }

            try
            {
                return JsonConvert.DeserializeObject<TrustPlanDetailsResponse>(snapshot.PlanConfigurationJson);
            }
            catch (JsonException)
            {
                throw new BusinessException("Trust Application Plan Snapshot configuration is invalid.", Code);
            }
        }

        public TrustPlanDetailsResponse DeserializeSnapshot(tbl_TrustApplication_PlanSnapshot snapshot)
        {
            if (snapshot == null)
            {
                throw new BusinessException("Trust Application Plan Snapshot is missing.", Code);
            }

            if (string.IsNullOrWhiteSpace(snapshot.PlanConfigurationJson))
            {
                throw new BusinessException("Trust Application Plan Snapshot configuration is empty.", Code);
            }

            try
            {
                return JsonConvert.DeserializeObject<TrustPlanDetailsResponse>(snapshot.PlanConfigurationJson);
            }
            catch (JsonException)
            {
                throw new BusinessException("Trust Application Plan Snapshot configuration is invalid.", Code);
            }
        }

        // ============================================================
        // SHA-256
        // ============================================================

        private string GenerateSha256(string value)
        {
            using (var sha256 = SHA256.Create())
            {
                byte[] bytes = Encoding.UTF8.GetBytes(value);
                byte[] hash = sha256.ComputeHash(bytes);
                var builder = new StringBuilder(hash.Length * 2);

                foreach (byte b in hash)
                {
                    builder.Append(b.ToString("x2"));
                }

                return builder.ToString();
            }
        }
    }
}