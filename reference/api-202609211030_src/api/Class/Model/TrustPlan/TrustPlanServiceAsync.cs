using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.TrustPlan;
using API_CPX.Class.Service.TrustPlan;
using API_CPX.Context;
using API_CPX.Model;
using API_CPX.Services.TrustPlan.Commission;
using API_CPX.Services.TrustPlan.Dividend;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Services.TrustPlan
{
    public class TrustPlanServiceAsync : ITrustPlanService
    {
        private readonly Sandbox_BasedEntities dbR;
        private readonly TrustPlanValidator validator;
        private readonly DividendReturnConfigurationResolver dividendResolver;
        private readonly CommissionConfigurationResolver commissionResolver;

        public TrustPlanServiceAsync()
        {
            dbR = new Sandbox_BasedEntities();
            validator = new TrustPlanValidator(dbR);

            dividendResolver =
                new DividendReturnConfigurationResolver(
                    new IDividendReturnConfigurationProvider[]
                    {
                        new InvestmentPeriodTierRateProvider(dbR)

                        // ====================================================
                        // FUTURE DIVIDEND / RETURN PROVIDERS
                        // ====================================================
                        //
                        // new FixedRateProvider(dbR),
                        // new InvestmentTierRateProvider(dbR),
                        // new PeriodTierRateProvider(dbR)
                    });

            commissionResolver =
                new CommissionConfigurationResolver(
                    new ICommissionConfigurationProvider[]
                    {
                        new OneOffCommissionProvider(dbR)

                        // ====================================================
                        // FUTURE COMMISSION PROVIDERS
                        // ====================================================
                        //
                        // new MonthlyRecurringCommissionProvider(dbR),
                        // new YearlyCommissionProvider(dbR),
                        // new MultiYearTieredCommissionProvider(dbR),
                        // new HybridCommissionProvider(dbR)
                    });
        }

        public async Task<string> CreateAsync(TrustPlanRequest request, long? userId, string merchantId)
        {
            const string code = "CREATE-TRUST-PLAN";

            await validator.ValidateAsync(request, merchantId);

            var step1 = request.Steps.Step1BasicInformation;

            string productName = step1.ProductName.Trim();

            bool productNameExists = await dbR.tbl_TrustPlan.AnyAsync(x => x.ProductName == productName);
            if (productNameExists)
            {
                throw new BusinessException("A Trust Plan with the same Product Name already exists.", code);
            }

            Guid productCode = Guid.NewGuid();
            DateTime transDate = DateTime.Now;

            using (var transaction = dbR.Database.BeginTransaction())
            {
                try
                {
                    var plan = new tbl_TrustPlan
                    {
                        ProductCode = productCode.ToString(),
                        ProductName = productName,
                        ProductCategory = step1.ProductCategory.Trim().ToUpperInvariant(),
                        ProductDescription = string.IsNullOrWhiteSpace(step1.ProductDescription) ? null : step1.ProductDescription.Trim(),
                        MinimumPlacement = step1.MinimumPlacement,
                        MaximumPlacement = step1.MaximumPlacement,
                        FundManagementPeriod = step1.FundManagementPeriod,
                        FundManagementPeriodUnit = step1.FundManagementPeriodUnit.Trim().ToUpperInvariant(),
                        ProductStatus = step1.ProductStatus.Trim().ToUpperInvariant(),
                        HasComplimentaryBenefits = request.Steps.Step9ComplimentaryBenefits.HasComplimentaryBenefits,
                        CreatedAt = transDate,
                        CreatedBy = userId
                    };

                    dbR.tbl_TrustPlan.Add(plan);
                    await dbR.SaveChangesAsync();

                    long trustPlanId = plan.RowID;

                    AddExecutionRanks(trustPlanId, request, transDate);
                    AddPaymentConfig(trustPlanId, request);
                    AddFees(trustPlanId, request);
                    AddWithdrawalConfig(trustPlanId, request);
                    AddDividendConfig(trustPlanId, request);
                    await AddDividendInvestmentPeriodTiersAsync(trustPlanId, request);
                    AddDividendPayout(trustPlanId, request);
                    AddBonusConfig(trustPlanId, request);
                    AddCommissionConfig(trustPlanId, request);
                    AddCommissionOneOffTiers(trustPlanId, request);
                    AddCommissionRule(trustPlanId, request);
                    AddBenefits(trustPlanId, request);

                    await dbR.SaveChangesAsync();
                    transaction.Commit();
                    return productCode.ToString();
                }
                catch
                {
                    transaction.Rollback();
                    throw;
                }
            }
        }

        private void AddExecutionRanks(long trustPlanId, TrustPlanRequest request, DateTime transDate)
        {
            int sequence = 1;
            foreach (string rank in request.Steps.Step1BasicInformation.ExecutionRanks)
            {
                dbR.tbl_TrustPlanExecutionRank.Add(
                    new tbl_TrustPlanExecutionRank
                    {
                        TrustPlanID = trustPlanId,
                        RankCode = rank.Trim().ToUpperInvariant(),
                        CreatedAt = transDate
                    });
                sequence++;
            }
        }

        private void AddPaymentConfig(long trustPlanId, TrustPlanRequest request)
        {
            var config = request.Steps.Step2PaymentAndFees.PaymentConfig;
            dbR.tbl_TrustPlanPaymentConfig.Add(
                new tbl_TrustPlanPaymentConfig
                {
                    TrustPlanID = trustPlanId,
                    PaymentFrequency = config.PaymentFrequency.Trim().ToUpperInvariant()
                });
        }

        private void AddFees(long trustPlanId, TrustPlanRequest request)
        {
            foreach (var fee in request.Steps.Step2PaymentAndFees.Fees)
            {
                dbR.tbl_TrustPlanFee.Add(
                    new tbl_TrustPlanFee
                    {
                        TrustPlanID = trustPlanId,
                        FeeType = fee.FeeType.Trim().ToUpperInvariant(),
                        RateType = fee.RateType.Trim().ToUpperInvariant(),
                        FeeValue = fee.Value,
                        ChargeTiming = fee.ChargeTiming.Trim().ToUpperInvariant()
                    });
            }
        }

        private void AddWithdrawalConfig(long trustPlanId, TrustPlanRequest request)
        {
            var data = request.Steps.Step3TenureAndWithdrawal;

            dbR.tbl_TrustPlanWithdrawalConfig.Add(
                new tbl_TrustPlanWithdrawalConfig
                {
                    TrustPlanID = trustPlanId,
                    LockInPeriod = data.LockInPeriod,
                    LockInPeriodUnit = data.LockInPeriodUnit.Trim().ToUpperInvariant(),
                    AllowEarlyWithdrawal = data.AllowEarlyWithdrawal,
                    EarlyWithdrawalFeeType = data.AllowEarlyWithdrawal && !string.IsNullOrWhiteSpace(data.EarlyWithdrawalFeeType) ? data.EarlyWithdrawalFeeType.Trim().ToUpperInvariant() : null,
                    EarlyWithdrawalFeeValue = data.AllowEarlyWithdrawal ? data.EarlyWithdrawalFeeValue : null
                });
        }

        private void AddDividendConfig(long trustPlanId, TrustPlanRequest request)
        {
            dbR.tbl_TrustPlanDividendConfig.Add(
                new tbl_TrustPlanDividendConfig
                {
                    TrustPlanID = trustPlanId,
                    DividendMethod = request.Steps.Step4DividendReturn.Method.Trim().ToUpperInvariant()
                });
        }

        private async Task AddDividendInvestmentPeriodTiersAsync(long trustPlanId, TrustPlanRequest request)
        {
            var tiers = request.Steps.Step4DividendReturn.MatrixTiers.OrderBy(x => x.MinimumPlacement).ToList();

            int sequence = 1;

            foreach (var tier in tiers)
            {
                var entity =
                    new tbl_TrustPlanDividendInvestmentPeriodTier
                    {
                        TrustPlanID = trustPlanId,
                        MinimumPlacement = tier.MinimumPlacement,
                        MaximumPlacement = tier.MaximumPlacement,
                        Sequence = sequence
                    };

                dbR.tbl_TrustPlanDividendInvestmentPeriodTier.Add(entity);
                await dbR.SaveChangesAsync();

                foreach (var rate in tier.YearlyRates.OrderBy(x => Convert.ToInt32(x.Key)))
                {
                    dbR.tbl_TrustPlanDividendInvestmentPeriodTierRate
                        .Add(new tbl_TrustPlanDividendInvestmentPeriodTierRate
                            {
                                InvestmentPeriodTierID = entity.RowID,
                                PeriodNo = Convert.ToInt32(rate.Key),
                                Rate = rate.Value
                            });
                }

                sequence++;
            }
        }

        private void AddDividendPayout(long trustPlanId, TrustPlanRequest request)
        {
            var data = request.Steps.Step5DividendPayout;

            dbR.tbl_TrustPlanDividendPayout.Add(
                new tbl_TrustPlanDividendPayout
                {
                    TrustPlanID =  trustPlanId,
                    PayoutFrequency = data.PayoutFrequency.Trim().ToUpperInvariant(),
                    CalculationStart = data.CalculationStart.Trim().ToUpperInvariant(),
                    AllowDividendRedeposit = data.AllowDividendRedeposit
                });
        }

        private void AddBonusConfig(long trustPlanId, TrustPlanRequest request)
        {
            dbR.tbl_TrustPlanBonusConfig.Add(
                new tbl_TrustPlanBonusConfig
                {
                    TrustPlanID = trustPlanId,
                    HasBonusReturn = request.Steps.Step6BonusConfiguration.HasBonusReturn
                });
        }

        private void AddCommissionConfig(long trustPlanId, TrustPlanRequest request)
        {
            var data = request.Steps.Step7CommissionConfiguration;

            dbR.tbl_TrustPlanCommissionConfig.Add(
                new tbl_TrustPlanCommissionConfig
                {
                    TrustPlanID = trustPlanId,
                    IsEnabled = data.Enabled,
                    CommissionMethod = data.Enabled ? data.Method.Trim().ToUpperInvariant() : null
                });
        }

        private void AddCommissionOneOffTiers(long trustPlanId, TrustPlanRequest request)
        {
            var commission = request.Steps.Step7CommissionConfiguration;

            if (!commission.Enabled)
            {
                return;
            }

            int sequence = 1;

            foreach (var tier in commission.OneOff.Tiers)
            {
                dbR.tbl_TrustPlanCommissionOneOffTier.Add(
                    new tbl_TrustPlanCommissionOneOffTier
                    {
                        TrustPlanID = trustPlanId,
                        RankCode = tier.Rank.Trim().ToUpperInvariant(),
                        CommissionType = tier.CommissionType.Trim().ToUpperInvariant(),
                        CommissionRate = tier.Rate,
                        Sequence = sequence
                    });

                sequence++;
            }
        }

        private void AddCommissionRule(long trustPlanId, TrustPlanRequest request)
        {
            var data = request.Steps.Step8CommissionRules;

            dbR.tbl_TrustPlanCommissionRule.Add(
                new tbl_TrustPlanCommissionRule
                {
                    TrustPlanID = trustPlanId,
                    CalculationBasis = data.CalculationBasis.Trim().ToUpperInvariant(),
                    RankDetermination = data.RankDetermination.Trim().ToUpperInvariant()
                });
        }

        private void AddBenefits(long trustPlanId, TrustPlanRequest request)
        {
            var data = request.Steps.Step9ComplimentaryBenefits;

            if (!data.HasComplimentaryBenefits)
            {
                return;
            }

            int sequence = 1;

            foreach (var benefit in  data.Benefits.OrderBy(x => x.MinimumPlacement))
            {
                dbR.tbl_TrustPlanBenefit.Add(
                    new tbl_TrustPlanBenefit
                    {
                        TrustPlanID = trustPlanId,
                        MinimumPlacement = benefit.MinimumPlacement,
                        MaximumPlacement = benefit.MaximumPlacement,
                        BenefitName = benefit.BenefitName.Trim(),
                        BenefitValue = benefit.BenefitValue,
                        FulfilmentMethod = benefit.FulfilmentMethod.Trim().ToUpperInvariant(),
                        Sequence = sequence
                    });

                sequence++;
            }
        }

        public async Task UpdateAsync(string productCode, TrustPlanRequest request, long? userId, string merchantId)
        {
            const string code = "UPDATE-TRUST-PLAN";

            if (string.IsNullOrEmpty(productCode))
            {
                throw new BusinessException("Invalid Product Code.", code);
            }

            await validator.ValidateAsync(request, merchantId);

            var plan = await dbR.tbl_TrustPlan.FirstOrDefaultAsync(x => x.ProductCode == productCode);
            if (plan == null)
            {
                throw new BusinessException("Trust Plan not found.", code);
            }

            string productName = request.Steps.Step1BasicInformation.ProductName.Trim();

            bool duplicateName = await dbR.tbl_TrustPlan.AnyAsync(x => x.ProductCode != plan.ProductCode && x.ProductName == productName);
            if (duplicateName)
            {
                throw new BusinessException("A Trust Plan with the same Product Name already exists.", code);
            }

            DateTime transDate = DateTime.Now;

            using (var transaction = dbR.Database.BeginTransaction())
            {
                try
                {
                    long trustPlanId = plan.RowID;
                    UpdateMainPlan(plan, request, userId, transDate);
                    await DeleteChildConfigurationAsync(trustPlanId);
                    AddExecutionRanks(trustPlanId, request, transDate);
                    AddPaymentConfig(trustPlanId, request);
                    AddFees(trustPlanId, request);
                    AddWithdrawalConfig(trustPlanId, request);
                    AddDividendConfig(trustPlanId,  request);
                    await AddDividendInvestmentPeriodTiersAsync(trustPlanId, request);
                    AddDividendPayout(trustPlanId, request);
                    AddBonusConfig(trustPlanId, request);
                    AddCommissionConfig(trustPlanId, request);
                    AddCommissionOneOffTiers(trustPlanId, request);
                    AddCommissionRule(trustPlanId, request);
                    AddBenefits(trustPlanId, request);

                    await dbR.SaveChangesAsync();
                    transaction.Commit();
                }
                catch
                {
                    transaction.Rollback();
                    throw;
                }
            }
        }

        private void UpdateMainPlan(tbl_TrustPlan plan, TrustPlanRequest request, long? userId, DateTime transDate)
        {
            var step1 = request.Steps.Step1BasicInformation;

            plan.ProductName = step1.ProductName.Trim();
            plan.ProductCategory = step1.ProductCategory.Trim().ToUpperInvariant();
            plan.ProductDescription = string.IsNullOrWhiteSpace(step1.ProductDescription) ? null : step1.ProductDescription.Trim();
            plan.MinimumPlacement = step1.MinimumPlacement;
            plan.MaximumPlacement = step1.MaximumPlacement;
            plan.FundManagementPeriod = step1.FundManagementPeriod;
            plan.FundManagementPeriodUnit = step1.FundManagementPeriodUnit.Trim().ToUpperInvariant();
            plan.ProductStatus = step1.ProductStatus.Trim().ToUpperInvariant();
            plan.HasComplimentaryBenefits = request.Steps.Step9ComplimentaryBenefits.HasComplimentaryBenefits;
            plan.UpdatedAt = transDate;
            plan.UpdatedBy = userId;

            // DO NOT:
            // plan.ProductCode = ...
        }

        private async Task DeleteChildConfigurationAsync(long trustPlanId)
        {
            var tierIds = await dbR.tbl_TrustPlanDividendInvestmentPeriodTier.Where(x => x.TrustPlanID == trustPlanId).Select(x => x.RowID).ToListAsync();

            if (tierIds.Any())
            {
                var rates = await dbR.tbl_TrustPlanDividendInvestmentPeriodTierRate.Where(x => tierIds.Contains(x.InvestmentPeriodTierID)).ToListAsync();
                dbR.tbl_TrustPlanDividendInvestmentPeriodTierRate.RemoveRange(rates);
            }

            var dividendTiers = await dbR.tbl_TrustPlanDividendInvestmentPeriodTier.Where(x => x.TrustPlanID == trustPlanId).ToListAsync();
            dbR.tbl_TrustPlanDividendInvestmentPeriodTier.RemoveRange(dividendTiers);
            dbR.tbl_TrustPlanExecutionRank.RemoveRange(await dbR.tbl_TrustPlanExecutionRank.Where(x => x.TrustPlanID == trustPlanId).ToListAsync());
            dbR.tbl_TrustPlanPaymentConfig.RemoveRange(await dbR.tbl_TrustPlanPaymentConfig.Where(x => x.TrustPlanID == trustPlanId).ToListAsync());
            dbR.tbl_TrustPlanFee.RemoveRange(await dbR.tbl_TrustPlanFee.Where(x => x.TrustPlanID == trustPlanId).ToListAsync());
            dbR.tbl_TrustPlanWithdrawalConfig.RemoveRange(await dbR.tbl_TrustPlanWithdrawalConfig.Where(x => x.TrustPlanID == trustPlanId).ToListAsync());
            dbR.tbl_TrustPlanDividendConfig.RemoveRange(await dbR.tbl_TrustPlanDividendConfig.Where(x => x.TrustPlanID == trustPlanId).ToListAsync());
            dbR.tbl_TrustPlanDividendPayout.RemoveRange(await dbR.tbl_TrustPlanDividendPayout.Where(x => x.TrustPlanID == trustPlanId).ToListAsync());
            dbR.tbl_TrustPlanBonusConfig.RemoveRange(await dbR.tbl_TrustPlanBonusConfig.Where(x => x.TrustPlanID == trustPlanId).ToListAsync());
            dbR.tbl_TrustPlanCommissionConfig.RemoveRange(await dbR.tbl_TrustPlanCommissionConfig.Where(x => x.TrustPlanID == trustPlanId).ToListAsync());
            dbR.tbl_TrustPlanCommissionOneOffTier.RemoveRange(await dbR.tbl_TrustPlanCommissionOneOffTier.Where(x => x.TrustPlanID == trustPlanId).ToListAsync());
            dbR.tbl_TrustPlanCommissionRule.RemoveRange(await dbR.tbl_TrustPlanCommissionRule.Where(x => x.TrustPlanID == trustPlanId).ToListAsync());
            dbR.tbl_TrustPlanBenefit.RemoveRange(await dbR.tbl_TrustPlanBenefit.Where(x => x.TrustPlanID == trustPlanId).ToListAsync());

            await dbR.SaveChangesAsync();
        }

        public async Task<TrustPlanListResponse> GetTrustProductListAsync(TrustPlanListRequest request, string merchantId)
        {
            if (request == null)
            {
                request = new TrustPlanListRequest();
            }

            if (request.Page <= 0)
            {
                request.Page = 1;
            }

            if (request.PageSize <= 0)
            {
                request.PageSize = 10;
            }

            if (request.PageSize > 100)
            {
                request.PageSize = 100;
            }

            // ================================================================
            // Base Query
            // ================================================================

            var query =
                from plan in dbR.tbl_TrustPlan
                join dividend in dbR.tbl_TrustPlanDividendConfig on plan.RowID equals dividend.TrustPlanID into dividendJoin
                from dividend in dividendJoin.DefaultIfEmpty()
                join payout in dbR.tbl_TrustPlanDividendPayout on plan.RowID equals payout.TrustPlanID into payoutJoin
                from payout in payoutJoin.DefaultIfEmpty()
                join commission in dbR.tbl_TrustPlanCommissionConfig on plan.RowID equals commission.TrustPlanID into commissionJoin
                from commission in commissionJoin.DefaultIfEmpty()
                select new
                {
                    Plan = plan,
                    DividendMethod = dividend != null ? dividend.DividendMethod : null,
                    PayoutFrequency = payout != null ? payout.PayoutFrequency : null,
                    CommissionMethod = commission != null && commission.IsEnabled ? commission.CommissionMethod : null
                };

            // ================================================================
            // Search
            // Product Code / Product Name
            // ================================================================

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                string search = request.Search.Trim();
                query = query.Where(x => x.Plan.ProductCode.Contains(search) || x.Plan.ProductName.Contains(search));
            }

            // ================================================================
            // Product Category Filter
            // ================================================================

            if (!string.IsNullOrWhiteSpace(request.ProductCategory))
            {
                string productCategory = request.ProductCategory.Trim().ToUpper();
                query = query.Where(x => x.Plan.ProductCategory == productCategory);
            }

            // ================================================================
            // Status Filter
            // ================================================================

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                string status = request.Status.Trim().ToUpper();
                query = query.Where(x => x.Plan.ProductStatus == status);
            }

            // ================================================================
            // Dividend / Return Method Filter
            // ================================================================

            if (!string.IsNullOrWhiteSpace(request.ReturnMethod))
            {
                string returnMethod = request.ReturnMethod.Trim().ToUpper();
                query = query.Where(x => x.DividendMethod == returnMethod);
            }

            // ================================================================
            // Commission Method Filter
            // ================================================================

            if (!string.IsNullOrWhiteSpace(request.CommissionMethod))
            {
                string commissionMethod = request.CommissionMethod.Trim().ToUpper();
                query = query.Where(x => x.CommissionMethod == commissionMethod);
            }

            // ================================================================
            // Total Records
            // ================================================================

            int totalRecords = await query.CountAsync();
            int totalPages = totalRecords == 0 ? 0 : (int)Math.Ceiling(totalRecords / (double)request.PageSize);

            // ================================================================
            // Get Current Page
            // ================================================================

            var records =
                await query
                    .OrderByDescending(x => x.Plan.CreatedAt)
                    .Skip((request.Page - 1) * request.PageSize)
                    .Take(request.PageSize)
                    .Select(x =>
                        new TrustPlanListItem
                        {
                            ProductCode = x.Plan.ProductCode,
                            ProductName = x.Plan.ProductName,
                            ProductDescription = x.Plan.ProductDescription,
                            ProductCategory = x.Plan.ProductCategory,
                            MinimumPlacement = x.Plan.MinimumPlacement,
                            FundManagementPeriod = x.Plan.FundManagementPeriod,
                            FundManagementPeriodUnit = x.Plan.FundManagementPeriodUnit,
                            ReturnMethod = x.DividendMethod,
                            PayoutFrequency = x.PayoutFrequency,
                            CommissionMethod = x.CommissionMethod,
                            ProductStatus = x.Plan.ProductStatus
                        })
                    .ToListAsync();

            // ================================================================
            // Product Category Name
            //
            // tbl_TrustPlan stores Category ID.
            // tbl_TrustCategories stores Category Name.
            // ================================================================

            var categoryCodes = records.Where(x => !string.IsNullOrWhiteSpace(x.ProductCategory)).Select(x => x.ProductCategory).Distinct().ToList();

            var categories =
                await dbR.tbl_TrustCategories
                    .Where(x => x.MerchantID == merchantId && categoryCodes.Contains(x.CategoryID))
                    .Select(x =>
                        new
                        {
                            x.CategoryID,
                            x.CategoryName
                        })
                    .ToListAsync();

            foreach (var record in records)
            {
                var category = categories.FirstOrDefault(x => string.Equals(x.CategoryID, record.ProductCategory, StringComparison.OrdinalIgnoreCase));
                record.ProductCategoryName = category != null ? category.CategoryName : record.ProductCategory;
            }

            // ================================================================
            // Response
            // ================================================================

            return new TrustPlanListResponse
            {
                TotalRecords = totalRecords,
                TotalPages = totalPages,
                CurrentPage = request.Page,
                PageSize = request.PageSize,
                Records = records
            };
        }

        public async Task<TrustPlanDetailsResponse> GetTrustProductDetailsAsync(string productCode, string merchantId)
        {
            const string code = "GET-TRUST-PRODUCT-DETAILS";

            // ================================================================
            // Validate Product Code
            // ================================================================

            if (string.IsNullOrWhiteSpace(productCode))
            {
                throw new BusinessException("Product Code is required.", code);
            }

            productCode = productCode.Trim();

            // ================================================================
            // Trust Plan
            // ================================================================

            var plan = await dbR.tbl_TrustPlan.FirstOrDefaultAsync(x => x.ProductCode == productCode);
            if (plan == null)
            {
                throw new BusinessException("Trust Plan not found.", code);
            }

            long trustPlanId = plan.RowID;

            // ================================================================
            // Step 1 - Execution Rank
            // ================================================================

            var executionRanks =
                await dbR.tbl_TrustPlanExecutionRank
                    .Where(x => x.TrustPlanID == trustPlanId)
                    .OrderBy(x => x.RowID)
                    .Select(x => x.RankCode)
                    .ToListAsync();

            // ================================================================
            // Step 2 - Payment Configuration
            // ================================================================

            var paymentConfig = await dbR.tbl_TrustPlanPaymentConfig.FirstOrDefaultAsync(x => x.TrustPlanID == trustPlanId);

            // ================================================================
            // Step 2 - Fees
            // ================================================================

            var fees = await dbR.tbl_TrustPlanFee.Where(x => x.TrustPlanID == trustPlanId).OrderBy(x => x.RowID).ToListAsync();

            // ================================================================
            // Step 3 - Tenure & Withdrawal
            // ================================================================

            var withdrawal = await dbR.tbl_TrustPlanWithdrawalConfig.FirstOrDefaultAsync(x => x.TrustPlanID == trustPlanId);

            // ================================================================
            // Step 4 - Dividend / Return Main Configuration
            // ================================================================

            var dividendConfig = await dbR.tbl_TrustPlanDividendConfig.FirstOrDefaultAsync(x => x.TrustPlanID == trustPlanId);
            DividendReturnDetails dividendReturn = await GetDividendReturnDetailsAsync(trustPlanId, dividendConfig);

            // ================================================================
            // Step 5 - Dividend Payout
            // ================================================================

            var dividendPayout = await dbR.tbl_TrustPlanDividendPayout.FirstOrDefaultAsync(x => x.TrustPlanID == trustPlanId);

            // ================================================================
            // Step 6 - Bonus Configuration
            // ================================================================

            var bonus = await dbR.tbl_TrustPlanBonusConfig.FirstOrDefaultAsync(x => x.TrustPlanID == trustPlanId);

            // ================================================================
            // Step 7 - Commission Main Configuration
            // ================================================================

            var commissionConfig = await dbR.tbl_TrustPlanCommissionConfig.FirstOrDefaultAsync(x => x.TrustPlanID == trustPlanId);
            CommissionConfigurationDetails commission = await GetCommissionDetailsAsync(trustPlanId, commissionConfig);

            // ================================================================
            // Step 8 - Commission Rules
            // ================================================================

            var commissionRule = await dbR.tbl_TrustPlanCommissionRule.FirstOrDefaultAsync(x => x.TrustPlanID == trustPlanId);

            // ================================================================
            // Step 9 - Complimentary Benefits
            // ================================================================

            var benefits = await dbR.tbl_TrustPlanBenefit.Where(x => x.TrustPlanID == trustPlanId).OrderBy(x => x.Sequence).ToListAsync();

            // ================================================================
            // Build Response
            // ================================================================

            return new TrustPlanDetailsResponse
            {
                ProductCode = plan.ProductCode,
                Steps =
                    new TrustPlanDetailsSteps
                    {
                        // ====================================================
                        // Step 1 - Basic Information
                        // ====================================================

                        Step1BasicInformation =
                            new Step1BasicInformation
                            {
                                ProductName = plan.ProductName,
                                ProductCategory = plan.ProductCategory,
                                ProductDescription = plan.ProductDescription,
                                MinimumPlacement = plan.MinimumPlacement,
                                MaximumPlacement = plan.MaximumPlacement,
                                FundManagementPeriod = plan.FundManagementPeriod,
                                FundManagementPeriodUnit = plan.FundManagementPeriodUnit,
                                ProductStatus = plan.ProductStatus,
                                ExecutionRanks = executionRanks
                            },


                        // ====================================================
                        // Step 2 - Payment & Fees
                        // ====================================================

                        Step2PaymentAndFees =
                            new Step2PaymentAndFees
                            {
                                PaymentConfig = paymentConfig == null ? null : new PaymentConfig {PaymentFrequency = paymentConfig.PaymentFrequency},
                                Fees = fees
                                .Select(x =>
                                    new TrustPlanFeeRequest
                                    {
                                        FeeType = x.FeeType,
                                        RateType = x.RateType,
                                        Value = x.FeeValue,
                                        ChargeTiming = x.ChargeTiming
                                    })
                                    .ToList()
                            },


                        // ====================================================
                        // Step 3 - Tenure & Withdrawal
                        // ====================================================

                        Step3TenureAndWithdrawal =
                            withdrawal == null
                                ? null
                                : new Step3TenureAndWithdrawal
                                {
                                    LockInPeriod = withdrawal.LockInPeriod,
                                    LockInPeriodUnit = withdrawal.LockInPeriodUnit,
                                    AllowEarlyWithdrawal = withdrawal.AllowEarlyWithdrawal,
                                    EarlyWithdrawalFeeType = withdrawal.EarlyWithdrawalFeeType,
                                    EarlyWithdrawalFeeValue = withdrawal.EarlyWithdrawalFeeValue
                                },


                        // ====================================================
                        // Step 4 - Dividend / Return
                        // ====================================================

                        Step4DividendReturn = dividendReturn,


                        // ====================================================
                        // Step 5 - Dividend Payout
                        // ====================================================

                        Step5DividendPayout =
                            dividendPayout == null ? null
                                : new Step5DividendPayout
                                {
                                    PayoutFrequency = dividendPayout.PayoutFrequency,
                                    CalculationStart = dividendPayout.CalculationStart,
                                    AllowDividendRedeposit = dividendPayout.AllowDividendRedeposit
                                },


                        // ====================================================
                        // Step 6 - Bonus
                        // ====================================================

                        Step6BonusConfiguration =
                            bonus == null ? null
                                : new Step6BonusConfiguration
                                {
                                    HasBonusReturn = bonus.HasBonusReturn
                                },


                        // ====================================================
                        // Step 7 - Commission
                        // ====================================================

                        Step7CommissionConfiguration = commission,


                        // ====================================================
                        // Step 8 - Commission Rules
                        // ====================================================

                        Step8CommissionRules =
                            commissionRule == null
                                ? null
                                : new Step8CommissionRules
                                {
                                    CalculationBasis = commissionRule.CalculationBasis,
                                    RankDetermination = commissionRule.RankDetermination
                                },


                        // ====================================================
                        // Step 9 - Complimentary Benefits
                        // ====================================================

                        Step9ComplimentaryBenefits =
                            new Step9ComplimentaryBenefits
                            {
                                HasComplimentaryBenefits = plan.HasComplimentaryBenefits,
                                Benefits =
                                    benefits
                                        .Select(x =>
                                            new ComplimentaryBenefitRequest
                                            {
                                                MinimumPlacement = x.MinimumPlacement,
                                                MaximumPlacement = x.MaximumPlacement,
                                                BenefitName = x.BenefitName,
                                                BenefitValue = x.BenefitValue,
                                                FulfilmentMethod = x.FulfilmentMethod
                                            })
                                        .ToList()
                            }
                    }
            };
        }

        private async Task<DividendReturnDetails> GetDividendReturnDetailsAsync(long trustPlanId, tbl_TrustPlanDividendConfig dividendConfig)
        {
            if (dividendConfig == null)
            {
                return null;
            }

            return new DividendReturnDetails
            {
                Method = dividendConfig.DividendMethod,
                Configuration = await dividendResolver.GetConfigurationAsync(dividendConfig.DividendMethod, trustPlanId)
            };
        }

        private async Task<CommissionConfigurationDetails> GetCommissionDetailsAsync(long trustPlanId, tbl_TrustPlanCommissionConfig commissionConfig)
        {
            if (commissionConfig == null)
            {
                return null;
            }

            var result =
                new CommissionConfigurationDetails
                {
                    Enabled = commissionConfig.IsEnabled,
                    Method = commissionConfig.CommissionMethod,
                    Configuration = null
                };

            if (!commissionConfig.IsEnabled)
            {
                return result;
            }

            result.Configuration = await commissionResolver.GetConfigurationAsync(commissionConfig.CommissionMethod, trustPlanId);
            return result;
        }
    }
}