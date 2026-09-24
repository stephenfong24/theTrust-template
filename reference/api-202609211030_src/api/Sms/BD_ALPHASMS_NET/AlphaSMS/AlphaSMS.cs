using Newtonsoft.Json;
using RestSharp;
using AlphaSMS.Model;
using System;
using System.Collections.Generic;
using System.Text;
using System.Web;
using System.Linq;

namespace AlphaSMS
{
    public class AlphaSMS
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
                string send_message = message;

                RestClient restClient = new RestClient("https://api.sms.net.bd/sendsms");
                RestRequest request = new RestRequest("") { OnBeforeDeserialization = resp => { resp.ContentType = "application/json"; } };
                request.AddQueryParameter("api_key", _apiKey);
                request.AddQueryParameter("msg", send_message);
                request.AddQueryParameter("to", mobile);

                IRestResponse response = restClient.Execute(request);
                string result = response.Content;
                r = JsonConvert.DeserializeObject<SmsResponse>(result);
                r.balance = GetBalance().data.balance;
            }
            catch (Exception ex)
            {
                r = new SmsResponse()
                {
                    data = { },
                    error = 0,
                    msg = ex.Message
                };
            }
            return r;
        }

        public BalanceResponse GetBalance()
        {
            RestClient restClient = new RestClient("https://api.sms.net.bd/user/balance");
            RestRequest request = new RestRequest("") { OnBeforeDeserialization = resp => { resp.ContentType = "application/json"; } };
            request.AddQueryParameter("api_key", _apiKey);

            IRestResponse response = restClient.Execute(request);
            string result = response.Content;
            BalanceResponse r = JsonConvert.DeserializeObject<BalanceResponse>(result);
            if (r.data == null)
            {
                r.data = new DataBalance() { balance = 0 };
            }
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
