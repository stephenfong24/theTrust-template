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
    public class AgentManagementAsync : Base
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
        public IEnumerable<AgentList> AgentLists { get; set; }
        public class ActivityList
        {
            public Guid RequestID { get; set; }
            public string Description { get; set; }
            public string ActionName { get; set; }
            public string ActityTitle { get; set; }
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

        public async Task<bool> AdminChangeAgentProfile()
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            Status = 4;

            tbl_MemberInfo memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
            if (memInfo == null)
            {
                Message = "Err : Invalid user account!";
                return false;
            }

            var reference = await dbR.tbl_Reference.FirstOrDefaultAsync(x => x.MemberID == UserID && x.MerchantID == MerchantID);
            if (reference == null)
            {
                Message = "Err : Agent is not registered under this merchant.";
                return false;
            }

            var login = await dbR.tbl_Login.FirstOrDefaultAsync(a => a.MemberID == UserID);
            if (login == null)
            {
                Message = "Err : Invalid user account login record!";
                return false;
            }

            tbl_MemberControl memControl = await dbR.tbl_MemberControl.FirstOrDefaultAsync(a => a.MemberID == UserID);
            if (memControl == null)
            {
                Message = "Err : Account control record not found!";
                return false;
            }

            // username

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

            if (await dbR.tbl_MemberInfo.Where(a => a.RowID != UserID && a.Username.Equals(Username, StringComparison.CurrentCultureIgnoreCase)).CountAsync() > 0)
            {
                Message = "This email address has been registered. Please try another.";
                return false;
            }

            // display name

            if (string.IsNullOrEmpty(Displayname))
            {
                Message = "Please enter your nickname.";
                return false;
            }

            if (Displayname.Length > 100)
            {
                Message = "Please enter your nickname with not more than 100 characters.";
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

            // process

            using (var transaction = dbR.Database.BeginTransaction())
            {
                try
                {
                    // profile

                    memInfo.Username = Username.ToLower();
                    memInfo.Email = Username.ToLower();
                    memInfo.displayName = Displayname;
                    memInfo.CountryMobileCode = CountryMobileCode;
                    memInfo.Mobile = Mobile;
                    memInfo.Postcode = Postcode;
                    memInfo.City = City;
                    memInfo.State = State;
                    memInfo.Address_1 = Address_1;
                    memInfo.Address_2 = Address_2;
                    memInfo.Country = ResidentCountry;
                    memInfo.Country_Domain = Country_Domain;
                    memInfo.UpdatedAt = DateTime.Now;
                    memInfo.UpdatedBy = CreatedBy;
                    await dbR.SaveChangesAsync();

                    // login

                    login.LoginStatus = LoginStatus;
                    await dbR.SaveChangesAsync();

                    // login false then remove all token

                    if (LoginStatus == false)
                    {
                        var tokens = await dbR.tbl_AppToken.Where(a => a.MemberID == UserID).ToListAsync();
                        if (tokens.Any())
                        {
                            dbR.tbl_AppToken.RemoveRange(tokens);
                            await dbR.SaveChangesAsync();
                        }
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

        public async Task<bool> AdminChangeAgentBank()
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            Status = 4;

            tbl_MemberInfo memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
            if (memInfo == null)
            {
                Message = "Err : Invalid user account!";
                return false;
            }

            var reference = await dbR.tbl_Reference.FirstOrDefaultAsync(x => x.MemberID == UserID && x.MerchantID == MerchantID);
            if (reference == null)
            {
                Message = "Err : Agent is not registered under this merchant.";
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
                            CreatedBy = CreatedBy
                        });
                        await dbR.SaveChangesAsync();
                    }
                    else
                    {
                        userBank.BankName = BankName;
                        userBank.AccountName = AccountName;
                        userBank.AccountNumber = AccountNumber;
                        userBank.UpdatedAt = DateTime.Now;
                        userBank.UpdatedBy = CreatedBy;
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

        public async Task<bool> AdminChangeAgentIdentity()
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            DateTime now = DateTime.Now;
            Status = 4;
            string mediaUrls = AppSettingsHelper.MediaUrl;
            string IdentityFrontFileUrl = string.Empty;
            string IdentityFrontUploadedFile = string.Empty;
            string IdentityBackFileUrl = string.Empty;
            string IdentityBackUploadedFile = string.Empty;
            string PassportFileUrl = string.Empty;
            string PassportUploadedFile = string.Empty;
            string SSMFileUrl = string.Empty;
            string SSMUploadedFile = string.Empty;
            string _BirthdayDate;

            // account

            var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
            if (memInfo == null)
            {
                Message = "Err : Invalid user account!";
                return false;
            }

            string OldIdentityType = memInfo.IC_Type;

            var reference = await dbR.tbl_Reference.FirstOrDefaultAsync(x => x.MemberID == UserID && x.MerchantID == MerchantID);
            if (reference == null)
            {
                Message = "Err : Agent is not registered under this merchant.";
                return false;
            }

            // full name

            if (string.IsNullOrEmpty(Fullname))
            {
                Message = "Please enter your full name.";
                return false;
            }

            if (Fullname.Length > 100)
            {
                Message = "Please enter your full name with not more than 100 characters.";
                return false;
            }

            // identity type

            if (IdentityType != "NRIC" && IdentityType != "PASSPORT" && IdentityType != "SSM")
            {
                Message = "Invalid identity type.";
                return false;
            }

            // identity id

            if (string.IsNullOrWhiteSpace(IdentityID))
            {
                switch (IdentityType)
                {
                    case "NRIC":
                        Message = "Please enter your NRIC number.";
                        return false;
                    case "PASSPORT":
                        Message = "Please enter your passport number.";
                        return false;
                    case "SSM":
                        Message = "Please enter your SSM registration number.";
                        return false;
                }
            }

            // =============================================================
            // 4. Date Of Birth
            // =============================================================

            if (string.IsNullOrEmpty(DateOfBirth))
            {
                switch (IdentityType)
                {
                    case "NRIC":
                        Message = "Please enter your date of birth.";
                        return false;

                    case "PASSPORT":
                        Message = "Please enter your date of birth.";
                        return false;
                    case "SSM":
                        Message = "Please enter your company incorporation date.";
                        return false;
                }
            }

            if (!Validation.isDateTime(DateOfBirth, "yyyy-MM-dd", "yyyy-MM-dd", out _BirthdayDate))
            {
                switch (IdentityType)
                {
                    case "NRIC":
                        Message = "Please enter a valid date of birth.";
                        return false;
                    case "PASSPORT":
                        Message = "Please enter a valid date of birth.";
                        return false;
                    case "SSM":
                        Message = "Please enter a valid company incorporation date.";
                        return false;
                }
            }

            DateTime dob = Convert.ToDateTime(_BirthdayDate);

            if (dob.Date > DateTime.Today)
            {
                switch (IdentityType)
                {
                    case "NRIC":
                        Message = "Invalid date of birth.";
                        return false;
                    case "PASSPORT":
                        Message = "Invalid date of birth.";
                        return false;
                    case "SSM":
                        Message = "Invalid company incorporation date.";
                        return false;
                }
            }

            if (IdentityType != "SSM")
            {
                // Must be at least 18 years old
                DateTime minimumDob = DateTime.Today.AddYears(-18);

                if (dob.Date > minimumDob)
                {
                    Message = "You must be at least 18 years old.";
                    return false;
                }
            }

            // =============================================================
            // Malaysian NRIC Validation
            // =============================================================

            if (IdentityType == "NRIC")
            {
                string normalizedNric;
                string nricError;

                if (!ValidateMalaysiaNric(IdentityID, dob, out normalizedNric, out nricError))
                {
                    Message = nricError;
                    return false;
                }

                IdentityID = normalizedNric;
            }

            // =============================================================
            // 3. Duplicate Identity Check
            // =============================================================

            bool identityExists = await dbR.tbl_MemberInfo.AnyAsync(a => a.RowID != UserID && a.IC_Type == IdentityType && a.IC == IdentityID && a.IsDeleted == false);
            if (identityExists)
            {
                switch (IdentityType)
                {
                    case "NRIC":
                        Message = "This NRIC number is already registered.";
                        return false;
                    case "PASSPORT":
                        Message = "This passport number is already registered.";
                        return false;
                    case "SSM":
                        Message = "This SSM registration number is already registered.";
                        return false;
                }
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

            if (IdentityType != "SSM")
            {
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
            }
            else
            {
                Occupation = null;
            }

            bool identityTypeChanged = !string.Equals(
                OldIdentityType,
                IdentityType,
                StringComparison.OrdinalIgnoreCase
            );

            if (identityTypeChanged)
            {
                if (IdentityType == "NRIC")
                {
                    if (string.IsNullOrWhiteSpace(IdentityFrontPublicID))
                    {
                        Message = "Please upload the NRIC front image.";
                        return false;
                    }

                    if (string.IsNullOrWhiteSpace(IdentityBackPublicID))
                    {
                        Message = "Please upload the NRIC back image.";
                        return false;
                    }
                }
                else if (IdentityType == "PASSPORT")
                {
                    if (string.IsNullOrWhiteSpace(PassportPublicID))
                    {
                        Message = "Please upload the passport image.";
                        return false;
                    }
                }
                else if (IdentityType == "SSM")
                {
                    if (string.IsNullOrWhiteSpace(SSMPublicID))
                    {
                        Message = "Please upload the SSM certificate.";
                        return false;
                    }
                }
            }

            // uploaded kyc document

            if (IdentityType == "NRIC")
            {
                // ---------------------------------------------------------
                // NRIC Front Reference
                // ---------------------------------------------------------

                Guid frontPublicId;
                Guid backPublicId;

                if (!string.IsNullOrWhiteSpace(IdentityFrontPublicID))
                {
                    if (!Guid.TryParse(IdentityFrontPublicID.Trim(), out frontPublicId))
                    {
                        Message = "Invalid NRIC front document reference.";
                        return false;
                    }

                    // ---------------------------------------------------------
                    // Validate NRIC Front Upload
                    // ---------------------------------------------------------

                    var front = await dbR.tbl_log_FileUpload.FirstOrDefaultAsync(a => a.PublicID == frontPublicId && a.Status == 0 && a.ExpiredAt > now);
                    if (front == null)
                    {
                        Message = "The NRIC front image is invalid or has expired. Please upload it again.";
                        return false;
                    }
                    else
                    {
                        IdentityFrontFileUrl = mediaUrls + CommonUtil.TrimMediaPath(front.UploadedFile);
                        IdentityFrontUploadedFile = front.UploadedFile;
                    }
                }

                // ---------------------------------------------------------
                // NRIC Back Reference
                // ---------------------------------------------------------

                if (!string.IsNullOrWhiteSpace(IdentityBackPublicID))
                {
                    if (!Guid.TryParse(IdentityBackPublicID.Trim(), out backPublicId))
                    {
                        Message = "Invalid NRIC back document reference.";
                        return false;
                    }

                    // ---------------------------------------------------------
                    // Validate NRIC Back Upload
                    // ---------------------------------------------------------

                    var back = await dbR.tbl_log_FileUpload.FirstOrDefaultAsync(a => a.PublicID == backPublicId && a.Status == 0 && a.ExpiredAt > now);
                    if (back == null)
                    {
                        Message = "The NRIC back image is invalid or has expired. Please upload it again.";
                        return false;
                    }
                    else
                    {
                        IdentityBackFileUrl = mediaUrls + CommonUtil.TrimMediaPath(back.UploadedFile);
                        IdentityBackUploadedFile = back.UploadedFile;
                    }
                }

                PassportPublicID = null;
                SSMPublicID = null;
            }
            else if (IdentityType == "PASSPORT")
            {
                Guid passportPublicId;

                if (!string.IsNullOrWhiteSpace(PassportPublicID))
                {
                    if (!Guid.TryParse(PassportPublicID.Trim(), out passportPublicId))
                    {
                        Message = "Invalid passport document reference.";
                        return false;
                    }

                    var passport = await dbR.tbl_log_FileUpload.FirstOrDefaultAsync(a => a.PublicID == passportPublicId && a.Status == 0 && a.ExpiredAt > now);
                    if (passport == null)
                    {
                        Message = "The passport image is invalid or has expired. Please upload it again.";
                        return false;
                    }
                    else
                    {
                        PassportFileUrl = mediaUrls + CommonUtil.TrimMediaPath(passport.UploadedFile);
                        PassportUploadedFile = passport.UploadedFile;
                    }
                }

                IdentityFrontPublicID = null;
                IdentityBackPublicID = null;
                SSMPublicID = null;
            }
            else if (IdentityType == "SSM")
            {
                Guid ssmPublicId;

                if (!string.IsNullOrWhiteSpace(SSMPublicID))
                {
                    if (!Guid.TryParse(SSMPublicID.Trim(), out ssmPublicId))
                    {
                        Message = "Invalid SSM document reference.";
                        return false;
                    }

                    var ssm = await dbR.tbl_log_FileUpload.FirstOrDefaultAsync(a => a.PublicID == ssmPublicId && a.Status == 0 && a.ExpiredAt > now);
                    if (ssm == null)
                    {
                        Message = "The SSM certificate is invalid or has expired. Please upload it again.";
                        return false;
                    }
                    else
                    {
                        SSMFileUrl = mediaUrls + CommonUtil.TrimMediaPath(ssm.UploadedFile);
                        SSMUploadedFile = ssm.UploadedFile;
                    }
                }

                IdentityFrontPublicID = null;
                IdentityBackPublicID = null;
                PassportPublicID = null;
            }

            // process

            using (var transaction = dbR.Database.BeginTransaction())
            {
                try
                {
                    memInfo.IC_Type = IdentityType;
                    memInfo.IC = IdentityID;
                    memInfo.Fullname = Fullname;
                    memInfo.DOB = Convert.ToDateTime(DateOfBirth);
                    memInfo.TinNumber = TinNumber;
                    memInfo.Occupation = Occupation;
                    memInfo.UpdatedAt = DateTime.Now;
                    memInfo.UpdatedBy = CreatedBy;
                    await dbR.SaveChangesAsync();

                    if (identityTypeChanged)
                    {
                        var currentKYC = await dbR.tbl_MemberInfo_KYC.Where(a => a.MemberID == UserID && a.Status == 0).ToListAsync();

                        foreach (var kyc in currentKYC)
                        {
                            kyc.Status = 4;
                            kyc.UpdatedAt = DateTime.Now;
                            kyc.UpdatedBy = CreatedBy;
                        }
                        await dbR.SaveChangesAsync();
                    }

                    if (!string.IsNullOrWhiteSpace(IdentityFrontPublicID))
                    {
                        var userFrontIC = await dbR.tbl_MemberInfo_KYC.FirstOrDefaultAsync(a => a.MemberID == UserID && a.DocumentType == "NRIC_FRONT" && a.Status == 0);
                        if (userFrontIC == null)
                        {
                            dbR.tbl_MemberInfo_KYC.Add(new tbl_MemberInfo_KYC
                            {
                                MemberID = UserID,
                                DocumentType = "NRIC_FRONT",
                                FileUrl = IdentityFrontFileUrl,
                                UploadedFile = IdentityFrontUploadedFile,
                                CreatedAt = DateTime.Now,
                                CreatedBy = CreatedBy,
                                Status = 0
                            });
                            await dbR.SaveChangesAsync();
                        }
                        else
                        {
                            userFrontIC.FileUrl = IdentityFrontFileUrl;
                            userFrontIC.UploadedFile = IdentityFrontUploadedFile;
                            userFrontIC.UpdatedAt = DateTime.Now;
                            userFrontIC.UpdatedBy = CreatedBy;
                            await dbR.SaveChangesAsync();
                        }
                    }

                    if (!string.IsNullOrWhiteSpace(IdentityBackPublicID))
                    {
                        var userBackIC = await dbR.tbl_MemberInfo_KYC.FirstOrDefaultAsync(a => a.MemberID == UserID && a.DocumentType == "NRIC_BACK" && a.Status == 0);
                        if (userBackIC == null)
                        {
                            dbR.tbl_MemberInfo_KYC.Add(new tbl_MemberInfo_KYC
                            {
                                MemberID = UserID,
                                DocumentType = "NRIC_BACK",
                                FileUrl = IdentityBackFileUrl,
                                UploadedFile = IdentityBackUploadedFile,
                                CreatedAt = DateTime.Now,
                                CreatedBy = CreatedBy,
                                Status = 0
                            });
                            await dbR.SaveChangesAsync();
                        }
                        else
                        {
                            userBackIC.FileUrl = IdentityBackFileUrl;
                            userBackIC.UploadedFile = IdentityBackUploadedFile;
                            userBackIC.UpdatedAt = DateTime.Now;
                            userBackIC.UpdatedBy = CreatedBy;
                            await dbR.SaveChangesAsync();
                        }
                    }

                    if (!string.IsNullOrWhiteSpace(PassportPublicID))
                    {
                        var userPassport = await dbR.tbl_MemberInfo_KYC.FirstOrDefaultAsync(a => a.MemberID == UserID && a.DocumentType == "PASSPORT" && a.Status == 0);
                        if (userPassport == null)
                        {
                            dbR.tbl_MemberInfo_KYC.Add(new tbl_MemberInfo_KYC
                            {
                                MemberID = UserID,
                                DocumentType = "PASSPORT",
                                FileUrl = PassportFileUrl,
                                UploadedFile = PassportUploadedFile,
                                CreatedAt = DateTime.Now,
                                CreatedBy = CreatedBy,
                                Status = 0
                            });
                            await dbR.SaveChangesAsync();
                        }
                        else
                        {
                            userPassport.FileUrl = PassportFileUrl;
                            userPassport.UploadedFile = PassportUploadedFile;
                            userPassport.UpdatedAt = DateTime.Now;
                            userPassport.UpdatedBy = CreatedBy;
                            await dbR.SaveChangesAsync();
                        }
                    }

                    if (!string.IsNullOrWhiteSpace(SSMPublicID))
                    {
                        var userSsmCert = await dbR.tbl_MemberInfo_KYC.FirstOrDefaultAsync(a => a.MemberID == UserID && a.DocumentType == "SSM_CERT" && a.Status == 0);
                        if (userSsmCert == null)
                        {
                            dbR.tbl_MemberInfo_KYC.Add(new tbl_MemberInfo_KYC
                            {
                                MemberID = UserID,
                                DocumentType = "SSM_CERT",
                                FileUrl = SSMFileUrl,
                                UploadedFile = SSMUploadedFile,
                                CreatedAt = DateTime.Now,
                                CreatedBy = CreatedBy,
                                Status = 0
                            });
                            await dbR.SaveChangesAsync();
                        }
                        else
                        {
                            userSsmCert.FileUrl = SSMFileUrl;
                            userSsmCert.UploadedFile = SSMUploadedFile;
                            userSsmCert.UpdatedAt = DateTime.Now;
                            userSsmCert.UpdatedBy = CreatedBy;
                            await dbR.SaveChangesAsync();
                        }
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

        public async Task<IEnumerable<AgentList>> GetAgentListAsync(string merchantId, int page, int pageSize, string keyword = null, string introducerKeyword = null, int? ranking = null)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                // ============================================================
                // PAGINATION VALIDATION
                // ============================================================

                if (page <= 0)
                    page = 1;

                if (pageSize <= 0)
                    pageSize = 10;

                if (pageSize > 100)
                    pageSize = 100;

                // ============================================================
                // BASE AGENT QUERY
                // ============================================================

                var query =
                    from member in dbR.tbl_MemberInfo
                    join login in dbR.tbl_Login on member.RowID equals login.MemberID
                    join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                    join rank in dbR.tbl_AgentRank
                        on new
                        {
                            MerchantID = reference.MerchantID,
                            Ranking = reference.AdvanceRanking > reference.Ranking ? reference.AdvanceRanking : reference.Ranking
                        }
                        equals new
                        {
                            MerchantID = rank.MerchantID,
                            Ranking = rank.Ranking
                        }
                        into rankJoin
                    from rank in rankJoin.DefaultIfEmpty()
                    where reference.MerchantID == merchantId && member.IsDeleted == false && login.LoginRole == "AG"
                    select new
                    {
                        member.RowID,
                        member.Email,
                        member.Fullname,
                        member.displayName,
                        member.IC_Type,
                        member.IC,
                        member.CreatedAt,
                        LastLogin = login.LastTimeLogin,
                        Ranking = reference.AdvanceRanking > reference.Ranking ? reference.AdvanceRanking : reference.Ranking,
                        RankName = rank != null ? rank.RankName : null
                    };

                if (!string.IsNullOrWhiteSpace(keyword))
                {
                    string search = keyword.Trim();

                    query = query.Where(a =>
                        (a.Fullname != null && a.Fullname.Contains(search))
                        ||
                        (a.Email != null && a.Email.Contains(search))
                        ||
                        (a.IC != null && a.IC.Contains(search))
                    );
                }

                if (!string.IsNullOrWhiteSpace(introducerKeyword))
                {
                    string introducerSearch = introducerKeyword.Trim();

                    var matchingAgentIds =
                        from unit in dbR.tbl_MemberUnit_Trust
                        join introducer in dbR.tbl_MemberInfo on (long)unit.unitSponsor equals introducer.RowID
                        join reference in dbR.tbl_Reference on introducer.RowID equals reference.MemberID
                        where reference.MerchantID == merchantId
                              &&
                              (
                                (introducer.Fullname != null && introducer.Fullname.Contains(introducerSearch))
                                  ||
                                (introducer.Email != null && introducer.Email.Contains(introducerSearch))
                              )
                        select (long)unit.memberID;

                    query = query.Where(a => matchingAgentIds.Contains(a.RowID));
                }

                if (ranking.HasValue)
                {
                    int rankingValue = ranking.Value;
                    query = query.Where(a => a.Ranking == rankingValue);
                }

                // ============================================================
                // TOTAL RECORDS
                // ============================================================

                TotalRecords = await query.CountAsync();
                TotalPages = TotalRecords == 0 ? 0 : (int)Math.Ceiling((decimal)TotalRecords / pageSize);

                // ============================================================
                // SERVER-SIDE PAGINATION
                // ============================================================

                var records = await query.OrderByDescending(a => a.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
                if (records.Count == 0)
                {
                    AgentLists = new List<AgentList>();
                    return AgentLists;
                }

                // ============================================================
                // CURRENT PAGE AGENT IDS
                // ============================================================

                var userIds = records.Select(a => a.RowID).ToList();

                // ============================================================
                // TOTAL DIRECT DOWNLINE
                // ============================================================

                var downlineCounts = await dbR.tbl_MemberUnit_Trust
                    .Where(a => a.unitSponsor.HasValue && userIds.Contains((long)a.unitSponsor.Value))
                    .GroupBy(a => a.unitSponsor.Value)
                    .Select(g => new
                    {
                        SponsorID = (long)g.Key,
                        TotalDownline = g.Count()
                    })
                    .ToListAsync();

                // ============================================================
                // INTRODUCER RELATIONSHIP
                // ============================================================

                var units =
                    await dbR.tbl_MemberUnit_Trust
                        .Where(a => userIds.Contains((long)a.memberID))
                        .Select(a => new
                        {
                            MemberID = (long)a.memberID,
                            SponsorID = a.unitSponsor
                        })
                        .ToListAsync();

                // ============================================================
                // INTRODUCER IDS
                // ============================================================

                var sponsorIds =
                    units
                        .Where(a => a.SponsorID.HasValue && a.SponsorID.Value > 0)
                        .Select(a => (long)a.SponsorID.Value)
                        .Distinct()
                        .ToList();

                // ============================================================
                // INTRODUCER INFORMATION
                // ============================================================

                var sponsors =
                    await (
                        from member in dbR.tbl_MemberInfo
                        join reference in dbR.tbl_Reference on member.RowID equals reference.MemberID
                        where sponsorIds.Contains(member.RowID) && reference.MerchantID == merchantId
                        select new
                        {
                            member.RowID,
                            member.Fullname,
                            member.Email
                        }
                    ).ToListAsync();

                // ============================================================
                // BUILD RESPONSE
                // ============================================================

                AgentLists =
                    records
                        .Select((a, index) =>
                        {
                            var downline = downlineCounts.FirstOrDefault(x => x.SponsorID == a.RowID);
                            int totalDownline = downline != null ? downline.TotalDownline : 0;
                            var unit = units.FirstOrDefault(x => x.MemberID == a.RowID);

                            string introducerName = null;
                            string introducerEmail = null;

                            if (unit != null && unit.SponsorID.HasValue && unit.SponsorID.Value > 0)
                            {
                                long sponsorId = (long)unit.SponsorID.Value;
                                var sponsor = sponsors.FirstOrDefault(x => x.RowID == sponsorId);
                                if (sponsor != null)
                                {
                                    introducerName = sponsor.Fullname;
                                    introducerEmail = sponsor.Email;
                                }
                            }

                            // =================================================
                            // RESPONSE
                            // =================================================

                            return new AgentList
                            {
                                Id = ((page - 1) * pageSize) + index + 1,
                                UserID = a.RowID,
                                Email = a.Email,
                                Fullname = a.Fullname,
                                Displayname = a.displayName,
                                Ranking = a.Ranking,
                                RankName = a.RankName,
                                IdentityType = a.IC_Type,
                                IdentityID = a.IC,
                                IntroducerName = introducerName,
                                IntroducerEmail = introducerEmail,
                                TotalDownline = totalDownline,
                                PersonalSales = 0,
                                CreatedAt = a.CreatedAt.HasValue ? a.CreatedAt.Value.ToString("yyyy-MM-dd HH:mm:ss") : null,
                                LastLogin = a.LastLogin.HasValue ? a.LastLogin.Value.ToString("yyyy-MM-dd HH:mm:ss") : null
                            };
                        })
                        .ToList();

                return AgentLists;
            }
        }

        private bool ValidateMalaysiaNric(string nric, DateTime dateOfBirth, out string normalizedNric, out string errorMessage)
        {
            normalizedNric = null;
            errorMessage = null;

            if (string.IsNullOrWhiteSpace(nric))
            {
                errorMessage = "Please enter your NRIC number.";
                return false;
            }

            // Allow input such as:
            // 810220086044
            // 810220-08-6044
            // 810220 08 6044
            normalizedNric = nric.Trim().Replace("-", "").Replace(" ", "");

            // Malaysian NRIC must contain exactly 12 digits
            if (normalizedNric.Length != 12 || !normalizedNric.All(char.IsDigit))
            {
                errorMessage = "Please enter a valid Malaysian NRIC number.";
                return false;
            }

            // First 6 digits = YYMMDD
            int yy;
            int mm;
            int dd;

            if (!int.TryParse(normalizedNric.Substring(0, 2), out yy) ||
                !int.TryParse(normalizedNric.Substring(2, 2), out mm) ||
                !int.TryParse(normalizedNric.Substring(4, 2), out dd))
            {
                errorMessage = "Please enter a valid Malaysian NRIC number.";
                return false;
            }

            // The NRIC YY must match the supplied DOB year.
            if ((dateOfBirth.Year % 100) != yy)
            {
                errorMessage = "The date of birth does not match the NRIC number.";
                return false;
            }

            DateTime nricDob;

            try
            {
                // Use the supplied DOB's century.
                // Example:
                // NRIC 810220...... + DOB 1981-02-20
                // => 1981-02-20
                nricDob = new DateTime(dateOfBirth.Year, mm, dd);
            }
            catch (ArgumentOutOfRangeException)
            {
                // Handles impossible dates such as:
                // 811332......
                // 810230......
                // 010229...... when year isn't leap year
                errorMessage = "The NRIC number contains an invalid date of birth.";
                return false;
            }

            if (nricDob.Date != dateOfBirth.Date)
            {
                errorMessage = "The date of birth does not match the NRIC number.";
                return false;
            }

            return true;
        }

        public class AgentList
        {
            public long Id { get; set; }
            public long UserID { get; set; }
            public string Email { get; set; }
            public string Fullname { get; set; }
            public string Displayname { get; set; }
            public int? Ranking { get; set; }
            public string RankName { get; set; }
            public string IdentityType { get; set; }
            public string IdentityID { get; set; }
            public string IntroducerName { get; set; }
            public string IntroducerEmail { get; set; }
            public int TotalDownline { get; set; }
            public decimal PersonalSales { get; set; }
            public string CreatedAt { get; set; }
            public string LastLogin { get; set; }
        }
    }
}