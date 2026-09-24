using API_CPX.api;
using API_CPX.Class;
using API_CPX.Class.Merchant;
using API_CPX.Class.Model;
using API_CPX.Context;
using API_CPX.Model;
using System;
using System.Collections.Generic;
using System.Data.Entity.Core.Objects;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Web;
using System.Web.Http;
using System.Web.Http.Description;
using Util;

namespace API_CPX.API.Controller
{
    [RoutePrefix("api")]
    [RequestAuthorizeAttribute]
    public class ApiController : System.Web.Http.ApiController
    {
        [HttpPost]
        [AllowAnonymous]
        [ActionName("v1/login")]
        public LoginUserModel Login(ParamLogin t)
        {
            LoginUserModel m = new LoginUserModel();

            try
            {
                if (!m.VerifyLogin(t.Username, t.Password, t.MerchantID))
                {
                    throw new Exception(m.Message);
                }

                m.Token = new TokenValidation().GenerateToken(m);
                HttpContext.Current.Session["TDMID"] = m.UserId;
                HttpContext.Current.Session["CCMID"] = m.UserId;
            }
            catch(Exception ex)
            {
                m.Status = 4;
                m.Message = ex.Message.ToString();
            }
            return m;
        }

        [HttpPost]
        //[AllowAnonymous]
        [AccountValidation]
        [ActionName("v1/change-login-password")]
        public ChangeLoginPasswordModel ChangeLoginPassword(ParamChangeLoginPassword t)
        {
            ChangeLoginPasswordModel m = new ChangeLoginPasswordModel();

            try
            {
                if (!m.ChangeLoginPassword(t.UserID, t.OldPassword, t.Password, t.ConfirmPassword, t.MerchantID, t.HandlePersonID))
                {
                    throw new Exception(m.Message);
                }
            }
            catch (Exception ex)
            {
                m.Status = 4;
                m.Message = ex.Message.ToString();
            }
            return m;
        }

        [HttpPost]
        [AllowAnonymous]
        //[AccountValidation]
        [ActionName("v1/change-security-password")]
        private ChangeSecurityPasswordModel ChangeSecurityPassword(ParamChangeSecurityPassword t)
        {
            ChangeSecurityPasswordModel m = new ChangeSecurityPasswordModel();

            try
            {
                if (!m.ChangeSecurityPassword(t.UserID, t.OldPassword, t.Password, t.ConfirmPassword, t.MerchantID, t.HandlePersonID))
                {
                    throw new Exception(m.Message);
                }
            }
            catch (Exception ex)
            {
                m.Status = 4;
                m.Message = ex.Message.ToString();
            }
            return m;
        }

        [HttpPost]
        [AllowAnonymous]
        [ActionName("v1/send-otp")]

        public Base SendOTP(ParamSendOTP t)
        {
            OTPModel m = new OTPModel();

            try
            {
                m.MerchantID = t.MerchantID;
                m.MemberID = t.UserID;
                m.ActionType = t.ActionType;
                m.OTP_SentMethod = t.SendMethod;
                m.ReceiverAddress = t.ReceiverAddress;
            
                if (!m.SendOTP())
                {
                    return new Base()
                    {
                        Status = 4,
                        Message = m.Message
                    };
                }
                else
                {
                    return new Base()
                    {
                        Status = 0,
                        Message = m.Message
                    };
                }
            }
            catch (Exception ex)
            {
                return new Base()
                {
                    Status = 4,
                    Message = ex.Message.ToString()
                };
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [ActionName("v1/register")]
        public Base Register(ParamRegister t)
        {
            try
            {
                RegisterModel m = new RegisterModel();
                m.MerchantID = t.MerchantID;
                m.OTP = t.OTP;
                m.SignupMethod = t.SigupMethod;
                m.Sponsor = t.Sponsor;
                m.CountryMobileCode = t.CountryMobileCode;
                m.Username = t.Username;
                m.Mobile = t.Mobile;
                m.Email = t.Email;
                m.Fullname = t.Fullname;
                m.IdentityId = t.IdentityID;
                m.Company = t.Company;
                m.Occupation = t.Occupation;
                m.DateOfBirth = t.DateOfBirth;
                m.LoginPassword = t.LoginPassword;
                m.ConfirmLoginPassword = t.ConfirmLoginPassword;
                m.SignupToken = t.SignupToken;
                m.ActionType = t.ActionType;

                if (!m.Register())
                {
                    return new Base()
                    {
                        Status = 4,
                        Message = m.Message
                    };
                }
                else
                {
                    return new Base()
                    {
                        Status = 0,
                        Message = m.Message
                    };
                }
            }
            catch(Exception ex)
            {
                return new Base()
                {
                    Status = 4,
                    Message = ex.Message.ToString()
                };
            }
        }

        [HttpPost]
        [AllowAnonymous]
        //[AccountValidation]
        [ActionName("v1/reset-password")]
        public ResetPasswordModel ResetPassword(ParamResetPassword t)
        {
            ResetPasswordModel m = new ResetPasswordModel();

            try
            {
                if (!m.ResetPassword(t.Username, t.OTP, "RESET_PASSWORD", t.MerchantID))
                {
                    throw new Exception(m.Message);
                }
            }
            catch (Exception ex)
            {
                m.Status = 4;
                m.Message = ex.Message.ToString();
            }
            return m;
        }

        [HttpPost]
        [AllowAnonymous]
        //[AccountValidation]
        [ActionName("v1/download-cert-zip")]
        public DownloadCertZipModel ZipCertificate(ParamZipCert t)
        {
            DownloadCertZipModel m = new DownloadCertZipModel();
            m.UserID = t.UserID;
            m.MerchantID = t.MerchantID;
            m.EnrolmentString = t.EnrolmentString;

            try
            {
                if (!m.DownloadZip())
                {
                    return new DownloadCertZipModel()
                    {
                        Status = 4,
                        Message = m.Message
                    };
                }
                else
                {
                    return new DownloadCertZipModel()
                    {
                        Status = 0,
                        Message = m.Message,
                        ZipPath = m.ZipPath,
                        ZipFile = m.ZipFile
                    };
                }
            }
            catch (Exception ex)
            {
                m.Status = 4;
                m.Message = ex.Message.ToString();
            }
            return m;
        }

        [HttpPost]
        [AllowAnonymous]
        //[AccountValidation]
        [ActionName("v1/generate-cert")]
        public GenerateCertificate GenerateCertificate(ParamGenerateCert t)
        {
            GenerateCertificate m = new GenerateCertificate();
            m.UserID = t.UserID;
            m.MerchantID = t.MerchantID;
            m.EnrolmentID = t.EnrolmentID;

            try
            {
                if (!m.GenerateCert())
                {
                    return new GenerateCertificate()
                    {
                        Status = 4,
                        Message = m.Message
                    };
                }
                else
                {
                    return new GenerateCertificate()
                    {
                        Status = 0,
                        Message = m.Message,
                        CertPath = m.CertPath,
                        CertPath_PDF = m.CertPath_PDF
                    };
                }
            }
            catch (Exception ex)
            {
                m.Status = 4;
                m.Message = ex.Message.ToString();
            }
            return m;
        }

        [HttpPost]
        //[AllowAnonymous]
        [AccountValidation]
        [ActionName("v1/change-profile")]
        public Base ChangeProfile(ParamChangeProfile t)
        {
            ChangeProfileModel m = new ChangeProfileModel();
            m.UserID = t.UserID;
            m.MerchantID = t.MerchantID;
            m.DateOfBirth = t.DateOfBirth;
            m.CountryMobileCode = t.CountryMobileCode;
            m.Mobile = t.Mobile;
            m.Postcode = t.Postcode;
            m.City = t.City;
            m.State = t.State;
            m.Address = t.Address;
            m.Country_Domain = t.Country_Domain;
            m.Gender = t.Gender;
            m.Company = t.Company;
            m.Occupation = t.Occupation;

            try
            {
                if (!m.ChangeProfile())
                {
                    return new Base()
                    {
                        Status = 4,
                        Message = m.Message
                    };
                }
                else
                {
                    return new Base()
                    {
                        Status = 0,
                        Message = m.Message
                    };
                }
            }
            catch (Exception ex)
            {
                m.Status = 4;
                m.Message = ex.Message.ToString();
            }
            return m;
        }

        [HttpPost]
        //[AllowAnonymous]
        [UploadValidation]
        [ActionName("v1/upload-avatar")]
        public UploadResponse UploadAvatar()
        {
            FileUploadModel m = new FileUploadModel();
            m.MerchantID = HttpContext.Current.Request.Headers["MerchantID"].ToString();
            m.UserID = Convert.ToInt64(HttpContext.Current.Request.Headers["UserID"].ToString());
            m.FileName = HttpContext.Current.Request.Headers["FileName"].ToString();
            m.FileType = HttpContext.Current.Request.Headers["FileType"].ToString();
            m.FileSize = int.Parse(HttpContext.Current.Request.Headers["FileSize"].ToString());
            m.UploadType = HttpContext.Current.Request.Headers["UploadType"].ToString();

            try
            {
                if (!m.UploadAvatar())
                {
                    return new UploadResponse()
                    {
                        Status = 4,
                        Message = m.Message
                    };
                }
                else
                {
                    return new UploadResponse()
                    {
                        Status = 0,
                        Message = m.Message,
                        FileUrl = m.FileUrl,
                        UploadedFile = m.UploadedFile
                    };
                }
            }
            catch (Exception ex)
            {
                m.Status = 4;
                m.Message = ex.Message.ToString();
            }
            return m;
        }

        [HttpPost]
        [AllowAnonymous]
        [ActionName("v1/send-grant-and-collaboration")]

        public Base SendGrantAndCollaboration(ParamGrantAndCollaboration t)
        {
            GrantAndCollaborationModel m = new GrantAndCollaborationModel();

            try
            {
                if (!m.SendGrantAndCollaboration(t.MerchantID, t.Company, t.Contact_Person, t.Fullname, t.Email, t.Mobile, t.Description))
                {
                    return new Base()
                    {
                        Status = 4,
                        Message = m.Message
                    };
                }
                else
                {
                    return new Base()
                    {
                        Status = 0,
                        Message = m.Message
                    };
                }
            }
            catch (Exception ex)
            {
                return new Base()
                {
                    Status = 4,
                    Message = ex.Message.ToString()
                };
            }
        }

        [HttpPost]
        [AllowAnonymous]
        [ActionName("v1/send-email-receipt")]

        public Base SendEmailReceipt(ParamEmailReceipt t)
        {
            EmailReceiptModel m = new EmailReceiptModel();

            try
            {
                if (!m.SendEmailReceipt(t.MerchantID, t.InvoiceID))
                {
                    return new Base()
                    {
                        Status = 4,
                        Message = m.Message
                    };
                }
                else
                {
                    return new Base()
                    {
                        Status = 0,
                        Message = m.Message
                    };
                }
            }
            catch (Exception ex)
            {
                return new Base()
                {
                    Status = 4,
                    Message = ex.Message.ToString()
                };
            }
        }


        [HttpPost]
        [AccountValidation]
        [ActionName("v1/logout")]
        public Base Signout(ParamLogout t)
        {
            Base m = new Base();
            try
            {
                HttpContext.Current.Session.Remove("TDMID");
                HttpContext.Current.Session.Remove("CCMID");
                m.Status = 0;
                m.Message = "Success";
            }
            catch (Exception ex)
            {
                m.Status = 4;
                m.Message = ex.Message.ToString();
            }
            return m;
        }
    }
}

public  class ParamLogin
{
    public string Username { get; set; }
    public string Password { get; set; }
    public string MerchantID { get; set; }
}

public class ParamChangeLoginPassword
{
    public long UserID { get; set; }
    public string OldPassword { get; set; }
    public string Password { get; set; }
    public string ConfirmPassword { get; set; }
    public string MerchantID { get; set; }
    public long HandlePersonID { get; set; }
}

public class ParamChangeSecurityPassword
{
    public long UserID { get; set; }
    public string OldPassword { get; set; }
    public string Password { get; set; }
    public string ConfirmPassword { get; set; }
    public string MerchantID { get; set; }
    public long HandlePersonID { get; set; }
}

public class ParamResetPassword
{
    public string Username { get; set; }
    public string OTP { get; set; }
    public string MerchantID { get; set; }
}

public class ParamChangeProfile
{
    public long UserID { get; set; }
    public string CountryMobileCode { get; set; }
    public string Mobile { get; set; }
    public string DateOfBirth { get; set; }
    public string Postcode { get; set; }
    public string City { get; set; }
    public string State { get; set; }
    public string Address { get; set; }
    public string Country_Domain { get; set; }
    public string Gender { get; set; }
    public string Company { get; set; }
    public string Occupation { get; set; }
    public string MerchantID { get; set; }
}

public class ParamAddBank
{
    public long UserID { get; set; }
    public string BankName { get; set; }
    public string BankHolderName { get; set; }
    public string BankAccountNo { get; set; }
    public string MerchantID { get; set; }
}

public class ParamDeleteBank
{
    public long UserID { get; set; }
    public long BankID { get; set; }
    public string MerchantID { get; set; }
}

public class ParamSendOTP
{
    public string MerchantID { get; set; }
    public long UserID { get; set; }
    public string ActionType { get; set; }
    public string SendMethod { get; set; }
    public string ReceiverAddress { get; set; }
}

public class ParamRegister
{
    public string MerchantID { get; set; }
    public string CountryMobileCode { get; set; }
    public string Username { get; set; }
    public string Mobile { get; set; }
    public string Email { get; set; }
    public string SigupMethod { get; set; }
    public string Sponsor { get; set; }
    public string Fullname { get; set; }
    public string IdentityID { get; set; }
    public string Company { get; set; }
    public string Occupation { get; set; }
    public string SignupToken { get; set; }
    public string OTP { get; set; }
    public string ActionType { get; set; }
    public string DateOfBirth { get; set; }
    public string LoginPassword { get; set; }
    public string ConfirmLoginPassword { get; set; }
}

public class ParamLogout
{
    public long UserID { get; set; }
}

public class ParamNotificationReaded
{
    public string MerchantID { get; set; }
    public long UserID { get; set; }
    public long NotificationID { get; set; }
}

public class ParamGenerateCert
{
    public string MerchantID { get; set; }
    public long UserID { get; set; }
    public string EnrolmentID { get; set; }
}

public class ParamZipCert
{
    public string MerchantID { get; set; }
    public long UserID { get; set; }
    public string EnrolmentString { get; set; }
}

public class ParamGrantAndCollaboration
{
    public string MerchantID { get; set; }
    public string Company { get; set; }
    public string Contact_Person { get; set; }
    public string Fullname { get; set; }
    public string Email { get; set; }
    public string Mobile { get; set; }
    public string Description { get; set; }
}

public class ParamEmailReceipt
{
    public string MerchantID { get; set; }
    public string InvoiceID { get; set; }
}

