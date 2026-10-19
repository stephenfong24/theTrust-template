using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Document.Generator.Helper
{
    public static class LetterOfWishesMinorBeneficiaryHelper
    {
        public const string Placeholder = "{{MINOR_BENEFICIARY_CLAUSE}}";

        public const string Clause =
            "In the event that any distribution of the Trust Fund " +
            "is to be made for the benefit of any of the Beneficiaries " +
            "who is below the age of majority within the jurisdiction " +
            "in which the Beneficiaries reside (“Minor Beneficiary\"), " +
            "it is my wish for the Trustee to distribute such portion " +
            "of Trust Fund to the guardian of the Minor Beneficiary.";

        public static async Task<bool> HasMinorBeneficiaryAsync(Sandbox_BasedEntities db, long trustApplicationId)
        {
            if (db == null)
                throw new ArgumentNullException(nameof(db));

            return await db.tbl_TrustApplication_MinorDistribution
                .AsNoTracking()
                .AnyAsync(x => x.TrustApplicationID == trustApplicationId);
        }

        public static async Task AddPlaceholderAsync(Sandbox_BasedEntities db, long trustApplicationId, IDictionary<string, string> placeholders)
        {
            if (placeholders == null)
                throw new ArgumentNullException(nameof(placeholders));

            bool hasMinor = await HasMinorBeneficiaryAsync(db, trustApplicationId);

            placeholders[Placeholder] = hasMinor ? Clause : "";
        }
    }
}