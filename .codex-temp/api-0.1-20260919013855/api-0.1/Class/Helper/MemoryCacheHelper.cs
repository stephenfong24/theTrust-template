using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Caching;
using System.Web;

namespace API_CPX.Class.Helper
{
    public static class MemoryCacheHelper
    {
        private static readonly ObjectCache cache = MemoryCache.Default;

        public static T Get<T>(string key)
        {
            object value = cache[key];

            if (value == null)
            {
                return default(T);
            }

            return (T)value;
        }

        public static void Set(
            string key,
            object data,
            int cacheMinutes = 30)
        {
            CacheItemPolicy policy =
                new CacheItemPolicy
                {
                    AbsoluteExpiration =
                        DateTimeOffset.Now.AddMinutes(cacheMinutes)
                };

            cache.Set(key, data, policy);
        }

        public static bool Exists(string key)
        {
            return cache.Contains(key);
        }

        public static void Remove(string key)
        {
            if (cache.Contains(key))
            {
                cache.Remove(key);
            }
        }
    }
}