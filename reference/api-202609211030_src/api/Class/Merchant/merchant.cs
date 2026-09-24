using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Merchant
{
    public class merchant
    {
    }
    public class merchant_create_account
    {
        public string MerchantID { get; set; }
        public string token { get; set; }
        public string sign { get; set; }
    }

    public class tx_info_multi
    {
        public string MerchantID { get; set; }
        public string MerchantAccountID { get; set; }
        public string type { get; set; }
        public string address { get; set; }
        public string sign { get; set; }
    }

    public class create_account_response : response_code
    {
        public string MerchantID { get; set; }
        public string MerchantAccountID { get; set; }
        public List<coin_address> address { get; set; }
    }

    public class tx_response : response_code
    {
        public string MerchantID { get; set; }
        public string MerchantAccountID { get; set; }
        public List<tx> tx { get; set; }
    }

    public class response_code
    {
        public string resCode { get; set; }
        public string errCode { get; set; }
        public string errCodeDes { get; set; }
    }

    public class tx
    {
        public string type { get; set; }
        public string address { get; set; }
        public decimal amount { get; set; }
        public string txnId { get; set; }
        public string refId { get; set; }
        public string time { get; set; }
    }

    public class coin_address
    {
        public string type { get; set; }
        public string name { get; set; }
        public string address { get; set; }
    }


}