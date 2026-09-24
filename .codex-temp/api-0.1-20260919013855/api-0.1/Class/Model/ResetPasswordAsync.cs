using API_CPX.Class.Helper;
using API_CPX.Context;
using Newtonsoft.Json;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using Util;

namespace API_CPX.Class.Model
{
    public class ResetPasswordAsync : Base
    {
        public async Task<bool> RequestResetPassword(string MerchantID, string Username)
        {
            string publicId = Guid.NewGuid().ToString().ToLower();
            string hangfireUrls = AppSettingsHelper.HangfireUrl;
            string memberUrls = AppSettingsHelper.MemberUrl;
            var errorContext = ErrorLogContext.GetErrorContext();

            using (Sandbox_BasedEntities dbR = new Sandbox_BasedEntities())
            {
                string isValidMerchant = await ValidationAsync.isValidMerchant(MerchantID);
                if (isValidMerchant != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = isValidMerchant;
                    return false;
                }

                var memInfo = await dbR.tbl_MemberInfo.Where(a => a.Username == Username && a.IsDeleted == false).FirstOrDefaultAsync().ConfigureAwait(false);
                if (memInfo == null)
                {
                    Status = 4;
                    Message = "Please enter a valid email address.";
                    return false;
                }

                DateTime now = DateTime.Now;
                DateTime oneHourAgo = now.AddHours(-1);
                long MemberID = memInfo.RowID;
                string ChangeType = "RESET-PASSWORD";
                string IP = errorContext.IP;
                string guid = Guid.NewGuid().ToString("N").ToLower();
                string signature = CommonUtil.GetHashSha256(Username + guid);
                DateTime ExpiredAt = DateTime.Now.AddMinutes(1440);

                // Latest request for this member

                var latestRequest = await dbR.tbl_ResetPassword.Where(a => a.MemberID == MemberID && a.ChangeType == ChangeType).OrderByDescending(a => a.CreatedAt).FirstOrDefaultAsync();
                if (latestRequest != null)
                {
                    double secondsSinceLastRequest = (now - latestRequest.CreatedAt).TotalSeconds;
                    if (secondsSinceLastRequest < 60)
                    {
                        Status = 4;
                        Message = "A password reset request was recently sent. Please wait before requesting another.";
                        return false;
                    }
                }

                int requestCount = await dbR.tbl_ResetPassword.CountAsync(a => a.MemberID == MemberID && a.ChangeType == ChangeType && a.CreatedAt >= oneHourAgo);
                if (requestCount >= 5)
                {
                    Status = 4;
                    Message = "Too many password reset requests. Please try again later.";
                    return false;
                }

                // process

                using (var dbContext = dbR.Database.BeginTransaction())
                {
                    try
                    {
                        // mark old unused requests
                        var unUsed = await dbR.tbl_ResetPassword
                                              .Where(a => a.MemberID == MemberID &&
                                                          a.ChangeType == ChangeType &&
                                                          a.Status == 0)
                                              .ToListAsync();

                        unUsed.ForEach(a =>
                        {
                            a.Status = 4;
                            a.Updated_IP = IP;
                            a.UpdatedBy = MemberID.ToString();
                            a.UpdatedAt = DateTime.Now;
                        });
                        await dbR.SaveChangesAsync();

                        // add new request
                        dbR.tbl_ResetPassword.Add(new tbl_ResetPassword
                        {
                            ChangeType = ChangeType,
                            MemberID = MemberID,
                            Email = memInfo.Username,
                            Expired = ExpiredAt,
                            UniqueID = guid,
                            Signature = signature,
                            CreatedAt = DateTime.Now,
                            CreatedBy = MemberID.ToString(),
                            IP = IP,
                            Status = 0
                        });

                        await dbR.SaveChangesAsync();

                        // send email

                        string subjects = "Action Required: Password Reset Request";
                        string receiverEmail = Username.ToLower();
                        string templateCode = "request-reset-password";
                        string jobType = "INSTANT";
                        string resetUrl = $"{memberUrls}/reset-password/{guid}";

                        var templateData = new
                        {
                            Fullname = memInfo.Fullname,
                            ResetPassword_Url = resetUrl
                        };
                        string templateDataJson = JsonConvert.SerializeObject(templateData);

                        dbR.tbl_EmailQueue.Add(new tbl_EmailQueue
                        {
                            MerchantID = MerchantID,
                            PublicID = publicId,
                            JobType = jobType,
                            ReceiverEmail = receiverEmail,
                            Subject = subjects,
                            TemplateCode = templateCode,
                            TemplateDataJson = templateDataJson,
                            Status = 0,
                            RetryCount = 0,
                            CreatedDate = DateTime.Now
                        });
                        await dbR.SaveChangesAsync();

                        dbContext.Commit();
                    }
                    catch (Exception ex)
                    {
                        dbContext.Rollback();
                        Status = 4;
                        Message = ex.Message;
                        return false;
                    }
                }

                await HangfireHelper.TriggerInstantEmail(publicId);

                Status = 0;
                Message = "Success";
                return true;
            }
        }

        public async Task<bool> RequestChangePassword(string MerchantID, string UniqueID, string NewLoginPassword, string NewConfirmPassword)
        {
            string publicId = Guid.NewGuid().ToString().ToLower();
            string hangfireUrls = AppSettingsHelper.HangfireUrl;
            string memberUrls = AppSettingsHelper.MemberUrl;

            using (Sandbox_BasedEntities dbR = new Sandbox_BasedEntities())
            {
                string isValidMerchant = await ValidationAsync.isValidMerchant(MerchantID);
                if (isValidMerchant != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = isValidMerchant;
                    return false;
                }

                // hash validate

                tbl_ResetPassword resetPass = dbR.tbl_ResetPassword.Where(a => a.UniqueID == UniqueID && a.Status == 0).FirstOrDefault();
                if (resetPass == null)
                {
                    Status = 4;
                    Message = "The reset password link is invalid.";
                    return false;
                }

                if (resetPass.Expired <= DateTime.Now)
                {
                    Status = 4;
                    Message = "The reset password link has expired.";
                    return false;
                }

                // new password validate

                string LoginPassValidate = await ValidationAsync.IsValidMemberLoginPassword(NewLoginPassword, NewConfirmPassword, 0);
                if (LoginPassValidate != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = LoginPassValidate;
                    return false;
                }

                // validate

                tbl_MemberInfo memInfo = dbR.tbl_MemberInfo.Where(a => a.RowID == resetPass.MemberID).FirstOrDefault();
                if (memInfo == null)
                {
                    Status = 4;
                    Message = "Err : Account not found!";
                    return false;
                }

                tbl_Login login = dbR.tbl_Login.Where(a => a.MemberID == resetPass.MemberID).FirstOrDefault();
                if (login == null)
                {
                    Status = 4;
                    Message = "Err : Account login stored record not found!";
                    return false;
                }

                // signature

                string hash = CommonUtil.GetHashSha256(memInfo.Email + UniqueID);

                if (hash != resetPass.Signature)
                {
                    Status = 4;
                    Message = "Err : Invalid signature!";
                    return false;
                }

                // process

                string IP = CommonUtil.GetIP();
                string NewPassword = secure.Encrypt(NewLoginPassword, true);
                string NewSecurityPassword = secure.Encrypt(NewLoginPassword, true);

                using (var dbContext = dbR.Database.BeginTransaction())
                {
                    try
                    {
                        login.LoginPassword = NewPassword;
                        login.SecondaryPassword = NewPassword;
                        dbR.SaveChanges();

                        resetPass.UpdatedAt = DateTime.Now;
                        resetPass.UpdatedBy = resetPass.MemberID.ToString();
                        resetPass.Updated_IP = IP;
                        resetPass.Status = 9;
                        dbR.SaveChanges();

                        // email queue

                        string subjects = "Action Required: Your Password Has Been Reset Successfully";
                        string receiverEmail = memInfo.Email;
                        string templateCode = "reset-password-success";
                        string jobType = "INSTANT";

                        var templateData = new
                        {
                            Fullname = memInfo.Fullname,
                            Login_Url = memberUrls + "/login"
                        };
                        string templateDataJson = JsonConvert.SerializeObject(templateData);

                        dbR.tbl_EmailQueue.Add(new tbl_EmailQueue
                        {
                            MerchantID = MerchantID,
                            PublicID = publicId,
                            JobType = jobType,
                            ReceiverEmail = receiverEmail,
                            Subject = subjects,
                            TemplateCode = templateCode,
                            TemplateDataJson = templateDataJson,
                            Status = 0,
                            RetryCount = 0,
                            CreatedDate = DateTime.Now
                        });
                        await dbR.SaveChangesAsync();

                        // commit
                        dbContext.Commit();
                    }
                    catch (Exception ex)
                    {
                        dbContext.Rollback();
                        Status = 4;
                        Message = ex.Message;
                        return false;
                    }
                }

                Message = "Success";
                return true;
            }
        }
    }
}
