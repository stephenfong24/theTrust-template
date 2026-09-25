using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Model;
using API_CPX.Class.Model.Class;
using API_CPX.Class.Model.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/agent-management")]
    [JwtAuthorize]
    public class AgentManagementController : System.Web.Http.ApiController
    {
        [Authorize(Roles = "SA,AD,OP")]
        [HttpPost]
        [Route("change-login-password")]
        public async Task<IHttpActionResult> AdminChangeAgentLoginPassword(AdminChangeAgentPasswordRequest t)
        {
            Request.Properties["AuditTitle"] = "Agent Password Change";
            Request.Properties["AuditDescription"] = "Back Office user attempted to change an agent's login password.";
            ChangePassword m = new ChangePassword();

            string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
            bool result = await m.AdminChangeAgentLoginPassword(t.UserID, t.Password, t.ConfirmPassword, merchantId, t.CreatedBy);
            if (!result)
            {
                throw new BusinessException(m.Message, "ADMIN-CHANGE-AGENT-LOGIN-PASSWORD");
            }

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = "ADMIN-CHANGE-AGENT-LOGIN-PASSWORD",
                Data = (object)null
            });
        }

        [HttpPost]
        [Route("change-profile")]
        [Authorize(Roles = "SA,AD,OP")]
        public async Task<IHttpActionResult> ChangeAgentProfile(AdminChangeAgentProfileRequest request)
        {
            Request.Properties["AuditTitle"] = "Agent Profile Update";
            Request.Properties["AuditDescription"] = "Back Office user attempted to update an agent's profile information.";
            const string code = "ADMIN-CHANGE-AGENT-PROFILE";

            try
            {
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                AgentManagementAsync m = new AgentManagementAsync();

                m.UserID = request.UserID;
                m.MerchantID = merchantId;
                m.Username = request.Username;
                m.Displayname = request.Displayname;
                m.CountryMobileCode = request.CountryMobileCode;
                m.Mobile = request.Mobile;
                m.Country_Domain = request.Country_Domain;
                m.Postcode = request.Postcode;
                m.State = request.State;
                m.City = request.City;
                m.Address_1 = request.Address_1;
                m.Address_2 = request.Address_2;
                m.LoginStatus = request.LoginStatus;
                m.CreatedBy = request.CreatedBy;

                bool isValid = await m.AdminChangeAgentProfile();

                if (!isValid)
                {
                    throw new BusinessException(m.Message, code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = (object)null
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code);
            }
        }

        [HttpPost]
        [Route("change-identity")]
        [Authorize(Roles = "SA,AD,OP")]
        public async Task<IHttpActionResult> ChangeAgentIdentity(AdminChangeAgentIdentityRequest request)
        {
            Request.Properties["AuditTitle"] = "Agent Identity Update";
            Request.Properties["AuditDescription"] = "Back Office user attempted to update an agent's identity information.";
            const string code = "ADMIN-CHANGE-AGENT-IDENTITY";

            try
            {
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                AgentManagementAsync m = new AgentManagementAsync();

                m.UserID = request.UserID;
                m.MerchantID = merchantId;
                m.Fullname = request.Fullname;
                m.DateOfBirth = request.DateOfBirth;
                m.IdentityType = request.IdentityType;
                m.IdentityID = request.IdentityID;
                m.TinNumber = request.TinNumber;
                m.Occupation = request.Occupation;
                m.IdentityFrontPublicID = request.IdentityFrontPublicID;
                m.IdentityBackPublicID = request.IdentityBackPublicID;
                m.PassportPublicID = request.PassportPublicID;
                m.SSMPublicID = request.SSMPublicID;
                m.CreatedBy = request.CreatedBy;

                bool isValid = await m.AdminChangeAgentIdentity();

                if (!isValid)
                {
                    throw new BusinessException(m.Message, code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = (object)null
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code);
            }
        }

        [HttpPost]
        [Route("change-bank")]
        [Authorize(Roles = "SA,AD,OP")]
        public async Task<IHttpActionResult> ChangeAgentBank(AdminChangeAgentBankRequest request)
        {
            Request.Properties["AuditTitle"] = "Agent Bank Update";
            Request.Properties["AuditDescription"] = "Back Office user attempted to update an agent's bank information.";
            const string code = "ADMIN-CHANGE-AGENT-BANK";

            try
            {
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                AgentManagementAsync m = new AgentManagementAsync();

                m.UserID = request.UserID;
                m.MerchantID = merchantId;
                m.BankName = request.BankName;
                m.AccountName = request.AccountName;
                m.AccountNumber = request.AccountNumber;
                m.CreatedBy = request.CreatedBy;

                bool isValid = await m.AdminChangeAgentBank();

                if (!isValid)
                {
                    throw new BusinessException(m.Message, code);
                }

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = (object)null
                });
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, code);
            }
        }

        [HttpGet]
        [Route("get-profile")]
        [Authorize(Roles = "SA,AD,OP,AC")]
        public async Task<IHttpActionResult> GetProfile(long userId)
        {
            Request.Properties["AuditTitle"] = "Profile View";
            Request.Properties["AuditDescription"] = "Back Office user attempted to requested account profile information.";
            string merchantId = Convert.ToString(Request.Properties["MerchantID"]);
            ProfileAsync m = new ProfileAsync();
            m.UserID = userId;
            m.MerchantID = merchantId;

            var profile = await m.GetProfile();

            if (profile.Status != 0)
            {
                throw new BusinessException(profile.Message, "ADMIN-GET-PROFILE");
            }

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = "ADMIN-GET-PROFILE",
                Data = new
                {
                    profile.ReferralCode,
                    profile.AvatarUrl,
                    profile.CountryMobileCode,
                    profile.Mobile,
                    profile.Email,
                    profile.Fullname,
                    profile.Displayname,
                    profile.DateOfBirth,
                    profile.IdentityType,
                    profile.IdentityID,
                    profile.Country,
                    profile.Country_Domain,
                    profile.Postcode,
                    profile.City,
                    profile.State,
                    profile.Address_1,
                    profile.Address_2,
                    profile.Occupation,
                    profile.TinNumber,
                    profile.AllowTrustOverridingCommission,
                    profile.LastChangePasswordDate,
                    profile.TotalReferrals,
                    profile.BankName,
                    profile.BankNameDetail,
                    profile.AccountName,
                    profile.AccountNumber,
                    profile.SwiftCode,
                    profile.IcFront,
                    profile.IcBack,
                    profile.Passport,
                    profile.SsmCertificate,
                    profile.Introducer,
                    profile.Activities
                }
            });
        }

        [HttpPost]
        [Route("upload-kyc")]
        [Authorize(Roles = "SA,AD,OP")]
        public async Task<IHttpActionResult> UploadKycDocument(string merchantId, string documentType, long userId)
        {
            Request.Properties["AuditTitle"] = "KYC Document Uploaded";
            Request.Properties["AuditDescription"] = "Back Office user attempted to upload a KYC document.";

            const string code = "ADMIN-UPLOAD-KYC-DOCUMENT";
            string tempFilePath = null;

            try
            {
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
                    UserID = userId,
                    FileName = upload.OriginalFileName,
                    FileType = upload.ContentType,
                    FileSize = upload.FileSize,
                    UploadType = uploadType,
                    TempFilePath = upload.TempFilePath
                };

                bool isValid = await m.UploadKycDocumentAsync();

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
                MultipartUploadHelper.DeleteFileSafely(tempFilePath);
            }
        }

        [Authorize(Roles = "SA,AD,OP,AC")]
        [HttpGet]
        [Route("agent-list")]
        public async Task<IHttpActionResult> AgentList(
            int page = 1,
            int pageSize = 10,
            string keyword = null,
            string introducerKeyword = null,
            int? ranking = null)
        {
            Request.Properties["AuditTitle"] = "Agent List Viewed";
            Request.Properties["AuditDescription"] = "Back Office user requested the agent account listing.";
            const string code = "GET-AGENT-LIST";

            try
            {
                string merchantId = Convert.ToString(Request.Properties["MerchantID"]);

                if (page <= 0)
                {
                    page = 1;
                }

                if (pageSize <= 0)
                {
                    pageSize = 10;
                }

                if (pageSize > 100)
                {
                    pageSize = 100;
                }

                AgentManagementAsync m = new AgentManagementAsync();

                var agentLists = await m.GetAgentListAsync(
                    merchantId,
                    page,
                    pageSize,
                    keyword,
                    introducerKeyword,
                    ranking
                );

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        AgentLists = agentLists,
                        Pagination = new
                        {
                            Page = page,
                            PageSize = pageSize,
                            TotalRecords = m.TotalRecords,
                            TotalPages = m.TotalPages
                        }
                    }
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
        }

        [Authorize(Roles = "SA,AD")]
        [HttpPost]
        [Route("manual-ranking-preview")]
        public async Task<IHttpActionResult> ManualRankingPreview(ManualRankingRequest request)
        {
            if (request == null)
            {
                return Ok(new
                {
                    Status = 4,
                    Message = "Invalid request.",
                    Code = "RANKING-MANUAL-PREVIEW",
                    Data = (object)null
                });
            }

            var identity = User.Identity as ClaimsIdentity;
            string merchantID = identity?.FindFirst("MerchantID")?.Value;
            string userIDValue = identity?.FindFirst("UserID")?.Value;

            long userID;

            if (string.IsNullOrWhiteSpace(merchantID) || string.IsNullOrWhiteSpace(userIDValue) || !long.TryParse(userIDValue, out userID))
            {
                return Ok(new
                {
                    Status = 4,
                    Message = "Invalid user session.",
                    Code = "RANKING-MANUAL-PREVIEW",
                    Data = (object)null
                });
            }

            var ranking = new AgentRankingAsync();
            var result = await ranking.ManualRankingAsync(merchantID, request.MemberID, request.AdvanceRanking, userID, true);

            if (result == null)
            {
                return Ok(new
                {
                    Status = ranking.Status,
                    Message = ranking.Message,
                    Code = "RANKING-MANUAL-PREVIEW",
                    Data = (object)null
                });
            }

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = "RANKING-MANUAL-PREVIEW",
                Data = new
                {
                    MemberID = request.MemberID,
                    AdvanceRanking = request.AdvanceRanking,
                    TotalAffected = result.Count,
                    TotalAffectedUplines = result.Count(x => x.NetworkLevel > 0),
                    AffectedAgents = result
                }
            });
        }

        [Authorize(Roles = "SA,AD")]
        [HttpPost]
        [Route("manual-ranking-update")]
        public async Task<IHttpActionResult> ManualRankingUpdate(ManualRankingRequest request)
        {
            if (request == null)
            {
                return Ok(new
                {
                    Status = 4,
                    Message = "Invalid request.",
                    Code = "RANKING-MANUAL-UPDATE",
                    Data = (object)null
                });
            }

            var identity = User.Identity as ClaimsIdentity;
            string merchantID = identity?.FindFirst("MerchantID")?.Value;
            string userIDValue = identity?.FindFirst("UserID")?.Value;

            long userID;

            if (string.IsNullOrWhiteSpace(merchantID) || string.IsNullOrWhiteSpace(userIDValue) || !long.TryParse(userIDValue, out userID))
            {
                return Ok(new
                {
                    Status = 4,
                    Message = "Invalid user session.",
                    Code = "RANKING-MANUAL-UPDATE",
                    Data = (object)null
                });
            }

            var ranking = new AgentRankingAsync();
            var result = await ranking.ManualRankingAsync(merchantID, request.MemberID, request.AdvanceRanking, userID, false);

            if (result == null)
            {
                return Ok(new
                {
                    Status = ranking.Status,
                    Message = ranking.Message,
                    Code = "RANKING-MANUAL-UPDATE",
                    Data = (object)null
                });
            }

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = "RANKING-MANUAL-UPDATE",
                Data = new
                {
                    MemberID = request.MemberID,
                    AdvanceRanking = request.AdvanceRanking,
                    TotalAffected = result.Count,
                    TotalAffectedUplines = result.Count(x => x.NetworkLevel > 0),
                    AffectedAgents = result
                }
            });
        }
    }
}