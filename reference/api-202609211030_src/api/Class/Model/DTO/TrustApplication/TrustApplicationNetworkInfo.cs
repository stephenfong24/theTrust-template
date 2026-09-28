using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.TrustApplication
{
    public class TrustApplicationNetworkInfo
    {
        public long? ReferenceID { get; set; }

        public string NetworkType { get; set; }

        public string NetworkName { get; set; }

        public string ReferralCode { get; set; }

        public bool CanEdit { get; set; }

        /// <summary>
        /// Available network references belonging to the
        /// Trust Application owner.
        ///
        /// Used when editing an existing application.
        /// </summary>
        public List<TrustApplicationNetworkOption>
            AvailableOptions
        { get; set; }
    }

    public class TrustApplicationNetworkOption
    {
        public long ReferenceID { get; set; }

        public string NetworkType { get; set; }

        public string NetworkName { get; set; }

        public string ReferralCode { get; set; }
    }
}