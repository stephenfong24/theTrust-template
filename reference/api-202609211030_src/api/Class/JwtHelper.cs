using API_CPX.Class.Exceptions;
using API_CPX.Context;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Configuration;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Linq;
using API_CPX.Services;
using System.Threading.Tasks;

public class JwtHelper
{
    private static string secret = "b8F$2kPz9QxL7vN!mR4tYwC3aD6uH8sJpE1gZ5 @KqT0BfVnX";

    public static string GenerateToken(long userId, string merchantId, string role)
    {
        var key = Encoding.ASCII.GetBytes(secret);

        var tokenHandler = new JwtSecurityTokenHandler();

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("UserID", userId.ToString()),
                new Claim("MerchantID", merchantId),
                new Claim(ClaimTypes.Role, role),
                new Claim("TokenType", "Auth")
            }),
            Expires = DateTime.UtcNow.AddHours(8),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);
        return tokenString;
    }

    public static string GenerateSignalRToken(long userId, string merchantId)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(ConfigurationManager.AppSettings["JwtSecretKey"]);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("UserID", userId.ToString()),
                new Claim("MerchantID", merchantId),
                new Claim("TokenType", "SignalR")
            }),

            Expires = DateTime.UtcNow.AddMinutes(5),

            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature
            )
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);
        return tokenString;
    }

    public static async Task<ClaimsPrincipal> ValidateToken(string token)
    {
        try
        {
            var key = Encoding.UTF8.GetBytes(secret);

            var tokenHandler = new JwtSecurityTokenHandler();

            var parameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            SecurityToken validatedToken;
            var principal = tokenHandler.ValidateToken(token, parameters, out validatedToken);

            // =========================
            // GET USER ID FROM CLAIM
            // =========================

            var userIdClaim = principal.FindFirst("UserID");

            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long memberId))
            {
                throw new BusinessException("Invalid token user.", "INVALID_TOKEN_USER");
            }

            // =========================
            // CHECK TOKEN EXISTS IN DB
            // =========================

            bool isValid = await AppTokenService.IsTokenValidAsync(memberId, token);
            if (!isValid)
            {
                throw new BusinessException("Session expired. Please login again.", "TOKEN_NOT_FOUND");
            }

            return principal;
        }
        catch (SecurityTokenExpiredException)
        {
            throw new BusinessException("Session expired. Please login again.", "TOKEN_EXPIRED");
        }
        catch (SecurityTokenInvalidSignatureException)
        {
            throw new BusinessException("Invalid token signature.", "INVALID_TOKEN_SIGNATURE");
        }
        catch (SecurityTokenException)
        {
            throw new BusinessException("Invalid token.", "INVALID_TOKEN");
        }
        catch (BusinessException)
        {
            throw;
        }
        catch (Exception)
        {
            throw new BusinessException("Authorization failed.", "AUTHORIZATION_FAILED");
        }
    }
}