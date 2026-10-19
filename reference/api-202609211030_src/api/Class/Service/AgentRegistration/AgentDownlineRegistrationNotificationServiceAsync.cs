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

        public async Task<string> QueueAsync(Sandbox_BasedEntities db, string merchantId, long newMemberId)
        {
            if (db == null)
                throw new ArgumentNullException(nameof(db));

            bool isTrust = AppSettingsHelper.IsTheTrust(merchantId);
            bool isWill = AppSettingsHelper.IsTheWill(merchantId);

            if (!isTrust && !isWill)
                throw new InvalidOperationException("Invalid MerchantID.");

            string referenceType = isTrust ? "V" : "W";

            var newAgent = await (
                from member in db.tbl_MemberInfo
                join reference in db.tbl_Reference on member.RowID equals reference.MemberID
                where member.RowID == newMemberId && member.IsDeleted == false && reference.MerchantID == merchantId && reference.Type == referenceType && reference.Status == 0
                select new
                {
                    member.Fullname,
                    member.Email,
                    reference.ReferralCode
                }
            ).FirstOrDefaultAsync();

            if (newAgent == null)
                throw new InvalidOperationException("Newly registered agent not found.");

            bool alreadyQueued = await db.tbl_EmailQueue.AnyAsync(x =>
                x.MerchantID == merchantId &&
                x.ReferenceType == ReferenceType &&
                x.ReferenceID == newMemberId &&
                x.EventCode == EventCode);

            if (alreadyQueued)
                return null;

            var visited = new HashSet<long> { newMemberId };
            long currentMemberId = newMemberId;
            string directUplineEmail = null;
            string directUplineName = null;
            var bccRecipients = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            int level = 0;

            while (true)
            {
                long? parentId;

                if (isTrust)
                {
                    parentId = await db.tbl_MemberUnit_Trust
                        .Where(x => x.memberID == currentMemberId && x.isDeleted == false)
                        .Select(x => x.unitSponsor)
                        .FirstOrDefaultAsync();
                }
                else
                {
                    parentId = await db.tbl_MemberUnit_Will
                        .Where(x => x.memberID == currentMemberId && x.isDeleted == false)
                        .Select(x => x.unitSponsor)
                        .FirstOrDefaultAsync();
                }

                if (!parentId.HasValue || parentId.Value <= 0)
                    break;

                long uplineId = parentId.Value;

                if (!visited.Add(uplineId))
                    throw new InvalidOperationException("Circular placement tree detected.");

                level++;

                var upline = await (
                    from member in db.tbl_MemberInfo
                    join reference in db.tbl_Reference on member.RowID equals reference.MemberID
                    where member.RowID == uplineId
                        && member.IsDeleted == false
                        && member.UserType == "AGENT"
                        && member.Status == 0
                        && reference.MerchantID == merchantId
                        && reference.Type == referenceType
                        && reference.Status == 0
                    select new
                    {
                        member.Fullname,
                        member.Email
                    }
                ).FirstOrDefaultAsync();

                if (level == 1)
                {
                    if (upline == null || string.IsNullOrWhiteSpace(upline.Email))
                    {
                        return null;
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
                return null;

            string publicId = Guid.NewGuid().ToString("N");

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
                BccEmails = bccRecipients.Count == 0 ? null : string.Join(",", bccRecipients.OrderBy(x => x)),
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

            return publicId;
        }
    }
}