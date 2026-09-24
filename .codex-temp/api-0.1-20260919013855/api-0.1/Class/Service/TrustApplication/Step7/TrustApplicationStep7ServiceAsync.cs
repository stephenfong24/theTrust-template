using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Common;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Step7
{
    public class TrustApplicationStep7ServiceAsync
    {
        private readonly TrustApplicationCommonService commonService;

        private readonly TrustApplicationStep7Validator validator;

        public TrustApplicationStep7ServiceAsync()
        {
            commonService = new TrustApplicationCommonService();
            validator = new TrustApplicationStep7Validator();
        }

        public async Task<TrustApplicationStepResult> SaveAsync(string merchantId, long userId, string roleCode, TrustApplicationStep7Request request)
        {
            const string code = "SAVE-TRUST-APPLICATION-STEP-7";
            validator.Validate(request);

            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction())
            {
                try
                {
                    // ====================================================
                    // Application
                    // ====================================================

                    var application = await commonService.GetApplicationForStepUpdateAsync(db, merchantId, userId, roleCode, request.TrustID);

                    if (commonService.IsAgent(roleCode))
                    {
                        commonService.ValidateStepAccess(application, 7, roleCode);
                    }

                    // ====================================================
                    // Resolve Co-Brokers
                    // ====================================================

                    var resolvedCoBrokers = new List<ResolvedCoBroker>();

                    foreach (var item in request.CoBrokers)
                    {
                        string email = item.Email.Trim();

                        var coBroker =
                            await
                            (
                                from member in db.tbl_MemberInfo
                                join reference in db.tbl_Reference on member.RowID equals reference.MemberID
                                where
                                    member.Email == email && member.UserType == "AGENT" && reference.MerchantID ==  merchantId && 
                                    reference.Type == "V"
                                select new
                                {
                                    MemberID = member.RowID,
                                    Email = member.Email
                                }
                            )
                            .FirstOrDefaultAsync();

                        if (coBroker == null)
                        {
                            throw new BusinessException(email + " is not a valid Trust Agent.", code);
                        }

                        // ================================================
                        // Cannot Add Same Agent As Application Owner
                        // ================================================

                        if (coBroker.MemberID == application.MemberID)
                        {
                            throw new BusinessException("The primary Trust Agent cannot be added as a co-broker.", code);
                        }

                        // ================================================
                        // Duplicate Member
                        // ================================================

                        if (resolvedCoBrokers.Any(a => a.MemberID == coBroker.MemberID))
                        {
                            throw new BusinessException("Duplicate co-broker is not allowed.", code);
                        }

                        resolvedCoBrokers.Add(
                            new ResolvedCoBroker
                            {
                                MemberID = coBroker.MemberID,
                                Email = coBroker.Email,
                                AllocationPercentage = item.AllocationPercentage.Value
                            });
                    }

                    // ====================================================
                    // Remove Existing Co-Brokers
                    // ====================================================

                    var existing = await db.tbl_TrustApplication_CoBroker.Where(a => a.TrustApplicationID == application.RowID).ToListAsync();

                    if (existing.Any())
                    {
                        db.tbl_TrustApplication_CoBroker.RemoveRange(existing);
                    }
                    
                    // ====================================================
                    // Insert New Co-Brokers
                    // ====================================================

                    foreach (var item in resolvedCoBrokers)
                    {
                        db.tbl_TrustApplication_CoBroker
                            .Add(
                                new tbl_TrustApplication_CoBroker
                                {
                                    TrustApplicationID = application.RowID,
                                    MemberID = item.MemberID,
                                    Email = item.Email,
                                    AllocationPercentage = item.AllocationPercentage,
                                    CreatedAt = DateTime.Now,
                                    CreatedBy = userId
                                });
                    }

                    // ====================================================
                    // Step Completed
                    // ====================================================

                    commonService.CompleteStepSave(application, 7, userId, roleCode);
                    await db.SaveChangesAsync();
                    transaction.Commit();
                    return commonService.ToResult(application);
                }
                catch
                {
                    transaction.Rollback();
                    throw;
                }
            }
        }

        private class ResolvedCoBroker
        {
            public long MemberID { get; set; }
            public string Email { get; set; }
            public decimal AllocationPercentage { get; set; }
        }
    }
}