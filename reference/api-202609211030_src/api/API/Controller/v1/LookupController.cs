using API_CPX.Class.Attributes;
using API_CPX.Class.Exceptions;
using API_CPX.Class.Merchant;
using API_CPX.Class.Model;
using API_CPX.Class.Model.Class;
using API_CPX.Context;
using API_CPX.Model;
using System;
using System.Collections.Generic;
using System.Data.Entity.Core.Objects;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.Caching;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
using System.Web.Http.Description;
using Util;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/lookup")]
    [JwtAuthorize]
    [SkipApiLogging]
    public class LookupController : System.Web.Http.ApiController
    {
        private static readonly MemoryCache cache = MemoryCache.Default;

        [HttpGet]
        [AllowAnonymous]
        [Route("bank-list")]
        public async Task<IHttpActionResult> BankList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Bank List";
                Request.Properties["AuditDescription"] = "Retrieved the bank list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-BANK-LIST");
                }

                string cacheKey = $"BankList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<BankAsync.BankList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-BANK-LIST",
                        Data = new
                        {
                            BankLists = cachedData
                        }
                    });
                }

                BankAsync m = new BankAsync();

                bool isvalid = await m.GetBankList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-BANK-LIST");
                }

                var bankLists = m.BankLists.ToList();

                cache.Set(cacheKey, bankLists, new CacheItemPolicy
                {
                    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                });

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-BANK-LIST",
                    Data = new
                    {
                        BankLists = bankLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-BANK-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("country-list")]
        public async Task<IHttpActionResult> CountryList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Country List";
                Request.Properties["AuditDescription"] = "Retrieved the country list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-COUNTRY-LIST");
                }

                string cacheKey = $"CountryList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<CountryAsync.CountryList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-COUNTRY-LIST",
                        Data = new
                        {
                            CountryLists = cachedData
                        }
                    });
                }

                CountryAsync m = new CountryAsync();

                bool isvalid = await m.GetCountryList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-COUNTRY-LIST");
                }

                var countryLists = m.CountryLists.ToList();

                cache.Set(cacheKey, countryLists, new CacheItemPolicy
                {
                    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                });

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-COUNTRY-LIST",
                    Data = new
                    {
                        CountryLists = countryLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-COUNTRY-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("relationship-list")]
        public async Task<IHttpActionResult> RelationshipList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Relationship List";
                Request.Properties["AuditDescription"] = "Retrieved the relationship list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-RELATIONSHIP-LIST");
                }

                string cacheKey = $"RelationshipList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<RelationshipAsync.RelationshipList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-RELATIONSHIP-LIST",
                        Data = new
                        {
                            RelationshipLists = cachedData
                        }
                    });
                }

                RelationshipAsync m = new RelationshipAsync();

                bool isvalid = await m.GetRelationshipList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-RELATIONSHIP-LIST");
                }

                var relationshipLists = m.RelationshipLists.ToList();

                cache.Set(cacheKey, relationshipLists, new CacheItemPolicy
                {
                    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                });

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-RELATIONSHIP-LIST",
                    Data = new
                    {
                        RelationshipLists = relationshipLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-RELATIONSHIP-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("property-type-list")]
        public async Task<IHttpActionResult> PropertyTypeList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Property Type List";
                Request.Properties["AuditDescription"] = "Retrieved the property type list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-PROPERTY-TYPE-LIST");
                }

                string cacheKey = $"PropertyTypeList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<TypeOfPropertyAsync.TypeOfPropertyList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-PROPERTY-TYPE-LIST",
                        Data = new
                        {
                            PropertyTypeLists = cachedData
                        }
                    });
                }

                TypeOfPropertyAsync m = new TypeOfPropertyAsync();

                bool isvalid = await m.GetTypeOfPropertyList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-PROPERTY-TYPE-LIST");
                }

                var propertyTypeLists = m.TypeOfPropertyLists.ToList();

                cache.Set(cacheKey, propertyTypeLists, new CacheItemPolicy
                {
                    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                });

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-PROPERTY-TYPE-LIST",
                    Data = new
                    {
                        PropertyTypeLists = propertyTypeLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-PROPERTY-TYPE-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("land-type-list")]
        public async Task<IHttpActionResult> LandTypeList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Land Type List";
                Request.Properties["AuditDescription"] = "Retrieved the land type list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-LAND-TYPE-LIST");
                }

                string cacheKey = $"LandTypeList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<TypeOfLandAsync.TypeOfLandList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-LAND-TYPE-LIST",
                        Data = new
                        {
                            LandTypeLists = cachedData
                        }
                    });
                }

                TypeOfLandAsync m = new TypeOfLandAsync();

                bool isvalid = await m.GetTypeOfLandList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-LAND-TYPE-LIST");
                }

                var landTypeLists = m.TypeOfLandLists.ToList();

                cache.Set(cacheKey, landTypeLists, new CacheItemPolicy
                {
                    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                });

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-LAND-TYPE-LIST",
                    Data = new
                    {
                        LandTypeLists = landTypeLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-LAND-TYPE-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("bank-account-type-list")]
        public async Task<IHttpActionResult> BankAccountTypeList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Bank Account Type List";
                Request.Properties["AuditDescription"] = "Retrieved the bank account type list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-BANK-ACCOUNT-TYPE-LIST");
                }

                string cacheKey = $"BankAccountTypeList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<BankAccountTypeAsync.BankAccountTypeList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-BANK-ACCOUNT-TYPE-LIST",
                        Data = new
                        {
                            BankAccountTypeLists = cachedData
                        }
                    });
                }

                BankAccountTypeAsync m = new BankAccountTypeAsync();

                bool isvalid = await m.GetBankAccountTypeList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-BANK-ACCOUNT-TYPE-LIST");
                }

                var bankAccountTypeLists = m.BankAccountTypeLists.ToList();

                cache.Set(cacheKey, bankAccountTypeLists, new CacheItemPolicy
                {
                    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                });

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-BANK-ACCOUNT-TYPE-LIST",
                    Data = new
                    {
                        BankAccountTypeLists = bankAccountTypeLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-BANK-ACCOUNT-TYPE-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("title-type-list")]
        public async Task<IHttpActionResult> TitleTypeList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Title Type List";
                Request.Properties["AuditDescription"] = "Retrieved the title type list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-TITLE-TYPE-LIST");
                }

                string cacheKey = $"TitleTypeList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<TypeOfTitleAsync.TypeOfTitleList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-TITLE-TYPE-LIST",
                        Data = new
                        {
                            TitleTypeLists = cachedData
                        }
                    });
                }

                TypeOfTitleAsync m = new TypeOfTitleAsync();

                bool isvalid = await m.GetTypeOfTitleList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-TITLE-TYPE-LIST");
                }

                var titleTypeLists = m.TypeOfTitleLists.ToList();

                cache.Set(cacheKey, titleTypeLists, new CacheItemPolicy
                {
                    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                });

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-TITLE-TYPE-LIST",
                    Data = new
                    {
                        TitleTypeLists = titleTypeLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-TITLE-TYPE-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("unit-trust-account-type-list")]
        public async Task<IHttpActionResult> UnitTrustAccountTypeList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Unit Trust Account Type List";
                Request.Properties["AuditDescription"] = "Retrieved the unit trust account type list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-UNIT-TRUST-ACCOUNT-TYPE-LIST");
                }

                string cacheKey = $"UnitTrustAccountTypeList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<UnitTrustAccountTypeAsync.UnitTrustAccountTypeList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-UNIT-TRUST-ACCOUNT-TYPE-LIST",
                        Data = new
                        {
                            UnitTrustAccountTypeLists = cachedData
                        }
                    });
                }

                UnitTrustAccountTypeAsync m = new UnitTrustAccountTypeAsync();

                bool isvalid = await m.GetUnitTrustAccountTypeList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-UNIT-TRUST-ACCOUNT-TYPE-LIST");
                }

                var unitTrustAccountTypeLists = m.UnitTrustAccountTypeLists.ToList();

                cache.Set(
                    cacheKey,
                    unitTrustAccountTypeLists,
                    new CacheItemPolicy
                    {
                        AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                    }
                );

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-UNIT-TRUST-ACCOUNT-TYPE-LIST",
                    Data = new
                    {
                        UnitTrustAccountTypeLists = unitTrustAccountTypeLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-UNIT-TRUST-ACCOUNT-TYPE-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("funeral-method-list")]
        public async Task<IHttpActionResult> FuneralMethodList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Funeral Method List";
                Request.Properties["AuditDescription"] = "Retrieved the funeral method list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-FUNERAL-METHOD-LIST");
                }

                string cacheKey = $"FuneralMethodList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<FuneralMethodAsync.FuneralMethodList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-FUNERAL-METHOD-LIST",
                        Data = new
                        {
                            FuneralMethodLists = cachedData
                        }
                    });
                }

                FuneralMethodAsync m = new FuneralMethodAsync();

                bool isvalid = await m.GetFuneralMethodList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-FUNERAL-METHOD-LIST");
                }

                var funeralMethodLists = m.FuneralMethodLists.ToList();

                cache.Set(cacheKey, funeralMethodLists, new CacheItemPolicy
                {
                    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                });

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-FUNERAL-METHOD-LIST",
                    Data = new
                    {
                        FuneralMethodLists = funeralMethodLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-FUNERAL-METHOD-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("identity-type-list")]
        public async Task<IHttpActionResult> IdentityTypeList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Identity Type List";
                Request.Properties["AuditDescription"] = "Retrieved the identity type list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-IDENTITY-TYPE-LIST");
                }

                string cacheKey = $"IdentityTypeList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<TypeOfIdentityAsync.TypeOfIdentityList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-IDENTITY-TYPE-LIST",
                        Data = new
                        {
                            IdentityTypeLists = cachedData
                        }
                    });
                }

                TypeOfIdentityAsync m = new TypeOfIdentityAsync();

                bool isvalid = await m.GetTypeOfIdentityList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-IDENTITY-TYPE-LIST");
                }

                var identityTypeLists = m.TypeOfIdentityLists.ToList();

                cache.Set(cacheKey, identityTypeLists, new CacheItemPolicy
                {
                    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                });

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-IDENTITY-TYPE-LIST",
                    Data = new
                    {
                        IdentityTypeLists = identityTypeLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-IDENTITY-TYPE-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("executor-type-list")]
        public async Task<IHttpActionResult> ExecutorTypeList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Executor Type List";
                Request.Properties["AuditDescription"] = "Retrieved the executor type list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-EXECUTOR-TYPE-LIST");
                }

                string cacheKey = $"ExecutorTypeList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<TypeOfExecutorAsync.TypeOfExecutorList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-EXECUTOR-TYPE-LIST",
                        Data = new
                        {
                            ExecutorTypeLists = cachedData
                        }
                    });
                }

                TypeOfExecutorAsync m = new TypeOfExecutorAsync();

                bool isvalid = await m.GetTypeOfExecutorList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-EXECUTOR-TYPE-LIST");
                }

                var executorTypeLists = m.TypeOfExecutorLists.ToList();

                cache.Set(cacheKey, executorTypeLists, new CacheItemPolicy
                {
                    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                });

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-EXECUTOR-TYPE-LIST",
                    Data = new
                    {
                        ExecutorTypeLists = executorTypeLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-EXECUTOR-TYPE-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("asset-allocation-type-list")]
        public async Task<IHttpActionResult> AssetAllocationTypeList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Asset Allocation Type List";
                Request.Properties["AuditDescription"] = "Retrieved the asset allocation type list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-ASSET-ALLOCATION-TYPE-LIST");
                }

                string cacheKey = $"AssetAllocationTypeList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<TypeOfAssetAllocationAsync.TypeOfAssetAllocationList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-ASSET-ALLOCATION-TYPE-LIST",
                        Data = new
                        {
                            AssetAllocationTypeLists = cachedData
                        }
                    });
                }

                TypeOfAssetAllocationAsync m = new TypeOfAssetAllocationAsync();

                bool isvalid = await m.GetTypeOfAssetAllocationList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-ASSET-ALLOCATION-TYPE-LIST");
                }

                var assetAllocationTypeLists = m.TypeOfAssetAllocationLists.ToList();

                cache.Set(
                    cacheKey,
                    assetAllocationTypeLists,
                    new CacheItemPolicy
                    {
                        AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                    }
                );

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-ASSET-ALLOCATION-TYPE-LIST",
                    Data = new
                    {
                        AssetAllocationTypeLists = assetAllocationTypeLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-ASSET-ALLOCATION-TYPE-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("religion-list")]
        public async Task<IHttpActionResult> ReligionList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Religion List";
                Request.Properties["AuditDescription"] = "Retrieved the religion list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-RELIGION-LIST");
                }

                string cacheKey = $"ReligionList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<ReligionAsync.ReligionList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-RELIGION-LIST",
                        Data = new
                        {
                            ReligionLists = cachedData
                        }
                    });
                }

                ReligionAsync m = new ReligionAsync();

                bool isvalid = await m.GetReligionList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-RELIGION-LIST");
                }

                var religionLists = m.ReligionLists.ToList();

                cache.Set(cacheKey, religionLists, new CacheItemPolicy
                {
                    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                });

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-RELIGION-LIST",
                    Data = new
                    {
                        ReligionLists = religionLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-RELIGION-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("payment-to-trustee-type-list")]
        public async Task<IHttpActionResult> PaymentToTrusteeTypeList(string MerchantID)
        {
            try
            {
                Request.Properties["AuditTitle"] = "View Payment to Trustee Type List";
                Request.Properties["AuditDescription"] = "Retrieved the payment-to-trustee type list.";

                if (string.IsNullOrWhiteSpace(MerchantID))
                {
                    throw new BusinessException("Invalid merchant account!", "GET-PAYMENT-TO-TRUSTEE-TYPE-LIST");
                }

                string cacheKey = $"PaymentToTrusteeTypeList_{MerchantID}";

                if (cache.Contains(cacheKey))
                {
                    var cachedData = cache.Get(cacheKey) as List<TypeOfPaymentToTrusteeAsync.TypeOfPaymentToTrusteeList>;

                    return Ok(new
                    {
                        Status = 0,
                        Message = "Success",
                        Code = "GET-PAYMENT-TO-TRUSTEE-TYPE-LIST",
                        Data = new
                        {
                            PaymentToTrusteeTypeLists = cachedData
                        }
                    });
                }

                TypeOfPaymentToTrusteeAsync m = new TypeOfPaymentToTrusteeAsync();

                bool isvalid = await m.GetTypeOfPaymentToTrusteeList(MerchantID);

                if (!isvalid)
                {
                    throw new BusinessException(m.Message, "GET-PAYMENT-TO-TRUSTEE-TYPE-LIST");
                }

                var paymentToTrusteeTypeLists = m.TypeOfPaymentToTrusteeLists.ToList();

                cache.Set(
                    cacheKey,
                    paymentToTrusteeTypeLists,
                    new CacheItemPolicy
                    {
                        AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(2)
                    }
                );

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = "GET-PAYMENT-TO-TRUSTEE-TYPE-LIST",
                    Data = new
                    {
                        PaymentToTrusteeTypeLists = paymentToTrusteeTypeLists
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BusinessException(ex.Message, "GET-PAYMENT-TO-TRUSTEE-TYPE-LIST");
            }
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("role-list")]
        public async Task<IHttpActionResult> GetRoleList(string merchantId, bool admin = true)
        {
            Request.Properties["AuditTitle"] = "View Role List";
            Request.Properties["AuditDescription"] = "Retrieved the available role list.";

            var model = new RoleListAsync();
            var result = await model.GetRoleListAsync(admin, merchantId);

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = "ROLE_LIST",
                Data = result
            });
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("all-role-list")]
        public async Task<IHttpActionResult> GetAllRoleList(string merchantId)
        {
            Request.Properties["AuditTitle"] = "View All Role List";
            Request.Properties["AuditDescription"] = "Retrieved the complete role list.";

            var model = new RoleListAsync();
            var result = await model.GetAllRoleListAsync(merchantId);

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = "ALL-ROLE_LIST",
                Data = result
            });
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("rank-list")]
        public async Task<IHttpActionResult> GetRankList(string merchantId)
        {
            Request.Properties["AuditTitle"] = "View Rank List";
            Request.Properties["AuditDescription"] = "Retrieved the agent rank list.";

            var model = new RankListAsync();
            var result = await model.GetRankListAsync(merchantId);

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = "RANK",
                Data = result
            });
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("trust-categories-list")]
        public async Task<IHttpActionResult> GetTrustCategoriesList(string merchantId)
        {
            Request.Properties["AuditTitle"] = "View Trust Category List";
            Request.Properties["AuditDescription"] = "Retrieved the trust product category list.";

            var model = new TrustCategoriesAsync();
            var result = await model.GetTrustCategoryListAsync(merchantId);

            return Ok(new
            {
                Status = 0,
                Message = "Success",
                Code = "TRUST_CATEGORY",
                Data = result
            });
        }
    }
}