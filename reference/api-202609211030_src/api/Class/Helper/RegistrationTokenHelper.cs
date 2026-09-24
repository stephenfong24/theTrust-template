using System;
using System.Security.Cryptography;
using System.Text;

public static class RegistrationTokenHelper
{
    public static string GenerateToken()
    {
        byte[] bytes = new byte[32];

        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }

        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
    }

    public static string HashToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return null;

        using (var sha256 = SHA256.Create())
        {
            byte[] bytes = Encoding.UTF8.GetBytes(token);
            byte[] hash = sha256.ComputeHash(bytes);

            return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        }
    }
}