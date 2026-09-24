using API_CPX.Class;
using API_CPX.Class.Attributes;
using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model;
using API_CPX.Class.Model.Class;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Service;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
using static API_CPX.Class.Model.DTO.AgentSignupValidationRequest;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/register")]
    [JwtAuthorize]
    public class RegisterController : System.Web.Http.ApiController
    {
        [HttpGet]
        [AllowAnonymous]
        [SkipApiLogging]
        [Route("validate-sponsor")]
        public async Task<IHttpActionResult> ValidateSponsor(string merchantId, string sponsor)
        {
            const string code = "VALIDATE-SPONSOR";

            try
            {
                using (var dbR = new Sandbox_BasedEntities())
                {
                    string isValidMerchant = await ValidationAsync.isValidMerchant(merchantId);
                    if (isValidMerchant != ProjectProperties.Return_Success)
                    {
                        return Ok(new
                        {
                            Status = 4,
                            Message = isValidMerchant,
                            Code = code,
                            Data = (object)null
                        });
                    }

                    if (string.IsNullOrWhiteSpace(sponsor))
                    {
                        return Ok(new
                        {
                            Status = 4,
                            Message = "Referral code is required.",
                            Code = code,
                            Data = (object)null
                        });
                    }

                    string sponsorCode = sponsor.Trim();

                    var sponsorInfo =
                        await (
                            from reference in dbR.tbl_Reference
                            join member in dbR.tbl_MemberInfo on reference.MemberID equals member.RowID
                            where reference.MerchantID == merchantId && reference.ReferralCode == sponsorCode && member.UserType == "AGENT" && reference.Status == 0
                            select new
                            {
                                member.Fullname
                            }
                        ).FirstOrDefaultAsync();

                    if (sponsorInfo == null)
                    {
                        return Ok(new
                        {
                            Status = 4,
                            Message = "Invalid referral code.",
                            Code = code,
                            Data = (object)null
                        });
                    }

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = new
                        {
                            Fullname = sponsorInfo.Fullname
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("registration/session")]
        public async Task<IHttpActionResult> CreateRegistrationSession(CreateRegistrationSessionRequest request)
        {
            Request.Properties["AuditTitle"] = "Agent Registration Started";
            Request.Properties["AuditDescription"] = "Started a new agent registration session.";
            const string code = "CREATE-REGISTRATION-SESSION";

            try
            {
                using (var dbR = new Sandbox_BasedEntities())
                {
                    if (request == null || string.IsNullOrWhiteSpace(request.ReferralCode))
                    {
                        throw new BusinessException("Invalid referral code.", code);
                    }

                    string referralCode = request.ReferralCode.Trim();
                    var errorContext = ErrorLogContext.GetErrorContext();

                    var introducer =
                        await (
                            from reference in dbR.tbl_Reference
                            join member in dbR.tbl_MemberInfo on reference.MemberID equals member.RowID
                            where reference.MerchantID == request.MerchantID && reference.ReferralCode == referralCode && member.UserType == "AGENT" && reference.Status == 0
                            select new
                            {
                                member.Fullname
                            }
                        ).FirstOrDefaultAsync();

                    if (introducer == null)
                    {
                        throw new BusinessException("Invalid referral code.", code);
                    }

                    string token = RegistrationTokenHelper.GenerateToken();
                    string tokenHash = RegistrationTokenHelper.HashToken(token);

                    DateTime now = DateTime.Now;

                    var session = new tbl_RegistrationSession
                    {
                        SessionID = Guid.NewGuid(),
                        TokenHash = tokenHash,
                        ReferralCode = referralCode,
                        MerchantID = request.MerchantID,
                        Status = "ACTIVE",
                        CreatedAt = now,
                        LastActivityAt = now,
                        ExpiresAt = now.AddMinutes(60),
                        CreatedIP = errorContext.IP
                    };
                    dbR.tbl_RegistrationSession.Add(session);
                    await dbR.SaveChangesAsync();

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = code,
                        Data = new
                        {
                            SessionID = session.SessionID,
                            RegistrationToken = token,
                            ExpiresAt = session.ExpiresAt,
                            ReferralCode = session.ReferralCode
                        }
                    });
                }
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(
                    ex.InnerException?.InnerException?.Message
                    ?? ex.InnerException?.Message
                    ?? ex.Message,
                    code);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("validate-account")]
        public async Task<IHttpActionResult> ValidateAccount(AgentAccountValidationRequest request)
        {
            try
            {
                Request.Properties["AuditTitle"] = "Account Details Validated";
                Request.Properties["AuditDescription"] = "Validated account details during registration.";

                var model = new RegisterAsync
                {
                    MerchantID = request.MerchantID,
                    Sponsor = request.Sponsor,
                    Username = request.Email,
                    OTP = request.OTP,
                    LoginPassword = request.LoginPassword,
                    ConfirmLoginPassword = request.ConfirmLoginPassword
                };

                string result = await model.ValidateAccount();

                if (result != ProjectProperties.Return_Success)
                {
                    throw new BusinessException(result, "VALIDATE-ACCOUNT");
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "VALIDATE-ACCOUNT",
                    Data = (object)null
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "VALIDATE-ACCOUNT");
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("validate-identity")]
        public async Task<IHttpActionResult> ValidateIdentity(AgentIdentityValidationRequest request)
        {
            try
            {
                Request.Properties["AuditTitle"] = "Identity Details Validated";
                Request.Properties["AuditDescription"] = "Validated identity information during registration.";

                var model = new RegisterAsync
                {
                    IdentityType = request.IdentityType,
                    IdentityId = request.IdentityId,
                    Fullname = request.Fullname,
                    DateOfBirth = request.DateOfBirth,
                    TinNumber = request.TinNumber,
                    Occupation = request.Occupation,
                    IdentityFrontPublicID = request.IdentityFrontPublicID,
                    IdentityBackPublicID = request.IdentityBackPublicID,
                    PassportPublicID = request.PassportPublicID,
                    SSMPublicID = request.SSMPublicID
                };

                string result = await model.ValidateIdentity();

                if (result != ProjectProperties.Return_Success)
                {
                    throw new BusinessException(result, "VALIDATE-IDENTITY");
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "VALIDATE-IDENTITY",
                    Data = (object)null
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "VALIDATE-IDENTITY");
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("validate-contact")]
        public async Task<IHttpActionResult> ValidateContact(AgentContactValidationRequest request)
        {
            try
            {
                Request.Properties["AuditTitle"] = "Contact Details Validated";
                Request.Properties["AuditDescription"] = "Validated contact and address information during registration.";

                var model = new RegisterAsync
                {
                    Country_Domain = request.Country_Domain,
                    CountryMobileCode = request.CountryMobileCode,
                    Mobile = request.Mobile,
                    Postcode = request.Postcode,
                    State = request.State,
                    City = request.City,
                    Address_1 = request.Address_1,
                    Address_2 = request.Address_2
                };

                string result = await model.ValidateContact();

                if (result != ProjectProperties.Return_Success)
                {
                    throw new BusinessException(result, "VALIDATE-CONTACT");
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "VALIDATE-CONTACT",
                    Data = (object)null
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "VALIDATE-CONTACT");
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("validate-bank")]
        public async Task<IHttpActionResult> ValidateBank(AgentBankValidationRequest request)
        {
            try
            {
                Request.Properties["AuditTitle"] = "Bank Validated";
                Request.Properties["AuditDescription"] = "Validated bank information during registration.";

                var model = new RegisterAsync
                {
                    BankName = request.BankName,
                    AccountName = request.AccountName,
                    AccountNumber = request.AccountNumber
                };

                string result = await model.ValidateBank();

                if (result != ProjectProperties.Return_Success)
                {
                    throw new BusinessException(result, "VALIDATE-BANK");
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "VALIDATE-BANK",
                    Data = (object)null
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "VALIDATE-BANK");
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("upload-kyc")]
        public async Task<IHttpActionResult> UploadKycDocument(string merchantId, string documentType)
        {
            Request.Properties["AuditTitle"] = "KYC Document Uploaded";
            Request.Properties["AuditDescription"] = "Attempted to upload a KYC document.";

            const string code = "UPLOAD-KYC-DOCUMENT";
            string tempFilePath = null;

            try
            {
                // =============================================================
                // Validate Registration Token
                // =============================================================

                string token = GetRegistrationToken();

                if (string.IsNullOrWhiteSpace(token))
                {
                    throw new BusinessException("Err : Registration session is required.", code);
                }

                var registrationSessionService = new RegistrationSessionService();
                var session = await registrationSessionService.ValidateAsync(token);
                if (session == null)
                {
                    throw new BusinessException("Err : Registration session has expired or is invalid.", code);
                }

                // =============================================================
                // Validate Document Type
                // =============================================================

                string uploadType;

                switch ((documentType ?? "").Trim().ToUpperInvariant())
                {
                    case "NRIC_FRONT":
                        uploadType = "NRIC_FRONT";
                        break;
                    case "NRIC_BACK":
                        uploadType = "NRIC_BACK";
                        break;
                    case "PASSPORT":
                        uploadType = "PASSPORT";
                        break;
                    case "SSM_CERT":
                        uploadType = "SSM_CERT";
                        break;
                    default:
                        throw new BusinessException("Invalid KYC document type.", code);
                }

                // =============================================================
                // Read Multipart Upload Into Quarantine
                // =============================================================

                MultipartUploadResult upload = await MultipartUploadHelper.ReadSingleFileAsync(Request);

                if (!upload.IsSuccess)
                {
                    throw new BusinessException(upload.Message, code);
                }

                tempFilePath = upload.TempFilePath;

                // =============================================================
                // KYC Business Logic
                // =============================================================

                var m = new FileUpload
                {
                    MerchantID = merchantId,
                    UserID = 0,
                    FileName = upload.OriginalFileName,
                    FileType = upload.ContentType,
                    FileSize = upload.FileSize,
                    UploadType = uploadType,
                    TempFilePath = upload.TempFilePath
                };

                bool isValid = await m.UploadKycDocumentAsync();

                /*
                 * FileUpload now owns / cleans the temp file.
                 */

                tempFilePath = null;

                if (!isValid)
                {
                    throw new BusinessException(m.Message, code);
                }

                // =============================================================
                // Response
                // =============================================================

                var data = new
                {
                    m.PublicID,
                    m.FileUrl,
                    m.UploadedFile
                };

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code);
            }
            finally
            {
                /*
                 * Handles controller failure before
                 * FileUpload takes ownership.
                 */

                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("agent-register")]
        public async Task<IHttpActionResult> Register(RegisterRequest t)
        {
            try
            {
                Request.Properties["AuditTitle"] = "Account Registration";
                Request.Properties["AuditDescription"] = "Attempted to register a new agent account.";

                RegisterAsync m = new RegisterAsync();
                m.MerchantID = t.MerchantID;
                m.RoleCode = t.RoleCode;
                m.Sponsor = t.Sponsor;
                m.CountryMobileCode = t.CountryMobileCode;
                m.Mobile = t.Mobile;
                m.Username = t.Username;
                m.Fullname = t.Fullname;
                m.DateOfBirth = t.DateOfBirth;
                m.IdentityType = t.IdentityType;
                m.IdentityId = t.IdentityID;
                m.IdentityFrontPublicID = t.IdentityFrontPublicID;
                m.IdentityBackPublicID = t.IdentityBackPublicID;
                m.PassportPublicID = t.PassportPublicID;
                m.SSMPublicID = t.SSMPublicID;
                m.Address_1 = t.Address_1;
                m.Address_2 = t.Address_2;
                m.Postcode = t.Postcode;
                m.State = t.State;
                m.City = t.City;
                m.Country_Domain = t.Country_Domain;
                m.Occupation = t.Occupation;
                m.TinNumber = t.TinNumber;
                m.BankName = t.BankName;
                m.AccountName = t.AccountName;
                m.AccountNumber = t.AccountNumber;
                m.LoginPassword = t.LoginPassword;
                m.ConfirmLoginPassword = t.ConfirmLoginPassword;
                m.OTP = t.OTP;

                bool isValid = await m.Register();
                if (!isValid)
                {
                    throw new BusinessException(m.Message, "REGISTER");
                }
                else
                {
                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "REGISTER",
                        Data = (object)null
                    });
                }
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "REGISTER");
            }
        }

        // =============================================================
        // Private Helper Methods
        // =============================================================

        private string GetRegistrationToken()
        {
            IEnumerable<string> values;

            if (!Request.Headers.TryGetValues(
                "X-Registration-Token",
                out values))
            {
                return null;
            }

            return values.FirstOrDefault();
        }
    }
}