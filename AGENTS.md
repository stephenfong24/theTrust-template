# 1. Project Overview

This repository contains theTrust portal frontend plus a referenced ASP.NET Web API backend and SQL Server schema. The system manages Trust Plan configuration, agent/member registration and network views, Trust Application creation and approval, payment allocation and finance approval, document generation, dividend schedules, commission sources/payout records, audit logs, OpenAI-assisted Malaysian IC extraction, and secured file uploads.

The active frontend application is in `src/`. The backend reference is under `reference/api-202609211030_src/api/`. The database schema script is `reference/scheme-2.1.sql`.

Major applications/components:

- Frontend: React/Vite/TypeScript single-page app in `src/`, with role-aware routes, API clients, trust application wizard, payment/dividend/commission screens, audit screens, dashboards, agent/network pages, and trust plan admin UI.
- API: ASP.NET Web API project `reference/api-202609211030_src/api/API_theTrust.csproj`, controllers under `API/Controller/v1/`, services under `Class/Service/`, EF entities under `Context/`, and configuration in `Web.config`.
- JobServer/Hangfire: no JobServer project or recurring Hangfire registration was found in the checked-in source. The API calls an external Hangfire/job server through `Class/Helper/HangfireHelper.cs` using `Hangfire.BaseUrl`.
- SignalR: login returns a short-lived SignalR token from `JwtHelper.GenerateSignalRToken`, but no SignalR hub/server implementation was found in this repository.
- Database: SQL Server schema in `reference/scheme-2.1.sql`; EF6 generated context/entities in `reference/api-202609211030_src/api/Context/`.
- External services: OpenAI Responses API for Malaysian IC extraction, optional Windows Defender scanning for uploads, LibreOffice for document conversion, Cloudflare Turnstile, and external Hangfire/email processing.

# 2. Technology Stack

- Frontend: React `18.3.1`, TypeScript `5.7.2`, Vite `6.0.7`, React Router `7.1.1`, Tailwind CSS, axios, lucide-react, recharts, zod, react-hook-form, vitest, tesseract.js, and opencv-js from `package.json`.
- Backend: ASP.NET Web API on .NET Framework. `API_theTrust.csproj` targets .NET Framework `v4.7.2`.
- ORM/database: Entity Framework 6 EDMX (`Context/database.edmx`, `database.Context.cs`) over SQL Server.
- Authentication: JWT bearer auth via `Class/Attributes/JwtAuthorizeAttribute.cs` and `Class/JwtHelper.cs`; legacy DB-token auth also exists in `Class/Attributes/RequestAuthorizeAttribute.cs`.
- Authorization: controller attributes such as `[JwtAuthorize(Roles = "SA,AD")]` plus service-level role/ownership checks.
- Hangfire: not hosted in this API project; API triggers external job server endpoints through `HangfireHelper`.
- SignalR: SignalR token generation only was verified; no hub/server files found.
- IIS/Web API config: `Global.asax.cs`, `App_Start/WebApiConfig.cs`, `Web.config`.
- OpenAI integration: `Class/Service/TrustApplication/OpenAiIcExtractionService.cs`, `OpenAiRequestLogService.cs`, `OpenAiUsageCostService.cs`.
- Email: queued into `tbl_EmailQueue`; actual sender/processor not present in checked-in source.
- Document generation/conversion: DOCX/XLSX placeholder helpers in `Class/Helper/Document/`, document generators under `Class/Service/TrustApplication/Document/Generator/`, and LibreOffice conversion in `Class/Helper/Document/LibreOfficePdfConverter.cs`.

# 3. Repository Structure

- `src/api/`: frontend API wrapper modules such as `trustApplicationApi.ts`, `trustPlanApi.ts`, `trustPaymentApi.ts`, `trustDividendApi.ts`, `trustCommissionApi.ts`, `auditApi.ts`, and `authApi.ts`.
- `src/pages/`: routed frontend pages for dashboards, Trust Application, Trust Plan, payment, dividend, commission, agents, network, resources, audit, profile, and login flows.
- `src/config/roles.ts`, `src/config/permissions.ts`, `src/config/navigation.ts`: frontend role names, permission keys, and navigation visibility.
- `src/context/AuthContext.tsx`, `src/routes/ProtectedRoute.tsx`, `src/services/authService.ts`: frontend session state, route protection, token storage.
- `docs/`: frontend/project notes, including `docs/TRUST_APPLICATION_WORKFLOW.md`.
- `reference/api-202609211030_src/api/API/Controller/v1/`: Web API controllers and attribute routes.
- `reference/api-202609211030_src/api/Class/Service/TrustApplication/`: Trust Application services by module: common/query/steps/workflow/payment/documents/dividend/commission/snapshot/history/notification/delete/complimentary benefit.
- `reference/api-202609211030_src/api/Class/Service/TrustPlan/`: trust plan validator and related service logic.
- `reference/api-202609211030_src/api/Class/Service/TrustCommission/`: finance/admin/agent commission listing/detail/status services.
- `reference/api-202609211030_src/api/Class/Model/`: older model/service classes and DTO folders.
- `reference/api-202609211030_src/api/Class/Helper/`: shared helpers for app settings, Hangfire triggers, document placeholders/conversion, upload paths, and miscellaneous formatting.
- `reference/api-202609211030_src/api/Class/Security/` and `Class/Service/Security/`: file upload security scanner and OpenAI/Tesseract/file policy support.
- `reference/api-202609211030_src/api/Context/`: EF-generated `Sandbox_BasedEntities` DbContext and generated table entity classes.
- `reference/api-202609211030_src/api/EmailTemplate/`: checked-in email template assets/files.
- `reference/scheme-2.1.sql`: SQL Server table schema, constraints, defaults, and FKs. Stored procedure bodies are not included.
- `.codex-temp/` and `backup_demo/`: historical/reference material; do not treat as primary source unless explicitly needed.

# 4. Coding Conventions

- Controllers use attribute routing with `[RoutePrefix]`, `[Route]`, and HTTP verb attributes. Most v1 controllers are under `API/Controller/v1/`.
- Controllers usually set `Request.Properties["AuditTitle"]` and `Request.Properties["AuditDescription"]` before service calls so `ApiLoggingHandler.cs` can persist meaningful request audit records.
- Controllers return a common response shape through `Class/Model/Response.cs`/`ApiResponse` patterns and catch `BusinessException` separately from generic exceptions.
- Services are named with an `Async` suffix even when not every method is async, for example `TrustApplicationWorkflowServiceAsync`, `TrustApplicationPaymentServiceAsync`, and `TrustPlanServiceAsync`.
- EF usage generally creates `using (var db = new Sandbox_BasedEntities())`, filters by `MerchantID`, and uses LINQ plus `SaveChangesAsync()`.
- Business transactions use `db.Database.BeginTransaction()`, then mutate tables, `SaveChangesAsync()`, commit, and only then trigger external Hangfire/email calls. Preserve this order.
- Service methods receive `merchantId`, `userId`, and often `roleCode` from `JwtAuthorizeAttribute` request properties. Do not trust frontend role filtering alone.
- `BusinessException` includes a message and code. New business rules should throw `BusinessException` with a stable code rather than generic exceptions.
- Trust Application workflow changes should use `TrustApplicationStatusHelper.ChangeStatus()` to update status and write `tbl_TrustApplication_StatusHistory`.
- Trust Application audit/history events should use `TrustApplicationHistoryHelper.AddHistory()` or the existing helper/service path instead of writing ad hoc rows.
- File uploads should go through `FileUploadService` and `FileUploadPolicies`; do not bypass extension/magic-byte/hash/antivirus/audit handling.
- Do not duplicate document placeholder or PDF conversion logic; reuse `DocxPlaceholderHelper`, `XlsxPlaceholderHelper`, `DocumentFileNameHelper`, and `LibreOfficePdfConverter`.
- Keep merchant isolation explicit. Many tables include `MerchantID`; commission batches do not, so `TrustCommissionServiceAsync` restricts batches through related `tbl_TrustCommission` rows.

# 5. Roles and Permissions

Verified frontend roles from `src/config/roles.ts`:

- `SA`: Super Administrator.
- `AD`: Administrator.
- `OP`: Operation.
- `AC`: Account.
- `AG`: Agent.

Frontend permission defaults from `src/config/permissions.ts`:

- `SA`, `AD`: all frontend permissions.
- `OP`: dashboard, agents, trust listing, trust payment, trust payment allocations, network, resources, memo, forms/documents, internal training, request log.
- `AC`: dashboard, agents, trust listing, trust dividend, trust payment, trust payment allocations, network, income, resources, memo, forms/documents, internal training, request log.
- `AG`: dashboard, trust listing, trust dividend, trust draft listing, my network, income, resources, memo, forms/documents, internal training, request log.

Backend rules are distributed:

- `TrustPlanController`: create/update/list/detail are restricted to `SA,AD`.
- `TrustApplicationController`: submit-admin-approval is `SA,AD,AC`; admin-approve is `SA,AD`; submit-stamping/complete are `SA,AD,OP`; reject is `SA,AD,OP,AC`; early-withdraw route is `SA,AD,OP`, but service logic verified only `SA,AD`.
- `TrustPaymentController`: approve/reject payment are `SA,AD,AC`; other payment operations rely on service ownership/status checks.
- `TrustDividendFinanceServiceAsync`: `SA,AD,AC,AG` can view, with `AG` restricted to own applications; only `SA,AD,AC` can process status changes.
- `TrustCommissionServiceAsync`: `SA,AD,AC,AG` can view, with `AG` restricted to selling/recipient records; only `SA,AD,AC` can move `CALCULATED` commissions to `PAID` or `CANCELLED`.
- `NetworkTreeAsync`: `AG` can view self/downlines only; internal users can start from configured base member or searched member.

# 6. Trust Application Architecture

Trust Application services live mainly in `Class/Service/TrustApplication/` and are exposed through `API/Controller/v1/TrustApplicationController.cs`.

- Creation: `Step1/TrustApplicationStep1ServiceAsync.cs` creates applications only for `AG`. New rows start with `ApplicationStatus = "DRAFT"`, `CurrentStep = 1`, `LastCompletedStep = 0`, a merchant-scoped sequential `TrustID`, and a status history row.
- TrustID/TrustNo: `TrustID` is the application-facing numeric trust identifier. It is formatted as four digits in document generators (`TrustID.ToString("D4")`). Some document output calls it `TRUST_NO`.
- Ownership: the root application stores `MemberID`. Agents are generally restricted to applications where `MemberID == userId`; internal users use role/status checks.
- Network snapshot: Step 1 stores `ReferenceID`, `NetworkType`, and `ReferralCode` from the selected `tbl_Reference`. Network selection is locked once the application is `COMPLETED`, `EARLY_WITHDRAWN`, or `MATURED`.
- Editing: `TrustApplicationCommonService.cs` centralizes lookup/load/update guards. Status and step restrictions are enforced by step services and common service methods.
- Reads: `TrustApplicationQueryServiceAsync.cs` assembles application detail, step data, status flow, lock flags, documents, and snapshot state.
- Delete: draft deletion is handled through `Delete/TrustApplicationDeleteServiceAsync.cs` and route `DELETE api/trust-application/{trustId}`.

Important controllers/services:

- `TrustApplicationController.cs`
- `TrustApplicationStep1ServiceAsync.cs` through `TrustApplicationSubmitServiceAsync.cs`
- `TrustApplicationWorkflowServiceAsync.cs`
- `TrustApplicationPaymentServiceAsync.cs`
- `TrustApplicationDocumentServiceAsync.cs`
- `TrustApplicationDividendScheduleServiceAsync.cs`
- `TrustCommissionSourceServiceAsync.cs`
- `TrustApplicationPlanSnapshotServiceAsync.cs`
- `TrustApplicationComplimentaryBenefitServiceAsync.cs`

Important tables:

- `tbl_TrustApplication`
- `tbl_TrustApplication_PersonalDetail`
- `tbl_TrustApplication_SourceOfFund`
- `tbl_TrustApplication_TrustAsset`
- `tbl_TrustApplication_Beneficiary`
- `tbl_TrustApplication_BeneficiaryAllocation`
- `tbl_TrustApplication_BeneficiaryAllocationDetail`
- `tbl_TrustApplication_MinorDistribution`
- `tbl_TrustApplication_TrustDeedExecution`
- `tbl_TrustApplication_CoBroker`
- `tbl_TrustApplication_SupportingDocument`
- `tbl_TrustApplication_Payment`
- `tbl_TrustApplication_PaymentDocument`
- `tbl_TrustApplication_StatusHistory`
- `tbl_TrustApplication_History`
- `tbl_TrustApplication_PlanSnapshot`
- `tbl_TrustApplication_GeneratedDocument`
- `tbl_TrustApplication_DividendSchedule`
- `tbl_TrustApplication_ComplimentaryBenefit`

# 7. Trust Application Status Flow

Canonical allowed transitions in `Class/Model/TrustApplication/TrustApplicationStatusHelper.cs`:

```text
DRAFT
  -> PENDING_PAYMENT_APPROVAL
  -> PAYMENT_APPROVED
  -> PENDING_ADMIN_APPROVAL
  -> SENT_OUT
  -> STAMPING
  -> COMPLETED
  -> EARLY_WITHDRAWN
```

Verified transitions and side effects:

| Transition | Who / API | Service/method | Verified side effects |
| --- | --- | --- | --- |
| `DRAFT -> PENDING_PAYMENT_APPROVAL` | `AG`, `POST api/trust-application/submit` | `TrustApplicationSubmitServiceAsync.SubmitAsync` | Validates Step 1-5 records and step progression, sets submitted fields, writes status/history. |
| `PENDING_PAYMENT_APPROVAL -> PAYMENT_APPROVED` | `SA,AD,AC`, `POST api/trust-payment/{trustId}/payment/{paymentId}/approve` | `TrustApplicationPaymentServiceAsync.ApprovePaymentAsync` | Requires full approved amount, sets commencement/maturity/payment approved data, queues email, creates automatic `PAYMENT_APPROVED` documents, writes payment/status/history. |
| `PAYMENT_APPROVED -> PENDING_ADMIN_APPROVAL` | `SA,AD,AC`, `POST api/trust-application/{trustId}/submit-admin-approval` | `TrustApplicationWorkflowServiceAsync.SubmitAdminApprovalAsync` | Queues status notification and creates automatic documents for `PENDING_ADMIN_APPROVAL`. |
| `PENDING_ADMIN_APPROVAL -> SENT_OUT` | `SA,AD`, `POST api/trust-application/{trustId}/admin-approve` | `TrustApplicationWorkflowServiceAsync.AdminApproveAsync` | Sets status/history and queues status notification. |
| `SENT_OUT -> STAMPING` | `SA,AD,OP`, `POST api/trust-application/{trustId}/submit-stamping` | `TrustApplicationWorkflowServiceAsync.SubmitStampingAsync` | Sets status/history and queues status notification. |
| `STAMPING -> COMPLETED` | `SA,AD,OP`, `POST api/trust-application/{trustId}/complete` | `TrustApplicationWorkflowServiceAsync.CompleteAsync` | Sets completed fields, creates/fetches plan snapshot, creates automatic `COMPLETED` documents, generates dividend schedule, syncs complimentary benefit, registers commission source, queues email, writes history. |
| `COMPLETED -> EARLY_WITHDRAWN` | service allows `SA,AD`; route also lists `OP` | `TrustApplicationWorkflowServiceAsync.EarlyWithdrawAsync` | Requires before maturity and snapshot withdrawal config, stores withdrawal amounts, voids outstanding scheduled dividends, queues email, writes history. |

Alternative/terminal statuses:

- `REJECTED`: referenced by dashboards/lists/email content and `RejectAsync`, but `TrustApplicationStatusHelper` does not allow any transition to `REJECTED`. Needs Verification.
- `MATURED`: referenced by dashboards, query lock rules, documents, and personal-sales calculations, but no maturity transition/job was found in checked-in C# or SQL. Needs Verification.
- `EARLY_WITHDRAWN`: implemented terminal path from `COMPLETED`.

# 8. Trust Application Steps

Step APIs are in `TrustApplicationController.cs`. Request/response DTOs are under `Class/Model/DTO/TrustApplication/`.

| Step | Purpose | Key services/tables | Important validation/rules |
| --- | --- | --- | --- |
| Step 1 | Personal details, source of funds, selected trust product, network/reference snapshot. | `Step1/TrustApplicationStep1ServiceAsync.cs`; `tbl_TrustApplication`, personal detail, source-of-fund tables. | New apps only by `AG`; selected trust product must be active; selected `tbl_Reference` must belong to owner and type `V` or `W`; network locked for completed/early withdrawn/matured applications. |
| Step 2 | Trust asset and payment/source details. | `Step2/TrustApplicationStep2ServiceAsync.cs`; `tbl_TrustApplication_TrustAsset`. | Placement amount is tied to plan min/max and cannot be changed in ways that conflict with active payment allocations. |
| Step 3 | Beneficiaries and minor/caretaker-related data. | `Step3/TrustApplicationStep3ServiceAsync.cs`; `tbl_TrustApplication_Beneficiary`, `tbl_TrustApplication_MinorDistribution`. | Submit revalidation requires beneficiary records and validates selected beneficiary references used by allocations. Minor distribution/guardian rules are implemented in step/document helpers; verify exact fields before editing. |
| Step 4 | Beneficiary allocation. | `Step4/TrustApplicationStep4ServiceAsync.cs`; allocation header/detail tables. | Allocation types 1-7 have distinct main/substitute/trustee-company/percentage/equal-share rules. Letter of Wishes document sync depends on allocation type. |
| Step 5 | Trust deed execution. | `Step5/TrustApplicationStep5ServiceAsync.cs`; `tbl_TrustApplication_TrustDeedExecution`. | Execution/rank options are connected to trust plan execution rank configuration. |
| Step 6 | Supporting documents. | `Step6/TrustApplicationSupportingDocumentServiceAsync.cs`, `FileUploadService`; `tbl_TrustApplication_SupportingDocument`. | Optional for final submit, but user must have progressed to the step. Upload policy is Trust Application supporting document: PDF/DOC/DOCX/JPG/JPEG/PNG up to 5 MB. |
| Step 7 | Co-broker. | `Step7/TrustApplicationStep7ServiceAsync.cs`; `tbl_TrustApplication_CoBroker`. | Optional. Frontend currently skips this screen per `docs/TRUST_APPLICATION_WORKFLOW.md`; commission impact is not verifiable without stored procedures. |
| Step 8 | Review and submit. | `Step8/TrustApplicationSubmitServiceAsync.cs`. | Only `AG`; requires persisted Step 1-5 and `LastCompletedStep >= 6`; Step 6/7 optional but progression is checked; changes status to `PENDING_PAYMENT_APPROVAL`. |

Allocation validation verified in `TrustApplicationSubmitServiceAsync`:

- Type 1: one main beneficiary and one substitute.
- Type 2: one main beneficiary and multiple equal substitutes.
- Type 3: one main beneficiary and percentage substitutes totaling 100.
- Type 4: one main beneficiary and trustee company substitute.
- Type 5: equal multiple main beneficiaries.
- Type 6: percentage multiple main beneficiaries totaling 100.
- Type 7: 100% trustee company.

# 9. Trust Plan

Trust plans are managed by `Class/Model/TrustPlan/TrustPlanServiceAsync.cs`, `Class/Service/TrustPlan/TrustPlanValidator.cs`, and `API/Controller/v1/TrustPlanController.cs`.

Configuration steps:

1. Basic plan information: product code/name, category, min/max placement, fund management period/unit, status, execution ranks.
2. Payment and fee configuration.
3. Tenure and withdrawal configuration.
4. Dividend/return configuration.
5. Dividend payout configuration.
6. Bonus configuration.
7. Commission configuration.
8. Commission rules.
9. Complimentary benefits.

Verified constraints:

- Trust Plan create/update/list/detail APIs are `SA,AD`.
- Updates remove and recreate child configuration rows.
- `TrustPlanValidator.cs` currently supports dividend method `INVESTMENT_PERIOD_TIER_RATE`.
- `TrustPlanValidator.cs` currently supports commission method `ONE_OFF_COMMISSION`.

Snapshot behaviour:

- Completion calls `TrustApplicationPlanSnapshotServiceAsync.CreateSnapshotAsync()` to serialize `TrustPlanDetailsResponse`, store JSON plus SHA-256 in `tbl_TrustApplication_PlanSnapshot`, and reuse an existing snapshot if one already exists.
- Snapshot creation does not call `SaveChanges`; the workflow transaction owns the save/commit.
- Dividend generation and commission source registration use the frozen snapshot on completion.
- `TrustApplicationPlanSnapshotRefreshServiceAsync.cs` and route `POST api/trust-application/{trustId}/plan-snapshot/refresh` can overwrite a completed application's snapshot from current plan config. Treat this as a deliberate maintenance tool; verify business approval before using it.
- `TrustApplicationComplimentaryBenefitServiceAsync.SyncAsync` reads current `tbl_TrustPlan` benefit configuration by product code when syncing; whether completed historical benefit behaviour should always use snapshot data needs verification.

# 10. Payment

Payment workflow is implemented in `Class/Service/TrustApplication/Payment/TrustApplicationPaymentServiceAsync.cs` and `API/Controller/v1/TrustPaymentController.cs`.

Statuses verified in payment service:

```text
WAITING_PAYMENT -> PENDING_APPROVAL -> PAYMENT_APPROVED
WAITING_PAYMENT -> CANCELLED
PENDING_APPROVAL -> REJECTED
REJECTED -> PENDING_APPROVAL
```

Allocation:

- Active allocation statuses counted against placement are `WAITING_PAYMENT`, `PENDING_APPROVAL`, and `PAYMENT_APPROVED`.
- Submitted amount is `PENDING_APPROVAL + PAYMENT_APPROVED`.
- Approved amount is `PAYMENT_APPROVED`.
- Save allocation replaces active `WAITING_PAYMENT` allocations and keeps submitted/approved allocations.
- Agents can allocate/upload only for own application and only in valid payment stage.

Payment slip:

- Slip upload accepts payment-slip policy files through upload/security services.
- Upload moves `WAITING_PAYMENT` or `REJECTED` to `PENDING_APPROVAL`.
- Active slip is required for approval/rejection.

Finance approval/rejection:

- `POST api/trust-payment/{trustId}/payment/{paymentId}/approve` and `/reject` require `SA,AD,AC`.
- Approval requires current `PENDING_APPROVAL`.
- Rejection requires a finance remark and sets payment status `REJECTED`.
- Full approval occurs when approved amount reaches placement amount.

Full approval side effects:

- Application moves `PENDING_PAYMENT_APPROVAL -> PAYMENT_APPROVED`.
- `CommencementDate` comes from approval request.
- `MaturityDate` is calculated from trust plan fund management period/unit (`YEARS` or `MONTHS`).
- Payment approved email is queued.
- Automatic `PAYMENT_APPROVED` documents are created, including official receipt when configured.
- Receipt numbering is handled by `Document/TrustReceiptNumberService.cs`.

Bank resolution:

- Bank/settlor payment fields are stored on the Trust Asset/payment records and displayed by payment/document services. Before changing bank mapping, inspect `TrustApplicationPaymentServiceAsync.cs`, Step 2 DTOs, and relevant lookup tables.

Important APIs:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `api/trust-payment/{trustId}/payment` | Payment summary/detail for a trust application. |
| POST | `api/trust-payment/{trustId}/payment/allocation/initialize` | Initialize allocation. |
| POST | `api/trust-payment/{trustId}/payment/allocation` | Save allocation. |
| POST | `api/trust-payment/{trustId}/payment/{paymentId}/slip` | Upload payment slip. |
| DELETE | `api/trust-payment/{trustId}/payment/{paymentId}/delete` | Cancel allocation. |
| POST | `api/trust-payment/{trustId}/payment/{paymentId}/approve` | Finance/admin approval. |
| POST | `api/trust-payment/{trustId}/payment/{paymentId}/reject` | Finance/admin rejection. |

# 11. Document Generation

Document master/config tables:

- `tbl_TrustDocument`
- `tbl_TrustDocumentTemplate`
- `tbl_TrustDocumentRole`
- `tbl_TrustDocumentAllocationMapping`
- `tbl_TrustApplication_GeneratedDocument`
- `tbl_DocumentDownload`

Verified document generator codes from `Class/Service/TrustApplication/Document/Generator/`:

- `BOOKING_FORM`
- `OFFICIAL_RECEIPT`
- `KYC_FORM`
- `LETTER_ENGAGEMENT`
- `FUND_MANAGEMENT_CONFIRMATION`
- `TRUST_DEED`
- `COURIER_LETTER`
- `LETTER_WISHES_1`
- `LETTER_WISHES_2`
- `LETTER_WISHES_3`
- `LETTER_WISHES_4`
- `LETTER_WISHES_5`
- `LETTER_WISHES_6`
- `LETTER_WISHES_7`
- `INTRODUCTION_FORM`

Generation behaviour:

- `TrustApplicationDocumentServiceAsync.CreateAutomaticDocumentsAsync()` selects active documents where `Status == 0` and `AvailableStage` matches the application stage.
- Allocation mappings filter documents by allocation type when a mapping exists.
- Duplicate active generated-document records are prevented by service checks.
- Current effective templates are selected by active status and effective date range.
- `GetDocumentsAsync()` applies role permission from `tbl_TrustDocumentRole`; download requires `CanDownload` and generated status `COMPLETED`.
- `GenerateDocumentForViewAsync()` supports on-demand generation only for documents marked `GenerateOnDemand`.
- `SyncLetterOfWishesDocumentAsync()` deactivates obsolete Letter of Wishes generated docs when allocation type changes and creates the required LOW record.

Helpers:

- `DocxPlaceholderHelper.cs`: DOCX placeholder replacement and repeating table rows.
- `XlsxPlaceholderHelper.cs`: XLSX placeholder replacement.
- `MalaysiaCurrencyWordsHelper.cs`: amount-to-words formatting.
- `DocumentFileNameHelper.cs`: output filename formatting.
- `LibreOfficePdfConverter.cs`: converts DOCX/XLSX to PDF using LibreOffice.

Important services:

- `TrustApplicationDocumentServiceAsync.cs`
- `TrustDocumentGeneratorResolver.cs`
- `DocumentDownloadServiceAsync.cs`
- all generator classes under `Document/Generator/`

# 12. Dividend

Dividend schedule generation:

- Completion calls `TrustApplicationDividendScheduleServiceAsync.GenerateAsync()`.
- Duplicate schedules are blocked by local and database checks.
- Generation uses frozen Step 4 dividend config from the Trust Plan snapshot, not the live plan.
- Provider resolution currently uses `InvestmentPeriodTierRateDividendProvider.cs`.

Calculation method:

- Current provider supports `INVESTMENT_PERIOD_TIER_RATE`.
- Fund management period unit must be `YEARS`.
- Tier selection matches trust asset amount against configured tier min/max.
- Payout frequencies: `MONTHLY`, `QUARTERLY`, `HALF_YEARLY`, `YEARLY`.
- Start-date options: `FROM_COMMENCEMENT_DATE`, `FROM_APPROVAL`, `FROM_COMPLETED`.
- `TRANSFER_TO_BANK`: annual return is based on original placement and distributed across periods; final period absorbs rounding.
- `REDEPOSIT_AS_TRUST_ASSET`: each period's return is redeposited into the basis for later periods.

Status flow:

```text
SCHEDULED
  -> DUE (derived when PayoutDate <= today)
  -> PAID / CANCELLED

SCHEDULED
  -> VOIDED (early withdrawal)
```

Finance processing:

- `TrustDividendFinanceServiceAsync.cs` derives effective `DUE` from stored `SCHEDULED` plus payout date.
- Only due bank-transfer schedules can be processed manually.
- `PAID` and `CANCELLED` are final.
- `CANCELLED` requires a remark.
- Redeposit schedules cannot be manually paid/cancelled.
- Early withdrawal voids outstanding stored `SCHEDULED` schedules; paid/cancelled rows are left intact.

Important tables/services:

- `tbl_TrustApplication_DividendSchedule`
- `tbl_TrustPlanDividendConfig`
- `tbl_TrustPlanDividendInvestmentPeriodTier`
- `tbl_TrustPlanDividendInvestmentPeriodTierRate`
- `tbl_TrustPlanDividendPayout`
- `TrustApplicationDividendScheduleServiceAsync.cs`
- `InvestmentPeriodTierRateDividendProvider.cs`
- `TrustDividendFinanceServiceAsync.cs`

# 13. Commission

Commission source registration:

- Completion calls `TrustCommissionSourceServiceAsync.RegisterAsync()`.
- This does not create final commission payout rows. It creates one `tbl_TrustCommissionSource` record with `ProcessingStatus = "PENDING"`.
- The source freezes application/product/member/network fields, placement amount, plan snapshot ID, commission method/config values, calculation basis, rank determination, and completion date.
- The unique constraint `UQ_tbl_TrustCommissionSource_TrustApplicationID` prevents duplicate commission sources.

Personal commission:

- Trust Plan Step 7/8 supports one-off commission config and tiers.
- Personal commission formulas/rate application are not implemented in checked-in C#; expected processing is in missing stored procedures. Needs Verification.

Overriding commission:

- `tbl_TrustPlanCommissionRule` and tier rows support overriding commission configuration.
- Actual upline selection, rate calculation, and payout creation are not present in checked-in C# or SQL bodies. Needs Verification.

Co-broker:

- Backend Step 7 and `tbl_TrustApplication_CoBroker` exist.
- Frontend currently skips the co-broker screen.
- Co-broker impact on commission cannot be verified without stored procedure bodies. Needs Verification.

Compression:

- Schema includes `tbl_TrustCommissionCompressionLog`, `IsCompressed`, `CompressedLevels`, and `tbl_TrustPlanCommissionRule.OverridingCompression` default `COMPRESS_UP`.
- The compression algorithm is not in checked-in C# or schema script. Needs Verification.

Batch processing:

- `TrustCommissionSourceServiceAsync.cs` comments identify `USP_TrustCommission_DailyCutoff` and `USP_TrustCommission_ProcessOneOff`.
- `TrustCommissionServiceAsync.cs` lists batches from `tbl_TrustCommissionBatch`, lists/detail payout rows from `tbl_TrustCommission`, and lets finance roles move `CALCULATED -> PAID` or `CALCULATED -> CANCELLED`.
- `PAID` and `CANCELLED` are final.

Important tables:

- `tbl_TrustCommissionSource`
- `tbl_TrustCommissionBatch`
- `tbl_TrustCommission`
- `tbl_TrustCommissionCompressionLog`
- `tbl_TrustPlanCommissionConfig`
- `tbl_TrustPlanCommissionOneOffTier`
- `tbl_TrustPlanCommissionRule`

# 14. Agent Network

Network code is primarily in `Class/Model/NetworkTreeAsync.cs` and exposed through network controllers/API clients.

Verified structure:

- Trust network uses `tbl_MemberUnit_Trust` and `tbl_Reference.Type == "V"`.
- Will network uses `tbl_MemberUnit_Will` and `tbl_Reference.Type == "W"`.
- `tbl_Reference` stores ranking, advance ranking, referral code/reference data, and member linkage.
- Internal users without a search start from configured `TrustNetworkBaseMemberUsername` or `WillNetworkBaseMemberUsername`.
- Agents without a search start from themselves.
- Agents can view only self/downlines; code walks upline with a visited set to avoid loops.
- Network display uses the greater of `tbl_Reference.AdvanceRanking` and `tbl_Reference.Ranking`.
- Trust personal sales uses applications in `COMPLETED`, `EARLY_WITHDRAWN`, or `MATURED`.

Commission network source:

- `TrustCommissionSourceServiceAsync` freezes selected `ReferenceID`, `NetworkType`, and `ReferralCode` from the application on completion.
- Actual commission upline traversal is not present in checked-in C# and is expected in stored procedures. Needs Verification.

Important tables/SPs:

- `tbl_Reference`
- `tbl_MemberUnit_Trust`
- `tbl_MemberUnit_Will`
- `tbl_AgentRank`
- `tbl_AgentRankingHistory`
- `USP_MemberRegister_Trust`
- `USP_Trust_ManualAgentRanking`

# 15. Agent Ranking

Verified ranking data:

- `tbl_AgentRank` stores rank definitions.
- `tbl_Reference.Ranking` and `tbl_Reference.AdvanceRanking` are used in network display.
- `tbl_AgentRankingHistory` records manual ranking changes.

Manual ranking:

- `AgentRankingAsync.ManualRankingAsync()` executes `[dbo].[USP_Trust_ManualAgentRanking]`.
- Inputs include merchant ID, member ID, new advance ranking, changed-by user ID, and preview-only flag.
- `AgentManagementController.cs` exposes `manual-ranking-preview` and `manual-ranking-update`.

Needs Verification:

- Ranking levels/requirements beyond data table names.
- Personal sales and direct downline formulas used for rank upgrades.
- Annual review/downgrade behaviour.
- Multiple-pass ranking algorithm and maximum passes.
- `USP_Trust_ProcessAllAgentRanking` was requested by the task but was not found in checked-in C# or `reference/scheme-2.1.sql`; no safe implementation details can be documented from this repository.

# 16. Complimentary Benefit

Complimentary benefits are configured on Trust Plan Step 9 and stored in `tbl_TrustPlanBenefit`.

`TrustApplicationComplimentaryBenefitServiceAsync.SyncAsync()`:

- Soft-deactivates current active application benefit rows.
- Checks `tbl_TrustPlan.HasComplimentaryBenefits`.
- Reads current plan benefits for the application product code.
- Selects the first benefit ordered by sequence whose placement range includes the trust asset amount.
- Inserts a snapshot row in `tbl_TrustApplication_ComplimentaryBenefit` including benefit name/value/fulfilment and qualified placement range.

Important caution:

- Completed application plan economics generally should come from `tbl_TrustApplication_PlanSnapshot`.
- The verified complimentary benefit sync currently reads current `tbl_TrustPlan`/benefit tables, so historical snapshot behaviour for benefits needs verification before changing this area.

# 17. Early Withdrawal

Implemented in `TrustApplicationWorkflowServiceAsync.EarlyWithdrawAsync()`.

Eligibility:

- Service allows only `SA`/`AD`.
- Application must be `COMPLETED`.
- Remark is required.
- Duplicate withdrawal is blocked if `EarlyWithdrawnAt` already exists.
- Maturity date is required.
- Withdrawal is blocked on or after maturity date.
- Frozen plan snapshot must include withdrawal config with `AllowEarlyWithdrawal = true`.

Fee/deduction:

- Fee type supports `PERCENTAGE` and `FIXED_AMOUNT`.
- Percentage must be `0..100`.
- Fixed amount must be non-negative.
- Base amount is trust asset placement.
- Deduction is rounded to 2 decimals and cannot exceed base amount.
- Net amount is base minus deduction.

Side effects:

- Stores fee type/value, base amount, deduction, net amount, remark, withdrawal timestamp and user.
- Changes `COMPLETED -> EARLY_WITHDRAWN`.
- Queues status email.
- Voids outstanding stored `SCHEDULED` dividend schedules through `TrustApplicationDividendScheduleServiceAsync.CancelForEarlyWithdrawalAsync()`.
- Writes status/history.

Document handling:

- No verified automatic document generation specific to early withdrawal was found.

# 18. Daily Cutoff

Verified repository facts:

- `reference/scheme-2.1.sql` defines `tbl_TrustDailyCutoffLog` and `tbl_TrustDailyCutoffProcessLog`.
- `TrustCommissionSourceServiceAsync.cs` comments reference `USP_TrustCommission_DailyCutoff` and `USP_TrustCommission_ProcessOneOff`.
- No stored procedure bodies for the daily cutoff were found in `reference/scheme-2.1.sql`.
- No `JobServer` project and no Hangfire recurring job registration were found in the checked-in source.

The exact current execution sequence cannot be fully verified from this repository. Treat the following as Needs Verification, not implemented documentation:

```text
PROCESS 1
DIVIDEND_MARK_DUE
-> usp_TrustDividend_MarkDue

PROCESS 2
COMMISSION_DAILY_CUTOFF
-> USP_TrustCommission_DailyCutoff

PROCESS 3
AGENT_RANKING
-> USP_Trust_ProcessAllAgentRanking
```

Needs Verification:

- Master procedure name and parameters.
- Whether `@CutoffDate` is passed consistently to child procedures.
- Locking/app-lock behaviour.
- Master/process log updates and `PARTIAL_FAILED` semantics.
- Rerun/idempotency rules.
- Hangfire or SQL Agent trigger.
- Whether dividend due status is physically updated by a proc or remains derived in API code.

# 19. Hangfire / Background Jobs

No hosted Hangfire server or recurring job registration was found in this API project. Verified trigger helper:

- `Class/Helper/HangfireHelper.cs`
  - `TriggerInstantEmail(publicId)` posts to external `/api/jobtrigger/instant-email`.
  - `TriggerGenerateCertJob(...)` posts to external `/api/certjobtrigger/request-generate-cert`.

Verified callers:

- OTP and reset-password flows queue `tbl_EmailQueue` rows, save, then call `TriggerInstantEmail`.
- Trust Application notification service queues status email and the workflow/payment services trigger after transaction commit.
- Document generation code comments mention needing generated document `RowID` for Hangfire later, but no local generation job was verified.

Needs Verification:

- Job names, schedules, retries, and processors for email.
- Certificate/document generation job implementation.
- Database backup job, if any.
- Daily cutoff scheduling.

# 20. Email System

Email queue:

- Table: `tbl_EmailQueue`.
- Queue rows include fields such as recipient, subject/body/template data, status, retry count, public ID, reference type/ID, event code, and timestamps.
- Schema defaults `Status` and `RetryCount` to `0`.

Verified queue creation:

- `Class/Model/OneTimePassword.cs`: queues OTP email with reference type `OTP`, saves, then triggers external Hangfire.
- `Class/Model/ResetPasswordAsync.cs`: queues reset/change email flows, then triggers external Hangfire.
- `Class/Service/TrustApplication/Notification/TrustApplicationEmailNotificationServiceAsync.cs`: queues Trust Application status emails with reference type `TRUST_APPLICATION`, reference ID = application RowID, and event code = status.

Duplicate prevention:

- `TrustApplicationEmailNotificationServiceAsync.QueueStatusNotificationAsync()` checks existing `tbl_EmailQueue` rows by `ReferenceType`, `ReferenceID`, and `EventCode` before adding a new status notification.
- A database unique index for that exact triple was not found in `reference/scheme-2.1.sql`; the duplicate guard appears service-level only. Needs Verification if live DB adds an index.

Trust Application status notification events verified:

- `PAYMENT_APPROVED`
- `PENDING_ADMIN_APPROVAL`
- `SENT_OUT`
- `STAMPING`
- `COMPLETED`
- `EARLY_WITHDRAWN`
- `REJECTED`

Important rule:

```text
Business transaction
-> queue email
-> SaveChanges
-> Commit
-> trigger Hangfire
```

Do not send or trigger external email inside an uncommitted business transaction.

Needs Verification:

- Actual `EmailService`, SMTP/Resend implementation, retry policy, and scheduled email handling were not found in this repository.

# 21. Audit System

Request audit:

- `Class/ApiLoggingHandler.cs` logs `/api/` requests/responses into `tbl_ApiRequestLog`.
- It skips multipart request bodies and binary responses, masks sensitive JSON through `ApiLogMaskHelper`, and honors `[SkipApiLogging]`.
- It derives user/merchant from JWT where possible.
- Controller-set `AuditTitle` and `AuditDescription` become log metadata.
- Logging failures are swallowed so audit failures do not break API responses.

File upload audit:

- `FileUploadService` creates/updates `tbl_FileUploadAudit`.
- Records include module/upload type, original/stored paths, content type, file size, hash, scan status, and error state.

OpenAI request audit:

- `OpenAiRequestLogService.cs` writes `tbl_OpenAiRequestLog` rows for success/failure, usage, cost, duration, status, and error details.

APIs:

- `GET api/audit/request-list`
- `GET api/audit/file-upload-list`
- `GET api/audit/openai-request-list`

# 22. OpenAI Integration

OpenAI is used for Malaysian IC extraction from uploaded images.

Request flow:

- `TrustApplicationController.ExtractMalaysiaIc()` receives uploaded image.
- `OpenAiIcExtractionService.cs` validates type/size/magic bytes.
- Supported image types are JPEG/PNG and max size is 5 MB.
- Service builds an OpenAI Responses API request using configured API URL/model/key.
- Request uses `store = false`.
- Output is constrained through a strict JSON schema for Malaysian IC fields.
- Result confidence is normalized by service code.

Logging/cost:

- `OpenAiRequestLogService.cs` logs request/response metadata.
- `OpenAiUsageCostService.cs` calculates cost from `tbl_OpenAiModelPricing`.
- Logged fields include model, response ID, input/output token counts, image size/content type, duration, HTTP status, success flag, error message, and calculated pricing fields.

Security rule:

- Never put API keys, secrets, raw tokens, or production config values into `AGENTS.md`.

# 23. File Upload and Security

Upload flow:

- `FileUploadService.UploadAsync()` validates module/upload type/subfolder, creates audit row, scans temp file, computes SHA-256, moves file under configured upload root/date/GUID name, stores media URL/path, and marks complete or failed.
- Unsafe subfolders/path traversal are rejected.
- Failed uploads clean up temp/moved files where possible.

Security scanner:

- `Class/Security/FileSecurityScanner.cs` validates non-empty file, max size, extension, magic bytes, DOCX ZIP structure, SHA-256 hash, and optional Windows Defender scan (`MpCmdRun.exe`).
- Scanner fails closed if Defender is required but cannot confirm a clean scan.

Policies from `FileUploadPolicies.cs`:

- Avatar: image types, 10 MB.
- Resource: pdf/doc/docx/xls/xlsx/ppt/pptx/jpg/jpeg/png, 5 MB.
- Trust application supporting document: pdf/doc/docx/jpg/jpeg/png, 5 MB.
- Trust application payment slip: pdf/jpg/jpeg/png, 5 MB.
- Will document: pdf/doc/docx/jpg/jpeg/png, 30 MB.

Download security:

- Trust document downloads are permission-checked by `TrustApplicationDocumentServiceAsync` and role rows in `tbl_TrustDocumentRole`.
- Generic document download handling is in `Class/Service/DocumentDownload/DocumentDownloadServiceAsync.cs`.

Configuration:

- Upload root/media URL settings are read through app settings helpers. Do not document production paths/secrets beyond the existence of required settings.

# 24. SignalR

Verified:

- `Class/JwtHelper.cs` has `GenerateSignalRToken(long userId, string merchantId)`.
- SignalR token claims include `UserID`, `MerchantID`, and `TokenType = SignalR`.
- Expiry is short-lived.
- `AuthController.cs` returns `SignalRToken` in the login response.
- Frontend `authService.ts` stores `signalRToken`.

Needs Verification:

- No `Hub`, `MapSignalR`, `GlobalHost`, or SignalR server configuration was found in checked-in source.
- No verified client hub connection/event handling was found.
- IIS/WebSocket requirements and event names cannot be documented from this repository.

# 25. Authentication and Security

JWT:

- `JwtAuthorizeAttribute.cs` requires Bearer token unless an action has `[AllowAnonymous]`.
- It validates token signature/lifetime with `JwtHelper` and checks token existence through `AppTokenService.IsTokenValidAsync`.
- It stores `UserID`, `MerchantID`, and role into request properties/principal for controllers and services.
- Auth JWT expiry is 8 hours in code.

Login/logout:

- `AuthController.cs` exposes `api/auth/login`, `remember-login`, and `logout`.
- Login returns auth token, role/profile data, and SignalR token.

Password reset / OTP / TAC:

- `OneTimePassword.cs` generates 6-digit TAC/OTP, invalidates previous active TACs, enforces a 60-second resend guard, queues email, and triggers Hangfire.
- `ResetPasswordAsync.cs` queues password-reset/change email flows.
- A hardcoded OTP bypass value exists in `OneTimePassword.IsValidOTPAsync`; see Known Issues.

Cloudflare Turnstile:

- `CloudflareTurnstileService.cs` exists and frontend login/forgot-password flows include Turnstile token handling.

CORS:

- `App_Start/WebApiConfig.cs` enables CORS via ASP.NET Web API CORS packages.

Authorization:

- Use `[JwtAuthorize(Roles = "...")]` for coarse route protection.
- Preserve service-level role, ownership, and merchant checks; frontend permissions are not sufficient.

Merchant isolation:

- Most service queries include `MerchantID`.
- Be especially careful where a table lacks `MerchantID`; `TrustCommissionServiceAsync` filters batches through related commission rows because `tbl_TrustCommissionBatch` does not contain merchant ID.

Secrets:

- Do not copy API keys, JWT secrets, production URLs, passwords, or connection strings into this file.

# 26. Database Map

Auth/member/network:

- `tbl_MemberInfo`
- `tbl_MemberControl`
- `tbl_MemberInfo_Bank`
- `tbl_MemberInfo_KYC`
- `tbl_Login`
- `tbl_AppToken`
- `tbl_RememberMeToken`
- `tbl_TAC`
- `tbl_Reference`
- `tbl_MemberUnit_Trust`
- `tbl_MemberUnit_Will`
- `tbl_AgentRank`
- `tbl_AgentRankingHistory`

Trust Application:

- `tbl_TrustApplication`
- `tbl_TrustApplication_PersonalDetail`
- `tbl_TrustApplication_SourceOfFund`
- `tbl_TrustApplication_TrustAsset`
- `tbl_TrustApplication_Beneficiary`
- `tbl_TrustApplication_BeneficiaryAllocation`
- `tbl_TrustApplication_BeneficiaryAllocationDetail`
- `tbl_TrustApplication_MinorDistribution`
- `tbl_TrustApplication_TrustDeedExecution`
- `tbl_TrustApplication_CoBroker`
- `tbl_TrustApplication_SupportingDocument`
- `tbl_TrustApplication_StatusHistory`
- `tbl_TrustApplication_History`
- `tbl_TrustApplication_PlanSnapshot`
- `tbl_TrustApplication_ComplimentaryBenefit`

Trust Plan:

- `tbl_TrustPlan`
- `tbl_TrustCategories`
- `tbl_TrustPlanExecutionRank`
- `tbl_TrustPlanPaymentConfig`
- `tbl_TrustPlanFee`
- `tbl_TrustPlanWithdrawalConfig`
- `tbl_TrustPlanDividendConfig`
- `tbl_TrustPlanDividendInvestmentPeriodTier`
- `tbl_TrustPlanDividendInvestmentPeriodTierRate`
- `tbl_TrustPlanDividendPayout`
- `tbl_TrustPlanBonusConfig`
- `tbl_TrustPlanCommissionConfig`
- `tbl_TrustPlanCommissionOneOffTier`
- `tbl_TrustPlanCommissionRule`
- `tbl_TrustPlanBenefit`

Payment:

- `tbl_TrustApplication_Payment`
- `tbl_TrustApplication_PaymentDocument`
- `tbl_TrustReceiptRunningNo`

Documents:

- `tbl_TrustDocument`
- `tbl_TrustDocumentTemplate`
- `tbl_TrustDocumentRole`
- `tbl_TrustDocumentAllocationMapping`
- `tbl_TrustApplication_GeneratedDocument`
- `tbl_DocumentDownload`

Dividend:

- `tbl_TrustApplication_DividendSchedule`
- trust plan dividend tables listed above.

Commission:

- `tbl_TrustCommissionSource`
- `tbl_TrustCommissionBatch`
- `tbl_TrustCommission`
- `tbl_TrustCommissionCompressionLog`

Daily cutoff:

- `tbl_TrustDailyCutoffLog`
- `tbl_TrustDailyCutoffProcessLog`

Audit/OpenAI/upload/email:

- `tbl_ApiRequestLog`
- `tbl_FileUploadAudit`
- `tbl_OpenAiRequestLog`
- `tbl_OpenAiModelPricing`
- `tbl_EmailQueue`

# 27. Stored Procedure Map

| Stored Procedure | Purpose | Called By | Important Notes |
| --- | --- | --- | --- |
| `USP_AddAdminAccount` | Add admin account. | `Class/Model/AdministratorAsync.cs` | Body not in checked-in schema. |
| `USP_MemberRegister_Trust` | Trust member/agent registration. | `Class/Model/RegisterAsync.cs` | Body not in checked-in schema. |
| `USP_Trust_ManualAgentRanking` | Manual rank preview/update. | `Class/Model/AgentRankingAsync.cs` | Body not in checked-in schema. |
| `USP_TrustCommission_DailyCutoff` | Expected commission daily cutoff processing. | Commented in `TrustCommissionSourceServiceAsync.cs` | Body/caller not found in checked-in source. Needs Verification. |
| `USP_TrustCommission_ProcessOneOff` | Expected one-off commission source processing. | Commented in `TrustCommissionSourceServiceAsync.cs` | Body/caller not found in checked-in source. Needs Verification. |
| `USP_Trust_ProcessAllAgentRanking` | Requested daily ranking process. | Not found | Needs Verification. |
| `usp_TrustDividend_MarkDue` | Requested dividend due process. | Not found | API derives `DUE` status in code; procedure not found. Needs Verification. |

# 28. API Map

Authentication/account:

| Method | Route | Roles | Purpose | Service |
| --- | --- | --- | --- | --- |
| POST | `api/auth/login` | anonymous/action-level allowed | Login and return auth/session data. | `AuthController` |
| POST | `api/auth/remember-login` | anonymous/action-level allowed | Remember-me login. | `AuthController` |
| POST | `api/auth/logout` | JWT | Logout/invalidate token. | `AuthController` |
| GET/POST | `api/account/*` | JWT | Profile/password/bank/email/avatar. | `AccountController`, account model classes |

Trust Plan:

| Method | Route | Roles | Purpose | Service |
| --- | --- | --- | --- | --- |
| POST | `api/trust-plan/create-trust-plan` | `SA,AD` | Create Trust Plan. | `TrustPlanServiceAsync` |
| PUT | `api/trust-plan/{productCode}` | `SA,AD` | Update Trust Plan. | `TrustPlanServiceAsync` |
| GET | `api/trust-plan/get-trust-product-list` | `SA,AD` | List Trust Plans. | `TrustPlanServiceAsync` |
| GET | `api/trust-plan/get-trust-product-details/{productCode}` | `SA,AD` | Get Trust Plan detail. | `TrustPlanServiceAsync` |

Trust Application:

| Method | Route | Roles | Purpose | Service |
| --- | --- | --- | --- | --- |
| POST | `api/trust-application/step-1` ... `step-7` | JWT plus service checks | Save wizard steps. | Step services |
| POST | `api/trust-application/supporting-document` | JWT plus service checks | Upload supporting document. | Step 6 + `FileUploadService` |
| DELETE | `api/trust-application/supporting-document/{supportingDocumentId}` | JWT plus service checks | Remove supporting document. | Step 6 |
| GET | `api/trust-application/{trustId}/review` | JWT plus service checks | Review before submit. | query/submit services |
| POST | `api/trust-application/submit` | `AG` by service | Submit draft to payment approval. | `TrustApplicationSubmitServiceAsync` |
| GET | `api/trust-application/{trustId}` | JWT plus service checks | Application detail. | `TrustApplicationQueryServiceAsync` |
| GET | `api/trust-application/list` | JWT plus service checks | Application listing. | `TrustApplicationListServiceAsync` |
| GET | `api/trust-application/{trustId}/history` | JWT plus service checks | Application history. | `TrustApplicationHistoryServiceAsync` |
| GET | `api/trust-application/{trustId}/documents` | JWT plus service checks | Application documents. | `TrustApplicationDocumentServiceAsync` |
| POST | `api/trust-application/{trustId}/submit-admin-approval` | `SA,AD,AC` | Move to admin approval. | `TrustApplicationWorkflowServiceAsync` |
| POST | `api/trust-application/{trustId}/admin-approve` | `SA,AD` | Admin approve/send out. | `TrustApplicationWorkflowServiceAsync` |
| POST | `api/trust-application/{trustId}/submit-stamping` | `SA,AD,OP` | Move to stamping. | `TrustApplicationWorkflowServiceAsync` |
| POST | `api/trust-application/{trustId}/complete` | `SA,AD,OP` | Complete application. | `TrustApplicationWorkflowServiceAsync` |
| POST | `api/trust-application/{trustId}/reject` | `SA,AD,OP,AC` | Reject application. | `TrustApplicationWorkflowServiceAsync` |
| POST | `api/trust-application/{trustId}/early-withdraw` | route `SA,AD,OP`; service `SA,AD` | Early withdrawal. | `TrustApplicationWorkflowServiceAsync` |
| POST | `api/trust-application/{trustId}/plan-snapshot/refresh` | JWT plus service checks | Refresh snapshot. | `TrustApplicationPlanSnapshotRefreshServiceAsync` |
| POST | `api/trust-application/extract-malaysia-ic` | JWT | OpenAI IC extraction. | `OpenAiIcExtractionService` |
| POST | `api/trust-application/ocr-extract-text` | JWT | OCR text extraction. | Tesseract OCR path |

Payment:

| Method | Route | Roles | Purpose | Service |
| --- | --- | --- | --- | --- |
| GET | `api/trust-payment/{trustId}/payment` | JWT plus service checks | Payment detail. | `TrustApplicationPaymentServiceAsync` |
| POST | `api/trust-payment/{trustId}/payment/allocation/initialize` | JWT plus service checks | Initialize allocation. | `TrustApplicationPaymentServiceAsync` |
| POST | `api/trust-payment/{trustId}/payment/allocation` | JWT plus service checks | Save allocation. | `TrustApplicationPaymentServiceAsync` |
| POST | `api/trust-payment/{trustId}/payment/{paymentId}/slip` | JWT plus service checks | Upload slip. | `TrustApplicationPaymentServiceAsync` |
| DELETE | `api/trust-payment/{trustId}/payment/{paymentId}/delete` | JWT plus service checks | Cancel allocation. | `TrustApplicationPaymentServiceAsync` |
| POST | `api/trust-payment/{trustId}/payment/{paymentId}/approve` | `SA,AD,AC` | Approve payment. | `TrustApplicationPaymentServiceAsync` |
| POST | `api/trust-payment/{trustId}/payment/{paymentId}/reject` | `SA,AD,AC` | Reject payment. | `TrustApplicationPaymentServiceAsync` |

Dividend and commission:

| Method | Route | Roles | Purpose | Service |
| --- | --- | --- | --- | --- |
| GET | `api/trust-dividend` | JWT; service allows `SA,AD,AC,AG` | List dividends. | `TrustDividendFinanceServiceAsync` |
| GET | `api/trust-dividend/{dividendScheduleId}` | JWT; service checks | Dividend detail. | `TrustDividendFinanceServiceAsync` |
| POST | `api/trust-dividend/{dividendScheduleId}/status` | service allows `SA,AD,AC` | Mark due dividend paid/cancelled. | `TrustDividendFinanceServiceAsync` |
| GET | `api/trust-commission/batch/list` | JWT; service checks | Commission batches. | `TrustCommissionServiceAsync` |
| GET | `api/trust-commission/list` | JWT; service checks | Commission list. | `TrustCommissionServiceAsync` |
| GET | `api/trust-commission/{commissionId}` | JWT; service checks | Commission detail. | `TrustCommissionServiceAsync` |
| POST | `api/trust-commission/{commissionId}/status` | service allows `SA,AD,AC` | Mark commission paid/cancelled. | `TrustCommissionServiceAsync` |

Agent/audit:

| Method | Route | Roles | Purpose | Service |
| --- | --- | --- | --- | --- |
| POST | `api/agent-management/manual-ranking-preview` | JWT | Preview manual rank change. | `AgentRankingAsync` |
| POST | `api/agent-management/manual-ranking-update` | JWT | Apply manual rank change. | `AgentRankingAsync` |
| GET | `api/audit/request-list` | JWT | Request audit list. | Audit model/controller |
| GET | `api/audit/file-upload-list` | JWT | Upload audit list. | Audit model/controller |
| GET | `api/audit/openai-request-list` | JWT | OpenAI request audit list. | Audit model/controller |

# 29. Side Effects Map

- Step 1 creates a new Trust Application -> assigns merchant-scoped `TrustID` -> stores network snapshot -> writes initial status history.
- Final submit -> validates persisted step records -> sets submitted fields -> changes `DRAFT` to `PENDING_PAYMENT_APPROVAL`.
- Payment slip upload -> creates upload audit/file record -> moves payment to `PENDING_APPROVAL` -> writes payment history.
- Payment fully approved -> payment becomes `PAYMENT_APPROVED` -> application becomes `PAYMENT_APPROVED` -> commencement/maturity dates set -> status email queued -> receipt/automatic documents created -> history written -> Hangfire triggered after commit.
- Submit admin approval -> application becomes `PENDING_ADMIN_APPROVAL` -> status email queued -> stage documents created.
- Admin approve -> application becomes `SENT_OUT` -> status email queued.
- Submit stamping -> application becomes `STAMPING` -> status email queued.
- Complete -> application becomes `COMPLETED` -> completed fields set -> plan snapshot created/reused -> completed-stage documents created -> dividend schedule generated -> complimentary benefit synced -> commission source registered -> status email queued -> Hangfire triggered after commit.
- Early withdrawal -> withdrawal amounts stored -> application becomes `EARLY_WITHDRAWN` -> outstanding `SCHEDULED` dividends become `VOIDED` -> email queued -> Hangfire triggered after commit.
- Dividend status update -> due bank-transfer schedule becomes `PAID` or `CANCELLED` -> dividend history row added.
- Commission status update -> `CALCULATED` commission becomes `PAID` or `CANCELLED`.
- OpenAI IC extraction -> request sent to OpenAI -> result normalized -> request/usage/cost logged regardless of success/failure path.

# 30. Transaction Boundaries

Important atomic operations:

- Trust Application workflow transitions in `TrustApplicationWorkflowServiceAsync`.
- Payment approval/rejection/cancellation in `TrustApplicationPaymentServiceAsync`.
- Completion side effects: status, snapshot, documents, dividend schedules, benefit sync, commission source, email queue.
- Early withdrawal: withdrawal fields, status, dividend voiding, email queue.
- Dividend status processing in `TrustDividendFinanceServiceAsync`.
- Commission status update in `TrustCommissionServiceAsync`.

Patterns to preserve:

- Open EF context.
- Begin DB transaction for multi-table workflow.
- Validate status/role/ownership inside transaction where stale state matters.
- Add status/history/email queue rows inside transaction.
- `SaveChangesAsync()`.
- Commit.
- Trigger external Hangfire/email after commit only.

External operations that should not happen before commit:

- Hangfire email trigger.
- Any actual email send.
- OpenAI calls should remain logged carefully; do not place slow external calls inside unrelated business transactions.
- File move/scanning has its own upload flow and failure handling; do not mix it into long business transactions without cleanup.

Rollback implication:

- If a transaction rolls back, queued emails/history/status rows should roll back too. If Hangfire were triggered before commit, it could process non-existent or rolled-back queue rows, so preserve after-commit triggering.

# 31. Business Rules That Must Not Be Broken

- Source code is authoritative over this file.
- Merchant isolation must be preserved in every query/write.
- Frontend role permissions are not authorization; backend role and ownership checks must remain.
- Agents can create/submit only their own Trust Applications.
- Application status transitions must go through `TrustApplicationStatusHelper` or equivalent history-preserving logic.
- Completed application calculations should use `tbl_TrustApplication_PlanSnapshot`, not silently use modified current plan configuration.
- Full payment approval is the only verified path that sets commencement/maturity dates and changes application to `PAYMENT_APPROVED`.
- Payment allocation totals must count only active `WAITING_PAYMENT`, `PENDING_APPROVAL`, and `PAYMENT_APPROVED` rows.
- Dividend generation is one-time per application and uses the frozen snapshot.
- `DUE` dividend status is derived in API code from stored `SCHEDULED` plus payout date.
- Early withdrawal is only for completed applications before maturity and must void outstanding scheduled dividends.
- Completion registers commission source only; actual payout calculation is deferred to missing batch/SP processing.
- Commission records can move only `CALCULATED -> PAID` or `CALCULATED -> CANCELLED`.
- Trust document access depends on `tbl_TrustDocumentRole`; do not expose files directly.
- Uploads must use `FileUploadService`/policies/scanner/audit.
- OpenAI extraction must validate files and log request/cost/error data.
- Email queue creation belongs inside the business transaction; external trigger belongs after commit.

# 32. Common Development Tasks

- Add Trust Application field: inspect DTOs under `Class/Model/DTO/TrustApplication/`, relevant Step service, `TrustApplicationQueryServiceAsync`, EF entity/schema, frontend form/page, API client, documents/placeholders if displayed.
- Add new application status: update `TrustApplicationStatusHelper`, workflow service, query status flow, dashboards/list filters, email notification content, document stage config, frontend status labels/filters, and migration/schema if constrained.
- Add status transition: define allowed transition, route/role, service method, status/history rows, email/doc/dividend/commission side effects, transaction boundary, frontend actions.
- Add Trust document: add `tbl_TrustDocument`/template/role/allocation mapping rows, generator class if needed, resolver registration, placeholders, file templates, document stage rules, and download permissions.
- Add placeholder: update relevant generator model mapping and `DocxPlaceholderHelper`/`XlsxPlaceholderHelper` usage; verify template placeholder spelling.
- Change payment rules: inspect `TrustApplicationPaymentServiceAsync`, Step 2 service, trust plan payment/fee config, payment frontend, receipt generation, and finance dashboards.
- Change dividend rules: inspect trust plan validator, dividend provider interface, `InvestmentPeriodTierRateDividendProvider`, schedule service, finance service, dashboards, and schema constraints.
- Change commission rules: inspect trust plan commission config/tier/rule models, `TrustCommissionSourceServiceAsync`, missing stored procedures, commission service, and schema. Do not assume SP behaviour.
- Change ranking rules: inspect `AgentRankingAsync`, `NetworkTreeAsync`, `tbl_AgentRank`, `tbl_AgentRankingHistory`, and live stored procedures. Checked-in code is insufficient for full algorithm changes.
- Add email notification: add template/content, queue through existing email notification/queue pattern, include duplicate key strategy, trigger after commit.
- Add audit API: follow `AuditController` pattern, set audit metadata, add frontend API/page if needed.
- Add Hangfire job: locate/create actual JobServer first; API project currently only triggers external endpoints.
- Add daily cutoff process: verify master stored procedure/job server implementation outside this repo before documenting or modifying.

# 33. Testing Checklist

Trust Application:

- Create draft as `AG`.
- Save Steps 1-7 with valid and invalid data.
- Verify Step 8 blocks missing required persisted data.
- Verify agent cannot edit/view another agent's application.
- Verify internal roles can perform only allowed workflow actions.

Payment:

- Allocate partial/full payments.
- Upload valid/invalid slips.
- Reject and re-upload.
- Approve partial payment without status change.
- Approve full payment and verify commencement/maturity/status/email/document side effects.

Documents:

- Verify document list permissions by role.
- Generate on-demand document.
- Verify allocation type changes sync correct Letter of Wishes.
- Verify LibreOffice PDF conversion on deployed host.

Dividend:

- Complete application and verify schedule count/amounts.
- Test start-date options and payout frequencies.
- Verify bank-transfer due item can become paid/cancelled.
- Verify redeposit item cannot be manually processed.
- Verify early withdrawal voids only outstanding scheduled rows.

Commission:

- Complete eligible application and verify one `tbl_TrustCommissionSource`.
- Verify duplicate completion does not duplicate source.
- Verify AG commission listing is restricted to selling/recipient records.
- Verify `CALCULATED -> PAID/CANCELLED` only.

Ranking:

- Run manual ranking preview and update in a safe environment.
- Verify `tbl_AgentRankingHistory`.
- Verify network display rank uses max of ranking/advance ranking.

Early withdrawal:

- Try before maturity, at maturity, and after maturity.
- Verify fee calculation for percentage and fixed.
- Verify dividend voiding and status/history/email.

Daily cutoff:

- Needs external JobServer/SP verification; this repository is insufficient for full regression.

Email:

- Verify queue row created inside transaction.
- Verify external trigger only after commit.
- Verify duplicate prevention by reference/event.

Authentication:

- Login/logout/remember login.
- Token expiry/invalid token.
- Role-restricted endpoints.
- Merchant isolation.
- Turnstile-required flows.

File upload:

- Valid files per module.
- Invalid extension/magic bytes.
- Oversized file.
- Antivirus unavailable/failure path if enabled.
- Audit row success/failure cleanup.

# 34. Deployment Checklist

API:

- Build/deploy `API_theTrust.csproj` output/DLLs to IIS.
- Preserve/update `Web.config` transforms/settings without committing secrets.
- Verify connection strings, JWT settings, CORS, upload root/media URLs, OpenAI settings, Turnstile settings, Hangfire base URL, network base usernames.
- Verify `tessdata` and any native dependencies required by OCR.

Frontend:

- Use `npm run build`, `npm run build:staging`, or `npm run build:production` as appropriate.
- Deploy Vite `dist/`.
- Verify environment variables/API base URL.
- Smoke test protected routes and role navigation.

JobServer/Hangfire:

- Verify external job server deployment separately; no local JobServer project was found here.
- Confirm instant-email and certificate/document job trigger endpoints.
- Confirm retry policies and logs outside this repo.

Database:

- Apply schema migrations/table changes.
- Deploy stored procedure changes from the authoritative DB project/source, not from `reference/scheme-2.1.sql` alone.
- Verify EF model/schema compatibility if entities are regenerated.
- Deploy email templates and document templates.
- Verify receipt running number tables and trust document master/config rows.

Document conversion:

- Install/configure LibreOffice at the path expected by `LibreOfficePdfConverter.cs` or update configuration/code deliberately.
- Verify temp profile permissions for LibreOffice conversion.

Security:

- Do not deploy with development secrets.
- Verify upload root permissions and antivirus scanner availability.
- Verify CORS origins and HTTPS.

# 35. Known Issues / Technical Debt

| Issue | Impact | Relevant file | Suggested investigation |
| --- | --- | --- | --- |
| `RejectAsync` uses `REJECTED`, but allowed transition map lacks `REJECTED`. | Reject may fail or bypass intended status rules. | `TrustApplicationWorkflowServiceAsync.cs`, `TrustApplicationStatusHelper.cs` | Test reject path and update transition design if needed. |
| `MATURED` appears in queries/dashboards/documents but no maturation process was found. | Maturity status may depend on missing jobs/SPs. | Dashboard/query/document services | Locate live daily cutoff/job/SP. |
| Daily cutoff SP/job server missing from repo. | Cannot safely modify cutoff/ranking/dividend mark-due flow from this repo alone. | `scheme-2.1.sql`, `TrustCommissionSourceServiceAsync.cs` | Locate authoritative DB/job source. |
| Commission calculation logic missing. | Personal/overriding/compression/co-broker formulas cannot be verified. | Commission source/service files; missing SPs | Inspect live stored procedures. |
| SignalR token exists but no hub/server found. | Realtime feature may be incomplete or external. | `JwtHelper.cs`, `AuthController.cs`, frontend auth service | Locate realtime project or remove stale token handling only with product approval. |
| OTP bypass value exists. | Security risk if enabled in production. | `Class/Model/OneTimePassword.cs` | Confirm environment guard/removal strategy. |
| Auth JWT secret appears hardcoded in source. | Security/configuration risk. | `Class/JwtHelper.cs` | Move to secure configuration and rotate if needed. Do not copy secret here. |
| Dividend `DUE` filter may conflict with derived status design. | List filtering by due status may miss records if it queries stored `DUE`. | `TrustDividendFinanceServiceAsync.cs` | Test `DUE` filter and align query with derived status. |
| Complimentary benefit sync reads current plan tables. | Historical completed applications may drift if benefits change. | `TrustApplicationComplimentaryBenefitServiceAsync.cs` | Verify intended snapshot behaviour. |
| LibreOffice path is hardcoded. | Deployment fragility across hosts. | `LibreOfficePdfConverter.cs` | Move path to config or validate server image. |

# 36. Needs Verification

- Daily cutoff master procedure, execution sequence, parameters, app locks, log semantics, rerun behaviour, and trigger mechanism.
- `usp_TrustDividend_MarkDue`: not found; API currently derives due status.
- `USP_Trust_ProcessAllAgentRanking`: not found; no safe algorithm details available.
- `USP_TrustCommission_DailyCutoff` and `USP_TrustCommission_ProcessOneOff`: referenced only in comments; bodies missing.
- `USP_Trust_ManualAgentRanking` internals.
- `USP_MemberRegister_Trust` internals.
- Commission formulas, overriding/upline traversal, compression, rank timing, and co-broker impact.
- Agent ranking requirements, annual downgrade/review, maximum passes.
- Actual JobServer/Hangfire schedules and retry policies.
- Actual email sender provider (SMTP/Resend/etc.) and retry handling.
- SignalR hubs/events/client usage.
- Whether live DB has unique email-queue indexes beyond the checked-in schema.
- Intended behaviour for `REJECTED` transition.
- Intended process for `MATURED` status.
- Historical complimentary benefit snapshot rules.

# 37. Change Log for AI Context

## 2026-10-05

- Created `AGENTS.md` from current repository source, backend reference source, and `reference/scheme-2.1.sql`.
- Reason: future Codex sessions need a technical working guide that preserves verified business rules, side effects, transaction patterns, and known gaps.
- Affected modules: frontend, ASP.NET Web API reference, Trust Application, Trust Plan, Payment, Documents, Dividend, Commission, Agent Network/Ranking, Email, Audit, OpenAI, File Upload, Hangfire/Daily Cutoff.
- Compatibility considerations: source code remains authoritative; multiple critical daily cutoff/commission/ranking behaviours require live stored procedure or JobServer verification before modification.

# 38. Instructions for Future Codex Sessions

Before modifying this project:

1. Read this `AGENTS.md`.
2. Inspect the actual files involved in the requested change.
3. Treat `AGENTS.md` as guidance, not as a replacement for source code.
4. If `AGENTS.md` conflicts with source code, source code is authoritative.
5. Follow existing architecture and naming conventions.
6. Reuse existing helpers/services instead of duplicating logic.
7. Check all side effects before changing a status/workflow.
8. Check database schema before writing EF queries.
9. Check transaction boundaries before adding external operations.
10. Do not modify unrelated functionality.
11. After implementation, run relevant tests/builds.
12. Update `AGENTS.md` if the change alters architecture, business rules, workflows, APIs, database structures, background processing, deployment, or other information future developers need.
