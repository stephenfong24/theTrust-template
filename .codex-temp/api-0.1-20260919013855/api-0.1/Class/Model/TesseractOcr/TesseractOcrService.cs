using API_CPX.Class.Model.DTO;
using API_CPX.Class.Model.TrustApplication;
using System;
using System.IO;
using System.Web;
using TesseractOCR;
using TesseractOCR.Enums;

namespace API_CPX.Class.Service.TrustApplication
{
    public class TesseractOcrService
    {
        private readonly string tessDataPath;

        public TesseractOcrService()
        {
            tessDataPath =
                HttpContext.Current.Server.MapPath("~/tessdata");
        }

        public TesseractOcrResult ExtractText(
            byte[] imageBytes)
        {
            if (imageBytes == null ||
                imageBytes.Length == 0)
            {
                throw new Exception(
                    "Image data is empty.");
            }

            try
            {
                using (var engine = new Engine(
                    tessDataPath,
                    Language.English,
                    EngineMode.Default))
                {
                    using (var img =
                        TesseractOCR.Pix.Image.LoadFromMemory(
                            imageBytes))
                    {
                        using (var page =
                            engine.Process(img))
                        {
                            string text =
                                page.Text;

                            float confidence =
                                page.MeanConfidence;

                            return new TesseractOcrResult
                            {
                                Text = text,
                                Confidence = confidence
                            };
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception(
                    "Unable to perform OCR on the uploaded image.",
                    ex);
            }
        }
    }
}