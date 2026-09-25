using API_CPX.Class;
using API_CPX.Class.Helper;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Util;

namespace API_CPX.Model
{
    [Serializable]
    public class LoginUserModel : Base
    {
        public long UserId { get; set; }
        public string DisplayName { get; set; }
        public string UserName { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string AvatarUrl { get; set; }
        public string MerchantID { get; set; }
        public string Country { get; set; }
        public string Country_Domain { get; set; }
        public string Role { get; set; }
        public string RoleName { get; set; }
        public int Ranking { get; set; }
        public string RankName { get; set; }
        public DateTime JoinDate { get; set; }
        public DateTime LastLogin { get; set; }
        public string Token { get; set; }
        public string SignalRToken { get; set; }
        public Guid? RememberMeToken { get; set; }
        public long SponsorID { get; set; }
        public string SponsorName { get; set; }
        public string ReferralCode { get; set; }
        public CommissionPermission CommissionAccess { get; set; }
        public RedirectRecords Redirects { get; set; }
        public AccessPermission Access { get; set; }

        public async Task<bool> VerifyLogin(string username, string password, string merchantId, bool rememberMe)
        {
            Status = 0;
            Message = null;
            var errorContext = ErrorLogContext.GetErrorContext();
            var sql = new StringBuilder();
            string encryptedPassword = null;

            // ========================================================
            // VALIDATE USERNAME
            // ========================================================

            if (string.IsNullOrWhiteSpace(username))
            {
                Status = 4;
                Message = "Invalid_Username_Empty";
                return false;
            }

            // ========================================================
            // VALIDATE PASSWORD
            // ========================================================

            if (string.IsNullOrWhiteSpace(password))
            {
                Status = 4;
                Message = "Invalid_Password_Empty";
                return false;
            }

            try
            {
                encryptedPassword = secure.RC(secure.Encrypt(password, true));

                using (var db = new Sandbox_BasedEntities())
                {
                    // =================================================
                    // FIND USER
                    // =================================================

                    var user =
                        await (
                            from m in db.tbl_MemberInfo
                            join l in db.tbl_Login on m.RowID equals l.MemberID
                            join r in db.tbl_Reference on m.RowID equals r.MemberID
                            where m.Username == username
                                  && m.IsDeleted == false
                                  && l.LoginStatus == true
                                  && r.MerchantID == merchantId
                            select new
                            {
                                MemberID = m.RowID
                            }
                        ).FirstOrDefaultAsync();

                    if (user == null)
                    {
                        Status = 4;
                        Message = "Unable to sign in. Please check your username and password and try again.";
                        await LogUtilAsync.LogLoginAsync(username, 0, encryptedPassword, "Failed", errorContext);
                        return false;
                    }

                    // =================================================
                    // VERIFY PASSWORD
                    // =================================================

                    bool isValidPassword = await ValidationAsync.IsValidPinAsync(user.MemberID, password);
                    if (!isValidPassword)
                    {
                        Status = 4;
                        Message = "Unable to sign in. Please check your username and password and try again.";
                        await LogUtilAsync.LogLoginAsync(username, user.MemberID, encryptedPassword, "Failed", errorContext);
                        return false;
                    }

                    // =================================================
                    // LOAD COMMON USER PROFILE
                    // =================================================

                    bool isProfileLoaded = await LoadUserProfileAsync(db, user.MemberID, merchantId);
                    if (!isProfileLoaded)
                    {
                        await LogUtilAsync.LogLoginAsync(username, user.MemberID, encryptedPassword, "Failed", errorContext);
                        return false;
                    }

                    // =================================================
                    // HANDLE REMEMBER ME
                    // =================================================

                    await CreateRememberMeTokenAsync(db, rememberMe);

                    // =================================================
                    // SUCCESS
                    // =================================================

                    Status = 0;
                    Message = "Success";
                    await LogUtilAsync.LogLoginAsync(UserName, UserId, encryptedPassword, "Success", errorContext);
                    return true;
                }
            }
            catch (Exception ex)
            {
                Status = 4;
                Message = "error: " + ex;
                await LogUtilAsync.LogErrorAsync(ex.ToString(), sql.ToString(), errorContext);
                return false;
            }
        }

        // ============================================================
        // REMEMBER LOGIN
        // ============================================================

        public async Task<bool> VerifyRememberLogin(Guid rememberMeToken, string merchantId)
        {
            Status = 0;
            Message = null;
            var errorContext = ErrorLogContext.GetErrorContext();

            try
            {
                using (var db = new Sandbox_BasedEntities())
                {
                    // =================================================
                    // FIND REMEMBER TOKEN
                    // =================================================

                    var tokenRecord = await db.tbl_RememberMeToken.FirstOrDefaultAsync(x => x.Token == rememberMeToken && x.IsRevoked == false && x.ExpiryDate > DateTime.Now);
                    if (tokenRecord == null)
                    {
                        Status = 4;
                        Message = "Invalid or expired remember me token.";
                        return false;
                    }

                    // =================================================
                    // VERIFY MEMBER ACCOUNT
                    // =================================================

                    var member =
                        await (
                            from m in db.tbl_MemberInfo
                            join l in db.tbl_Login on m.RowID equals l.MemberID
                            join r in db.tbl_Reference on m.RowID equals r.MemberID
                            where
                                m.RowID == tokenRecord.MemberID &&
                                r.MerchantID == merchantId &&
                                l.LoginStatus == true
                            select new
                            {
                                MemberID = m.RowID
                            }
                        ).FirstOrDefaultAsync();

                    if (member == null)
                    {
                        tokenRecord.IsRevoked = true;
                        await db.SaveChangesAsync();
                        Status = 4;
                        Message = "Member account not found.";
                        return false;
                    }

                    // =================================================
                    // LOAD COMMON USER PROFILE
                    // =================================================

                    bool isProfileLoaded = await LoadUserProfileAsync(db, member.MemberID, merchantId);
                    if (!isProfileLoaded)
                    {
                        tokenRecord.IsRevoked = true;
                        await db.SaveChangesAsync();
                        return false;
                    }

                    // =================================================
                    // ROTATE REMEMBER TOKEN
                    // =================================================

                    await RotateRememberMeTokenAsync(db, tokenRecord);
                    Status = 0;
                    Message = "Success";
                    return true;
                }
            }
            catch (Exception ex)
            {
                Status = 4;
                Message = "error: " + ex;
                await LogUtilAsync.LogErrorAsync(ex.ToString(), string.Empty, errorContext);
                return false;
            }
        }

        // ============================================================
        // COMMON USER PROFILE LOADER
        // ============================================================

        private async Task<bool> LoadUserProfileAsync(Sandbox_BasedEntities db, long memberId, string merchantId)
        {
            string mediaUrl = AppSettingsHelper.MediaUrl;

            // ========================================================
            // LOAD MEMBER + LOGIN + CONTROL + COUNTRY
            // ========================================================

            var user =
                await (
                    from m in db.tbl_MemberInfo
                    join l in db.tbl_Login on m.RowID equals l.MemberID
                    join t in db.tbl_MemberControl on m.RowID equals t.MemberID
                    join r in db.tbl_Reference on m.RowID equals r.MemberID
                    join c in db.tbl_Country on m.Country_Domain equals c.Country_Domain into countryGroup
                    from co in countryGroup.DefaultIfEmpty()
                    where
                        m.RowID == memberId &&
                        m.IsDeleted == false &&
                        r.MerchantID == merchantId &&
                        l.LoginStatus == true
                    select new
                    {
                        Member = m,
                        Login = l,
                        Control = t,
                        Reference = r,
                        Country = co
                    }
                ).FirstOrDefaultAsync();

            if (user == null)
            {
                Status = 4;
                Message = "Member account not found.";
                return false;
            }

            // ========================================================
            // BASIC USER INFORMATION
            // ========================================================

            UserId = user.Member.RowID;
            DisplayName = user.Member.displayName;
            UserName = user.Member.Username;
            Name = user.Member.Fullname;
            Email = user.Member.Email;
            MerchantID = user.Reference.MerchantID;
            Country = user.Member.Country;
            Role = user.Login.LoginRole;

            // ========================================================
            // DATE
            // ========================================================

            JoinDate = user.Member.CreatedAt.HasValue ? user.Member.CreatedAt.Value : DateTime.Now;
            LastLogin = user.Login.LastTimeLogin ?? DateTime.Now;

            // ========================================================
            // COUNTRY DOMAIN
            // ========================================================

            Country_Domain = user.Country != null ? user.Country.Country_Domain : user.Member.Country_Domain;

            // ========================================================
            // COMMISSION PERMISSION
            // ========================================================

            CommissionAccess = new CommissionPermission
            {
                AllowOverridingComm = user.Control.AllowTrustOverridingCommission
            };

            // ========================================================
            // REDIRECT
            // ========================================================

            Redirects = new RedirectRecords
            {
                ChangeLoginPassword = user.Control.ChangePass == 1,
                ChangeProfile = user.Control.ChangeProfile == 1
            };

            // ========================================================
            // ACCESS
            // ========================================================

            Access = new AccessPermission
            {
                TrustAccess = user.Control.TrustAccess == 1,
                WillAccess = user.Control.WillAccess == 1
            };

            // ========================================================
            // ROLE
            // ========================================================

            RoleName = null;

            var role = await db.tbl_Role.FirstOrDefaultAsync(x => x.MerchantID == MerchantID && x.RoleCode == Role);
            if (role != null)
            {
                RoleName = role.RoleName;
            }

            // ========================================================
            // REFERENCE / RANKING
            // ========================================================

            Ranking = 0;
            RankName = null;
            ReferralCode = null;

            var reference = await db.tbl_Reference.FirstOrDefaultAsync(x => x.MerchantID == MerchantID && x.MemberID == UserId);
            if (reference != null)
            {
                Ranking = reference.AdvanceRanking > reference.Ranking
                    ? reference.AdvanceRanking
                    : reference.Ranking;
                ReferralCode = reference.ReferralCode;
            }

            // ========================================================
            // RANK NAME
            // ========================================================

            if (Ranking > 0)
            {
                var ranking = await db.tbl_AgentRank.FirstOrDefaultAsync(x => x.MerchantID == MerchantID && x.Ranking == Ranking);
                if (ranking != null)
                {
                    RankName = ranking.RankName;
                }
            }

            // ========================================================
            // SPONSOR
            // ========================================================

            SponsorID = 0;
            SponsorName = null;

            var sponsor = await db.tbl_MemberUnit_Trust.FirstOrDefaultAsync(x => x.memberID == UserId);
            if (sponsor != null)
            {
                long sponsorId = Convert.ToInt64(sponsor.unitSponsor);
                if (sponsorId > 0)
                {
                    SponsorID = sponsorId;
                    var sponsorInfo = await db.tbl_MemberInfo.FirstOrDefaultAsync(x => x.RowID == sponsorId);
                    if (sponsorInfo != null)
                    {
                        SponsorName = sponsorInfo.Fullname;
                    }
                }
            }

            // ========================================================
            // AVATAR
            // ========================================================

            var avatar = await db.tbl_MemberInfo_Avatar.FirstOrDefaultAsync(x => x.MemberID == UserId && x.Status == 0);
            if (avatar != null)
            {
                AvatarUrl = mediaUrl + CommonUtil.TrimMediaPath(avatar.Avatar);
            }
            else
            {
                AvatarUrl = mediaUrl + "/assets/images/avatar.png";
            }

            return true;
        }


        // ============================================================
        // NORMAL LOGIN REMEMBER TOKEN
        // ============================================================

        private async Task CreateRememberMeTokenAsync(Sandbox_BasedEntities db, bool rememberMe)
        {
            // ========================================================
            // REVOKE EXISTING REMEMBER TOKENS
            // ========================================================

            var oldTokens = await db.tbl_RememberMeToken.Where(x => x.MemberID == UserId && x.IsRevoked == false).ToListAsync();
            foreach (var oldToken in oldTokens)
            {
                oldToken.IsRevoked = true;
            }

            RememberMeToken = null;


            // ========================================================
            // CREATE NEW REMEMBER TOKEN
            // ========================================================

            if (rememberMe)
            {
                RememberMeToken = Guid.NewGuid();
                db.tbl_RememberMeToken.Add(new tbl_RememberMeToken
                    {
                        MemberID = UserId,
                        Token = RememberMeToken.Value,
                        CreatedDate = DateTime.Now,
                        ExpiryDate = DateTime.Now.AddDays(30),
                        IsRevoked = false
                    }
                );
            }

            if (oldTokens.Count > 0 || rememberMe)
            {
                await db.SaveChangesAsync();
            }
        }


        // ============================================================
        // REMEMBER LOGIN TOKEN ROTATION
        // ============================================================

        private async Task RotateRememberMeTokenAsync(Sandbox_BasedEntities db, tbl_RememberMeToken tokenRecord)
        {
            RememberMeToken = Guid.NewGuid();
            tokenRecord.Token = RememberMeToken.Value;
            tokenRecord.LastUsedDate = DateTime.Now;
            tokenRecord.ExpiryDate =  DateTime.Now.AddDays(30);
            await db.SaveChangesAsync();
        }
    }

    // ================================================================
    // REDIRECT RECORD
    // ================================================================

    [Serializable]
    public class RedirectRecords
    {
        public bool ChangeLoginPassword { get; set; }
        public bool ChangeProfile { get; set; }
    }

    // ================================================================
    // ACCESS PERMISSION
    // ================================================================

    [Serializable]
    public class AccessPermission
    {
        public bool TrustAccess { get; set; }
        public bool WillAccess { get; set; }
    }

    // ================================================================
    // COMMISSION PERMISSION
    // ================================================================

    [Serializable]
    public class CommissionPermission
    {
        public bool AllowOverridingComm { get; set; }
    }
}