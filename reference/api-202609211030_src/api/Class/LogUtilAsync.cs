using API_CPX.Class;
using API_CPX.Class.Helper;
using API_CPX.Context;
using API_CPX.Model;
using Newtonsoft.Json.Linq;
using System;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web;
using Util;

public static class LogUtilAsync
{
    public static async Task LogLoginAsync(string user, long userid, string pwd, string loginStatus, ErrorLogContext context)
    {
        using (var dbR = new Sandbox_BasedEntities())
        {
            try
            {
                dbR.tbl_log_login.Add(new tbl_log_login
                {
                    log_user = user,
                    log_userId = userid,
                    log_ip = context?.IP ?? "",
                    log_sessionId = context?.SessionID ?? "",
                    log_action = loginStatus,
                    log_pwdAttempt = secure.RC(secure.Encrypt(pwd, true)),
                    log_browser = context?.Browser ?? "",
                    log_version = context?.Version ?? "",
                    log_datetime = DateTime.Now,
                    log_credit = loginStatus.ToUpper() == "FAILED" ? 1 : 1,
                    log_clearcredit = 1
                });
                await dbR.SaveChangesAsync();

                if (loginStatus.Trim().ToUpper() == "SUCCESS")
                {
                    if (userid > 0)
                    {
                        var login = await dbR.tbl_Login.FirstOrDefaultAsync(a => a.MemberID == userid);
                        if (login != null)
                        {
                            login.LastTimeLogin = DateTime.Now;
                            login.LastLoginIP = context?.IP ?? "";
                            await dbR.SaveChangesAsync();
                        }
                    }

                    var unUsed = await dbR.tbl_log_SecurityAttemp
                        .Where(a => a.log_user == user && a.log_credit > 0 && a.log_clearcredit <= 0)
                        .ToListAsync();

                    unUsed.ForEach(a => a.log_clearcredit = 1);
                    await dbR.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                LoggerUtil.TextFileLogger.LogToFile("Log Login Catch Error", ex.ToString(), false);
            }
        }
    }

    public static async Task logActionAsync(string sqlstring, string sqltype, string loginID, ErrorLogContext context)
    {
        using (var dbR = new Sandbox_BasedEntities())
        {
            try
            {
                dbR.tbl_log_action.Add(new tbl_log_action
                {
                    action_sql = sqlstring,
                    action_type = secure.RC(sqltype),
                    action_loginID = secure.RC(loginID),
                    action_datetime = DateTime.Now,
                    action_browser = secure.RC(context?.Browser ?? ""),
                    action_browser_version = secure.RC(context?.Version ?? ""),
                    action_ip = secure.RC(context?.IP ?? "")
                });
                await dbR.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                LoggerUtil.TextFileLogger.LogToFile("Log Action Catch Error", ex.ToString(), false);
            }
        }
    }

    public static async Task LogErrorAsync(
        string errMessage,
        string sqlstring,
        ErrorLogContext context)
    {
        try
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                dbR.tbl_log_error.Add(new tbl_log_error
                {
                    error_message = secure.RC(errMessage),
                    error_sql = sqlstring,
                    error_rawurl = secure.RC(context?.RawUrl ?? "NA"),
                    error_loginid = secure.RC(context?.LoginID ?? 0),
                    error_datetime = DateTime.Now,
                    error_ip = secure.RC(context?.IP ?? ""),
                    error_browser = secure.RC(context?.Browser ?? ""),
                    error_browser_version = secure.RC(context?.Version ?? "")
                });

                await dbR.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            LoggerUtil.TextFileLogger.LogToFile(
                "Log Error Catch Error",
                ex.ToString(),
                false
            );
        }
    }

    public static async Task logOTPAsync(string user, long userId, string otp, string verifyStatus, ErrorLogContext context)
    {
        int ClearCredit = !ProjectProperties.Member_OTP_TryAttempts_Suspended ? 1 : 0;

        try
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                dbR.tbl_log_TacAttemp.Add(new tbl_log_TacAttemp
                {
                    log_user = secure.RC(user),
                    log_userId = userId,
                    log_ip = secure.RC(context?.IP ?? ""),
                    log_sessionId = secure.RC(context?.SessionID ?? ""),
                    log_action = secure.RC(verifyStatus),
                    log_tacAttempt = secure.RC(otp),
                    log_browser = secure.RC(context?.Browser ?? ""),
                    log_version = secure.RC(context?.Version ?? ""),
                    log_datetime = DateTime.Now,
                    log_credit = verifyStatus.ToUpper() == "FAILED" ? 1 : 0,
                    log_clearcredit = ClearCredit
                });
                await dbR.SaveChangesAsync();

                if (verifyStatus.Trim().ToUpper() == "SUCCESS")
                {
                    var unUsed = await dbR.tbl_log_TacAttemp.Where(a => a.log_user == user && a.log_credit > 0 && a.log_clearcredit <= 0).ToListAsync();
                    unUsed.ForEach(a =>
                    {
                        a.log_clearcredit = 1;
                    });
                    await dbR.SaveChangesAsync();
                }
            }
        }
        catch (Exception ex)
        {
            LoggerUtil.TextFileLogger.LogToFile("Log OTP Catch Error", ex.ToString(), false);
        }
    }
}
