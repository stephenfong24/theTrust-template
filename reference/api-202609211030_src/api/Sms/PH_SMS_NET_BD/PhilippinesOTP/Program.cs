using Newtonsoft.Json;
using PhilippinesOTP.Model;
using System;

namespace PhilippinesOTP
{
    class Program
    {
        static void Main(string[] args)
        {
            string apikey = "cXRill";
            string secretkey = "ASqoJt";

            PhilippinesOTP sms = new PhilippinesOTP();
            sms.SetEnv(apikey, secretkey);

            SmsResponse result1 = sms.sendSMS("60173482441", "helloworld");
            Console.WriteLine($"SMS sent response (json) = {JsonConvert.SerializeObject(result1)}");

            decimal result2 = sms.GetBalance().balance;
            Console.WriteLine("balance = " + result2.ToString());

            Console.ReadKey();
        }
    }
}
