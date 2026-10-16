using API_CPX.Class.Model.DTO.TrustCommission;
using API_CPX.Context;
using ClosedXML.Excel;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Services.TrustCommission
{
    public class TrustCommissionExcelExportService
    {
        private const string TrustMerchantID = "814152";

        private sealed class ApplicationInfo
        {
            public long TrustApplicationID { get; set; }
            public DateTime? CompletedAt { get; set; }
        }

        private sealed class AgentReferenceInfo
        {
            public long MemberID { get; set; }
            public string ReferralCode { get; set; }
        }

        // ============================================================
        // Main Excel generation
        // ============================================================

        public async Task<byte[]> GenerateAsync(string merchantId, List<TrustCommissionListItem> records, string templatePath)
        {
            if (records == null)
            {
                throw new ArgumentNullException("records");
            }

            if (string.IsNullOrWhiteSpace(templatePath) || !File.Exists(templatePath))
            {
                throw new FileNotFoundException("Trust commission Excel template not found.", templatePath);
            }

            // Load supplementary information not included
            // in the existing commission listing response.
            var completedDateMap = await LoadCompletedDatesAsync(merchantId, records);
            var referralCodeMap = await LoadTrustReferralCodesAsync(records);

            using (var workbook = new XLWorkbook(templatePath))
            {
                var sheet = workbook.Worksheet(1);

                // Latest template:
                // A-AC = 29 columns
                // Row 1 = header
                // Row 2 onwards = report records

                const int firstDataRow = 2;
                const int lastTemplateRow = 10;
                const int lastColumn = 29;

                // Validate the expected template structure.
                ValidateTemplate(sheet);

                // Preserve listing order when grouping.
                var groups = records.GroupBy(x => x.TrustApplicationID).ToList();

                // Clear sample/template data while retaining styles.
                sheet.Range(
                    firstDataRow,
                    1,
                    lastTemplateRow,
                    lastColumn)
                    .Clear(XLClearOptions.Contents);

                int row = firstDataRow;

                foreach (var group in groups)
                {
                    if (row > lastTemplateRow)
                    {
                        // Reuse the last formatted template row.
                        sheet.Row(lastTemplateRow).CopyTo(sheet.Row(row));
                    }

                    sheet.Range(row, 1, row, lastColumn).Clear(XLClearOptions.Contents);

                    var first = group.First();

                    // ====================================================
                    // A-D: Trust application information
                    // ====================================================

                    SetText(sheet.Cell(row, 1), first.Settlor == null ? null : first.Settlor.FullName);
                    SetText(sheet.Cell(row, 2), first.TrustNo);
                    sheet.Cell(row, 3).SetValue(first.PlacementAmount);
                    sheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0.00";

                    DateTime? completedAt;

                    if (completedDateMap.TryGetValue(group.Key, out completedAt) && completedAt.HasValue)
                    {
                        sheet.Cell(row, 4).SetValue(completedAt.Value);
                        sheet.Cell(row, 4).Style.DateFormat.Format = "dd/MM/yyyy";
                    }

                    // ====================================================
                    // E-I: Trust Advisor (PERSONAL)
                    // ====================================================

                    var personalRecords = group.Where(x => IsCode(x.CommissionType, "PERSONAL")).ToList();
                    WriteCommissionSection(sheet, row, 5, personalRecords, referralCodeMap);

                    // ====================================================
                    // J-N: Trust Manager (TM)
                    // ====================================================

                    WriteCommissionSection(
                        sheet,
                        row,
                        10,
                        GetOverridingByRank(group, "TM"),
                        referralCodeMap);

                    // ====================================================
                    // O-S: Trust Director (TD)
                    // ====================================================

                    WriteCommissionSection(
                        sheet,
                        row,
                        15,
                        GetOverridingByRank(group, "TD"),
                        referralCodeMap);

                    // ====================================================
                    // T-X: Group Trust Director (GTD)
                    // ====================================================

                    WriteCommissionSection(
                        sheet,
                        row,
                        20,
                        GetOverridingByRank(group, "GTD"),
                        referralCodeMap);

                    // ====================================================
                    // Y-AC: Chief Trust Director (CTD)
                    // ====================================================

                    WriteCommissionSection(
                        sheet,
                        row,
                        25,
                        GetOverridingByRank(group, "CTD"),
                        referralCodeMap);

                    // Let Excel display multiple commission records.
                    sheet.Row(row).Height = CalculateRowHeight(group.ToList());
                    ApplyRowBorders(sheet, row);
                    row++;
                }

                // Clear any unused template data rows.
                if (row <= lastTemplateRow)
                {
                    sheet.Range(
                        row,
                        1,
                        lastTemplateRow,
                        lastColumn)
                        .Clear(XLClearOptions.Contents);
                }

                // Preserve the template's existing column widths,
                // fonts, colors and borders.
                sheet.SheetView.FreezeRows(1);

                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }

        // ============================================================
        // Validate latest template
        // ============================================================

        private static void ValidateTemplate(IXLWorksheet sheet)
        {
            var expectedHeaders = new Dictionary<int, string>
            {
                { 1, "Settlor" },
                { 2, "Trust Deed No" },
                { 5, "Commission No." },
                { 6, "Trust Advisor" },
                { 9, "Status" },
                { 10, "Commission No." },
                { 11, "Trust Manager" },
                { 14, "Status" },
                { 15, "Commission No." },
                { 16, "Trust Director" },
                { 19, "Status" },
                { 20, "Commission No." },
                { 21, "Group Trust Director" },
                { 24, "Status" },
                { 25, "Commission No." },
                { 26, "Chief Trust Director" },
                { 29, "Status" }
            };

            foreach (var header in expectedHeaders)
            {
                string actual = sheet.Cell(1, header.Key).GetString().Trim();

                if (!string.Equals(actual, header.Value, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        "Invalid commission Excel template. " +
                        "Unexpected header at column " +
                        header.Key + ".");
                }
            }
        }

        // ============================================================
        // Filter overriding commission by recipient rank
        // ============================================================

        private static List<TrustCommissionListItem> GetOverridingByRank(IGrouping<long, TrustCommissionListItem> group, string rankCode)
        {
            return group
                .Where(x =>
                    IsCode(x.CommissionType, "OVERRIDING") &&
                    IsCode(x.RequiredRankCode, rankCode))
                .ToList();
        }

        private static bool IsCode(string value, string expected)
        {
            return string.Equals(value, expected, StringComparison.OrdinalIgnoreCase);
        }

        // ============================================================
        // Write five-column commission section
        //
        // startColumn:
        // 5  = E-I
        // 10 = J-N
        // 15 = O-S
        // 20 = T-X
        // 25 = Y-AC
        //
        // Commission No. | Agent | Referral Code |
        // Commission | Status
        // ============================================================

        private static void WriteCommissionSection(
            IXLWorksheet sheet,
            int row,
            int startColumn,
            List<TrustCommissionListItem> records,
            Dictionary<long, string> referralCodeMap)
        {
            if (records == null || records.Count == 0)
            {
                return;
            }

            // Preserve the listing order of commission records.
            var commissionNumbers = new List<string>();
            var agentNames = new List<string>();
            var referralCodes = new List<string>();
            var amounts = new List<string>();

            foreach (var item in records)
            {
                // CommissionNo is sourced directly from
                // tbl_TrustCommission.CommissionNo by GetListAsync.
                commissionNumbers.Add(item.CommissionNo ?? "");
                long memberId = item.RecipientAgent == null ? 0 : item.RecipientAgent.MemberID;
                string fullName = item.RecipientAgent == null ? "" : item.RecipientAgent.FullName ?? "";
                agentNames.Add(fullName);

                string referralCode = "";

                if (memberId > 0)
                {
                    referralCodeMap.TryGetValue(memberId, out referralCode);
                }

                referralCodes.Add(referralCode ?? "");
                amounts.Add(item.CommissionAmount.ToString("N2"));
            }

            // 1. Commission No.
            SetText(sheet.Cell(row, startColumn), string.Join("\n", commissionNumbers));

            // 2. Agent Name
            SetText(sheet.Cell(row, startColumn + 1), string.Join("\n", agentNames));

            // 3. TheTrust Referral Code
            SetText(sheet.Cell(row, startColumn + 2), string.Join("\n", referralCodes));

            // 4. Commission Amount
            //
            // Multiple commission records are represented as
            // individual amounts matching the commission numbers.
            // Single-record amounts remain numeric Excel values.
            if (records.Count == 1)
            {
                sheet.Cell(row, startColumn + 3).SetValue(records[0].CommissionAmount);
                sheet.Cell(row, startColumn + 3).Style.NumberFormat.Format = "#,##0.00";
            }
            else
            {
                SetText(sheet.Cell(row, startColumn + 3), string.Join("\n", amounts));
            }

            // 5. Status
            //
            // Intentionally blank for ALL commission statuses.
            sheet.Cell(row, startColumn + 4).Clear(XLClearOptions.Contents);

            // Wrap multi-line content.
            for (int col = startColumn; col <= startColumn + 3; col++)
            {
                sheet.Cell(row, col).Style.Alignment.WrapText = true;
                sheet.Cell(row, col).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            }
        }

        // ============================================================
        // Load trust application completed dates
        // ============================================================

        private static async Task<Dictionary<long, DateTime?>> LoadCompletedDatesAsync(string merchantId, List<TrustCommissionListItem> records)
        {
            var ids = records.Select(x => x.TrustApplicationID).Distinct().ToList();
            var result = new Dictionary<long, DateTime?>();

            using (var db = new Sandbox_BasedEntities())
            {
                const int batchSize = 500;

                for (int offset = 0; offset < ids.Count; offset += batchSize)
                {
                    var batchIds = ids.Skip(offset).Take(batchSize).ToList();
                    var items = await db.tbl_TrustApplication
                        .AsNoTracking()
                        .Where(x => x.MerchantID == merchantId && batchIds.Contains(x.RowID))
                        .Select(x => new ApplicationInfo
                        {
                            TrustApplicationID = x.RowID,
                            CompletedAt = x.CompletedAt
                        })
                        .ToListAsync();

                    foreach (var item in items)
                    {
                        result[item.TrustApplicationID] = item.CompletedAt;
                    }
                }
            }

            return result;
        }

        // ============================================================
        // Load TheTrust V referral codes
        // ============================================================

        private static async Task<Dictionary<long, string>> LoadTrustReferralCodesAsync(List<TrustCommissionListItem> records)
        {
            var memberIds = records.Where(x => x.RecipientAgent != null).Select(x => x.RecipientAgent.MemberID).Distinct().ToList();
            var references = new List<AgentReferenceInfo>();

            using (var db = new Sandbox_BasedEntities())
            {
                const int batchSize = 500;

                for (int offset = 0; offset < memberIds.Count; offset += batchSize)
                {
                    var ids = memberIds.Skip(offset).Take(batchSize).ToList();

                    var batch = await db.tbl_Reference
                        .AsNoTracking()
                        .Where(x => x.MerchantID == TrustMerchantID && x.Type == "V" && x.Status == 0 && ids.Contains(x.MemberID))
                        .Select(x => new AgentReferenceInfo
                        {
                            MemberID = x.MemberID,
                            ReferralCode = x.ReferralCode
                        })
                        .ToListAsync();

                    references.AddRange(batch);
                }
            }

            return references.GroupBy(x => x.MemberID).ToDictionary(x => x.Key, x => x.First().ReferralCode);
        }

        // ============================================================
        // Write string as text
        // ============================================================

        private static void SetText(IXLCell cell, string value)
        {
            cell.Style.NumberFormat.Format = "@";
            cell.SetValue(value ?? "");
        }

        // ============================================================
        // Dynamic row height
        // ============================================================

        private static double CalculateRowHeight(List<TrustCommissionListItem> records)
        {
            int maxLines = 1;

            maxLines = Math.Max(maxLines, records.Count(x => IsCode(x.CommissionType, "PERSONAL")));

            foreach (string rank in new[]
            {
                "TM", "TD", "GTD", "CTD"
            })
            {
                int count = records.Count(x =>
                    IsCode(x.CommissionType, "OVERRIDING") &&
                    IsCode(x.RequiredRankCode, rank));

                maxLines = Math.Max(maxLines, count);
            }

            // Excel row height is measured in points.
            return Math.Min(409.0, Math.Max(25.0, maxLines * 17.0 + 8.0));
        }

        private static void ApplyRowBorders(IXLWorksheet sheet, int row)
        {
            // Apply borders to every cell from A to AC.
            for (int col = 1; col <= 29; col++)
            {
                var cell = sheet.Cell(row, col);
                cell.Style.Border.TopBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.LeftBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.RightBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.TopBorderColor = XLColor.Black;
                cell.Style.Border.BottomBorderColor = XLColor.Black;
                cell.Style.Border.LeftBorderColor = XLColor.Black;
                cell.Style.Border.RightBorderColor = XLColor.Black;
            }
        }
    }
}