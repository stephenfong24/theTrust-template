using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI.WebControls;
using System.Web.UI;
using System.IO;
using System.Collections;
using System.Net;
using Newtonsoft.Json.Linq;
using API_CPX.Context;
using API_CPX.Class;
using System.Text;
using System.Data;
using API_CPX.Model;
using System.Data.SqlTypes;
using System.Security.AccessControl;

namespace Util
{
    
    public class LogUtil
    {
        public static void logAction(string sqlstring, string sqltype)
        {
            int SessionsCount = 0;
            long loginID = 0;
            string Browser = "";
            string Version = "";
            string IP = "";

            LoginUserModel loginsecure = new LoginUserModel();
            HttpContext context = HttpContext.Current;

            try
            {
                SessionsCount = HttpContext.Current.Session.Keys.Count;
            }
            catch
            {
                SessionsCount = 0;
            }

            if (SessionsCount > 0)
            {
                if (HttpContext.Current.Session["loginsecure"] != null)
                {
                    loginsecure = (LoginUserModel)HttpContext.Current.Session["loginsecure"];
                    loginID = (loginsecure != null) ? loginsecure.UserId : 0;
                }
            }

            if (context != null)
            {
                Browser = HttpContext.Current.Request.Browser.Browser;
                Version = HttpContext.Current.Request.Browser.Version;
                IP = CommonUtil.GetIP();
            }

            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
       
            try
            {
                dbR.tbl_log_action.Add(new tbl_log_action
                {
                    action_sql = sqlstring,
                    action_type = secure.RC(sqltype),
                    action_loginID = secure.RC(loginID),
                    action_datetime = DateTime.Now,
                    action_browser = secure.RC(Browser),
                    action_browser_version = secure.RC(Version),
                    action_ip = secure.RC(IP)
                });
                dbR.SaveChanges();
            }
            catch (Exception ex)
            {
                LoggerUtil.TextFileLogger.LogToFile("Log Action Catch Error", ex.ToString(), false);
            }
        }

        public static void logError(string errMessage, string sqlstring)
        {
            int SessionsCount = 0;
            string rawUrl = "NA";
            long loginID = 0;
            string Browser = "";
            string Version = "";
            string IP = "";

            LoginUserModel loginsecure = new LoginUserModel();
            HttpContext context = HttpContext.Current;

            try
            {
                rawUrl = HttpContext.Current.Request.RawUrl.ToString();
            }
            catch (Exception ex1) 
            {
                string error1 = ex1.Message.ToString();
            }

            try
            {
                SessionsCount = HttpContext.Current.Session.Keys.Count;
            }
            catch
            {
                SessionsCount = 0;
            }

            if (SessionsCount > 0)
            {
                if (HttpContext.Current.Session["loginsecure"] != null)
                {
                    loginsecure = (LoginUserModel)HttpContext.Current.Session["loginsecure"];
                    loginID = (loginsecure != null) ? loginsecure.UserId : 0;
                }
            }

            if (context != null)
            {
                Browser = HttpContext.Current.Request.Browser.Browser;
                Version= HttpContext.Current.Request.Browser.Version;
                IP = CommonUtil.GetIP();
            }

            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();

            try
            {
                dbR.tbl_log_error.Add(new tbl_log_error
                {
                    error_message = secure.RC(errMessage),
                    error_sql = sqlstring,
                    error_rawurl = secure.RC(rawUrl),
                    error_loginid = secure.RC(loginID),
                    error_datetime = DateTime.Now,
                    error_ip = secure.RC(IP),
                    error_browser = secure.RC(Browser),
                    error_browser_version = secure.RC(Version)
                });
                dbR.SaveChanges();
            }
            catch (Exception ex)
            {
                LoggerUtil.TextFileLogger.LogToFile("Log Error Catch Error", ex.ToString(), false);
            }
        }

        public static void logSQL(string sql)
        {
            int SessionsCount = 0;
            string rawUrl = HttpContext.Current.Request.RawUrl.ToString();
            long loginID = 0;
            LoginUserModel loginsecure = new LoginUserModel();
            
            try
            {
                SessionsCount = HttpContext.Current.Session.Keys.Count;
            }
            catch
            {
                SessionsCount = 0;
            }

            if (SessionsCount > 0)
            {
                if (HttpContext.Current.Session["loginsecure"] != null)
                {
                    loginsecure = (LoginUserModel)HttpContext.Current.Session["loginsecure"];
                    loginID = (loginsecure != null) ? loginsecure.UserId : 0;
                }
            }

            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
        
            try
            {
                dbR.tbl_log_sql.Add(new tbl_log_sql
                {
                    sqlString = sql,
                    fromURL = secure.RC(rawUrl),
                    loginID = secure.RC(loginID)
                });
                dbR.SaveChanges();
            }
            catch (Exception ex)
            {
                LoggerUtil.TextFileLogger.LogToFile("Log SQL Catch Error", ex.ToString(), false);
            }
        }

        public static void logLogin(string user, long userid, string pwd, string loginStatus)
        {
            string SessionID = null;
            int SessionsCount = 0;
            string Browser = "";
            string Version = "";
            string IP = "";
            string Location = "";
            HttpContext context = HttpContext.Current;

            try
            {
                SessionsCount = HttpContext.Current.Session.Keys.Count;
            }
            catch
            {
                SessionsCount = 0;
            }

            if (HttpContext.Current.Session != null)
            {
                SessionID = HttpContext.Current.Session.SessionID.ToString();
            }

            if (context != null)
            {
                Browser = HttpContext.Current.Request.Browser.Browser;
                Version = HttpContext.Current.Request.Browser.Version;
                IP = CommonUtil.GetIP();
                Location = GetUserCountryByIp(IP).CountryName;
            }

            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();

            try
            {
                dbR.tbl_log_login.Add(new tbl_log_login
                {
                    log_user = user,
                    log_userId = userid,
                    log_ip = IP,
                    log_sessionId = SessionID,
                    log_action = loginStatus,
                    log_pwdAttempt = secure.RC(secure.Encrypt(pwd, true)),
                    log_browser = Browser,
                    log_version = Version,
                    log_datetime = DateTime.Now,
                    log_credit = loginStatus.ToUpper() == "FAILED" ? 1 : 1,
                    log_clearcredit = 1
                });
                dbR.SaveChanges();

                if (loginStatus.Trim().ToUpper() == "SUCCESS")
                {
                    if (userid > 0)
                    {
                        tbl_Login login = dbR.tbl_Login.Where(a => a.MemberID == userid).FirstOrDefault();
                        if (login != null)
                        {
                            login.LastTimeLogin = DateTime.Now;
                            login.LastLoginIP = IP;
                        }
                        dbR.SaveChanges();
                    }

                    var unUsed = dbR.tbl_log_SecurityAttemp.Where(a => a.log_user == user && a.log_credit > 0 && a.log_clearcredit <= 0).ToList();
                    unUsed.ForEach(a =>
                    {
                        a.log_clearcredit = 1;
                    });
                    dbR.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                LoggerUtil.TextFileLogger.LogToFile("Log Login Catch Error", ex.ToString(), false);
            }
        }

        public static void logSecurityVerification(string user, long userId, string valAttempts, string verifyStatus, string actionType, string userType)
        {
            string SessionID = null;

            if (HttpContext.Current.Session != null)
            {
                SessionID = HttpContext.Current.Session.SessionID.ToString();
            }

            string Browser = HttpContext.Current.Request.Browser.Browser;
            string Version = HttpContext.Current.Request.Browser.Version;
            string IP = CommonUtil.GetIP();

            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            int ClearCredit = !ProjectProperties.Member_SecurityVerification_TryAttempts_Suspended ? 1 : 0;

            try
            {
                dbR.tbl_log_SecurityAttemp.Add(new tbl_log_SecurityAttemp
                {
                    log_user = secure.RC(user),
                    log_userId = userId,
                    log_ip = secure.RC(IP),
                    log_sessionId = secure.RC(SessionID),
                    log_action = secure.RC(verifyStatus),
                    log_actionType = secure.RC(actionType),
                    log_valAttempt = secure.RC(valAttempts),
                    log_browser = secure.RC(Browser),
                    log_version = secure.RC(Version),
                    log_datetime = DateTime.Now,
                    log_credit = verifyStatus.ToUpper() == "FAILED" ? 1 : 1,
                    log_clearcredit = ClearCredit
                });
                dbR.SaveChanges();

                if (verifyStatus.Trim().ToUpper() == "SUCCESS")
                {
                    var unUsed = dbR.tbl_log_SecurityAttemp.Where(a => a.log_user == user && a.log_credit > 0 && a.log_clearcredit <= 0).ToList();
                    unUsed.ForEach(a =>
                    {
                        a.log_clearcredit = 1;
                    });
                    dbR.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                LoggerUtil.TextFileLogger.LogToFile("Log Security Verification Catch Error", ex.ToString(), false);
            }
            finally
            {
                dbR.Dispose();
            }
        }

        public static UserCountryObject GetUserCountryByIp(string ip)
        {
            string result = string.Empty;
            UserCountryObject uco = new UserCountryObject();

            try
            {
                string info = new WebClient().DownloadString("http://www.geoplugin.net/json.gp?ip=" + ip);
        
                if (info.Trim() != string.Empty)
                {
                    JObject jsonObj = JObject.Parse(info);

                    if (jsonObj != null)
                    {
                        uco.CountryCode = (string)jsonObj["geoplugin_countryCode"];
                        uco.CountryName = (string)jsonObj["geoplugin_countryName"];
                        uco.CurrencyCode = (string)jsonObj["geoplugin_currencyCode"];
                    }
                    else
                    {
                        uco.CountryCode = null;
                        uco.CountryName = null;
                        uco.CurrencyCode = null;
                    }
                }
                else
                {
                    uco.CountryCode = null;
                    uco.CountryName = null;
                    uco.CurrencyCode = null;
                }

            }
            catch (Exception)
            {
                uco.CountryCode = null;
                uco.CountryName = null;
                uco.CurrencyCode = null;
            }

            return uco;
        }
    }

    public class UserCountryObject
    {
        public string CountryName { get; set; }
        public string CountryCode { get; set; }
        public string CurrencyCode { get; set; }
    }
}
