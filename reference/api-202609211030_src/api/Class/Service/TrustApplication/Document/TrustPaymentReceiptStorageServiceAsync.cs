using API_CPX.Class.Exceptions;
using API_CPX.Class.Helper;
using API_CPX.Context;
using System;
using System.Configuration;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Document
{
    public class TrustPaymentReceiptStorageServiceAsync
    {
        private const string Code = "TRUST-PAYMENT-RECEIPT-ARCHIVE";

        private const string TrustMerchantId = AppSettingsHelper.TrustMerchantId;

        public async Task<tbl_TrustPaymentReceiptArchive> EnsureArchivedAsync(string merchantId, long userId, string roleCode, long trustId, long paymentId)
        {
            if (merchantId != TrustMerchantId)
                throw new BusinessException("Receipt archive is available for theTrust only.", Code);

            using (var db = new Sandbox_BasedEntities())
            {
                var application = await db.tbl_TrustApplication.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.TrustID == trustId);

                if (application == null)
                    throw new BusinessException("Trust application not found.", Code);

                var payment = await db.tbl_TrustApplication_Payment
                    .FirstOrDefaultAsync(x => x.RowID == paymentId && x.TrustApplicationID == application.RowID && x.IsActive);

                if (payment == null)
                    throw new BusinessException("Payment not found.", Code);

                if (payment.PaymentStatus != "PAYMENT_APPROVED" || !payment.ApprovedAt.HasValue || string.IsNullOrWhiteSpace(payment.ReceiptNo))
                {
                    throw new BusinessException("Payment is not eligible for an official receipt.", Code);
                }

                var existing = await db.tbl_TrustPaymentReceiptArchive.FirstOrDefaultAsync(x => x.MerchantID == merchantId && x.PaymentID == paymentId);

                if (existing != null)
                {
                    ValidateArchiveFile(existing);
                    return existing;
                }

                var documentService = new TrustApplicationDocumentServiceAsync();
                var generated = await documentService.GeneratePaymentOfficialReceiptForViewAsync(merchantId, userId, roleCode, trustId, paymentId);

                if (generated == null || generated.Content == null || generated.Content.Length < 5)
                {
                    throw new BusinessException("Receipt PDF generation failed.", Code);
                }

                byte[] pdfBytes = generated.Content;

                if (pdfBytes[0] != '%' ||
                    pdfBytes[1] != 'P' ||
                    pdfBytes[2] != 'D' ||
                    pdfBytes[3] != 'F' ||
                    pdfBytes[4] != '-')
                {
                    throw new BusinessException("Generated receipt is not a PDF.", Code);
                }

                string root = GetStorageRoot();

                string relativeDirectory = Path.Combine(
                    "trust-receipts",
                    merchantId,
                    application.RowID.ToString(),
                    payment.RowID.ToString());

                string storedFileName = "receipt-" + Guid.NewGuid().ToString("N") + ".pdf";
                string relativePath = Path.Combine(relativeDirectory, storedFileName);
                string directory = Path.Combine(root, relativeDirectory);
                Directory.CreateDirectory(directory);

                string fullPath = Path.Combine(directory, storedFileName);
                string temporaryPath = fullPath + ".tmp";

                string hash;
                using (var sha = SHA256.Create())
                {
                    hash = BitConverter.ToString(sha.ComputeHash(pdfBytes)).Replace("-", "").ToLowerInvariant();
                }

                try
                {
                    File.WriteAllBytes(temporaryPath, pdfBytes);
                    File.Move(temporaryPath, fullPath);

                    var archive = new tbl_TrustPaymentReceiptArchive
                    {
                        MerchantID = merchantId,
                        TrustApplicationID = application.RowID,
                        PaymentID = payment.RowID,
                        ReceiptNo = payment.ReceiptNo,
                        FileName = Path.GetFileName(generated.FileName),
                        FilePath = relativePath,
                        FileSize = pdfBytes.LongLength,
                        SHA256 = hash,
                        CreatedAt = DateTime.Now,
                        CreatedBy = userId
                    };

                    db.tbl_TrustPaymentReceiptArchive.Add(archive);
                    await db.SaveChangesAsync();

                    return archive;
                }
                finally
                {
                    if (File.Exists(temporaryPath))
                        File.Delete(temporaryPath);
                }
            }
        }

        public void ValidateArchiveFile(tbl_TrustPaymentReceiptArchive archive)
        {
            string root = GetStorageRoot();

            if (string.IsNullOrWhiteSpace(archive.FilePath) || Path.IsPathRooted(archive.FilePath))
            {
                throw new InvalidOperationException("Invalid receipt archive path.");
            }

            string prefix = root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
            string fullPath = Path.GetFullPath(Path.Combine(root, archive.FilePath));

            if (!fullPath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Receipt file is outside the storage root.");
            }

            if (!File.Exists(fullPath))
                throw new FileNotFoundException("Archived receipt file not found.", fullPath);

            var info = new FileInfo(fullPath);

            if (info.Length != archive.FileSize)
                throw new InvalidOperationException("Archived receipt file size mismatch.");

            using (var sha = SHA256.Create())
            using (var stream = File.OpenRead(fullPath))
            {
                string actualHash = BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();

                if (!string.Equals(actualHash, archive.SHA256, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Archived receipt integrity check failed.");
                }
            }
        }

        private static string GetStorageRoot()
        {
            string configured = ConfigurationManager.AppSettings["EmailAttachment.StorageRoot"];

            if (string.IsNullOrWhiteSpace(configured))
                throw new InvalidOperationException("EmailAttachment.StorageRoot is not configured.");

            return Path.GetFullPath(configured);
        }
    }
}
