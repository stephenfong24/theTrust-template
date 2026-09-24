using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Threading.Tasks;

namespace API_CPX.Class.Model.Resource
{
    public class DeleteResource
    {
        public long ResourceID { get; set; }
        public long UserID { get; set; }
        public string MerchantID { get; set; }
        public string Message { get; set; }

        public async Task<bool> DeleteAsync()
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                var resource = await dbR.tbl_Resource.FirstOrDefaultAsync(a => a.RowID == ResourceID && a.MerchantID == MerchantID && a.IsDeleted == false);
                if (resource == null)
                {
                    Message = "Err : Resource not found.";
                    return false;
                }

                resource.IsDeleted = true;
                resource.UpdatedAt = DateTime.Now;
                resource.UpdatedBy = UserID.ToString();
                await dbR.SaveChangesAsync();

                Message = "Success";
                return true;
            }
        }
    }
}