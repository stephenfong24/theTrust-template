using Newtonsoft.Json;
using RestSharp;
using PhilippinesOTP.Model;
using System;
using System.Collections.Generic;
using System.Text;
using System.Web;
using System.Linq;
using System.Security.Cryptography;

namespace PhilippinesOTP
{
    public class PhilippinesOTP
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
                long timestamp = getUnixTimestamp();
                string signature = CalculateMd5Hash(_apiKey + _secretKey + timestamp.ToString());

                RestClient restClient = new RestClient("http://47.242.85.7:9090/sms/batch/v2");
                RestRequest request = new RestRequest("") { OnBeforeDeserialization = resp => { resp.ContentType = "application/json"; } };
                request.AddQueryParameter("appkey", _apiKey);
                request.AddQueryParameter("appcode", _secretKey);
                request.AddQueryParameter("appsecret", _secretKey);
                request.AddQueryParameter("sign", signature);
                request.AddQueryParameter("phone", mobile);
                request.AddQueryParameter("msg", message);
                request.AddQueryParameter("timestamp", timestamp.ToString());

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
                    balance = 0,
                    code = "",
                    desc = ex.Message,
                    result = null,
                    uid = ""
                };
            }
            return r;
        }

        public BalanceResponse GetBalance()
        {
            long timestamp = getUnixTimestamp();
            string signature = CalculateMd5Hash(_apiKey + _secretKey + timestamp.ToString());

            RestClient restClient = new RestClient("http://47.242.85.7:9090/sms/balance/v1");
            RestRequest request = new RestRequest("") { OnBeforeDeserialization = resp => { resp.ContentType = "application/json"; } };
            request.AddQueryParameter("appkey", _apiKey);
            request.AddQueryParameter("appcode", _secretKey);
            request.AddQueryParameter("sign", signature);
            request.AddQueryParameter("timestamp", timestamp.ToString());

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

        private long getUnixTimestamp()
        {
            long currentTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            return currentTimestamp;
        }

        public bool ContainsUnicodeCharacter(string input)
        {
            const int MaxAnsiCode = 255;
            return input.Any(c => c > MaxAnsiCode);
        }

        private string CalculateMd5Hash(string input)
        {
            using (MD5 md5 = MD5.Create())
            {
                byte[] inputBytes = Encoding.UTF8.GetBytes(input);
                byte[] hashBytes = md5.ComputeHash(inputBytes);

                StringBuilder sb = new StringBuilder();

                for (int i = 0; i < hashBytes.Length; i++)
                {
                    sb.Append(hashBytes[i].ToString("x2"));
                }

                return sb.ToString();
            }
        }
    }
}
