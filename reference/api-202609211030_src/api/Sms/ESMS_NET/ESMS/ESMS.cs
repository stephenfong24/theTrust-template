using Newtonsoft.Json;
using RestSharp;
using ESMS.Model;
using System;
using System.Collections.Generic;
using System.Text;
using System.Web;
using System.Linq;

namespace ESMS
{
    public class ESMS
    {
        private string _apiKey = "";
        private string _secretKey = "";
        public void SetEnv(string apiKey, string secretKey)
        {
            _apiKey = apiKey;
            _secretKey = secretKey;
        }

        public SmsResponse sendSMS(string mobile, string message)
        {
            SmsResponse r = null;
            
            try
            {
                string lang_type = ContainsUnicodeCharacter(message) ? "8" : "0";
                string send_message = lang_type == "0" ? message : message;

                RestClient restClient = new RestClient("https://api.esms.com.my/sms/send");
                RestRequest request = new RestRequest("") { OnBeforeDeserialization = resp => { resp.ContentType = "application/json"; } };
                request.AddQueryParameter("user", _apiKey);
                request.AddQueryParameter("pass", _secretKey);
                request.AddQueryParameter("to", mobile);
                request.AddQueryParameter("msg", send_message);
                request.AddQueryParameter("type", lang_type);

                IRestResponse response = restClient.Execute(request);
                string result = response.Content;
                r = JsonConvert.DeserializeObject<SmsResponse>(result);

                decimal bln = GetBalance().balance;
                r.balance = bln;
            }
            catch (Exception ex)
            {
                r = new SmsResponse()
                {
                    creditDeducted = 0,
                    id = "",
                    balance = 0,
                    message = ex.Message.ToString(),
                    parts = 0,
                    status = 44,
                    type = 0
                };
            }
            return r;
        }

        public BalanceResponse GetBalance()
        {
            RestClient restClient = new RestClient("https://api.esms.com.my/sms/balance");
            RestRequest request = new RestRequest("") { OnBeforeDeserialization = resp => { resp.ContentType = "application/json"; } };
            request.AddQueryParameter("user", _apiKey);
            request.AddQueryParameter("pass", _secretKey);

            IRestResponse response = restClient.Execute(request);
            string result = response.Content;
            BalanceResponse r = JsonConvert.DeserializeObject<BalanceResponse>(result);
            return r;
        }

        public string StringToHex(string Data)
        {
            char[] counting = Data.ToCharArray();
            StringBuilder sb = new StringBuilder();
            foreach (char words in counting)
            {
                int value = Convert.ToInt32(words);
                string hexaOutput = string.Format("{0:X4}", value);
                sb.Append(hexaOutput);               
            }
            return sb.ToString();
        }

        public bool ContainsUnicodeCharacter(string input)
        {
            const int MaxAnsiCode = 255;
            return input.Any(c => c > MaxAnsiCode);
        }
    }
}
