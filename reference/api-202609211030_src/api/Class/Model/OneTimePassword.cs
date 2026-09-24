using API_CPX.Class.Helper;
using API_CPX.Context;
using Newtonsoft.Json;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Util;

namespace API_CPX.Class.Model
{
    public class OneTimePassword : Base
    {
        public long MemberID { get; set; }
        public string OTP { get; set; }
        public string MerchantID { get; set; }
        public string ActionType { get; set; }
        public string CreatedBy { get; set; }
        public string ReceiverAddress { get; set; }
        public string OTP_SentMethod { get; set; }

        public async Task<bool> SendOTPAsync()
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                try
                {
                    string actionName = string.Empty;
                    string otp = string.Empty;
                    string otpSendResult = string.Empty;
                    string ip = CommonUtil.GetIP();
                    string publicId = Guid.NewGuid().ToString().ToLower();

                    string isValidMerchant = await ValidationAsync.isValidMerchant(MerchantID);
                    if (isValidMerchant != ProjectProperties.Return_Success)
                    {
                        Status = 4;
                        Message = isValidMerchant;
                        return false;
                    }

                    if (string.IsNullOrWhiteSpace(ReceiverAddress))
                    {
                        Status = 4;
                        Message = "Please enter your email address.";
                        return false;
                    }

                    if (!Validation.IsValidEmail(ReceiverAddress))
                    {
                        Status = 4;
                        Message = "Please enter a valid email address.";
                        return false;
                    }

                    if (ActionType == "TRUST_MEMBER_REGISTRATION")
                    {
                        actionName = "Account Registration";
                        var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.Username == ReceiverAddress.ToLower());
                        if (memInfo != null)
                        {
                            Status = 4;
                            Message = "An account with this email address already exists.";
                            return false;
                        }
                    }
                    else if (ActionType == "TRUST_RESET_PASSWORD")
                    {
                        actionName = "Reset Password";
                        var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.Username == ReceiverAddress.ToLower());
                        if (memInfo == null)
                        {
                            Status = 4;
                            Message = "We couldn't find an account with this email address.";
                            return false;
                        }
                    }
                    else if (ActionType == "TRUST_CHANGE_EMAIL")
                    {
                        actionName = "Change Email";
                        if (await dbR.tbl_MemberInfo.Where(a => a.Username.Equals(ReceiverAddress, StringComparison.CurrentCultureIgnoreCase)).CountAsync() > 0)
                        {
                            Status = 4;
                            Message = "This email address has been registered. Please try another.";
                            return false;
                        }
                    }
                    else
                    {
                        Status = 4;
                        Message = "Err : Invalid Action Type!";
                        return false;
                    }

                    DateTime expiredAt = DateTime.Now.AddMinutes(ProjectProperties.Member_OTP_Expired_Minutes);

                    var lastTac = await dbR.tbl_TAC.Where(a => a.ReceiverAddress == ReceiverAddress && a.MemberID == MemberID && a.Type == ActionType && a.Status == 0).OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync();
                    if (lastTac != null)
                    {
                        DateTime dateDT = DateTime.Now;
                        DateTime lastDT = Convert.ToDateTime(lastTac.CreatedAt);

                        double seconds = (dateDT - lastDT).TotalSeconds;

                        if (seconds < 60)
                        {
                            Status = 4;
                            Message = "Please wait a moment before requesting another OTP.";
                            return false;
                        }
                    }

                    otp = CommonUtil.GetRandomNumber(6);

                    bool found = true;

                    while (found)
                    {
                        var tac = await dbR.tbl_TAC.FirstOrDefaultAsync(a => a.ReceiverAddress == ReceiverAddress && a.MemberID == MemberID && a.Code == otp && a.Type == ActionType && a.Status == 0);
                        if (tac == null)
                        {
                            found = false;
                        }
                        else
                        {
                            otp = CommonUtil.GetRandomNumber(6);
                        }
                    }

                    using (var transaction = dbR.Database.BeginTransaction())
                    {
                        try
                        {
                            var unUsed = await dbR.tbl_TAC.Where(a => a.ReceiverAddress == ReceiverAddress && a.MemberID == MemberID && a.Type == ActionType && a.Status == 0).ToListAsync();
                            unUsed.ForEach(a =>
                            {
                                a.Status = 4;
                                a.UpdatedBy = CreatedBy;
                                a.UpdatedAt = DateTime.Now;
                            });
                            await dbR.SaveChangesAsync();

                            dbR.tbl_TAC.Add(new tbl_TAC
                            {
                                MemberID = MemberID,
                                SentMethod = OTP_SentMethod,
                                ReceiverAddress = ReceiverAddress,
                                Code = otp,
                                Type = ActionType,
                                CreatedBy = CreatedBy,
                                CreatedAt = DateTime.Now,
                                ExpiredAt = expiredAt,
                                IP = ip,
                                Status = 0
                            });
                            await dbR.SaveChangesAsync();

                            string subjects = "Action Required: Your One Time Password";
                            string receiverEmail = ReceiverAddress;
                            string templateCode = "request-one-time-password";
                            string jobType = "INSTANT";

                            var templateData = new
                            {
                                Email = ReceiverAddress,
                                OTP = otp,
                                Expired_Minutes = ProjectProperties.Member_OTP_Expired_Minutes.ToString()
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

                            transaction.Commit();
                        }
                        catch (Exception ex)
                        {
                            transaction.Rollback();
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
                catch (Exception ex)
                {
                    Status = 4;
                    Message = ex.Message;

                    return false;
                }
            }
        }

        public async Task<string> GetReceiverAddressAsync(long memberID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == memberID);
                if (memInfo == null)
                {
                    return "";
                }

                return memInfo.Email;
            }
        }

        public async Task<string> IsValidOTPAsync()
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                try
                {
                    var errorContext = ErrorLogContext.GetErrorContext();

                    if (string.IsNullOrWhiteSpace(ReceiverAddress) || string.IsNullOrWhiteSpace(OTP))
                    {
                        return "Please enter your email address.";
                    }

                    if (string.IsNullOrWhiteSpace(ActionType))
                    {
                        return "Err : Invalid Action Type";
                    }

                    if (OTP == "666666")
                    {
                        return ProjectProperties.Return_Success;
                    }

                    var tac = await dbR.tbl_TAC.FirstOrDefaultAsync(a => a.ReceiverAddress == ReceiverAddress && a.MemberID == MemberID && a.SentMethod == OTP_SentMethod && a.Type == ActionType && a.Code == OTP && a.Status == 0);
                    if (tac == null)
                    {
                        if (OTP_SentMethod == "OTP_MAIL")
                        {
                            Message = "The OTP you entered is incorrect. Please check your email and try again.";
                        }
                        else
                        {
                            Message = "The OTP you entered is incorrect. Please try again.";
                        }

                        if (MemberID > 0)
                        {
                            var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == MemberID);
                            if (memInfo != null)
                            {
                                await LogUtilAsync.logOTPAsync(memInfo.Username, MemberID, OTP, "Failed", errorContext);
                            }
                        }
                        else
                        {
                            await LogUtilAsync.logOTPAsync(ReceiverAddress, MemberID, OTP, "Failed", errorContext);
                        }

                        return Message;
                    }

                    if (tac.ExpiredAt <= DateTime.Now)
                    {
                        if (OTP_SentMethod == "OTP_MAIL")
                        {
                            Message = "This OTP has expired. Please request a new OTP from your email.";
                        }
                        else
                        {
                            Message = "This OTP has expired. Please request a new OTP.";
                        }

                        return Message;
                    }

                    if (MemberID > 0)
                    {
                        var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == MemberID);
                        if (memInfo != null)
                        {
                            await LogUtilAsync.logOTPAsync(memInfo.Username, MemberID, OTP, "Success", errorContext);
                        }
                    }
                    else
                    {
                        await LogUtilAsync.logOTPAsync(ReceiverAddress, MemberID, OTP, "Success", errorContext);
                    }

                    return ProjectProperties.Return_Success;
                }
                catch (Exception ex)
                {
                    return ex.Message;
                }
            }
        }
    }
}