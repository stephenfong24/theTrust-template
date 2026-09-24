using System;
using System.Collections.Generic;
using System.Text;

namespace PhilippinesOTP.Model
{
    public class ResultToken : BasicResponse
    {
        public string token_type { get; set; }
        public int expires_in { get; set; }
        public string access_token { get; set; }
    }
}
