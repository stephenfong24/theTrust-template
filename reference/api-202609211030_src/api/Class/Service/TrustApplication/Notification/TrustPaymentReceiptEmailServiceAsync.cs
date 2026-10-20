using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Class.Helper.TrustApplication;
using API_CPX.Class.Service.TrustApplication.Document;
using API_CPX.Context;
using Newtonsoft.Json;
using System;
using System.Data.Entity;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Notification
{
    public class TrustPaymentReceiptEmailServiceAsync
    {
        private const string Code = "TRUST-PAYMENT-RECEIPT-EMAIL";

        private const string Merchant = AppSettingsHelper.TrustMerchantId;

        private const string Template = "trust-payment-receipt";

        private const string Reference = "TRUST_PAYMENT";

        public async Task<string> QueueAsync(string merchantId, long trustId, long paymentId, bool isManual)
        {
            if (merchantId != Merchant)
                throw new BusinessException("Receipt email is available for theTrust only.", Code);

            using (var db = new Sandbox_BasedEntities())
            using (var transaction = db.Database.BeginTransaction())
            {
                var application = await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                if (application == null)
                    throw new BusinessException("Trust application not found.", Code);

                var payment = await db.tbl_TrustApplication_Payment
                    .FirstOrDefaultAsync(x => x.RowID == paymentId && x.TrustApplicationID == application.RowID && x.IsActive);

                if (payment == null || payment.PaymentStatus != "PAYMENT_APPROVED" || !payment.ApprovedAt.HasValue || string.IsNullOrWhiteSpace(payment.ReceiptNo))
                {
                    throw new BusinessException("Only approved payments can send receipts.", Code);
                }

                var archive = await db.tbl_TrustPaymentReceiptArchive
                    .FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.PaymentID == paymentId);

                if (archive == null)
                    throw new BusinessException("Receipt has not been archived.", Code);

                new TrustPaymentReceiptStorageServiceAsync().ValidateArchiveFile(archive);

                var personal = await db.tbl_TrustApplication_PersonalDetail
                    .FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

                if (personal == null || string.IsNullOrWhiteSpace(personal.Email))
                {
                    throw new BusinessException("Settlor email is missing.", Code);
                }

                string eventCode = isManual ? "TRUST_PAYMENT_RECEIPT_RESEND" : "TRUST_PAYMENT_RECEIPT_AUTO";

                if (!isManual)
                {
                    bool exists = await db.tbl_EmailQueue.AnyAsync(x => x.MerchantID == merchantId && x.ReferenceType == Reference && x.ReferenceID == payment.RowID && x.EventCode == eventCode);
                    if (exists)
                        return null;
                }

                string publicId = Guid.NewGuid().ToString();
                string trustNo = TrustNoHelper.Format(application);

                var templateData = new
                {
                    SettlorName = personal.FullName ?? "",
                    TrustNo = trustNo,
                    ReceiptNo = payment.ReceiptNo,
                    PaymentDate = payment.PaymentReceivedDate.HasValue ? payment.PaymentReceivedDate.Value.ToString("dd MMM yyyy", CultureInfo.InvariantCulture) : "",
                    PaymentAmount = payment.PaymentAmount.ToString("N2", CultureInfo.InvariantCulture)
                };

                var email = new tbl_EmailQueue
                {
                    MerchantID = merchantId,
                    PublicID = publicId,
                    JobType = "INSTANT",
                    ReceiverEmail = personal.Email.Trim(),
                    CcEmails = null,
                    BccEmails = null,
                    Subject = "theTrust - Official Payment Receipt - " + trustNo,
                    TemplateCode = Template,
                    TemplateDataJson = JsonConvert.SerializeObject(templateData),
                    Status = 0,
                    RetryCount = 0,
                    CreatedDate = DateTime.Now,
                    ReferenceType = Reference,
                    ReferenceID = payment.RowID,
                    EventCode = eventCode
                };

                db.tbl_EmailQueue.Add(email);

                // Obtain the generated queue RowID.
                await db.SaveChangesAsync();

                db.tbl_EmailQueue_Attachment.Add(
                    new tbl_EmailQueue_Attachment
                    {
                        EmailQueueID = email.RowID,
                        MerchantID = merchantId,
                        FileName = archive.FileName,
                        ContentType = "application/pdf",
                        FilePath = archive.FilePath,
                        FileSize = archive.FileSize,
                        CreatedAt = DateTime.Now
                    });

                await db.SaveChangesAsync();
                transaction.Commit();

                return publicId;
            }
        }

        public async Task TriggerAsync(string publicId, string merchantId)
        {
            if (string.IsNullOrWhiteSpace(publicId))
                return;

            await HangfireHelper.TriggerInstantEmail(publicId, merchantId);
        }
    }
}
