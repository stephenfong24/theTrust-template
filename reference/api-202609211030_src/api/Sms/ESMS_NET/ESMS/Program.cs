using Newtonsoft.Json;
using ESMS.Model;
using System;

namespace ESMS
{
    class Program
    {
        static void Main(string[] args)
        {
            string apikey = "cfacefb70bc7422487daa19fbcc4c5db";
            string secretkey = "ck43spvte57q52aazypdiusxeyj6i93cpxc8med2agee62brx0rfmbl0bwyoksfnyf6p9icjnt7mf4rcfr0duc8ocwirztwr9wgz";

            ESMS sms = new ESMS();
            sms.SetEnv(apikey, secretkey);

            SmsResponse result1 = sms.sendSMS("60173482441", "全面、及时的新闻报道，Google 新闻为您汇集来自世界各地的新闻来源。");
            Console.WriteLine($"SMS sent response (json) = {JsonConvert.SerializeObject(result1)}");

            decimal result2 = sms.GetBalance().balance;
            Console.WriteLine("balance = " + result2.ToString());

            Console.ReadKey();
        }
    }
}
