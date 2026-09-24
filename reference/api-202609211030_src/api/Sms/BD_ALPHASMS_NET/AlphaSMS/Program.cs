using Newtonsoft.Json;
using AlphaSMS.Model;
using System;

namespace AlphaSMS
{
    class Program
    {
        static void Main(string[] args)
        {
            string apikey = "wnjCeC0eS5dNJ0x4kCH5Y49d7dS7u66SBU2AKHrS";
            string secretkey = "-";

            AlphaSMS sms = new AlphaSMS();
            sms.SetEnv(apikey, secretkey);

            SmsResponse result1 = sms.sendSMS("8801795396443", "testing");
            Console.WriteLine($"SMS sent response (json) = {JsonConvert.SerializeObject(result1)}");

            decimal result2 = sms.GetBalance().data.balance;
            Console.WriteLine("balance = " + result2.ToString());

            Console.ReadKey();
        }
    }
}
