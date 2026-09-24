using API_CPX.Class.Helper;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Util;

namespace API_CPX.Class.Model
{
    public class RegisterAsync : Base
    {
        public string MerchantID { get; set; }
        public string RoleCode { get; set; }
        public string Sponsor { get; set; }
        public string CountryMobileCode { get; set; }
        public string Mobile { get; set; }
        public string Username { get; set; }
        public string Fullname { get; set; }
        public string DateOfBirth { get; set; }
        public string IdentityType { get; set; }
        public string IdentityId { get; set; }
        public string Address_1 { get; set; }
        public string Address_2 { get; set; }
        public string Postcode { get; set; }
        public string State { get; set; }
        public string City { get; set; }
        public string Country_Domain { get; set; }
        public string Occupation { get; set; }
        public string TinNumber { get; set; }
        public string LoginPassword { get; set; }
        public string ConfirmLoginPassword { get; set; }
        public string BankName { get; set; }
        public string AccountName { get; set; }
        public string AccountNumber { get; set; }
        public string IdentityFrontPublicID { get; set; }
        public string IdentityBackPublicID { get; set; }
        public string PassportPublicID { get; set; }
        public string SSMPublicID { get; set; }
        public string OTP { get; set; }

        public async Task<string> ValidateAccount()
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                // merchant validate

                string isValidMerchant = await ValidationAsync.isValidMerchant(MerchantID);
                if (isValidMerchant != ProjectProperties.Return_Success)
                {
                    return isValidMerchant;
                }

                // sponsor validate

                if (string.IsNullOrEmpty(Sponsor))
                {
                    return "Err : Referral code is required.";
                }

                tbl_Reference sponsorInfo = await dbR.tbl_Reference
                    .FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.ReferralCode == Sponsor && a.Status == 0 &&
                        dbR.tbl_MemberInfo.Any(m => m.RowID == a.MemberID && m.UserType == "AGENT"));
                if (sponsorInfo == null)
                {
                    return "Err : Invalid referral code.";
                }

                // username validate

                if (string.IsNullOrEmpty(Username))
                {
                    return "Please enter the email address.";
                }

                if (!Validation.IsValidEmail(Username))
                {
                    return "The email address is invalid.";
                }

                if (await dbR.tbl_MemberInfo.Where(a => a.Username.Equals(Username, StringComparison.CurrentCultureIgnoreCase)).CountAsync() > 0)
                {
                    return "This email address has been registered. Please try another.";
                }

                // OTP validate

                OneTimePassword OneTimePassword = new OneTimePassword();
                OneTimePassword.OTP = OTP;
                OneTimePassword.MemberID = 0;
                OneTimePassword.ActionType = "TRUST_MEMBER_REGISTRATION";
                OneTimePassword.ReceiverAddress = Username;
                OneTimePassword.OTP_SentMethod = "OTP_MAIL";
                string verificationresult = await OneTimePassword.IsValidOTPAsync();

                if (verificationresult != ProjectProperties.Return_Success)
                {
                    return verificationresult;
                }

                // login password

                string LoginPassValidate = await ValidationAsync.IsValidMemberLoginPassword(LoginPassword, ConfirmLoginPassword, 0);
                if (LoginPassValidate != ProjectProperties.Return_Success)
                {
                    return LoginPassValidate;
                }
            }

            return ProjectProperties.Return_Success;
        }

        public async Task<string> ValidateIdentity()
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                // =============================================================
                // 1. Identity Type
                // =============================================================

                if (string.IsNullOrWhiteSpace(IdentityType))
                {
                    return "Please select an identity type.";
                }

                string identityType = IdentityType.Trim().ToUpperInvariant();

                if (identityType != "NRIC" &&
                    identityType != "PASSPORT" &&
                    identityType != "SSM")
                {
                    return "Invalid identity type.";
                }

                // =============================================================
                // 2. Identity Number
                // =============================================================

                if (string.IsNullOrWhiteSpace(IdentityId))
                {
                    switch (identityType)
                    {
                        case "NRIC":
                            return "Please enter your NRIC number.";

                        case "PASSPORT":
                            return "Please enter your passport number.";

                        case "SSM":
                            return "Please enter your SSM registration number.";
                    }
                }

                // =============================================================
                // 3. Duplicate Identity Check
                // =============================================================

                bool identityExists = await dbR.tbl_MemberInfo.AnyAsync(a => a.IC_Type == identityType && a.IC == IdentityId && a.IsDeleted == false);

                if (identityExists)
                {
                    switch (identityType)
                    {
                        case "NRIC":
                            return "This NRIC number is already registered.";

                        case "PASSPORT":
                            return "This passport number is already registered.";

                        case "SSM":
                            return "This SSM registration number is already registered.";
                    }
                }

                // =============================================================
                // 4. Name Validation
                // =============================================================

                if (string.IsNullOrEmpty(Fullname))
                {
                    switch (identityType)
                    {
                        case "NRIC":
                            return "Please enter your full name.";

                        case "PASSPORT":
                            return "Please enter your full name.";

                        case "SSM":
                            return "Please enter your company name.";
                    }
                }

                if (Fullname.Length > 100)
                {
                    switch (identityType)
                    {
                        case "NRIC":
                            return "Please enter your full name with not more than 100 characters.";

                        case "PASSPORT":
                            return "Please enter your full name with not more than 100 characters.";

                        case "SSM":
                            return "Please enter your company name with not more than 100 characters.";
                    }
                }

                // =============================================================
                // 4. Date Of Birth
                // =============================================================

                string _BirthdayDate;

                if (string.IsNullOrEmpty(DateOfBirth))
                {
                    switch (identityType)
                    {
                        case "NRIC":
                            return "Please enter your date of birth.";

                        case "PASSPORT":
                            return "Please enter your date of birth.";

                        case "SSM":
                            return "Please enter your company incorporation date.";
                    }
                }

                if (!Validation.isDateTime(DateOfBirth, "yyyy-MM-dd", "yyyy-MM-dd", out _BirthdayDate))
                {
                    switch (identityType)
                    {
                        case "NRIC":
                            return "Please enter a valid date of birth.";

                        case "PASSPORT":
                            return "Please enter a valid date of birth.";

                        case "SSM":
                            return "Please enter a valid company incorporation date.";
                    }
                }

                DateTime dob = Convert.ToDateTime(_BirthdayDate);

                if (dob.Date > DateTime.Today)
                {
                    switch (identityType)
                    {
                        case "NRIC":
                            return "Invalid date of birth.";

                        case "PASSPORT":
                            return "Invalid date of birth.";

                        case "SSM":
                            return "Invalid company incorporation date.";
                    }
                }

                if (IdentityType != "SSM")
                {
                    // Must be at least 18 years old
                    DateTime minimumDob = DateTime.Today.AddYears(-18);

                    if (dob.Date > minimumDob)
                    {
                        return "You must be at least 18 years old.";
                    }
                }

                // =============================================================
                // Malaysian NRIC Validation
                // =============================================================

                if (identityType == "NRIC")
                {
                    string normalizedNric;
                    string nricError;

                    if (!ValidateMalaysiaNric(IdentityId, dob, out normalizedNric, out nricError))
                    {
                        return nricError;
                    }

                    IdentityId = normalizedNric;
                }

                // =============================================================
                // NRIC
                //
                // Required:
                // - NRIC Front
                // - NRIC Back
                // =============================================================

                DateTime now = DateTime.Now;

                if (identityType == "NRIC")
                {
                    // ---------------------------------------------------------
                    // NRIC Front Reference
                    // ---------------------------------------------------------

                    if (string.IsNullOrWhiteSpace(IdentityFrontPublicID))
                    {
                        return "Please upload the front image of your NRIC.";
                    }

                    Guid frontPublicId;

                    if (!Guid.TryParse(IdentityFrontPublicID.Trim(), out frontPublicId))
                    {
                        return "Invalid NRIC front document reference.";
                    }

                    // ---------------------------------------------------------
                    // NRIC Back Reference
                    // ---------------------------------------------------------

                    if (string.IsNullOrWhiteSpace(IdentityBackPublicID))
                    {
                        return "Please upload the back image of your NRIC.";
                    }

                    Guid backPublicId;

                    if (!Guid.TryParse(IdentityBackPublicID.Trim(), out backPublicId))
                    {
                        return "Invalid NRIC back document reference.";
                    }

                    // ---------------------------------------------------------
                    // Front / Back Cannot Be Same
                    // ---------------------------------------------------------

                    if (frontPublicId == backPublicId)
                    {
                        return "The NRIC front and back images cannot be the same file.";
                    }

                    // ---------------------------------------------------------
                    // Validate NRIC Front Upload
                    // ---------------------------------------------------------

                    var front = await dbR.tbl_log_FileUpload.FirstOrDefaultAsync(a => a.PublicID == frontPublicId && a.Status == 0 && a.ExpiredAt > now);
                    if (front == null)
                    {
                        return "The NRIC front image is invalid or has expired. Please upload it again.";
                    }

                    // ---------------------------------------------------------
                    // Validate NRIC Back Upload
                    // ---------------------------------------------------------

                    var back = await dbR.tbl_log_FileUpload.FirstOrDefaultAsync(a => a.PublicID == backPublicId && a.Status == 0 && a.ExpiredAt > now);
                    if (back == null)
                    {
                        return "The NRIC back image is invalid or has expired. Please upload it again.";
                    }
                }

                // =============================================================
                // PASSPORT
                //
                // Required:
                // - Passport Details Page
                // =============================================================

                else if (identityType == "PASSPORT")
                {
                    if (string.IsNullOrWhiteSpace(PassportPublicID))
                    {
                        return "Please upload the passport details page.";
                    }

                    Guid passportPublicId;

                    if (!Guid.TryParse(PassportPublicID.Trim(), out passportPublicId))
                    {
                        return "Invalid passport document reference.";
                    }

                    var passport = await dbR.tbl_log_FileUpload.FirstOrDefaultAsync(a => a.PublicID == passportPublicId && a.Status == 0 && a.ExpiredAt > now);
                    if (passport == null)
                    {
                        return "The passport image is invalid or has expired. Please upload it again.";
                    }
                }

                // =============================================================
                // SSM
                //
                // Required:
                // - One SSM Certificate
                // =============================================================

                else if (identityType == "SSM")
                {
                    if (string.IsNullOrWhiteSpace(
                        SSMPublicID))
                    {
                        return "Please upload the SSM certificate.";
                    }

                    Guid ssmPublicId;

                    if (!Guid.TryParse(SSMPublicID.Trim(), out ssmPublicId))
                    {
                        return "Invalid SSM document reference.";
                    }

                    var ssm = await dbR.tbl_log_FileUpload.FirstOrDefaultAsync(a => a.PublicID == ssmPublicId && a.Status == 0 && a.ExpiredAt > now);
                    if (ssm == null)
                    {
                        return "The SSM certificate is invalid or has expired. Please upload it again.";
                    }
                }

                if (string.IsNullOrEmpty(TinNumber))
                {
                    return "Please enter the Tin Number.";
                }

                if (TinNumber.Length > 50)
                {
                    return "Please enter the TIN number with not more than 50 characters.";
                }

                if (identityType != "SSM")
                {
                    if (string.IsNullOrEmpty(Occupation))
                    {
                        return "Please enter the occupation.";
                    }

                    if (Occupation.Length > 150)
                    {
                        return "Please enter the occupation with not more than 150 characters.";
                    }
                }

                return ProjectProperties.Return_Success;
            }
        }

        public async Task<string> ValidateContact()
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                // country

                if (string.IsNullOrEmpty(Country_Domain))
                {
                    return "Please select the country.";
                }

                var country = await dbR.tbl_Country.FirstOrDefaultAsync(a => a.Country_Domain == Country_Domain && a.Country_Status == 1);
                if (country == null)
                {
                    return "Err : Invalid country.";
                }

                // country mobile code validate

                if (string.IsNullOrEmpty(CountryMobileCode))
                {
                    return "Please select the Country mobile code.";
                }

                int _CountryMobileCode;
                if (!int.TryParse(CountryMobileCode, out _CountryMobileCode))
                {
                    return "Err : Country mobile code was not in correct format!";
                }

                var countrymobilecode = await dbR.tbl_Country.FirstOrDefaultAsync(a => a.Country_MobileCode == _CountryMobileCode);
                if (countrymobilecode == null)
                {
                    return "Err : Invalid country mobile code!";
                }

                // mobile validate

                if (string.IsNullOrEmpty(Mobile))
                {
                    return "Please enter the mobile number.";
                }

                if (!Validation.IsValidPhone(Mobile))
                {
                    return "Please enter a valid mobile number.";
                }

                // postcode 

                if (string.IsNullOrEmpty(Postcode))
                {
                    return "Please enter the postcode.";
                }

                if (Postcode.Length > 50)
                {
                    return "Please enter the postcode with not more than 50 characters.";
                }

                // state

                if (string.IsNullOrEmpty(State))
                {
                    return "Please enter the state.";
                }

                if (State.Length > 50)
                {
                    return "Please enter the state with not more than 50 characters.";
                }

                // city

                if (string.IsNullOrEmpty(City))
                {
                    return "Please enter the city.";
                }

                if (City.Length > 300)
                {
                    return "Please enter the city with not more than 300 characters.";
                }

                // address

                if (string.IsNullOrEmpty(Address_1))
                {
                    return "Please enter the address 1.";
                }

                if (Address_1.Length > 300)
                {
                    return "Please enter the address 1 with not more than 300 characters.";
                }

                if (string.IsNullOrEmpty(Address_2))
                {
                    return "Please enter the address 2.";
                }

                if (Address_2.Length > 300)
                {
                    return "Please enter the address 2 with not more than 300 characters.";
                }
            }

            return ProjectProperties.Return_Success;
        }

        private async Task<bool> LinkKycDocumentsAsync(Sandbox_BasedEntities dbR, long memberId)
        {
            string identityType = (IdentityType ?? "").Trim().ToUpperInvariant();

            List<Guid> publicIds = new List<Guid>();

            if (identityType == "NRIC")
            {
                Guid frontPublicId;
                Guid backPublicId;

                if (!Guid.TryParse(IdentityFrontPublicID, out frontPublicId))
                {
                    return false;
                }

                if (!Guid.TryParse(
                    IdentityBackPublicID,
                    out backPublicId))
                {
                    return false;
                }

                publicIds.Add(frontPublicId);
                publicIds.Add(backPublicId);
            }
            else if (identityType == "PASSPORT")
            {
                Guid passportPublicId;

                if (!Guid.TryParse(PassportPublicID, out passportPublicId))
                {
                    return false;
                }

                publicIds.Add(passportPublicId);
            }
            else if (identityType == "SSM")
            {
                Guid ssmPublicId;

                if (!Guid.TryParse(SSMPublicID, out ssmPublicId))
                {
                    return false;
                }

                publicIds.Add(ssmPublicId);
            }
            else
            {
                return false;
            }

            DateTime now = DateTime.Now;

            var files = await dbR.tbl_log_FileUpload.Where(a => publicIds.Contains(a.PublicID) && a.MemberID == 0 && a.Status == 0 && a.ExpiredAt > now).ToListAsync();
            if (files.Count != publicIds.Count)
            {
                return false;
            }

            foreach (var file in files)
            {
                file.MemberID = memberId;
            }

            await dbR.SaveChangesAsync();

            return true;
        }

        public async Task<string> ValidateBank()
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                if (string.IsNullOrEmpty(BankName))
                {
                    return "Please select the bank.";
                }

                var bank = await dbR.tbl_Master_BankList.FirstOrDefaultAsync(a => a.BankName == BankName && a.Status == 0);
                if (bank == null)
                {
                    return "Err : Invalid bank selected.";
                }

                if (string.IsNullOrEmpty(AccountName) || AccountName.Length > 100)
                {
                    return "Please enter the account name with not more than 100 characters.";
                }

                if (string.IsNullOrEmpty(AccountNumber) || AccountNumber.Length > 50)
                {
                    return "Please enter the account number with not more than 50 characters.";
                }
            }

            return ProjectProperties.Return_Success;
        }

        public async Task<bool> Register()
        {
            Status = 0;
            Sponsor = Sponsor.Trim();
            CountryMobileCode = CountryMobileCode.Trim();
            string result = string.Empty;
            var errorContext = ErrorLogContext.GetErrorContext();

            using (var dbR = new Sandbox_BasedEntities())
            {
                // validate account

                result = await ValidateAccount();
                if (result != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = result;
                    return false;
                }
                result = string.Empty;

                // validate identity

                result = await ValidateIdentity();
                if (result != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = result;
                    return false;
                }
                result = string.Empty;

                // contact identity

                result = await ValidateContact();
                if (result != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = result;
                    return false;
                }
                result = string.Empty;

                // bank

                result = await ValidateBank();
                if (result != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = result;
                    return false;
                }
                result = string.Empty;

                // process

                string IP = CommonUtil.GetIP();
                string NewPassword = secure.Encrypt(LoginPassword, true);
                string NewSecurityPassword = secure.Encrypt(LoginPassword, true);
                string strSQL = string.Empty;
                string mediaUrl = AppSettingsHelper.MediaUrl;

                strSQL = $@"
                        EXEC [USP_MemberRegister_Trust]
                        @Sponsor='{Sponsor}',
                        @RoleCode='{RoleCode}',
                        @Username=N'{Username.ToLower()}',
                        @Fullname=N'{Fullname}',
                        @IdentityType='{IdentityType}',
                        @IdentityID='{IdentityId}',
                        @Address_1=N'{Address_1}',
                        @Address_2=N'{Address_2}',
                        @PostCode='{Postcode}',
                        @State='{State}',
                        @City=N'{City}',
                        @Country_Domain='{Country_Domain}',
                        @CountryMobileCode='{CountryMobileCode}',
                        @Mobile=N'{Mobile}',
                        @Occupation=N'{Occupation}',
                        @TinNumber=N'{TinNumber}',
                        @DOB='{DateOfBirth}',
                        @Password=N'{NewPassword}',
                        @SecurityPassword=N'{NewSecurityPassword}',
                        @BankName=N'{BankName}',
                        @AccountName=N'{AccountName}',
                        @AccountNumber=N'{AccountNumber}',
                        @FileUrl=N'{mediaUrl}',
                        @IdentityFrontPublicID='{IdentityFrontPublicID}',
                        @IdentityBackPublicID='{IdentityBackPublicID}',
                        @PassportPublicID='{PassportPublicID}',
                        @SSMPublicID='{SSMPublicID}',
                        @OTP='{OTP}',
                        @MerchantID='{MerchantID}'";

                string LogStrSQL = CommonUtil.CleanSql(strSQL);
                await LogUtilAsync.logActionAsync(LogStrSQL, "Agent Registration", "", errorContext);

                using (var tran = dbR.Database.BeginTransaction())
                {
                    try
                    {
                        long _memberId = await dbR.Database.SqlQuery<long>(strSQL).FirstOrDefaultAsync();

                        bool kycLinked = await LinkKycDocumentsAsync(dbR, _memberId);
                        if (!kycLinked)
                        {
                            tran.Rollback();
                            Status = 4;
                            Message = "Unable to link the KYC documents to the agent account.";
                            return false;
                        }

                        Message = "Success";
                        tran.Commit();
                        return true;
                    }
                    catch (Exception ex)
                    {
                        tran.Rollback();
                        Status = 4;
                        Message = ex.Message;
                        return false;
                    }
                }
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
    }
}