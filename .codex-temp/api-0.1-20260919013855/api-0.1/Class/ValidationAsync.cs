using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Util;

namespace API_CPX.Class
{
    public class ValidationAsync
    {
        public static async Task<string> isValidMerchant(string merchantId)
        {
            if (string.IsNullOrEmpty(merchantId))
            {
                return "Err : Merchant is empty.";
            }

            using (var dbR = new Sandbox_BasedEntities())
            {
                var merchant = await dbR.tbl_Merchant.FirstOrDefaultAsync(a => a.MerchantID == merchantId);
                if (merchant == null)
                {
                    return "Err : Invalid merchant!";
                }
            }

            return ProjectProperties.Return_Success;
        }

        public static async Task<bool> IsValidPinAsync(long memberId, string pin)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                string encryPassword = secure.RC(secure.Encrypt(pin, true));

                var tmp = await dbR.tbl_Login.Where(a => a.MemberID == memberId).Select(x => new { x.LoginPassword }).FirstOrDefaultAsync().ConfigureAwait(false);
                if (tmp == null)
                    return false;

                var mi = await dbR.tbl_MemberInfo.Where(a => a.RowID == memberId).Select(x => new { x.Username }).FirstOrDefaultAsync().ConfigureAwait(false);

                string username = mi?.Username ?? "N/A";

                if (secure.Decrypt(tmp.LoginPassword, true).Equals(pin))
                {
                    return true;
                }
                else
                {
                    string tmpx = string.Format("memberid={0}|username={1},pwd={2}", memberId, username, pin);
                    LogUtil.logError("invalid pin", tmpx);
                    return false;
                }
            }
        }

        public static async Task<string> IsValidMemberLoginPassword(string newLoginPassword, string newConfirmLoginPassword, long memberID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                if (!ValidationAsync.isValidMemberPasswordCriteria(newLoginPassword.Trim()))
                {
                    return "Password must be 6 to 30 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
                }

                if (!newLoginPassword.Equals(newConfirmLoginPassword))
                {
                    return "Password not match.";
                }

                if (memberID != 0)
                {
                    var loginRow = await dbR.tbl_Login
                        .Where(a => a.MemberID == memberID)
                        .FirstOrDefaultAsync()
                        .ConfigureAwait(false);

                    if (loginRow == null)
                    {
                        return "Err : Account Not Found!";
                    }

                    string oldPassword = loginRow.LoginPassword;
                    string decryptedOldPassword = secure.Decrypt(oldPassword, true);
                    string encryptedNewPassword = secure.Encrypt(secure.RC(newLoginPassword.Trim()), true);

                    if (!ProjectProperties.Member_ChangeLoginPassword_CanSameWithOld)
                    {
                        if (decryptedOldPassword.Equals(newLoginPassword, StringComparison.OrdinalIgnoreCase))
                        {
                            return "You have already used that password, please try another.";
                        }
                    }

                    if (!ProjectProperties.Member_ChangeLoginPassword_CanUsedRecently)
                    {
                        int count = 0;

                        var historyList = await dbR.tbl_log_ChangePassword
                            .Where(a => a.MemberID == memberID && a.ChangeType == "PASSWORD")
                            .ToListAsync()
                            .ConfigureAwait(false);

                        historyList.ForEach(a =>
                        {
                            string pass1 = secure.Decrypt(a.NewPass, true);
                            string pass2 = secure.Decrypt(a.OldPass, true);
                            if (pass1.Equals(newLoginPassword, StringComparison.OrdinalIgnoreCase) ||
                                pass2.Equals(newLoginPassword, StringComparison.OrdinalIgnoreCase))
                            {
                                count++;
                            }
                        });

                        if (count != 0)
                        {
                            return "Please enter a different password.";
                        }
                    }
                }

                return ProjectProperties.Return_Success;
            }
        }

        public static bool isValidMemberPasswordCriteria(string password)
        {
            if (string.IsNullOrEmpty(password))
                return false;

            if (password.Length < ProjectProperties.Member_Min_Password || password.Length > ProjectProperties.Member_Max_Password)
                return false;

            if (!password.Any(char.IsLower))
                return false;

            if (!password.Any(char.IsUpper))
                return false;

            if (!password.Any(char.IsDigit))
                return false;

            if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
                return false;

            return true;
        }
    }
}