using API_CPX.Class.Helper;
using API_CPX.Context;
using Newtonsoft.Json;
using System;
using System.Data.Entity;
using System.Globalization;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Notification
{
    public class TrustApplicationEmailNotificationServiceAsync
    {
        private const string TemplateCode = "trust-application-status";
        private const string ReferenceType = "TRUST_APPLICATION";

        // ============================================================
        // Queue Status Notification
        // ============================================================

        public async Task<string> QueueStatusNotificationAsync(Sandbox_BasedEntities db, tbl_TrustApplication application, string newStatus)
        {
            if (db == null)
                throw new ArgumentNullException(nameof(db));

            if (application == null)
                throw new ArgumentNullException(nameof(application));

            if (string.IsNullOrWhiteSpace(newStatus))
                return null;

            string status = newStatus.Trim().ToUpperInvariant();

            var content = GetStatusContent(status);

            // Status does not require agent notification.
            if (content == null)
                return null;

            // ============================================================
            // Duplicate Protection
            //
            // One Trust Application should only generate one email for
            // each status event.
            // ============================================================

            bool alreadyQueued =
                await db.tbl_EmailQueue.AnyAsync(
                    x =>
                        x.MerchantID == application.MerchantID &&
                        x.ReferenceType == ReferenceType &&
                        x.ReferenceID == application.RowID &&
                        x.EventCode == status);

            if (alreadyQueued)
            {
                return null;
            }

            // ========================================================
            // Agent
            //
            // tbl_TrustApplication.MemberID = Trust Representative
            // ========================================================

            var agent = await db.tbl_MemberInfo.FirstOrDefaultAsync(x => x.RowID == application.MemberID && !x.IsDeleted);

            if (agent == null)
                return null;

            if (string.IsNullOrWhiteSpace(agent.Email))
                return null;

            // ========================================================
            // Settlor
            // ========================================================

            var personal = await db.tbl_TrustApplication_PersonalDetail.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            // ========================================================
            // Trust Asset
            // ========================================================

            var trustAsset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            // ========================================================
            // Trust Plan
            // ========================================================

            var trustPlan = await db.tbl_TrustPlan.FirstOrDefaultAsync(x => x.ProductCode == application.ProductCode);

            // ========================================================
            // Public ID
            // ========================================================

            string publicId = Guid.NewGuid().ToString();

            // ========================================================
            // Trust No.
            //
            // Current system displays TrustID as 4 digits.
            // Example:
            // 7 -> 0007
            // ========================================================

            string trustNo = application.TrustID.ToString("D4");

            // ========================================================
            // Application URL
            //
            // Change this path if the React route differs.
            // ========================================================

            string memberUrl = AppSettingsHelper.MemberUrl?.TrimEnd('/');
            string applicationUrl = string.IsNullOrWhiteSpace(memberUrl) ? "" : memberUrl + "/trust/listing/" + trustNo;

            // ========================================================
            // Template Data
            // ========================================================

            var templateData = new
            {
                AgentName = string.IsNullOrWhiteSpace(agent.Fullname) ? agent.displayName : agent.Fullname,
                TrustNo = trustNo,
                SettlorName = personal == null ? "" : personal.FullName,
                ProductName = trustPlan == null ? "" : trustPlan.ProductName,
                TrustPlacement = trustAsset == null ? "" : trustAsset.TrustAssetAmount.ToString("N2", CultureInfo.InvariantCulture),
                StatusTitle = content.Title,
                StatusDisplay = content.DisplayStatus,
                StatusMessage = content.Message,
                StatusDescription = content.Description,
                ApplicationUrl = applicationUrl
            };

            string templateDataJson = JsonConvert.SerializeObject(templateData);

            // ========================================================
            // Email Queue
            // ========================================================

            db.tbl_EmailQueue.Add(
                new tbl_EmailQueue
                {
                    MerchantID = application.MerchantID,
                    PublicID = publicId,
                    JobType = "INSTANT",
                    ReceiverEmail = agent.Email.Trim(),
                    Subject = content.Subject + " - " + trustNo,
                    TemplateCode = TemplateCode,
                    TemplateDataJson = templateDataJson,
                    Status = 0,
                    RetryCount = 0,
                    CreatedDate = DateTime.Now,
                    ReferenceType = ReferenceType,
                    ReferenceID = application.RowID,
                    EventCode = status
                });

            return publicId;
        }

        // ============================================================
        // Trigger JobServer
        //
        // IMPORTANT:
        // Call this only AFTER transaction.Commit().
        // ============================================================

        public async Task TriggerAsync(string publicId)
        {
            if (string.IsNullOrWhiteSpace(publicId))
                return;

            await HangfireHelper.TriggerInstantEmail(publicId);
        }

        // ============================================================
        // Status Content
        // ============================================================

        private StatusEmailContent GetStatusContent(string status)
        {
            switch (status)
            {
                case "PAYMENT_APPROVED":

                    return new StatusEmailContent
                    {
                        Subject = "Trust Application Payment Approved",
                        Title = "Payment Approved",
                        DisplayStatus = "Payment Approved",
                        Message = "The full payment for the following Trust Application has been approved.",
                        Description = "The Trust Application has commenced and will proceed to the next stage for administrative processing."
                    };

                case "PENDING_ADMIN_APPROVAL":

                    return new StatusEmailContent
                    {
                        Subject = "Trust Application Pending Admin Approval",
                        Title = "Pending Admin Approval",
                        DisplayStatus = "Pending Admin Approval",
                        Message = "The following Trust Application has been submitted for Admin approval.",
                        Description = "The application is currently awaiting review and approval by the Admin team."
                    };

                case "SENT_OUT":

                    return new StatusEmailContent
                    {
                        Subject = "Trust Application Sent Out",
                        Title = "Trust Application Sent Out",
                        DisplayStatus = "Sent Out",
                        Message = "The following Trust Application has been approved by Admin and has progressed to the Sent Out stage.",
                        Description = "The application is now being processed for the next stage before stamping."
                    };

                case "STAMPING":

                    return new StatusEmailContent
                    {
                        Subject = "Trust Application Submitted for Stamping",
                        Title = "Submitted for Stamping",
                        DisplayStatus = "Stamping",
                        Message = "The following Trust Application has been submitted for stamping.",
                        Description = "The application is currently undergoing the stamping process."
                    };

                case "COMPLETED":

                    return new StatusEmailContent
                    {
                        Subject = "Trust Application Completed",
                        Title = "Trust Application Completed",
                        DisplayStatus = "Completed",
                        Message = "The following Trust Application has been successfully completed.",
                        Description = "The Trust Application has completed all required processing stages and is now active."
                    };

                case "EARLY_WITHDRAWN":

                    return new StatusEmailContent
                    {
                        Subject = "Trust Application Early Withdrawal Completed",
                        Title = "Early Withdrawal Completed",
                        DisplayStatus = "Early Withdrawn",
                        Message = "The early withdrawal for the following Trust Application has been completed.",
                        Description = "The Trust Application has been successfully withdrawn before maturity and is now closed."
                    };

                case "REJECTED":

                    return new StatusEmailContent
                    {
                        Subject = "Trust Application Rejected",
                        Title = "Trust Application Rejected",
                        DisplayStatus = "Rejected",
                        Message = "The following Trust Application has been rejected.",
                        Description = "The Trust Application has been rejected and will not proceed to the next processing stage."
                    };

                default:
                    return null;
            }
        }

        // ============================================================
        // Internal Model
        // ============================================================

        private class StatusEmailContent
        {
            public string Subject { get; set; }
            public string Title { get; set; }
            public string DisplayStatus { get; set; }
            public string Message { get; set; }
            public string Description { get; set; }
        }
    }
}