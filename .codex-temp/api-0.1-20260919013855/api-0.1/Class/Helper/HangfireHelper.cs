using Newtonsoft.Json;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace API_CPX.Class.Helper
{
    public class HangfireHelper
    {
        public static async Task<bool> TriggerInstantEmail(string publicId)
        {
            try
            {
                var requestObject = new
                {
                    PublicId = publicId
                };

                string json = JsonConvert.SerializeObject(requestObject);
                string hangfireUrls = AppSettingsHelper.HangfireUrl;
                if (string.IsNullOrWhiteSpace(hangfireUrls))
                {
                    return false;
                }

                string triggerInstantEmailUrl = hangfireUrls + "/api/jobtrigger/instant-email";

                using (var client = new WebClient())
                {
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                    client.Encoding = Encoding.UTF8;
                    await client.UploadStringTaskAsync(triggerInstantEmailUrl, "POST", json);
                }

                return true;
            }
            catch
            {
                return false;
            }
        }

        public static async Task<bool> TriggerGenerateCert(long userId, string enrolmentId)
        {
            try
            {
                var requestObject = new
                {
                    userId = userId,
                    enrolmentId = enrolmentId
                };

                string json = JsonConvert.SerializeObject(requestObject);
                string hangfireUrls = AppSettingsHelper.HangfireUrl;
                if (string.IsNullOrWhiteSpace(hangfireUrls))
                {
                    return false;
                }

                string triggerInstantGenerateCertUrl = hangfireUrls + "/api/certjobtrigger/request-generate-cert";

                using (var client = new WebClient())
                {
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                    client.Encoding = Encoding.UTF8;
                    await client.UploadStringTaskAsync(triggerInstantGenerateCertUrl, "POST", json);
                }

                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}