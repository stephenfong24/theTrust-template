using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class
{
    public class SMS
    {
        private string apiKey;
        private string secretKey;
        private string serviceName;

        public string ApiKey
        {
            get { return apiKey; }
            set { apiKey = value; }
        }

        public string SecretKey
        {
            get { return secretKey; }
            set { secretKey = value; }
        }

        public string ServiceName
        {
            get { return serviceName; }
            set { serviceName = value; }
        }

        public string SendSMS(string MerchantID, long MemberID, string Sender, string Content)
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            string Results = "okay";
            serviceName = null;
            string ApiKey = string.Empty;
            string SecretKey = string.Empty;

            tbl_Merchant_Sms smsOwnActived = dbR.tbl_Merchant_Sms.Where(a => a.MerchantID == MerchantID && a.IsMaster == 9 && a.Status == 0).FirstOrDefault();
            if (smsOwnActived != null)
            {
                serviceName = smsOwnActived.ServiceName;
                ApiKey = smsOwnActived.ApiKey;
                SecretKey = smsOwnActived.SecretKey;
            }
            else
            {
                tbl_Merchant_Sms smsActived = dbR.tbl_Merchant_Sms.Where(a => a.MerchantID == MerchantID && a.IsMaster == 0 && a.Status == 0).FirstOrDefault();
                if (smsActived == null)
                {
                    return "Err : Merchant SMS configuration not found!";
                }

                tbl_Config_Sms configSms = dbR.tbl_Config_Sms.Where(a => a.ServiceName == smsActived.ServiceName && a.Status == 0).FirstOrDefault();
                if (configSms == null)
                {
                    return "Err : System SMS configuration not found!";
                }

                serviceName = configSms.ServiceName;
                ApiKey = configSms.ApiKey;
                SecretKey = configSms.SecretKey;
            }

            if (serviceName == "ONEWAYSMS")
            {
                OneWaySMS.OneWaySMS sms = new OneWaySMS.OneWaySMS();
                sms.SetEnv(ApiKey, SecretKey);

                OneWaySMS.Model.ResultSend result = sms.sendSMS(Sender, Content);

                if (result.code == 0)
                {
                    Results = ProjectProperties.Return_Success;
                }
                else
                {
                    Results = result.desc;
                }
            }
            else if (serviceName == "ESMS")
            {
                ESMS.ESMS sms = new ESMS.ESMS();
                sms.SetEnv(ApiKey, SecretKey);
                ESMS.Model.SmsResponse result = sms.sendSMS(Sender, Content);

                if (result.status == 0)
                {
                    Results = ProjectProperties.Return_Success;
                }
                else
                {
                    Results = result.message;
                }
            }
            else if (serviceName == "BD_ALPHASMS_NET")
            {
                AlphaSMS.AlphaSMS sms = new AlphaSMS.AlphaSMS();
                sms.SetEnv(ApiKey, SecretKey);
                AlphaSMS.Model.SmsResponse result = sms.sendSMS(Sender, Content);

                if (result.error == 0)
                {
                    Results = ProjectProperties.Return_Success;
                }
                else
                {
                    Results = result.msg;
                }
            }
            else
            {
                Results = "Err : Invalid SMS Services!";
            }

            return Results;
        }
    }
}