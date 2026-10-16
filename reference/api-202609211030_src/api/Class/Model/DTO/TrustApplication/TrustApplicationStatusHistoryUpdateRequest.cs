using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.TrustApplication
{
    public class TrustApplicationStatusHistoryUpdateRequest
    {
        [StringLength(500)]
        public string Remark { get; set; }

        [Required]
        public DateTime? ChangedAt { get; set; }
    }
}