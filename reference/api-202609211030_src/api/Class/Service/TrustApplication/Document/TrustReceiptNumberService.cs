using API_CPX.Context;
using System;
using System.Data.SqlClient;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Document
{
    public class TrustReceiptNumberService
    {
        public async Task<string> GenerateAsync(Sandbox_BasedEntities db, DateTime receiptDate)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            string yearMonth = receiptDate.ToString("yyMM");

            // =====================================================
            // 1. Ensure counter exists for this month
            // =====================================================

            await db.Database.ExecuteSqlCommandAsync(
                @"
                IF NOT EXISTS
                (
                    SELECT 1
                    FROM dbo.tbl_TrustReceiptRunningNo
                    WHERE YearMonth = @YearMonth
                )
                BEGIN
                    INSERT INTO dbo.tbl_TrustReceiptRunningNo
                    (
                        YearMonth,
                        LastRunningNo,
                        UpdatedAt
                    )
                    VALUES
                    (
                        @YearMonth,
                        0,
                        GETDATE()
                    );
                END
                ",
                new SqlParameter(
                    "@YearMonth",
                    yearMonth));

            // =====================================================
            // 2. Increment and obtain number
            //
            // UPDLOCK prevents another transaction from obtaining
            // the same running number.
            // =====================================================

            int runningNo =
                await db.Database.SqlQuery<int>(
                    @"
                    UPDATE dbo.tbl_TrustReceiptRunningNo
                    WITH (UPDLOCK, ROWLOCK)
                    SET
                        LastRunningNo = LastRunningNo + 1,
                        UpdatedAt = GETDATE()
                    OUTPUT INSERTED.LastRunningNo
                    WHERE YearMonth = @YearMonth
                    ",
                    new SqlParameter("@YearMonth", yearMonth)).SingleAsync();

            // =====================================================
            // 3. CNB/ORYYMM/001
            // =====================================================

            return "CNB/OR" + yearMonth + "/" + runningNo.ToString("D3");
        }
    }
}