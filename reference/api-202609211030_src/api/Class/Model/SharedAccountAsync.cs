using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO.SharedAccount;
using API_CPX.Context;
using System;
using System.Data;
using System.Data.Entity;
using System.Data.SqlClient;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class SharedAccountAsync
    {
        private const string TrustMerchantID = AppSettingsHelper.TrustMerchantId;

        private const string WillMerchantID = AppSettingsHelper.TheWillMerchantId;

        private static string NormalizeEmail(string email)
        {
            return (email ?? "").Trim().ToLowerInvariant();
        }

        private static string NormalizeSponsor(string sponsor)
        {
            return (sponsor ?? "").Trim().ToUpperInvariant();
        }

        public async Task<SharedAccountValidationResult> ValidateAsync(SharedAccountValidateRequest request)
        {
            if (request == null)
                throw new ArgumentException("Request is required.");

            string merchantId = (request.MerchantID ?? "").Trim();
            string email = NormalizeEmail(request.Email);
            string sponsor = NormalizeSponsor(request.Sponsor);

            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("Email is required.");

            if (string.IsNullOrWhiteSpace(sponsor))
                throw new ArgumentException("Referral code is required.");

            string sourceMerchantId;
            string sourceType;
            string targetType;
            string actionType;

            if (merchantId == WillMerchantID)
            {
                sourceMerchantId = TrustMerchantID;
                sourceType = "V";
                targetType = "W";
                actionType = "WILL_SHARE_ACCOUNT";
            }
            else if (merchantId == TrustMerchantID)
            {
                sourceMerchantId = WillMerchantID;
                sourceType = "W";
                targetType = "V";
                actionType = "TRUST_SHARE_ACCOUNT";
            }
            else
            {
                throw new ArgumentException("Invalid target merchant.");
            }

            using (var db = new Sandbox_BasedEntities())
            {
                bool merchantExists = await db.tbl_Merchant.AsNoTracking().AnyAsync(x => x.MerchantID == merchantId && x.Status == 0);

                if (!merchantExists)
                    throw new InvalidOperationException("Target merchant is inactive.");

                var member = await db.tbl_MemberInfo
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Username == email && x.Status == 0 && !x.IsDeleted);

                if (member == null)
                    throw new InvalidOperationException("Existing active account not found.");

                long memberId = member.RowID;

                bool sourceExists = await db.tbl_Reference
                    .AsNoTracking()
                    .AnyAsync(x => x.MemberID == memberId && x.MerchantID == sourceMerchantId && x.Type == sourceType && x.Status == 0);

                if (!sourceExists)
                    throw new InvalidOperationException("Source portal membership not found.");

                bool targetExists = await db.tbl_Reference
                    .AsNoTracking()
                    .AnyAsync(x => x.MemberID == memberId && x.MerchantID == merchantId && x.Type == targetType);

                if (targetExists)
                    throw new InvalidOperationException("Account already registered on the target portal.");

                var sponsorInfo = await
                    (from reference in db.tbl_Reference.AsNoTracking()
                     join sponsorMember in db.tbl_MemberInfo.AsNoTracking() on reference.MemberID equals sponsorMember.RowID
                     where reference.MerchantID == merchantId
                           && reference.Type == targetType
                           && reference.ReferralCode == sponsor
                           && reference.Status == 0
                           && sponsorMember.Status == 0
                           && !sponsorMember.IsDeleted
                     select new
                     {
                         reference.MemberID,
                         sponsorMember.Fullname
                     })
                    .FirstOrDefaultAsync();

                if (sponsorInfo == null)
                    throw new InvalidOperationException("Invalid sponsor referral code.");

                if (sponsorInfo.MemberID == memberId)
                    throw new InvalidOperationException("Cannot sponsor your own account.");

                bool sponsorPlacementExists;

                if (targetType == "W")
                {
                    sponsorPlacementExists =
                        await db.tbl_MemberUnit_Will
                            .AsNoTracking()
                            .AnyAsync(x => x.memberID == sponsorInfo.MemberID && x.isActivated == true && x.isDeleted == false);
                }
                else
                {
                    sponsorPlacementExists =
                        await db.tbl_MemberUnit_Trust
                            .AsNoTracking()
                            .AnyAsync(x => x.memberID == sponsorInfo.MemberID && x.isActivated == true && x.isDeleted == false);
                }

                if (!sponsorPlacementExists)
                    throw new InvalidOperationException("Sponsor network placement not found.");

                return new SharedAccountValidationResult
                {
                    MemberID = memberId,
                    Email = email,
                    TargetMerchantID = merchantId,
                    SourceMerchantID = sourceMerchantId,
                    Sponsor = sponsor,
                    SponsorName = sponsorInfo.Fullname,
                    ActionType = actionType,
                    TargetReferenceType = targetType
                };
            }
        }

        public async Task<SharedAccountRegistrationResult> CompleteAsync(SharedAccountCompleteRequest request, string ipAddress)
        {
            var validation = await ValidateAsync(request);

            int ranking;

            if (validation.TargetMerchantID == TrustMerchantID)
            {
                ranking = 100;
            }
            else
            {
                if (!request.Ranking.HasValue || (request.Ranking.Value != 6100 && request.Ranking.Value != 6200))
                {
                    throw new ArgumentException("Please select a valid Will ranking.");
                }

                ranking = request.Ranking.Value;
            }

            if (string.IsNullOrWhiteSpace(request.OTP))
                throw new ArgumentException("OTP is required.");

            using (var db = new Sandbox_BasedEntities())
            {
                var parameters = new[]
                {
                    new SqlParameter("@MerchantID", SqlDbType.VarChar, 50)
                    {
                        Value = validation.TargetMerchantID
                    },
                    new SqlParameter("@Username", SqlDbType.NVarChar, 250)
                    {
                        Value = validation.Email
                    },
                    new SqlParameter("@Sponsor", SqlDbType.VarChar, 50)
                    {
                        Value = validation.Sponsor
                    },
                    new SqlParameter("@Ranking", SqlDbType.Int)
                    {
                        Value = ranking
                    },
                    new SqlParameter("@OTP", SqlDbType.VarChar, 10)
                    {
                        Value = request.OTP.Trim()
                    },
                    new SqlParameter("@IP", SqlDbType.NVarChar, 500)
                    {
                        Value = (object)ipAddress ?? DBNull.Value
                    }
                };

                using (var tran = db.Database.BeginTransaction())
                {
                    try
                    {
                        var result = await db.Database
                            .SqlQuery<SharedAccountRegistrationResult>(
                                @"EXEC dbo.USP_MemberRegister_SharedAccount
                                    @MerchantID = @MerchantID,
                                    @Username = @Username,
                                    @Sponsor = @Sponsor,
                                    @Ranking = @Ranking,
                                    @OTP = @OTP,
                                    @IP = @IP",
                                parameters)
                            .FirstOrDefaultAsync();

                        if (result == null || !result.Success)
                        {
                            throw new InvalidOperationException("Shared account registration failed.");
                        }

                        tran.Commit();
                        return result;
                    }
                    catch (Exception)
                    {
                        tran.Rollback();
                        throw;
                    }
                }
            }
        }
    }
}