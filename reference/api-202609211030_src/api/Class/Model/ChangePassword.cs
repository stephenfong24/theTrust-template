using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Util;

namespace API_CPX.Class.Model
{
    public class ChangePassword : Base
    {
        public async Task<bool> ChangeLoginPassword(long UserID, string OldLoginPassword, string NewLoginPassword, string NewConfirmLoginPassword, string MerchantID)
        {
            Status = 0;
            string ChangeFrom = string.Empty;

            using (var dbR = new Sandbox_BasedEntities())
            {
                try
                {
                    string isValidMerchant = await ValidationAsync.isValidMerchant(MerchantID);
                    if (isValidMerchant != ProjectProperties.Return_Success)
                    {
                        Status = 4;
                        Message = isValidMerchant;
                        return false;
                    }

                    if (string.IsNullOrWhiteSpace(OldLoginPassword))
                    {
                        Status = 4;
                        Message = "Please enter your current password.";
                        return false;
                    }

                    if (string.IsNullOrWhiteSpace(NewLoginPassword))
                    {
                        Status = 4;
                        Message = "Please enter a new password.";
                        return false;
                    }

                    if (string.IsNullOrWhiteSpace(NewConfirmLoginPassword))
                    {
                        Status = 4;
                        Message = "Please confirm your new password.";
                        return false;
                    }

                    var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
                    if (memInfo == null)
                    {
                        Status = 4;
                        Message = "Err : Invalid user!";
                        return false;
                    }

                    bool hasMerchantAccess = await dbR.tbl_Reference.AnyAsync(a => a.MemberID == UserID && a.MerchantID == MerchantID);
                    if (!hasMerchantAccess)
                    {
                        Status = 4;
                        Message = "Err : Account is not registered under this merchant.";
                        return false;
                    }

                    if (ProjectProperties.Member_Enabled_CheckOldPassword)
                    {
                        if (!await ValidationAsync.IsValidPinAsync(UserID, OldLoginPassword.Trim()))
                        {
                            Status = 4;
                            Message = "The current password you entered is incorrect. Please try again.";
                            return false;
                        }
                    }

                    string loginPassValidation = await ValidationAsync.IsValidMemberLoginPassword(NewLoginPassword, NewConfirmLoginPassword, UserID);
                    if (loginPassValidation != ProjectProperties.Return_Success)
                    {
                        Status = 4;
                        Message = loginPassValidation;
                        return false;
                    }

                    var login = await dbR.tbl_Login.FirstOrDefaultAsync(a => a.MemberID == UserID);
                    if (login == null)
                    {
                        Status = 4;
                        Message = "Err : Login Account Not Found!";
                        return false;
                    }

                    string oldPassword = login.LoginPassword;
                    string encryptedNewPassword = secure.Encrypt(secure.RC(NewLoginPassword.Trim()), true);

                    using (var transaction = dbR.Database.BeginTransaction())
                    {
                        try
                        {
                            login.LoginPassword = encryptedNewPassword;
                            await dbR.SaveChangesAsync();

                            dbR.tbl_log_ChangePassword.Add(new tbl_log_ChangePassword
                            {
                                MemberID = UserID,
                                ChangeFrom = memInfo.UserType,
                                ChangeType = "PASSWORD",
                                OldPass = oldPassword,
                                NewPass = encryptedNewPassword,
                                CreatedAt = DateTime.Now,
                                CreatedBy = UserID.ToString()
                            });
                            await dbR.SaveChangesAsync();

                            var control = await dbR.tbl_MemberControl.FirstOrDefaultAsync(a => a.MemberID == UserID && a.ChangePass == 1);
                            if (control != null)
                            {
                                control.ChangePass = 0;
                                await dbR.SaveChangesAsync();
                            }

                            transaction.Commit();
                            Message = "Success";
                            return true;
                        }
                        catch (Exception ex)
                        {
                            transaction.Rollback();
                            Status = 4;
                            Message = ex.Message;
                            return false;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Status = 4;
                    Message = ex.Message;
                    return false;
                }
            }
        }

        public async Task<bool> AdminChangeAgentLoginPassword(long UserID, string NewLoginPassword, string NewConfirmLoginPassword, string MerchantID, string CreatedBy)
        {
            Status = 0;
            string ChangeFrom = string.Empty;

            using (var dbR = new Sandbox_BasedEntities())
            {
                try
                {
                    string isValidMerchant = await ValidationAsync.isValidMerchant(MerchantID);
                    if (isValidMerchant != ProjectProperties.Return_Success)
                    {
                        Status = 4;
                        Message = isValidMerchant;
                        return false;
                    }

                    if (string.IsNullOrWhiteSpace(NewLoginPassword))
                    {
                        Status = 4;
                        Message = "Please enter a new password.";
                        return false;
                    }

                    if (string.IsNullOrWhiteSpace(NewConfirmLoginPassword))
                    {
                        Status = 4;
                        Message = "Please confirm your new password.";
                        return false;
                    }

                    var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
                    if (memInfo == null)
                    {
                        Status = 4;
                        Message = "Err : Invalid user!";
                        return false;
                    }

                    bool hasMerchantAccess = await dbR.tbl_Reference.AnyAsync(a => a.MemberID == UserID && a.MerchantID == MerchantID);
                    if (!hasMerchantAccess)
                    {
                        Status = 4;
                        Message = "Err : Account is not registered under this merchant.";
                        return false;
                    }

                    string loginPassValidation = await ValidationAsync.IsValidMemberLoginPassword(NewLoginPassword, NewConfirmLoginPassword, UserID);
                    if (loginPassValidation != ProjectProperties.Return_Success)
                    {
                        Status = 4;
                        Message = loginPassValidation;
                        return false;
                    }

                    var login = await dbR.tbl_Login.FirstOrDefaultAsync(a => a.MemberID == UserID);
                    if (login == null)
                    {
                        Status = 4;
                        Message = "Err : Login Account Not Found!";
                        return false;
                    }

                    string oldPassword = login.LoginPassword;
                    string encryptedNewPassword = secure.Encrypt(secure.RC(NewLoginPassword.Trim()), true);

                    using (var transaction = dbR.Database.BeginTransaction())
                    {
                        try
                        {
                            login.LoginPassword = encryptedNewPassword;
                            await dbR.SaveChangesAsync();

                            dbR.tbl_log_ChangePassword.Add(new tbl_log_ChangePassword
                            {
                                MemberID = UserID,
                                ChangeFrom = memInfo.UserType,
                                ChangeType = "PASSWORD",
                                OldPass = oldPassword,
                                NewPass = encryptedNewPassword,
                                CreatedAt = DateTime.Now,
                                CreatedBy = CreatedBy
                            });
                            await dbR.SaveChangesAsync();

                            transaction.Commit();
                            Message = "Success";
                            return true;
                        }
                        catch (Exception ex)
                        {
                            transaction.Rollback();
                            Status = 4;
                            Message = ex.Message;
                            return false;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Status = 4;
                    Message = ex.Message;
                    return false;
                }
            }
        }
    }
}