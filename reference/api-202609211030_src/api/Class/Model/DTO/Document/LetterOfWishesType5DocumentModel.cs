using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.Document
{
    public class LetterOfWishesType5BeneficiaryDocumentModel
    {
        public long BeneficiaryID { get; set; }
        public string Relationship { get; set; }
        public string Name { get; set; }
        public string IdentityNo { get; set; }
    }
}