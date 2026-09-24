using API_CPX.Class.Helper;
using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using System;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication
{
    public class MalaysiaIcOcrService
    {
        private readonly OpenAiIcExtractionService openAiService;

        public MalaysiaIcOcrService()
        {
            openAiService =
                new OpenAiIcExtractionService();
        }

        public async Task<MalaysiaIcOcrResult> ExtractAsync(
            byte[] imageBytes,
            string contentType,
            string source,
            long? userID,
            string merchantID)
        {
            // ============================================================
            // Step 1
            // Validate image
            // ============================================================

            if (imageBytes == null ||
                imageBytes.Length == 0)
            {
                throw new Exception(
                    "Image data is empty.");
            }

            if (string.IsNullOrWhiteSpace(contentType))
            {
                throw new Exception(
                    "Image content type is required.");
            }

            // ============================================================
            // Step 2
            // Send original image directly to OpenAI Vision
            //
            // No Tesseract.
            // No OCR intermediate text.
            // No physical image storage.
            // ============================================================

            MalaysiaIcOcrResult result =
                await openAiService
                    .ExtractMalaysiaIcAsync(
                        imageBytes,
                        contentType,
                        source,
                        userID,
                        merchantID);

            if (result == null)
            {
                throw new Exception(
                    "Unable to extract IC information.");
            }

            // ============================================================
            // Step 3
            // OpenAI document classification
            // ============================================================

            if (!result.IsValidIC)
            {
                throw new Exception(
                    "The uploaded image does not appear to be a Malaysian IC.");
            }

            // ============================================================
            // Step 4
            // IC Number must exist
            // ============================================================

            if (result.ICNumber == null ||
                string.IsNullOrWhiteSpace(
                    result.ICNumber.Value))
            {
                throw new Exception(
                    "Unable to reliably read the IC number.");
            }

            // ============================================================
            // Step 5
            // Normalize IC number
            // ============================================================

            string normalizedIc =
                MalaysiaIcValidator.Normalize(
                    result.ICNumber.Value);

            // ============================================================
            // Step 6
            // Server-side Malaysian NRIC validation
            //
            // Never rely only on OpenAI validation.
            // ============================================================

            if (!MalaysiaIcValidator.IsValid(
                normalizedIc))
            {
                throw new Exception(
                    "The extracted IC number is invalid.");
            }

            result.ICNumber.Value =
                normalizedIc;

            // ============================================================
            // Step 7
            // Normalize field confidence
            // ============================================================

            NormalizeField(result.ICNumber);
            NormalizeField(result.Name);
            NormalizeField(result.Postcode);
            NormalizeField(result.City);
            NormalizeField(result.State);
            NormalizeField(result.Address1);
            NormalizeField(result.Address2);

            return result;
        }

        private void NormalizeField(
            OcrFieldResult field)
        {
            if (field == null)
                return;

            if (string.IsNullOrWhiteSpace(
                field.Value))
            {
                field.Value = null;
                field.Confidence = 0;
                return;
            }

            field.Value =
                field.Value.Trim();

            if (field.Confidence < 0)
                field.Confidence = 0;

            if (field.Confidence > 1)
                field.Confidence = 1;
        }
    }
}