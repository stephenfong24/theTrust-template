using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO
{
    public class BankRequest
    {
    }

    public class AddBankRequest
    {
        public string BankCode { get; set; }
        public string BankNameDetail { get; set; }
    }

    public class EditBankRequest
    {
        public long RowID { get; set; }
        public string BankNameDetail { get; set; }
        public int BankStatus { get; set; }
    }

    public class BankListResponse
    {
        public long RowID { get; set; }
        public string BankCode { get; set; }
        public string BankName { get; set; }
        public string BankNameDetail { get; set; }
    }
}