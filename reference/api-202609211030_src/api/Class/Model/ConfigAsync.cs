using API_CPX.Class.Helper;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
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