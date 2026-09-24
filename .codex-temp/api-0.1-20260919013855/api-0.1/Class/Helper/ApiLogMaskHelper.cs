using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;

namespace API_CPX.Class.Helper
{
    public static class ApiLogMaskHelper
    {
        public static string MaskSensitiveJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return json;

            try
            {
                var token = JToken.Parse(json);

                MaskToken(token);

                return token.ToString(Formatting.None);
            }
            catch
            {
                return json;
            }
        }

        private static void MaskToken(JToken token)
        {
            if (token == null)
                return;

            if (token.Type == JTokenType.Object)
            {
                foreach (var property in ((JObject)token).Properties())
                {
                    string name = property.Name.ToLower();

                    if (
                        name.Contains("password") ||
                        name.Contains("token") ||
                        name.Contains("otp") ||
                        name.Contains("secret") ||
                        name.Contains("authorization") ||
                        name.Contains("card") ||
                        name.Contains("cvv")
                    )
                    {
                        property.Value = "******";
                    }
                    else
                    {
                        MaskToken(property.Value);
                    }
                }
            }
            else if (token.Type == JTokenType.Array)
            {
                foreach (var item in token.Children())
                {
                    MaskToken(item);
                }
            }
        }

        public static string TrimLargeText(string text, int maxLength = 100000)
        {
            if (string.IsNullOrEmpty(text))
                return text;

            if (text.Length <= maxLength)
                return text;

            return text.Substring(0, maxLength) + " ... <TRUNCATED>";
        }
    }
}