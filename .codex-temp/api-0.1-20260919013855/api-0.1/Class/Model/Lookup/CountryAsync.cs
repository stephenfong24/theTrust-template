using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace API_CPX.Class.Model
{
    public class CountryAsync : Base
    {
        private IEnumerable<CountryList> countryLists;

        public IEnumerable<CountryList> CountryLists
        {
            get { return countryLists; }
            set { countryLists = value; }
        }

        public async Task<bool> GetCountryList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var merchant = await dbR.tbl_Merchant.FirstOrDefaultAsync(a => a.MerchantID == MerchantID && a.Status == 0);
                if (merchant == null)
                {
                    Status = 4;
                    Message = "Err : Invalid merchant account!";
                    return false;
                }

                var topCountries = new[]
                {
                    "Malaysia"
                };

                var countries = await dbR.tbl_Country
                    .Where(a => a.Country_Status == 1)
                    .Select(a => new CountryList
                    {
                        id = a.Id,
                        CountryMobileCode = a.Country_MobileCode.HasValue
                            ? (int)a.Country_MobileCode.Value
                            : 0,
                        CountryDomain = a.Country_Domain,
                        CountryName = a.Country_Name.Replace("_", " "),
                        Nationality = a.Country_Nationality,
                        UTCoffSet = 0
                    })
                    .ToListAsync();

                CountryLists = countries
                    .OrderBy(a => topCountries.Contains(a.CountryName) ? 0 : 1)
                    .ThenBy(a => topCountries.Contains(a.CountryName)
                        ? Array.IndexOf(topCountries, a.CountryName)
                        : int.MaxValue)
                    .ThenBy(a => a.CountryName)
                    .ToList();

                Message = "Success";
                return true;
            }
        }

        public class CountryList
        {
            public long id { get; set; }
            public int CountryMobileCode { get; set; }
            public string CountryDomain { get; set; }
            public string CountryName { get; set; }
            public string Nationality { get; set; }
            public decimal UTCoffSet { get; set; }
        }
    }
}