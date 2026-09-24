using API_CPX.Class.Helper;
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
    public class AdministratorAsync : Base
    {
        public string MerchantID { get; set; }
        public long UserID { get; set; }
        public string Username { get; set; }
        public string Fullname { get; set; }
        public string RoleCode { get; set; }
        public string LoginPassword { get; set; }
        public string ConfirmLoginPassword { get; set; }
        public int TrustAccess { get; set; }
        public int WillAccess { get; set; }
        public int LoginStatus { get; set; }
        public string CreatedBy { get; set; }

        public async Task<bool> DeleteAdministrator()
        {
            Status = 0;

            using (var dbR = new Sandbox_BasedEntities())
            {
                // validate

                string isValidMerchant = await ValidationAsync.isValidMerchant(MerchantID);
                if (isValidMerchant != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = isValidMerchant;
                    return false;
                }

                var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
                if (memInfo == null)
                {
                    Status = 4;
                    Message = "Err : Invalid user account.";
                    return false;
                }

                var login = await dbR.tbl_Login.FirstOrDefaultAsync(a => a.MemberID == UserID);
                if (login == null)
                {
                    Status = 4;
                    Message = "Err : Invalid login record.";
                    return false;
                }

                if (Convert.ToInt64(CreatedBy) == UserID)
                {
                    Status = 4;
                    Message = "You are not allow deleted your own account.";
                    return false;
                }

                // process

                using (var transaction = dbR.Database.BeginTransaction())
                {
                    try
                    {
                        memInfo.IsDeleted = true;
                        memInfo.UpdatedAt = DateTime.Now;
                        memInfo.UpdatedBy = memInfo.RowID;
                        await dbR.SaveChangesAsync();

                        login.LoginStatus = false;
                        await dbR.SaveChangesAsync();

                        var appTokens = await dbR.tbl_AppToken.Where(a => a.MemberID == UserID).ToListAsync();
                        if (appTokens.Any())
                        {
                            dbR.tbl_AppToken.RemoveRange(appTokens);
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
                        Message = ex.Message.ToString();
                        return false;
                    }
                }
            }
        }

        public async Task<bool> AdminChangeProfile()
        {
            Status = 0;

            using (var dbR = new Sandbox_BasedEntities())
            {
                // validate

                string isValidMerchant = await ValidationAsync.isValidMerchant(MerchantID);
                if (isValidMerchant != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = isValidMerchant;
                    return false;
                }

                var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
                if (memInfo == null)
                {
                    Status = 4;
                    Message = "Err : Invalid user account.";
                    return false;
                }

                var memControl = await dbR.tbl_MemberControl.FirstOrDefaultAsync(a => a.MemberID == UserID);
                if (memControl == null)
                {
                    Status = 4;
                    Message = "Err : Invalid user control account.";
                    return false;
                }

                // username validate

                if (string.IsNullOrEmpty(Username))
                {
                    Status = 4;
                    Message = "Please enter the email address.";
                    return false;
                }

                if (!Validation.IsValidEmail(Username) || Username.Length > 250)
                {
                    Status = 4;
                    Message = "The email address is invalid.";
                    return false;
                }

                if (await dbR.tbl_MemberInfo.Where(a => a.RowID != UserID && a.Username.Equals(Username, StringComparison.CurrentCultureIgnoreCase)).CountAsync() > 0)
                {
                    Status = 4;
                    Message = "This email address is already taken. Please choose a different email address.";
                    return false;
                }

                // full name validate

                if (string.IsNullOrEmpty(Fullname))
                {
                    Status = 4;
                    Message = "Please enter the full name.";
                    return false;
                }

                if (Fullname.Length > 100)
                {
                    Status = 4;
                    Message = "Please enter the full name with not more than 100 characters.";
                    return false;
                }

                // process

                using (var transaction = dbR.Database.BeginTransaction())
                {
                    try
                    {
                        memInfo.Fullname = Fullname;
                        memInfo.displayName = Fullname;
                        memInfo.Username = Username.ToLower();
                        memInfo.Email = Username.ToLower();
                        memInfo.UpdatedAt = DateTime.Now;
                        memInfo.UpdatedBy = UserID;
                        await dbR.SaveChangesAsync();

                        memControl.ChangeProfile = 0;
                        await dbR.SaveChangesAsync();

                        transaction.Commit();
                        Message = "Success";
                        return true;
                    }
                    catch (Exception ex)
                    {
                        transaction.Rollback();
                        Status = 4;
                        Message = ex.Message.ToString();
                        return false;
                    }
                }
            }
        }

        public async Task<bool> EditAdministratorPassword()
        {
            Status = 0;

            using (var dbR = new Sandbox_BasedEntities())
            {
                // validate

                string isValidMerchant = await ValidationAsync.isValidMerchant(MerchantID);
                if (isValidMerchant != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = isValidMerchant;
                    return false;
                }

                var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
                if (memInfo == null)
                {
                    Status = 4;
                    Message = "Err : Invalid user account.";
                    return false;
                }

                var login = await dbR.tbl_Login.FirstOrDefaultAsync(a => a.MemberID == UserID);
                if (login == null)
                {
                    Status = 4;
                    Message = "Err : Invalid login record.";
                    return false;
                }

                string LoginPassValidate = await ValidationAsync.IsValidMemberLoginPassword(LoginPassword, ConfirmLoginPassword, UserID);
                if (LoginPassValidate != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = LoginPassValidate;
                    return false;
                }

                // process

                using (var transaction = dbR.Database.BeginTransaction())
                {
                    try
                    {
                        string oldPassword = login.LoginPassword;
                        string NewPassword = secure.Encrypt(LoginPassword, true);
                        string NewSecurityPassword = secure.Encrypt(LoginPassword, true);

                        login.LoginPassword = NewPassword;
                        login.SecondaryPassword = NewSecurityPassword;
                        await dbR.SaveChangesAsync();

                        dbR.tbl_log_ChangePassword.Add(new tbl_log_ChangePassword
                        {
                            MemberID = UserID,
                            ChangeFrom = memInfo.UserType,
                            ChangeType = "PASSWORD",
                            OldPass = oldPassword,
                            NewPass = NewPassword,
                            CreatedAt = DateTime.Now,
                            CreatedBy = CreatedBy.ToString()
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
                        Message = ex.Message.ToString();
                        return false;
                    }
                }
            }
        }

        public async Task<bool> EditProfile()
        {
            Status = 0;
            TrustAccess = 1;

            using (var dbR = new Sandbox_BasedEntities())
            {
                // validate

                string isValidMerchant = await ValidationAsync.isValidMerchant(MerchantID);
                if (isValidMerchant != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = isValidMerchant;
                    return false;
                }

                var memInfo = await dbR.tbl_MemberInfo.FirstOrDefaultAsync(a => a.RowID == UserID && a.IsDeleted == false);
                if (memInfo == null)
                {
                    Status = 4;
                    Message = "Err : Invalid user account.";
                    return false;
                }

                var memControl = await dbR.tbl_MemberControl.FirstOrDefaultAsync(a => a.MemberID == UserID);
                if (memControl == null)
                {
                    Status = 4;
                    Message = "Err : Invalid user control account.";
                    return false;
                }

                var login = await dbR.tbl_Login.FirstOrDefaultAsync(a => a.MemberID == UserID);
                if (login == null)
                {
                    Status = 4;
                    Message = "Err : Invalid login record.";
                    return false;
                }

                // role validate

                if (string.IsNullOrEmpty(RoleCode))
                {
                    Status = 4;
                    Message = "Please select the administrator role.";
                    return false;
                }

                var role = await dbR.tbl_Role.FirstOrDefaultAsync(a => a.RoleCode == RoleCode && a.IsDeleted == 0);
                if (role == null)
                {
                    Status = 4;
                    Message = "Err : Invalid administrator role.";
                    return false;
                }

                // username validate

                if (string.IsNullOrEmpty(Username))
                {
                    Status = 4;
                    Message = "Please enter the email address.";
                    return false;
                }

                if (!Validation.IsValidEmail(Username) || Username.Length > 250)
                {
                    Status = 4;
                    Message = "The email address is invalid.";
                    return false;
                }

                if (await dbR.tbl_MemberInfo.Where(a => a.RowID != UserID && a.Username.Equals(Username, StringComparison.CurrentCultureIgnoreCase)).CountAsync() > 0)
                {
                    Status = 4;
                    Message = "This email address is already taken. Please choose a different email address.";
                    return false;
                }

                // full name validate

                if (string.IsNullOrEmpty(Fullname))
                {
                    Status = 4;
                    Message = "Please enter the full name.";
                    return false;
                }

                if (Fullname.Length > 100)
                {
                    Status = 4;
                    Message = "Please enter the full name with not more than 100 characters.";
                    return false;
                }

                // process

                using (var transaction = dbR.Database.BeginTransaction())
                {
                    try
                    {
                        memInfo.Fullname = Fullname;
                        memInfo.displayName = Fullname;
                        memInfo.Username = Username.ToLower();
                        memInfo.Email = Username.ToLower();
                        memInfo.UserType = role.UserType;
                        memInfo.UpdatedAt = DateTime.Now;
                        memInfo.UpdatedBy = UserID;
                        await dbR.SaveChangesAsync();

                        memControl.ChangeProfile = 0;
                        memControl.TrustAccess = TrustAccess;
                        memControl.WillAccess = WillAccess;
                        await dbR.SaveChangesAsync();

                        login.LoginStatus = LoginStatus == 0 ? false : true;
                        login.LoginRole = RoleCode;
                        await dbR.SaveChangesAsync();

                        transaction.Commit();
                        Message = "Success";
                        return true;
                    }
                    catch (Exception ex)
                    {
                        transaction.Rollback();
                        Status = 4;
                        Message = ex.Message.ToString();
                        return false;
                    }
                }
            }
        }

        public async Task<bool> AddAdministrator()
        {
            Status = 0;
            TrustAccess = 1;
            var errorContext = ErrorLogContext.GetErrorContext();

            using (var dbR = new Sandbox_BasedEntities())
            {
                // validate

                string isValidMerchant = await ValidationAsync.isValidMerchant(MerchantID);
                if (isValidMerchant != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = isValidMerchant;
                    return false;
                }

                // role validate

                if (string.IsNullOrEmpty(RoleCode))
                {
                    Status = 4;
                    Message = "Please select the administrator role.";
                    return false;
                }

                var role = await dbR.tbl_Role.FirstOrDefaultAsync(a => a.RoleCode == RoleCode && a.IsDeleted == 0);
                if (role == null)
                {
                    Status = 4;
                    Message = "Err : Invalid administrator role.";
                    return false;
                }

                // username validate

                if (string.IsNullOrEmpty(Username))
                {
                    Status = 4;
                    Message = "Please enter the email address.";
                    return false;
                }

                if (!Validation.IsValidEmail(Username) || Username.Length > 250)
                {
                    Status = 4;
                    Message = "The email address is invalid.";
                    return false;
                }

                if (await dbR.tbl_MemberInfo.Where(a => a.Username.Equals(Username, StringComparison.CurrentCultureIgnoreCase)).CountAsync() > 0)
                {
                    Status = 4;
                    Message = "This email address is already taken. Please choose a different email address.";
                    return false;
                }

                // full name validate

                if (string.IsNullOrEmpty(Fullname))
                {
                    Status = 4;
                    Message = "Please enter the full name.";
                    return false;
                }

                if (Fullname.Length > 100)
                {
                    Status = 4;
                    Message = "Please enter the full name with not more than 100 characters.";
                    return false;
                }

                // login password

                string LoginPassValidate = await ValidationAsync.IsValidMemberLoginPassword(LoginPassword, ConfirmLoginPassword, 0);
                if (LoginPassValidate != ProjectProperties.Return_Success)
                {
                    Status = 4;
                    Message = LoginPassValidate;
                    return false;
                }

                // sso access permission

                if (WillAccess != 0 && WillAccess != 1)
                {
                    Status = 4;
                    Message = "Err : Invalid sso access permission value.";
                    return false;
                }

                // process

                string strSQL = string.Empty;
                string IP = CommonUtil.GetIP();
                string NewPassword = secure.Encrypt(LoginPassword, true);
                string NewSecurityPassword = secure.Encrypt(LoginPassword, true);

                strSQL = $@"
                        EXEC [USP_AddAdminAccount]
                        @Username=N'{Username.ToLower()}',
                        @Email=N'{Username.ToLower()}',
                        @Fullname=N'{Fullname}',
                        @Password=N'{NewPassword}',
                        @SecurityPassword=N'{NewSecurityPassword}',
                        @LoginRole='{RoleCode}',
                        @TrustAccess={TrustAccess},
                        @WillAccess={WillAccess},
                        @MerchantID='{MerchantID}',
                        @CreatedBy='{CreatedBy}'";
                string LogStrSQL = CommonUtil.CleanSql(strSQL);
                await LogUtilAsync.logActionAsync(LogStrSQL, "Administrator Register", "", errorContext);

                using (var tran = dbR.Database.BeginTransaction())
                {
                    try
                    {
                        long _memberId = await dbR.Database.SqlQuery<long>(strSQL).FirstOrDefaultAsync();
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
    }
}