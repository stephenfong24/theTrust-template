using API_CPX.Class.Helper;
using API_CPX.Context;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.AgentRegistration
{
    public class AgentDownlineRegistrationNotificationServiceAsync
    {
        private const string TemplateCode = "agent-downline-registered";
        private const string ReferenceType = "AGENT_REGISTRATION";
        private const string EventCode = "DOWNLINE_REGISTERED";

        public async Task<bool> QueueAsync(Sandbox_BasedEntities db, string merchantId, long newMemberId)
        {
            if (db == null)
                throw new ArgumentNullException(nameof(db));

            var newAgent = await (
                from member in db.tbl_MemberInfo
                join reference in db.tbl_Reference on member.RowID equals reference.MemberID
                where member.RowID == newMemberId
                    && member.IsDeleted == false
                    && reference.MerchantID == merchantId
                    && reference.Type == "V"
                    && reference.Status == 0
                select new
                {
                    member.Fullname,
                    member.Email,
                    reference.ReferralCode
                }
            ).FirstOrDefaultAsync();

            if (newAgent == null)
                throw new InvalidOperationException("Newly registered Trust agent not found.");

            // One notification event per newly registered agent.
            bool alreadyQueued = await db.tbl_EmailQueue.AnyAsync(x => x.MerchantID == merchantId && x.ReferenceType == ReferenceType && x.ReferenceID == newMemberId && x.EventCode == EventCode);

            if (alreadyQueued)
                return false;

            var visited = new HashSet<long>();
            visited.Add(newMemberId);

            long currentMemberId = newMemberId;
            string directUplineEmail = null;
            string directUplineName = null;
            string publicId = Guid.NewGuid().ToString("N");

            var bccRecipients = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            int level = 0;

            while (true)
            {
                var parentId = await db.tbl_MemberUnit_Trust.Where(x => x.memberID == currentMemberId && x.isDeleted == false).Select(x => x.unitSponsor).FirstOrDefaultAsync();

                if (!parentId.HasValue || parentId.Value <= 0)
                    break;

                long uplineId = parentId.Value;

                if (!visited.Add(uplineId))
                    throw new InvalidOperationException("Circular Trust placement tree detected.");

                level++;

                var upline = await db.tbl_MemberInfo
                    .Where(x => x.RowID == uplineId && x.IsDeleted == false && x.UserType == "AGENT" && x.Status == 0)
                    .Select(x => new
                    {
                        x.Fullname,
                        x.Email
                    })
                    .FirstOrDefaultAsync();

                if (level == 1)
                {
                    if (upline == null || string.IsNullOrWhiteSpace(upline.Email))
                    {
                        return false;
                    }

                    directUplineEmail = upline.Email.Trim();
                    directUplineName = upline.Fullname;
                }
                else if (upline != null && !string.IsNullOrWhiteSpace(upline.Email))
                {
                    string email = upline.Email.Trim();

                    if (!string.Equals(email, directUplineEmail, StringComparison.OrdinalIgnoreCase))
                    {
                        bccRecipients.Add(email);
                    }
                }

                currentMemberId = uplineId;
            }

            if (string.IsNullOrWhiteSpace(directUplineEmail))
                return false;

            var templateData = new
            {
                AgentName = directUplineName ?? "",
                DownlineCode = newAgent.ReferralCode,
                DownlineName = newAgent.Fullname ?? "",
                DownlineEmail = newAgent.Email ?? ""
            };

            db.tbl_EmailQueue.Add(new tbl_EmailQueue
            {
                MerchantID = merchantId,
                PublicID = publicId,
                JobType = "INSTANT",
                ReceiverEmail = directUplineEmail,
                CcEmails = null,
                BccEmails = bccRecipients.Count == 0 ? null : string.Join(",", bccRecipients),
                Subject = "New Agent Registered in Your Network",
                TemplateCode = TemplateCode,
                TemplateDataJson = JsonConvert.SerializeObject(templateData),
                Status = 0,
                RetryCount = 0,
                CreatedDate = DateTime.Now,
                ReferenceType = ReferenceType,
                ReferenceID = newMemberId,
                EventCode = EventCode
            });

            await HangfireHelper.TriggerInstantEmail(publicId, merchantId);
            return true;
        }
    }
}
