using API_CPX.Context;
using API_CPX.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Web;

namespace API_CPX.API
{
    public class TokenValidation
    {
        private const string secretkey = "2TxrnDXzYwqGQwC9fEEg@aSxNq6Jrh";
        private const string AccessTokenPurpose = "AT";
        private const string ResetPasswordTokenPurpose = "RP";
        private const string ConfirmEmailTokenPurpose = "EC";//change here change bit length for reason  section (2 per char)

        public string GenerateToken(long MemberID)
        {
            Sandbox_BasedEntities db = new Sandbox_BasedEntities();
            string customguid = StringToGUID(MemberID.ToString() + DateTime.Now.ToString("yyyyMMddHHmmss")).ToString();
            string hash = Encrypt(customguid);
            tbl_AppToken apptoken = db.tbl_AppToken.Where(a => a.MemberID == MemberID).FirstOrDefault();
            apptoken.token = hash;
            apptoken.lastTxnDate = DateTime.Now;
            db.SaveChanges();
            return hash;
        }

        public string GenerateToken(LoginUserModel user)
        {
            string customguid = StringToGUID(user.UserName + user.UserId + DateTime.Now.ToString("yyyyMMddHHmmss")).ToString();
            Sandbox_BasedEntities db = new Sandbox_BasedEntities();
            long lngMid = Convert.ToInt64(user.UserId);
            string hash = Encrypt(customguid);
            tbl_AppToken apptoken = db.tbl_AppToken.Where(a => a.MemberID == lngMid).FirstOrDefault();
            if (apptoken != null)
            {
                apptoken.token = hash;
                apptoken.lastTxnDate = DateTime.Now;
                db.SaveChanges();
            }
            else
            {
                tbl_AppToken appNewToken = new tbl_AppToken();
                appNewToken.MemberID = lngMid;
                appNewToken.token = hash;
                appNewToken.lastTxnDate = DateTime.Now;

                db.tbl_AppToken.Add(appNewToken);
                db.SaveChanges();
            }
            return hash;
        }

        private Guid StringToGUID(string value)
        {
            // Create a new instance of the MD5CryptoServiceProvider object.
            MD5 md5Hasher = MD5.Create();
            // Convert the input string to a byte array and compute the hash.
            byte[] data = md5Hasher.ComputeHash(Encoding.Default.GetBytes(value));
            return new Guid(data);
        }

        public static string Encrypt(string toEncrypt)
        {
            byte[] keyArray;
            byte[] toEncryptArray = UTF8Encoding.UTF8.GetBytes(toEncrypt);

            //Get your key from config file to open the lock!
            string key = secretkey;
            bool useHashing = true;
            //System.Windows.Forms.MessageBox.Show(key);
            //If hashing use get hashcode regards to your key
            if (useHashing)
            {
                MD5CryptoServiceProvider hashmd5 = new MD5CryptoServiceProvider();
                keyArray = hashmd5.ComputeHash(UTF8Encoding.UTF8.GetBytes(key));
                //Always release the resources and flush data
                // of the Cryptographic service provide. Best Practice

                hashmd5.Clear();
            }
            else
                keyArray = UTF8Encoding.UTF8.GetBytes(key);

            TripleDESCryptoServiceProvider tdes = new TripleDESCryptoServiceProvider();
            //set the secret key for the tripleDES algorithm
            tdes.Key = keyArray;
            //mode of operation. there are other 4 modes.
            //We choose ECB(Electronic code Book)
            tdes.Mode = CipherMode.ECB;
            //padding mode(if any extra byte added)

            tdes.Padding = PaddingMode.PKCS7;

            ICryptoTransform cTransform = tdes.CreateEncryptor();
            //transform the specified region of bytes array to resultArray
            byte[] resultArray =
              cTransform.TransformFinalBlock(toEncryptArray, 0,
              toEncryptArray.Length);
            //Release resources held by TripleDes Encryptor
            tdes.Clear();
            //Return the encrypted data into unreadable string format
            return Convert.ToBase64String(resultArray, 0, resultArray.Length);
        }

        public string Decrypt(string cipherString)
        {
            byte[] keyArray;
            //get the byte code of the string

            byte[] toEncryptArray = Convert.FromBase64String(cipherString);

            //Get your key from config file to open the lock!
            string key = secretkey;
            bool useHashing = true;
            if (useHashing)
            {
                //if hashing was used get the hash code with regards to your key
                MD5CryptoServiceProvider hashmd5 = new MD5CryptoServiceProvider();
                keyArray = hashmd5.ComputeHash(UTF8Encoding.UTF8.GetBytes(key));
                //release any resource held by the MD5CryptoServiceProvider

                hashmd5.Clear();
            }
            else
            {
                //if hashing was not implemented get the byte code of the key
                keyArray = UTF8Encoding.UTF8.GetBytes(key);
            }

            TripleDESCryptoServiceProvider tdes = new TripleDESCryptoServiceProvider();
            //set the secret key for the tripleDES algorithm
            tdes.Key = keyArray;
            //mode of operation. there are other 4 modes. 
            //We choose ECB(Electronic code Book)

            tdes.Mode = CipherMode.ECB;
            //padding mode(if any extra byte added)
            tdes.Padding = PaddingMode.PKCS7;

            ICryptoTransform cTransform = tdes.CreateDecryptor();
            byte[] resultArray = cTransform.TransformFinalBlock(
                                 toEncryptArray, 0, toEncryptArray.Length);
            //Release resources held by TripleDes Encryptor                
            tdes.Clear();
            //return the Clear decrypted TEXT
            return UTF8Encoding.UTF8.GetString(resultArray);
        }
    }
}