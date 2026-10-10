using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Helper.Document
{
    public static class DocumentAddressHelper
    {
        public static string BuildSettlorAddress(string addressLine1, string addressLine2)
        {
            string address1 = (addressLine1 ?? "").Trim();
            string address2 = (addressLine2 ?? "").Trim();

            if (string.IsNullOrWhiteSpace(address2))
                return address1;

            if (string.IsNullOrWhiteSpace(address1))
                return address2;

            return address1 + ", " + address2;
        }
    }
}