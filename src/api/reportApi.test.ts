import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "./apiClient";
import { reportApi } from "./reportApi";
import { rolePermissions } from "../config/permissions";
import { navigation } from "../config/navigation";

vi.mock("./apiClient", () => ({ default: { get: vi.fn() } }));

describe("OTP history report", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends server pagination and filters, including status zero, and uses API totals", async () => {
    const data = { Records: [{ RowID: 81 }], Pagination: { Page: 3, PageSize: 20, TotalRecords: 81, TotalPages: 5 } };
    vi.mocked(apiClient.get).mockResolvedValue({ data: { Status: 0, Data: data } });
    await expect(reportApi.getOtpHistory({ page: 3, pageSize: 20, search: "person@example.com", type: "TRUST_RESET_PASSWORD", sentMethod: "OTP_MAIL", status: 0, dateFrom: "2026-10-01", dateTo: "2026-10-17" })).resolves.toEqual(data);
    expect(apiClient.get).toHaveBeenCalledWith("/report/tac-history", { params: { page: 3, pageSize: 20, search: "person@example.com", type: "TRUST_RESET_PASSWORD", sentMethod: "OTP_MAIL", status: 0, dateFrom: "2026-10-01", dateTo: "2026-10-17" } });
  });

  it("omits cleared filters so reset fetches all records", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { Status: 0, Data: { Records: [], Pagination: {} } } });
    await reportApi.getOtpHistory({ page: 1, pageSize: 10, search: "", type: "", sentMethod: "", status: undefined, dateFrom: "", dateTo: "" });
    expect(apiClient.get).toHaveBeenCalledWith("/report/tac-history", { params: { page: 1, pageSize: 10 } });
  });

  it("surfaces API business errors", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { Status: 4, Message: "Date From cannot exceed Date To." } });
    await expect(reportApi.getOtpHistory({ page: 1, pageSize: 20 })).rejects.toThrow("Date From cannot exceed Date To.");
  });

  it("grants the report permission only to SA, AD, and OP", () => {
    const allowedRoles = Object.entries(rolePermissions).filter(([, permissions]) => permissions.includes("otpHistory.view")).map(([role]) => role);
    expect(allowedRoles).toEqual(["SA", "AD", "OP"]);
    expect(navigation.find((item) => item.label === "Report")).toMatchObject({ permission: "otpHistory.view", children: [{ label: "OTP History", path: "/report/otp-history", permission: "otpHistory.view" }] });
  });
});
