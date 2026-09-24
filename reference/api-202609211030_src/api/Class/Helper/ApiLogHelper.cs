using API_CPX.Class.Model.Class;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Helper
{
    public class ApiLogHelper
    {
        public static async Task InsertApiLogAsync(ApiRequestLog log)
        {
            try
            {
                using (var db = new Sandbox_BasedEntities())
                {
                    string MerchantID = AppSettingsHelper.MerchantID;

                    var entity = new tbl_ApiRequestLog
                    {
                        RequestID = log.RequestID,
                        RequestTime = log.RequestTime,
                        ResponseTime = log.ResponseTime,
                        DurationMs = log.DurationMs,
                        UserID = log.UserID,
                        MerchantID = MerchantID,
                        HttpMethod = log.HttpMethod,
                        RequestUrl = log.RequestUrl,
                        ControllerName = log.ControllerName,
                        ActionName = log.ActionName,
                        ActivityTitle = log.ActivityTitle,
                        Description = log.Description,
                        IpAddress = log.IpAddress,
                        UserAgent = log.UserAgent,
                        RequestHeaders = log.RequestHeaders,
                        RequestBody = log.RequestBody,
                        ResponseStatusCode = log.ResponseStatusCode,
                        ResponseBody = log.ResponseBody,
                        IsSuccess = log.IsSuccess,
                        ExceptionMessage = log.ExceptionMessage,
                        CreatedAt = DateTime.Now
                    };

                    db.tbl_ApiRequestLog.Add(entity);

                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                // Never allow logging failure to break API
                // Debug.WriteLine("API Log Insert Failed:");
                // Debug.WriteLine(ex.ToString());
            }
        }
    }
}