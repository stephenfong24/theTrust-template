using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Model
{
    public class ConfigAsync : Base
    {
        public string MerchantID { get; set; }
        public long CreatedBy { get; set; }

        public async Task<GeneralConfigResponse> GetConfiguration()
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var merchant = await dbR.tbl_Merchant.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.Status == 0);
                if (merchant == null)
                {
                    Status = 4;
                    Message = "Err : Invalid merchant account!";
                    return null;
                }

                var config = await dbR.tbl_Config_General
                    .Where(a => a.MerchantID == MerchantID)
                    .Select(a => new GeneralConfigResponse
                    {
                        SST = a.SST
                    })
                    .FirstOrDefaultAsync();

                if (config == null)
                {
                    Status = 4;
                    Message = "Err : Configuration not found!";
                    return null;
                }

                return config;
            }
        }

        public async Task<bool> UpdateConfiguration(UpdateConfigRequest request)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                Status = 0;

                // =============================================================
                // Validate Request
                // =============================================================

                if (request == null)
                {
                    Status = 4;
                    Message = "Err : Invalid configuration request!";
                    return false;
                }

                // =============================================================
                // Validate Merchant
                // =============================================================

                var merchant = await db.tbl_Merchant.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.Status == 0);
                if (merchant == null)
                {
                    Status = 4;
                    Message = "Err : Invalid merchant account!";
                    return false;
                }

                // =============================================================
                // Get Configuration
                // =============================================================

                var config = await db.tbl_Config_General.FirstOrDefaultAsync(a => a.MerchantID == MerchantID);
                if (config == null)
                {
                    Status = 4;
                    Message = "Err : Configuration not found!";
                    return false;
                }

                // =============================================================
                // Validate Configuration
                // =============================================================

                if (request.SST < 0 || request.SST > 100)
                {
                    Status = 4;
                    Message = "SST must be between 0 and 100!";
                    return false;
                }

                config.SST = request.SST;
                config.UpdatedAt = DateTime.Now;
                config.UpdatedBy = CreatedBy;
                await db.SaveChangesAsync();

                Status = 0;
                Message = "Success";
                return true;
            }
        }

        public async Task<List<BankListResponse>> GetBankList()
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var banks = await dbR.tbl_Master_BankList
                    .Where(x => x.ShowOption == "Bank" && x.Status == 0)
                    .OrderBy(x => x.BankNameDetail)
                    .Select(x => new BankListResponse
                    {
                        RowID = x.RowID,
                        BankName = x.BankName,
                        BankNameDetail = x.BankNameDetail
                    })
                    .ToListAsync();

                foreach (var bank in banks)
                {
                    const string prefix = "MY-MYR-";

                    bank.BankCode =
                        bank.BankName != null &&
                        bank.BankName.StartsWith(
                            prefix,
                            StringComparison.OrdinalIgnoreCase)
                            ? bank.BankName.Substring(prefix.Length)
                            : bank.BankName;
                }

                Message = "Success";
                return banks;
            }
        }

        public async Task<bool> AddBank(AddBankRequest request)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                Status = 0;

                // =============================================================
                // Validate Request
                // =============================================================

                if (request == null)
                {
                    Status = 4;
                    Message = "Invalid bank request.";
                    return false;
                }

                string bankCode = (request.BankCode ?? "").Trim().ToUpperInvariant();
                string bankNameDetail = (request.BankNameDetail ?? "").Trim();

                if (string.IsNullOrWhiteSpace(bankCode))
                {
                    Status = 4;
                    Message = "Bank code is required.";
                    return false;
                }

                if (!Regex.IsMatch(bankCode, @"^[A-Z]+$"))
                {
                    Status = 4;
                    Message = "Bank code can only contain letters A-Z.";
                    return false;
                }

                if (string.IsNullOrWhiteSpace(bankNameDetail))
                {
                    Status = 4;
                    Message = "Bank name detail is required.";
                    return false;
                }

                // =============================================================
                // Build Bank Name
                // Format: MY-MYR-{BANK CODE}
                // =============================================================

                string bankName = "MY-MYR-" + bankCode;

                // =============================================================
                // Validate Length
                // tbl_Master_BankList.BankName = varchar(50)
                // tbl_Master_BankList.BankNameDetail = nvarchar(100)
                // =============================================================

                if (bankName.Length > 50)
                {
                    Status = 4;
                    Message = "Bank code is too long.";
                    return false;
                }

                if (bankNameDetail.Length > 100)
                {
                    Status = 4;
                    Message = "Bank name detail cannot exceed 100 characters.";
                    return false;
                }

                // =============================================================
                // Check Duplicate Bank Name
                // Only active Bank records
                // =============================================================

                bool exists = await db.tbl_Master_BankList.AnyAsync(x => x.ShowOption == "Bank" && x.Status == 0 && x.BankName == bankName);

                if (exists)
                {
                    Status = 4;
                    Message = "Bank code already exists.";
                    return false;
                }

                // =============================================================
                // Insert
                // =============================================================

                var bank = new tbl_Master_BankList
                {
                    BankName = bankName,
                    BankNameDetail = bankNameDetail,
                    ShowOption = "Bank",
                    Status = 0,
                    IsDeposit = 0,
                    IsWithdrawal = 0
                };

                db.tbl_Master_BankList.Add(bank);

                await db.SaveChangesAsync();

                Status = 0;
                Message = "Success";
                return true;
            }
        }

        public async Task<bool> EditBank(EditBankRequest request)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                Status = 0;

                // =============================================================
                // Validate Request
                // =============================================================

                if (request == null)
                {
                    Status = 4;
                    Message = "Invalid bank request.";
                    return false;
                }

                if (request.RowID <= 0)
                {
                    Status = 4;
                    Message = "Invalid bank ID.";
                    return false;
                }

                string bankNameDetail = (request.BankNameDetail ?? "").Trim();

                if (string.IsNullOrWhiteSpace(bankNameDetail))
                {
                    Status = 4;
                    Message = "Bank name detail is required.";
                    return false;
                }

                if (bankNameDetail.Length > 100)
                {
                    Status = 4;
                    Message = "Bank name detail cannot exceed 100 characters.";
                    return false;
                }

                var bank = await db.tbl_Master_BankList.FirstOrDefaultAsync(x => x.RowID == request.RowID && x.ShowOption == "Bank");

                if (bank == null)
                {
                    Status = 4;
                    Message = "Bank not found.";
                    return false;
                }

                bank.BankNameDetail = bankNameDetail;
                bank.Status = request.BankStatus;

                await db.SaveChangesAsync();

                Status = 0;
                Message = "Success";
                return true;
            }
        }

        public class GeneralConfigResponse
        {
            public decimal SST { get; set; }
        }
        public class UpdateConfigRequest
        {
            public decimal SST { get; set; }
        }
    }
}