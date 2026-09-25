using API_CPX.Class.Helper;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Model
{
    public class ProfileAsync : Base
    {
        public string MerchantID { get; set; }
        public long UserID { get; set; }
        public string DateOfBirth { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string Fullname { get; set; }
        public string Displayname { get; set; }
        public string CountryMobileCode { get; set; }
        public string Mobile { get; set; }
        public string Postcode { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string State_Name { get; set; }
        public string Address_1 { get; set; }
        public string Address_2 { get; set; }
        public string Country { get; set; }
        public string Country_Domain { get; set; }
        public string ReferralID { get; set; }
        public string AvatarUrl { get; set; }
        public string Occupation { get; set; }
        public string TinNumber { get; set; }
        public string LastChangePasswordDate { get; set; }
        public int TotalReferrals { get; set; }
        public string BankName { get; set; }
        public string BankNameDetail { get; set; }
        public string AccountName { get; set; }
        public string AccountNumber { get; set; }
        public string SwiftCode { get; set; }
        public string IdentityType { get; set; }
        public string IdentityID { get; set; }
        public IntroducerItem Introducer { get; set; }
        public IEnumerable<ActivityList> Activities { get; set; }
        public bool LoginStatus { get; set; }
        public long CreatedBy { get; set; }
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }
        public class ActivityList
        {
            public Guid RequestID { get; set; }
            public string Description { get; set; }
            public string ActionName { get; set; }
            public string ActivityTitle { get; set; }
            public string ActivityDate { get; set; }
            public bool IsSuccess { get; set; }
        }
        public class KycDocumentInfo
        {
            public string FileUrl { get; set; }
        }
        public KycDocumentInfo IcFront { get; set; }
        public KycDocumentInfo IcBack { get; set; }
        public KycDocumentInfo Passport { get; set; }
        public KycDocumentInfo SsmCertificate { get; set; }
        public string IdentityFrontPublicID { get; set; }
        public string IdentityBackPublicID { get; set; }
        public string PassportPublicID { get; set; }
        public string SSMPublicID { get; set; }
        public class IntroducerItem
        {
            public long UserID { get; set; }
            public string Username { get; set; }
            public string Fullname { get; set; }
        }
        public string OTP { get; set; }
        public class ReferralCodeInfo
        {
            public string TheTrust { get; set; }
            public string TheWill { get; set; }
        }
        public bool AllowTrustOverridingCommission { get; set; }
        public ReferralCodeInfo ReferralCode { get; set; }

        public async Task<ProfileAsync> GetProfile()
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                string MediaUrls = AppSettingsHelper.MediaUrl;

                var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.AccType == "REAL");
                if (memInfo == null)
                {
                    return new ProfileAsync
                    {
                        Status = 4,
                        Message = "Err : Account record not found!"
                    };
                }

                var reference = await dbR.tbl_Reference.FirstOrDefaultAsync(x => x.MerchantID == MerchantID && x.MemberID == UserID);
                if (reference == null)
                {
                    return new ProfileAsync
                    {
                        Status = 4,
                        Message = "Err : Account is not registered under this merchant."
                    };
                }

                var control = await dbR.tbl_MemberControl.FirstOrDefaultAsync(x => x.MemberID == UserID);
                if (control == null)
                {
                    return new ProfileAsync
                    {
                        Status = 4,
                        Message = "Err : Account control record not found!"
                    };
                }

                var trustReference = await dbR.tbl_Reference.FirstOrDefaultAsync(a => a.MemberID == UserID && a.Type == "V");
                var willReference = await dbR.tbl_Reference.FirstOrDefaultAsync(a => a.MemberID == UserID && a.Type == "W");

                ReferralCode = new ReferralCodeInfo
                {
                    TheTrust = trustReference?.ReferralCode,
                    TheWill = willReference?.ReferralCode
                };

                ReferralID = trustReference?.ReferralCode;

                var userBank = await dbR.tbl_MemberInfo_Bank.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.MemberID == UserID && a.IsDeleted == 0);
                if (userBank != null)
                {
                    var bankInfo = await dbR.tbl_Master_BankList.FirstOrDefaultAsync(a => a.BankName == userBank.BankName);
                    if (bankInfo != null)
                    {
                        BankName = bankInfo.BankName;
                        BankNameDetail = bankInfo.BankNameDetail;
                    }
                    AccountName = userBank.AccountName;
                    AccountNumber = userBank.AccountNumber;
                    SwiftCode = userBank.SwiftCode;
                }

                var sponsor = await dbR.tbl_MemberUnit_Trust.FirstOrDefaultAsync(a => a.memberID == UserID);
                if (sponsor != null)
                {
                    long SponsorID = (long)sponsor.unitSponsor;
                    var sponsorInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == SponsorID);
                    if (sponsorInfo != null)
                    {
                        Introducer = new IntroducerItem
                        {
                            UserID = SponsorID,
                            Username = sponsorInfo.Username,
                            Fullname = sponsorInfo.Fullname
                        };
                    }
                }

                var avatar = await dbR.tbl_MemberInfo_Avatar.FirstOrDefaultAsync(a => a.MemberID == UserID && a.Status == 0);
                if (avatar != null)
                {
                    AvatarUrl = MediaUrls + CommonUtil.TrimMediaPath(avatar.Avatar);
                }
                else
                {
                    AvatarUrl = MediaUrls + "/assets/images/sample-avatar.svg";
                }

                var kycRecords = await dbR.tbl_MemberInfo_KYC
                    .Where(a => a.MemberID == UserID && a.Status == 0)
                    .OrderByDescending(a => a.RowID)
                    .ToListAsync();

                var icFront = kycRecords.FirstOrDefault(a => a.DocumentType == "NRIC_FRONT");
                var icBack = kycRecords.FirstOrDefault(a => a.DocumentType == "NRIC_BACK");
                var passport = kycRecords.FirstOrDefault(a => a.DocumentType == "PASSPORT");
                var ssmCertificate = kycRecords.FirstOrDefault(a => a.DocumentType == "SSM_CERT");

                var passChanged = await dbR.tbl_log_ChangePassword.Where(a => a.MemberID == UserID && a.ChangeType == "PASSWORD").OrderByDescending(a => a.RowID).FirstOrDefaultAsync();
                int totalReferral = await dbR.tbl_MemberUnit_Trust.Where(a => a.unitSponsor == UserID).CountAsync();
                string userIDString = UserID.ToString();

                var activityRecords = await dbR.tbl_ApiRequestLog
                    .Where(a => a.UserID == userIDString && a.MerchantID == MerchantID && a.Description != null && a.Description != "")
                    .OrderByDescending(a => a.RequestTime)
                    .Take(10)
                    .ToListAsync();

                var activities = activityRecords
                    .Select(a => new ActivityList
                    {
                        RequestID = a.RequestID,
                        Description = a.Description,
                        ActionName = a.ActionName,
                        ActivityTitle = a.ActivityTitle,
                        ActivityDate = a.RequestTime.ToString("dd MMM yyyy · hh:mm tt"),
                        IsSuccess = a.IsSuccess ?? false
                    })
                    .ToList();

                return new ProfileAsync
                {
                    ReferralID = ReferralID,
                    ReferralCode = ReferralCode,
                    AvatarUrl = AvatarUrl,
                    CountryMobileCode = memInfo.CountryMobileCode,
                    Email = memInfo.Email,
                    Mobile = memInfo.Mobile,
                    Fullname = memInfo.Fullname,
                    Displayname = memInfo.displayName,
                    DateOfBirth = memInfo.DOB?.ToString("yyyy-MM-dd"),
                    IdentityType = memInfo.IC_Type,
                    IdentityID = memInfo.IC,
                    Country = memInfo.Country,
                    Country_Domain = memInfo.Country_Domain,
                    Postcode = memInfo.Postcode,
                    City = memInfo.City,
                    State = memInfo.State,
                    Address_1 = memInfo.Address_1,
                    Address_2 = memInfo.Address_2,
                    Occupation = memInfo.Occupation,
                    TinNumber = memInfo.TinNumber,
                    AllowTrustOverridingCommission = control.AllowTrustOverridingCommission,
                    LastChangePasswordDate = passChanged?.CreatedAt.ToString("yyyy-MM-dd hh:mm tt"),
                    TotalReferrals = totalReferral,
                    BankName = BankName,
                    BankNameDetail = BankNameDetail,
                    AccountName = AccountName,
                    AccountNumber = AccountNumber,
                    SwiftCode = SwiftCode,
                    Introducer = Introducer,
                    IcFront = icFront == null ? null : new KycDocumentInfo
                    {
                        FileUrl = icFront.FileUrl
                    },
                    IcBack = icBack == null ? null : new KycDocumentInfo
                    {
                        FileUrl = icBack.FileUrl
                    },
                    Passport = passport == null ? null : new KycDocumentInfo
                    {
                        FileUrl = passport.FileUrl
                    },
                    SsmCertificate = ssmCertificate == null ? null : new KycDocumentInfo
                    {
                        FileUrl = ssmCertificate.FileUrl
                    },
                    Activities = activities
                };
            }
        }

        public async Task<bool> AgentChangeBankInfo()
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            Status = 4;

            tbl_MemberInfo memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
            if (memInfo == null)
            {
                Message = "Err : Invalid user account!";
                return false;
            }

            bool hasMerchantAccess = await dbR.tbl_Reference.AnyAsync(x => x.MemberID == UserID && x.MerchantID == MerchantID);
            if (!hasMerchantAccess)
            {
                Message = "Err : Account is not registered under this merchant.";
                return false;
            }

            // bank name

            if (string.IsNullOrEmpty(BankName))
            {
                Message = "Please select the bank.";
                return false;
            }

            var bankInfo = await dbR.tbl_Master_BankList.FirstOrDefaultAsync(a => a.BankName == BankName);
            if (bankInfo == null)
            {
                Message = "Err : Invalid bank selected.";
                return false;
            }

            // bank account holder name

            if (string.IsNullOrEmpty(AccountName) || AccountName.Length > 100)
            {
                Message = "Please enter the bank account holder name with not more than 100 characters.";
                return false;
            }

            // bank account number

            if (string.IsNullOrEmpty(AccountNumber) || AccountNumber.Length > 50)
            {
                Message = "Please enter the bank account number with not more than 50 characters.";
                return false;
            }

            // process

            using (var transaction = dbR.Database.BeginTransaction())
            {
                try
                {
                    // bank

                    var userBank = await dbR.tbl_MemberInfo_Bank.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.MemberID == UserID && a.IsDeleted == 0);
                    if (userBank == null)
                    {
                        dbR.tbl_MemberInfo_Bank.Add(new tbl_MemberInfo_Bank
                        {
                            MerchantID = MerchantID,
                            MemberID = UserID,
                            BankName = BankName,
                            AccountName = AccountName,
                            AccountNumber = AccountNumber,
                            IsDeleted = 0,
                            CreatedAt = DateTime.Now,
                            CreatedBy = UserID
                        });
                        await dbR.SaveChangesAsync();
                    }
                    else
                    {
                        userBank.BankName = BankName;
                        userBank.AccountName = AccountName;
                        userBank.AccountNumber = AccountNumber;
                        userBank.UpdatedAt = DateTime.Now;
                        userBank.UpdatedBy = UserID;
                        await dbR.SaveChangesAsync();
                    }

                    transaction.Commit();
                    Status = 0;
                    Message = "Success";
                    return true;
                }
                catch (Exception ex)
                {
                    transaction.Rollback();
                    Message = ex.Message.ToString();
                    return false;
                }
            }
        }

        public async Task<bool> AgentChangeProfile()
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            Status = 4;

            tbl_MemberInfo memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
            if (memInfo == null)
            {
                Message = "Err : Invalid user account!";
                return false;
            }

            bool hasMerchantAccess = await dbR.tbl_Reference.AnyAsync(x => x.MemberID == UserID && x.MerchantID == MerchantID);
            if (!hasMerchantAccess)
            {
                Message = "Err : Account is not registered under this merchant.";
                return false;
            }

            // display name

            if (string.IsNullOrEmpty(Displayname))
            {
                Message = "Please enter the nickname.";
                return false;
            }

            if (Displayname.Length > 100)
            {
                Message = "Please enter a nickname with no more than 100 characters.";
                return false;
            }

            // process

            using (var transaction = dbR.Database.BeginTransaction())
            {
                try
                {
                    // profile

                    memInfo.displayName = Displayname;
                    memInfo.UpdatedAt = DateTime.Now;
                    memInfo.UpdatedBy = UserID;
                    await dbR.SaveChangesAsync();

                    transaction.Commit();
                    Status = 0;
                    Message = "Success";
                    return true;
                }
                catch (Exception ex)
                {
                    transaction.Rollback();
                    Message = ex.Message.ToString();
                    return false;
                }
            }
        }

        public async Task<bool> AgentChangeEmail()
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            Status = 4;

            tbl_MemberInfo memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
            if (memInfo == null)
            {
                Message = "Err : Invalid user account!";
                return false;
            }

            bool hasMerchantAccess = await dbR.tbl_Reference.AnyAsync(x => x.MemberID == UserID && x.MerchantID == MerchantID);
            if (!hasMerchantAccess)
            {
                Message = "Err : Account is not registered under this merchant.";
                return false;
            }

            // New Username validate

            if (string.IsNullOrEmpty(Username))
            {
                Message = "Please enter the email address.";
                return false;
            }

            if (!Validation.IsValidEmail(Username))
            {
                Message = "The email address is invalid.";
                return false;
            }

            if (string.Equals(memInfo.Email?.Trim(), Username?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                Message = "Please enter a different email address.";
                return false;
            }

            if (await dbR.tbl_MemberInfo.Where(a => a.RowID != UserID && a.Username.Equals(Username, StringComparison.CurrentCultureIgnoreCase)).CountAsync() > 0)
            {
                Message = "This email address has been registered. Please try another.";
                return false;
            }

            // OTP validate

            OneTimePassword OneTimePassword = new OneTimePassword();
            OneTimePassword.OTP = OTP;
            OneTimePassword.MemberID = UserID;
            OneTimePassword.ActionType = "TRUST_CHANGE_EMAIL";
            OneTimePassword.ReceiverAddress = Username;
            OneTimePassword.OTP_SentMethod = "OTP_MAIL";
            string verificationresult = await OneTimePassword.IsValidOTPAsync();

            if (verificationresult != ProjectProperties.Return_Success)
            {
                Message = verificationresult;
                return false;
            }

            // process

            return true;
        }

        public async Task<bool> Obsolete_AgentChangeProfile()
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            Status = 4;
            string _BirthdayDate;

            tbl_MemberInfo memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
            if (memInfo == null)
            {
                Message = "Err : Invalid user account!";
                return false;
            }

            bool hasMerchantAccess = await dbR.tbl_Reference.AnyAsync(x => x.MemberID == UserID && x.MerchantID == MerchantID);
            if (!hasMerchantAccess)
            {
                Message = "Err : Account is not registered under this merchant.";
                return false;
            }

            tbl_MemberControl memControl = await dbR.tbl_MemberControl.FirstOrDefaultAsync(a => a.MemberID == UserID);
            if (memControl == null)
            {
                Message = "Err : Account control record not found!";
                return false;
            }

            // date of birth

            if (string.IsNullOrEmpty(DateOfBirth))
            {
                Message = "Please enter your date of birth.";
                return false;
            }

            if (!Validation.isDateTime(DateOfBirth, "yyyy-MM-dd", "yyyy-MM-dd", out _BirthdayDate))
            {
                Message = "Please enter a valid date of birth.";
                return false;
            }

            string BirthdayDate = Convert.ToDateTime(_BirthdayDate).ToString("yyyy-MM-dd HH:mm:ss");
            DateTime dob = Convert.ToDateTime(_BirthdayDate);

            // DOB cannot be future date
            if (dob.Date > DateTime.Today)
            {
                Message = "Invalid date of birth.";
                return false;
            }

            // Must be at least 18 years old
            DateTime minimumDob = DateTime.Today.AddYears(-18);

            if (dob.Date > minimumDob)
            {
                Message = "You must be at least 18 years old.";
                return false;
            }

            // mobile

            if (string.IsNullOrEmpty(CountryMobileCode) || CountryMobileCode == "0")
            {
                Message = "Please select a valid country mobile code.";
                return false;
            }

            if (string.IsNullOrEmpty(Mobile))
            {
                Message = "Please enter a valid mobile number.";
                return false;
            }

            string MobileCountryDomain = string.Empty;

            if (!int.TryParse(CountryMobileCode, out int _CountryMobileCode))
            {
                Message = "Please select a valid country mobile code.";
                return false;
            }

            tbl_Country mobileCountry = await dbR.tbl_Country.FirstOrDefaultAsync(a => a.Country_MobileCode == _CountryMobileCode);
            if (mobileCountry == null)
            {
                Message = "Err : Invalid country mobile code!";
                return false;
            }

            if (!Validation.IsValidPhone(CountryMobileCode + Mobile))
            {
                Message = "Please enter a valid mobile number.";
                return false;
            }

            if (_CountryMobileCode == 60)
            {
                if (!Validation.IsValidMalayisaPhone(CountryMobileCode.ToString() + Mobile.ToString()))
                {
                    Message = "Please enter a valid Malaysian mobile number";
                    return false;
                }
            }

            // Country

            if (string.IsNullOrEmpty(Country_Domain) || Country_Domain == "0")
            {
                Message = "Please select a valid country of residence.";
                return false;
            }

            tbl_Country residentCountry = dbR.tbl_Country.Where(a => a.Country_Domain == Country_Domain).FirstOrDefault();
            if (residentCountry == null)
            {
                Message = "Err : Invalid resident country selected!";
                return false;
            }

            string ResidentCountry = residentCountry.Country_Name;

            // postcode

            if (string.IsNullOrEmpty(Postcode))
            {
                Message = "Please enter the postcode.";
                return false;
            }

            if (Postcode.Length > 50)
            {
                Message = "Please enter a valid postcode with no more than 50 characters.";
                return false;
            }

            // city

            if (string.IsNullOrEmpty(City))
            {
                Message = "Please enter the city.";
                return false;
            }

            if (City.Length > 100)
            {
                Message = "Please enter a valid city with no more than 100 characters.";
                return false;
            }

            // state

            if (string.IsNullOrEmpty(State))
            {
                Message = "Please enter the state.";
                return false;
            }

            if (State.Length > 100)
            {
                Message = "Please enter a valid state with no more than 100 characters.";
                return false;
            }

            // address

            if (string.IsNullOrEmpty(Address_1))
            {
                Message = "Please enter the address 1.";
                return false;
            }

            if (Address_1.Length > 300)
            {
                Message = "Please enter Address 1 with no more than 300 characters.";
                return false;
            }

            if (string.IsNullOrEmpty(Address_2))
            {
                Message = "Please enter the address 2.";
                return false;
            }

            if (Address_2.Length > 300)
            {
                Message = "Please enter Address 2 with no more than 300 characters.";
                return false;
            }

            // tin number validate

            if (string.IsNullOrEmpty(TinNumber))
            {
                Message = "Please enter the TIN number.";
                return false;
            }

            if (TinNumber.Length > 50)
            {
                Message = "Please enter the TIN number with not more than 50 characters.";
                return false;
            }

            // occupation validate

            if (string.IsNullOrEmpty(Occupation))
            {
                Message = "Please enter the occupation.";
                return false;
            }

            if (Occupation.Length > 150)
            {
                Message = "Please enter the occupation with not more than 150 characters.";
                return false;
            }

            // bank name

            if (string.IsNullOrEmpty(BankName))
            {
                Message = "Please select the bank.";
                return false;
            }

            var bankInfo = await dbR.tbl_Master_BankList.FirstOrDefaultAsync(a => a.BankName == BankName);
            if (bankInfo == null)
            {
                Message = "Err : Invalid bank selected.";
                return false;
            }

            // bank account holder name

            if (string.IsNullOrEmpty(AccountName) || AccountName.Length > 100)
            {
                Message = "Please enter the bank account holder name with not more than 100 characters.";
                return false;
            }

            // bank account number

            if (string.IsNullOrEmpty(AccountNumber) || AccountNumber.Length > 50)
            {
                Message = "Please enter the bank account number with not more than 50 characters.";
                return false;
            }

            // process

            using (var transaction = dbR.Database.BeginTransaction())
            {
                try
                {
                    // profile

                    memInfo.CountryMobileCode = CountryMobileCode;
                    memInfo.Mobile = Mobile;
                    memInfo.DOB = Convert.ToDateTime(DateOfBirth);
                    memInfo.Postcode = Postcode;
                    memInfo.City = City;
                    memInfo.State = State;
                    memInfo.Address_1 = Address_1;
                    memInfo.Address_2 = Address_2;
                    memInfo.Country = ResidentCountry;
                    memInfo.Country_Domain = Country_Domain;
                    memInfo.Occupation = Occupation;
                    memInfo.TinNumber = TinNumber;
                    memInfo.UpdatedAt = DateTime.Now;
                    memInfo.UpdatedBy = UserID;
                    await dbR.SaveChangesAsync();

                    // bank

                    var userBank = await dbR.tbl_MemberInfo_Bank.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.MemberID == UserID && a.IsDeleted == 0);
                    if (userBank == null)
                    {
                        dbR.tbl_MemberInfo_Bank.Add(new tbl_MemberInfo_Bank
                        {
                            MerchantID = MerchantID,
                            MemberID = UserID,
                            BankName = BankName,
                            AccountName = AccountName,
                            AccountNumber = AccountNumber,
                            IsDeleted = 0,
                            CreatedAt = DateTime.Now,
                            CreatedBy = UserID
                        });
                        await dbR.SaveChangesAsync();
                    }
                    else
                    {
                        userBank.BankName = BankName;
                        userBank.AccountName = AccountName;
                        userBank.AccountNumber = AccountNumber;
                        userBank.UpdatedAt = DateTime.Now;
                        userBank.UpdatedBy = UserID;
                        await dbR.SaveChangesAsync();
                    }

                    transaction.Commit();
                    Status = 0;
                    Message = "Success";
                    return true;
                }
                catch (Exception ex)
                {
                    transaction.Rollback();
                    Message = ex.Message.ToString();
                    return false;
                }
            }
        }
    }
}