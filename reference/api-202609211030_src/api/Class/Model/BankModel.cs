using API_CPX.Class.Helper;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model
{
    public class BankModel : Base
    {
        private IEnumerable<BankRecords> records;

        public IEnumerable<BankRecords> Records
        {
            get { return records; }
            set { records = value; }
        }

        public Boolean GetBankList(string MerchantID, long UserID)
        {
            Sandbox_BasedEntities dbR = new Sandbox_BasedEntities();
            Status = 0;
            bool result = true;
            string Medialurl = AppSettingsHelper.MediaUrl;

            if (string.IsNullOrEmpty(MerchantID) || string.IsNullOrEmpty(UserID.ToString()))
            {
                Status = 4;
                Message = "Err : Invalid parameter";
                result = false;
                return result;
            }

            tbl_Merchant merchant = dbR.tbl_Merchant.Where(a => a.MerchantID == MerchantID && a.Status == 0).FirstOrDefault();
            if (merchant == null)
            {
                Status = 4;
                Message = "Err : Invalid merchant";
                result = false;
                return result;
            }

            tbl_MemberInfo memInfo = dbR.tbl_MemberInfo.Where(a => a.RowID == UserID).FirstOrDefault();
            if (memInfo == null)
            {
                Status = 4;
                Message = "Err : Invalid account ID";
                result = false;
                return result;
            }

            try
            {
                IEnumerable<BankRecords> t1 = null;

                t1 = (from n in dbR.tbl_MemberInfo_Bank
                      join c in dbR.tbl_Master_BankList on n.BankName equals c.BankName
                      orderby n.RowID
                      where n.MemberID == UserID && n.IsDeleted == 0
                      select new BankRecords
                      {
                          BankID = n.RowID,
                          BankHolderName = n.AccountName,
                          BankName = n.BankName,
                          BankAccountNumber = n.AccountNumber,
                          BankNameDetails = c.BankNameDetail,
                          Image = Medialurl + c.ImgPath,
                      }).AsEnumerable<BankRecords>().ToList();

                Records = t1;
                Message = "Success";
            }
            catch (Exception ex)
            {
                Status = 4;
                Message = ex.Message.ToString();
                result = false;
                return result;
            }

            return result;
        }

    }

    public class BankRecords
    {
        public long BankID { get; set; }
        public string BankHolderName { get; set; }
        public string BankAccountNumber { get; set; }
        public string BankName { get; set; }
        public string BankNameDetails { get; set; }
        public string Image { get; set; }
    }
}