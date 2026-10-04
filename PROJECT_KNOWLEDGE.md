# Project Overview

This repository contains a React/TypeScript frontend for a trust fund management system plus a referenced ASP.NET Web API backend and SQL schema under `reference/`. The frontend in `src/` implements the application shell, role-aware navigation, trust application wizard, trust plan UI, payment/dividend/commission screens, audit views, and API clients. The backend reference in `reference/api-202609211030_src/api/` implements Web API controllers, Entity Framework entities, service-layer business rules, document generation, uploads, OpenAI OCR logging, email queueing, and trust application workflows. The schema file `reference/scheme-2.1.sql` defines the important trust, commission, dividend, audit, email, upload, member, rank, and lookup tables.

# Technology Stack

- Frontend: React 18, TypeScript, Vite, React Router, Tailwind CSS, lucide-react, React Hook Form, Zod, Recharts, axios, Tesseract/OpenCV support. See `package.json`, `src/App.tsx`, `src/routes/AppRoutes.tsx`, and `src/api/apiClient.ts`.
- Backend reference: ASP.NET Web API on .NET Framework, Entity Framework EDMX (`Context/database.edmx`, `Context/database.Context.cs`), attribute routing, Newtonsoft.Json, JWT auth, Swagger, Tesseract OCR, OpenAI Responses API integration, DOCX/XLSX/PDF document helpers, and Hangfire job-trigger HTTP calls.
- Database: SQL Server schema in `reference/scheme-2.1.sql`.

# Solution Structure

- `src/api/`: frontend API wrappers grouped by module, such as `trustApplicationApi.ts`, `trustPlanApi.ts`, `trustDividendApi.ts`, `trustCommissionApi.ts`, `auditApi.ts`, and `authApi.ts`.
- `src/pages/`: routed frontend pages for dashboard, trust listing/application/payment/dividend, trust plan management, commission, network, resources, audit, profile, administrators, and agents.
- `src/config/roles.ts`, `src/config/permissions.ts`, `src/config/navigation.ts`: frontend role names, permission keys, and navigation visibility.
- `src/routes/ProtectedRoute.tsx`, `src/context/AuthContext.tsx`, `src/services/authService.ts`: frontend session protection and auth state.
- `reference/api-202609211030_src/api/API/Controller/v1/`: ASP.NET Web API controllers.
- `reference/api-202609211030_src/api/Class/Service/TrustApplication/`: trust application step services, workflow, payment, documents, dividend, commission-source registration, complimentary benefit sync, snapshots, history, notification, and query services.
- `reference/api-202609211030_src/api/Class/Model/TrustPlan/TrustPlanServiceAsync.cs` and `Class/Service/TrustPlan/TrustPlanValidator.cs`: trust plan persistence and validation.
- `reference/api-202609211030_src/api/Context/`: generated EF entities for database tables.
- `reference/scheme-2.1.sql`: checked-in SQL Server schema, including constraints/defaults/FKs. Stored procedure bodies were not found in this file.

# Roles and Permissions

Frontend role labels are defined in `src/config/roles.ts`:

- `SA`: Super Administrator.
- `AD`: Administrator.
- `OP`: Operation.
- `AC`: Account.
- `AG`: Agent.

Frontend permissions are listed in `src/config/permissions.ts`. `SA` and `AD` receive all frontend permissions. `OP` can access dashboard, agents, trust listing/payment/payment allocations, network, resources, and request log. `AC` can access dashboard, agents, trust listing/dividend/payment/payment allocations, network, income, resources, and request log. `AG` can access dashboard, trust listing/dividend/draft listing, my network, income, resources, and request log.

Backend service access rules are implemented per service, not by a single global role matrix. Examples: `TrustApplicationWorkflowServiceAsync` allows payment-to-admin submission to `AC`, `SA`, `AD`; admin approval and early withdrawal to `SA`/`AD`; stamping and completion to `OP`, `SA`, `AD`. `TrustDividendFinanceServiceAsync` allows dividend viewing to `SA`, `AD`, `AC`, `AG` with AG restricted to own applications, and dividend processing to `SA`, `AD`, `AC`. `TrustCommissionServiceAsync` allows commission viewing to `SA`, `AD`, `AC`, `AG`, with AG restricted to selling/recipient records, and status updates to `SA`, `AD`, `AC`.

# Trust Application

## Application Flow

The trust application wizard is implemented in backend step services and the frontend `src/pages/TrustApplicationPage.tsx`.

- Step 1 personal details, source of funds, product, and selected submission network are saved by `Class/Service/TrustApplication/Step1/TrustApplicationStep1ServiceAsync.cs`. New applications can only be created by `AG`; they start as `DRAFT`, receive a merchant-scoped sequential `TrustID`, and snapshot `ReferenceID`, `NetworkType`, and `ReferralCode`.
- Steps 2-5 persist trust assets/payment source, beneficiaries, beneficiary allocations, and deed execution through the matching `Step2`-`Step5` services.
- Step 6 supporting documents are optional and handled by `Step6/TrustApplicationSupportingDocumentServiceAsync.cs` and upload security.
- Step 7 co-broker is optional in backend (`Step7/TrustApplicationStep7ServiceAsync.cs`). Frontend notes in `docs/TRUST_APPLICATION_WORKFLOW.md` state the UI currently skips the co-broker screen and sends users from supporting documents to review.
- Final submit is handled by `Step8/TrustApplicationSubmitServiceAsync.cs`; only `AG` can submit, and the service revalidates persisted step data before changing `DRAFT` to `PENDING_PAYMENT_APPROVAL`.

## Status Flow

Canonical status transitions are centralized in `Class/Model/TrustApplication/TrustApplicationStatusHelper.cs`:

- `DRAFT` -> `PENDING_PAYMENT_APPROVAL`
- `PENDING_PAYMENT_APPROVAL` -> `PAYMENT_APPROVED`
- `PAYMENT_APPROVED` -> `PENDING_ADMIN_APPROVAL`
- `PENDING_ADMIN_APPROVAL` -> `SENT_OUT`
- `SENT_OUT` -> `STAMPING`
- `STAMPING` -> `COMPLETED`
- `COMPLETED` -> `EARLY_WITHDRAWN`

The workflow service contains `RejectAsync`, but `TrustApplicationStatusHelper` does not include `REJECTED` in the allowed transition dictionary. This looks conflicting and is marked Needs Verification.

## Step Flow

`TrustApplicationSubmitServiceAsync` requires persisted Step 1-5 records and `LastCompletedStep >= 6` before submission. It treats Step 6 supporting documents and Step 7 co-broker as optional, but the user must have progressed through them. Allocation types 1-7 are validated in the submit service with rules for main/substitute beneficiaries, trustee company allocation, no duplicate beneficiary selections, and percentage totals where applicable.

## Access Rules

- Agents can create and submit only their own trust applications (`Step1Service`, `SubmitService`).
- Internal users can update applications through `TrustApplicationCommonService` rules; specific status actions are role-gated in `TrustApplicationWorkflowServiceAsync`.
- Network selection is locked once the application reaches `COMPLETED`, `EARLY_WITHDRAWN`, or `MATURED` (`Step1ServiceAsync.IsNetworkLocked`).
- Agents are restricted to their own payments/documents/dividends/commission rows where service code implements AG access checks.

## Important Tables

- `tbl_TrustApplication`: root application record; holds `TrustID`, `ApplicationStatus`, current/last step, product, member, network snapshot, commencement/maturity/completion/rejection/early withdrawal fields.
- `tbl_TrustApplication_PersonalDetail`, `SourceOfFund`, `TrustAsset`, `Beneficiary`, `BeneficiaryAllocation`, `BeneficiaryAllocationDetail`, `TrustDeedExecution`, `CoBroker`, `SupportingDocument`, `Payment`, `PaymentDocument`, `GeneratedDocument`, `DividendSchedule`, `PlanSnapshot`, `StatusHistory`, `History`, `ComplimentaryBenefit`.

## Important APIs

- `api/trust-application/step-1` through `step-7`, `api/trust-application/submit`, `api/trust-application/{trustId}/review`, `api/trust-application/{trustId}` and `api/trust-application/list` in `API/Controller/v1/TrustApplicationController.cs`.
- Workflow endpoints: `{trustId}/submit-admin-approval`, `{trustId}/admin-approve`, `{trustId}/submit-stamping`, `{trustId}/complete`, `{trustId}/reject`, `{trustId}/early-withdraw`.
- OCR endpoints: `extract-malaysia-ic` and `ocr-extract-text`.

# Trust Plan

## Configuration

Trust plans are managed by `TrustPlanController.cs`, `TrustPlanServiceAsync.cs`, and `TrustPlanValidator.cs`. The plan is composed of nine steps:

1. Basic information: product code/name, category, min/max placement, fund management period/unit, status, execution ranks.
2. Payment and fees.
3. Tenure and early withdrawal.
4. Dividend/return configuration.
5. Dividend payout.
6. Bonus configuration.
7. Commission configuration.
8. Commission rules.
9. Complimentary benefits.

Only `INVESTMENT_PERIOD_TIER_RATE` is currently accepted for dividend/return and only `ONE_OFF_COMMISSION` is currently accepted for commission. Product statuses are validated against the allowed status list in `TrustPlanValidator.cs`. Updates remove and recreate child configuration rows for the trust plan.

## Snapshot Behaviour

`TrustApplicationPlanSnapshotServiceAsync.cs` creates a frozen JSON snapshot when an application is completed. It serializes the current `TrustPlanDetailsResponse`, stores SHA-256 in `tbl_TrustApplication_PlanSnapshot`, and uses that snapshot for dividend schedule generation and commission-source registration. Future plan changes should not affect completed applications. A refresh service/API exists for completed applications (`TrustApplicationPlanSnapshotRefreshServiceAsync.cs`, `TrustApplicationController.RefreshTrustPlanSnapshot`), but its business use should be verified before use because it intentionally overwrites the frozen snapshot with current plan configuration.

# Payment

## Allocation

`TrustApplicationPaymentServiceAsync.cs` handles payment allocation. Active allocation statuses counted against placement are `WAITING_PAYMENT`, `PENDING_APPROVAL`, and `PAYMENT_APPROVED`. Agents can create/save allocations only for their own application while it is pending payment approval. Save allocation replaces active `WAITING_PAYMENT` allocations but preserves submitted/approved allocations. Payment amounts must not exceed the trust asset placement amount.

## Payment Approval

Payment slip upload changes `WAITING_PAYMENT` or `REJECTED` to `PENDING_APPROVAL`. Finance/admin can approve or reject `PENDING_APPROVAL` payments. When the total approved amount reaches the placement amount, the application transitions from `PENDING_PAYMENT_APPROVAL` to `PAYMENT_APPROVED`, commencement and maturity dates are set, a payment-approved email is queued, and receipt documents are created. Maturity is calculated from commencement plus fund management period in `YEARS` or `MONTHS`.

## Receipt

Receipt/document creation is triggered via `TrustApplicationDocumentServiceAsync.CreateAutomaticDocumentsAsync` at `PAYMENT_APPROVED`. Receipt numbering is handled by `Document/TrustReceiptNumberService.cs`, which uses SQL commands against receipt running number tables.

## Important APIs

- `GET api/trust-payment/{trustId}/payment`
- `POST api/trust-payment/{trustId}/payment/allocation/initialize`
- `POST api/trust-payment/{trustId}/payment/allocation`
- `POST api/trust-payment/{trustId}/payment/{paymentId}/slip`
- `DELETE api/trust-payment/{trustId}/payment/{paymentId}/delete`
- `POST api/trust-payment/{trustId}/payment/{paymentId}/approve`
- `POST api/trust-payment/{trustId}/payment/{paymentId}/reject`

# Documents

## Document Types

Document master/config tables are `tbl_TrustDocument`, `tbl_TrustDocumentTemplate`, `tbl_TrustDocumentRole`, and `tbl_TrustDocumentAllocationMapping`. Generators exist for booking form, courier letter, fund management confirmation, introduction form, KYC form, letter of engagement, letter of wishes types 1-7, official receipt, and trust deed under `Class/Service/TrustApplication/Document/Generator/`.

## Generation Timing

`TrustApplicationDocumentServiceAsync.CreateAutomaticDocumentsAsync` selects active document records by `AvailableStage`, allocation mapping, and current effective template. It prevents duplicate active generation records. Workflow code triggers automatic document records at `PAYMENT_APPROVED`, `PENDING_ADMIN_APPROVAL`, and `COMPLETED`.

## Templates

Templates are selected from `tbl_TrustDocumentTemplate` where active and effective date range contains now. Document placeholder helpers live under `Class/Helper/Document/`.

## Important Services

- `TrustApplicationDocumentServiceAsync.cs`: creates generation records, lists role-permitted documents, performs on-demand generation, and syncs letter-of-wishes documents when allocation type changes.
- `TrustDocumentGeneratorResolver.cs`: maps document codes to generator classes.
- `DocumentDownloadServiceAsync.cs`: serves document-download module files.

# Dividend

## Calculation

Dividend schedules are generated only after completion by `TrustApplicationDividendScheduleServiceAsync.cs` using the frozen plan snapshot. The current provider is `InvestmentPeriodTierRateDividendProvider.cs`. It requires fund management period unit `YEARS`, selects the tier matching trust asset amount, supports monthly/quarterly/half-yearly/yearly payout, and supports calculation start from commencement date, payment approval, or completed date.

For `TRANSFER_TO_BANK`, annual dividends are calculated on the original basis and distributed across periods with the final period absorbing rounding remainder. For `REDEPOSIT_AS_TRUST_ASSET`, each period's return is redeposited and increases the calculation basis for subsequent periods.

## Schedule

Generated records are stored in `tbl_TrustApplication_DividendSchedule` with schedule number, return year, period number, period dates, payout date, rates, base/bonus/total amounts, payout/redeposit amounts, return option, and status `SCHEDULED`.

## Status Flow

`TrustDividendFinanceServiceAsync.cs` treats `DUE` as a derived/effective status: stored `SCHEDULED` with `PayoutDate <= today` is shown as `DUE`. Finance/admin can update only due bank-transfer dividends to `PAID` or `CANCELLED`; redeposit dividends cannot be manually processed. Early withdrawal voids outstanding stored `SCHEDULED` schedules as `VOIDED`; `PAID` and `CANCELLED` remain unchanged.

## Important Tables / Services

- Tables: `tbl_TrustApplication_DividendSchedule`, `tbl_TrustPlanDividendConfig`, `tbl_TrustPlanDividendInvestmentPeriodTier`, `tbl_TrustPlanDividendInvestmentPeriodTierRate`, `tbl_TrustPlanDividendPayout`.
- Services: `TrustApplicationDividendScheduleServiceAsync.cs`, `InvestmentPeriodTierRateDividendProvider.cs`, `TrustDividendFinanceServiceAsync.cs`.
- APIs: `GET api/trust-dividend`, `GET api/trust-dividend/{dividendScheduleId}`, `POST api/trust-dividend/{dividendScheduleId}/status`.

# Commission

## Personal Commission

Completed applications with enabled commission configuration are registered by `TrustCommissionSourceServiceAsync.cs` into `tbl_TrustCommissionSource`. The source freezes selling member, selected network, referral code, placement amount, plan snapshot ID, commission method, calculation basis, rank determination, and completion date. It does not calculate recipients, rates, amounts, or overriding.

## Overriding Commission

The trust plan validator allows one-off commission tiers with `CommissionType` of `PERSONAL` or `OVERRIDING`, rank code, and rate. The actual overriding calculation is expected to be in stored procedures referenced by comments, not in checked-in C#.

## Co-Broker

`tbl_TrustApplication_CoBroker` and Step 7 service/model files exist. The frontend currently hides/skips the co-broker step per `docs/TRUST_APPLICATION_WORKFLOW.md`. Business impact of co-broker on commission calculation was not verifiable from checked-in stored procedure bodies.

## Compression

The schema defines `tbl_TrustCommissionCompressionLog` and commission fields `IsCompressed` and `CompressedLevels`. `tbl_TrustPlanCommissionRule` has default `OverridingCompression = 'COMPRESS_UP'`. Actual compression algorithm is not present in checked-in C# or SQL procedure bodies.

## Batch Processing

`TrustCommissionSourceServiceAsync.cs` comments state scheduled processing is performed by `USP_TrustCommission_DailyCutoff` and `USP_TrustCommission_ProcessOneOff`. `TrustCommissionServiceAsync.cs` lists batches from `tbl_TrustCommissionBatch`, lists/detail commission records from `tbl_TrustCommission`, and allows `CALCULATED` commissions to move to final `PAID` or `CANCELLED`.

## Important Stored Procedures

- `USP_TrustCommission_DailyCutoff` is referenced in comments but not defined in `reference/scheme-2.1.sql`.
- `USP_TrustCommission_ProcessOneOff` is referenced in comments but not defined in `reference/scheme-2.1.sql`.

# Agent Network and Ranking

## Network Structure

Trust and will networks are separate. `NetworkTreeAsync.cs` uses `tbl_MemberUnit_Trust` for Trust (`Type = V`) and `tbl_MemberUnit_Will` for Will (`Type = W`). `tbl_Reference` stores member network references with ranking and advance ranking. Internal users without a search start from `TrustNetworkBaseMemberUsername` or `WillNetworkBaseMemberUsername` in Web.config. Agents without search start from themselves.

## Ranking Rules

Network display joins to `tbl_AgentRank` using the greater of `tbl_Reference.AdvanceRanking` and `tbl_Reference.Ranking`. Trust personal sales in network view sum trust asset amounts for statuses `COMPLETED`, `EARLY_WITHDRAWN`, and `MATURED`.

## Ranking Processing

Manual ranking preview/update calls `AgentRankingAsync.ManualRankingAsync`, which executes `dbo.USP_Trust_ManualAgentRanking` with merchant ID, member ID, new advance ranking, changed by, and preview-only flag. Agent management endpoints in `AgentManagementController.cs` expose preview/update.

## Important Stored Procedures

- `USP_Trust_ManualAgentRanking` is referenced by `AgentRankingAsync.cs` but not defined in the checked-in schema.
- `USP_MemberRegister_Trust` is referenced by `RegisterAsync.cs` for agent registration but not defined in the checked-in schema.

# Complimentary Benefit

Plan benefits are configured in Step 9 and stored in `tbl_TrustPlanBenefit`. `TrustApplicationComplimentaryBenefitServiceAsync.cs` syncs the qualified benefit for a trust application by soft-deactivating previous active benefit records, checking `tbl_TrustPlan.HasComplimentaryBenefits`, finding the first benefit whose placement range includes the trust asset amount, and inserting a snapshot in `tbl_TrustApplication_ComplimentaryBenefit`.

# Early Withdrawal

`TrustApplicationWorkflowServiceAsync.EarlyWithdrawAsync` allows only `SA`/`AD`, requires current status `COMPLETED`, requires a remark, prevents duplicate withdrawal, blocks withdrawal on or after maturity date, reads frozen snapshot withdrawal config, and requires `AllowEarlyWithdrawal = true`. Fees support `PERCENTAGE` and `FIXED_AMOUNT`; deductions are rounded to 2 decimals and cannot exceed placement amount. The application stores fee type/value/base/deduction/net/remark, changes to `EARLY_WITHDRAWN`, queues email, records actor/date, and voids outstanding scheduled dividends.

# Daily Cutoff

The schema defines `tbl_TrustDailyCutoffLog` and `tbl_TrustDailyCutoffProcessLog`. C# comments identify the commission daily cutoff path as:

1. `USP_TrustCommission_DailyCutoff`
2. `USP_TrustCommission_ProcessOneOff`

Needs Verification: no scheduler, Hangfire recurring job registration, or stored procedure body for the daily cutoff was found in the checked-in application source or `reference/scheme-2.1.sql`. Execution order beyond the comments above cannot be verified from this repository.

# Background Jobs / Hangfire

The Web API does not host Hangfire directly in checked-in code. `Class/Helper/HangfireHelper.cs` calls an external Hangfire/job server via `Hangfire.BaseUrl`:

- `POST {Hangfire.BaseUrl}/api/jobtrigger/instant-email` with `PublicId`.
- `POST {Hangfire.BaseUrl}/api/certjobtrigger/request-generate-cert`.

Email queueing services call Hangfire only after database transactions commit. No recurring job registration was found in the checked-in Web API project.

# Email System

Emails are queued in `tbl_EmailQueue`. OTP emails are queued by `OneTimePassword.SendOTPAsync` using template `request-one-time-password`, then `HangfireHelper.TriggerInstantEmail(publicId)` is called. Trust application status emails are queued by `TrustApplicationEmailNotificationServiceAsync.cs` using template `trust-application-status`, one email per application/status event, sent to the agent email, and triggered after commit. Status email content exists for `PAYMENT_APPROVED`, `PENDING_ADMIN_APPROVAL`, `SENT_OUT`, `STAMPING`, `COMPLETED`, `EARLY_WITHDRAWN`, and `REJECTED`.

# Audit System

`ApiLoggingHandler.cs` logs API requests/responses to `tbl_ApiRequestLog`, masking sensitive JSON via `ApiLogMaskHelper`, skipping multipart request bodies and binary responses, and honoring `[SkipApiLogging]`. It stores request ID, timing, duration, user/merchant where derivable from JWT, controller/action, audit title/description, IP, user agent, headers, bodies, status, success flag, and exception. Logging failures are swallowed. File upload audit records are stored separately in `tbl_FileUploadAudit`. Trust application history uses `tbl_TrustApplication_History` and status history uses `tbl_TrustApplication_StatusHistory`.

# OpenAI Integration

`OpenAiIcExtractionService.cs` extracts Malaysian NRIC details from JPEG/PNG images up to 5 MB. It validates content type and magic bytes, sends an OpenAI Responses API request using config keys `OpenAI.ApiKey`, `OpenAI.ApiUrl`, and `OpenAI.Model`, sets `store = false`, requests strict JSON schema output, and normalizes confidence values. `OpenAiRequestLogService.cs` writes success/failure rows to `tbl_OpenAiRequestLog`, including model, response ID, token usage, pricing/cost fields, image size, duration, HTTP status, success flag, and error message. Pricing is calculated by `OpenAiUsageCostService.cs` from `tbl_OpenAiModelPricing`.

# SignalR

`JwtHelper.GenerateSignalRToken` creates a short-lived token with `TokenType = SignalR`, and `AuthController.cs` returns `SignalRToken` in the login response. No SignalR hub/server implementation was found in the checked-in source. Frontend `authService.ts` stores `signalRToken`, but no verified realtime hub usage was found.

# File Upload / Security

`FileUploadService.cs` centralizes upload storage. It validates request data, prevents unsafe subfolders/path traversal, creates `tbl_FileUploadAudit`, scans the temporary file, moves it to `{UploadRootPath}/{subfolder}/{yyyyMMdd}/{guid.ext}`, records SHA-256 and public paths, and supports completion/failure cleanup. `FileSecurityScanner.cs` validates size, extension, file signatures, DOCX structure, SHA-256, and optionally Windows Defender (`MpCmdRun.exe`) with fail-closed behavior when Defender cannot confirm success.

Policies in `FileUploadPolicies.cs` include:

- Avatar: image types, 10 MB.
- Resource: document/image types, 5 MB.
- Trust application supporting document: PDF/DOC/DOCX/JPG/JPEG/PNG, 5 MB.
- Trust application payment slip: PDF/JPG/JPEG/PNG, 5 MB.
- Will document: PDF/DOC/DOCX/JPG/JPEG/PNG, 30 MB.

# Database

Important tables by module:

- Auth/member/network: `tbl_MemberInfo`, `tbl_MemberControl`, `tbl_MemberInfo_Bank`, `tbl_MemberInfo_KYC`, `tbl_Login`, `tbl_AppToken`, `tbl_RememberMeToken`, `tbl_TAC`, `tbl_Reference`, `tbl_MemberUnit_Trust`, `tbl_MemberUnit_Will`, `tbl_AgentRank`, `tbl_AgentRankingHistory`.
- Trust application: `tbl_TrustApplication`, personal/source/asset/beneficiary/allocation/caretaker/minor distribution/deed/co-broker/supporting/payment/document/history/status/snapshot/benefit tables.
- Trust plan: `tbl_TrustPlan`, `tbl_TrustCategories`, `tbl_TrustPlanExecutionRank`, payment config, fee, withdrawal config, dividend config/tier/rate/payout, bonus config, commission config/tier/rule, benefit.
- Payment/dividend/commission: `tbl_TrustApplication_Payment`, `tbl_TrustApplication_PaymentDocument`, `tbl_TrustApplication_DividendSchedule`, `tbl_TrustCommissionSource`, `tbl_TrustCommissionBatch`, `tbl_TrustCommission`, `tbl_TrustCommissionCompressionLog`, `tbl_TrustDailyCutoffLog`, `tbl_TrustDailyCutoffProcessLog`.
- Documents: `tbl_TrustDocument`, `tbl_TrustDocumentTemplate`, `tbl_TrustDocumentRole`, `tbl_TrustDocumentAllocationMapping`, `tbl_DocumentDownload`.
- Audit/OpenAI/upload/email: `tbl_ApiRequestLog`, `tbl_OpenAiRequestLog`, `tbl_OpenAiModelPricing`, `tbl_FileUploadAudit`, `tbl_EmailQueue`, `tbl_log_*`.
- Lookups/config: country, bank, relationship, religion, identity/executor/asset allocation/property/land/title/payment-to-trustee/unit trust account types, `tbl_Config_General`, `tbl_Config_Sms`, `tbl_Parameter`, `tbl_RunningNumber`, `tbl_TrustReceiptRunningNo`.

# Important API Endpoints

- Auth/account: `api/auth/login`, logout/remember endpoints in `AuthController.cs`; account profile/password/bank/email/avatar endpoints in `AccountController.cs`.
- Register: `api/register/validate-sponsor`, registration session, account/identity/contact/bank validation, KYC upload, `agent-register`.
- Trust plan: `api/trust-plan/create-trust-plan`, `PUT api/trust-plan/{productCode}`, `get-trust-product-list`, `get-trust-product-details/{productCode}`.
- Trust application: step save endpoints, supporting document upload/delete, review, submit, list/detail, document list, workflow status actions, snapshot refresh, OCR endpoints.
- Payment: `api/trust-payment/...` endpoints listed in the Payment section.
- Dividend: `api/trust-dividend` list/detail/status.
- Commission: `api/trust-commission/batches`, commission list/detail/status endpoints in `TrustCommissionController.cs`.
- Network: `api/network/trust/downline-list`, `api/network/will/downline-list`.
- Resources/documents/audit/config/dashboard/lookups: controllers exist under `API/Controller/v1/`.

# Important Business Rules

- Trust application status changes must go through `TrustApplicationStatusHelper` to preserve allowed transitions and status history.
- Completed application calculations must use `tbl_TrustApplication_PlanSnapshot`, not current trust plan tables.
- Commission is not calculated during completion; completion only registers a commission source.
- Dividend schedule generation is one-time per application and uses the frozen snapshot.
- `DUE` dividend status is derived, not stored.
- Early withdrawal can only happen before maturity on completed applications and voids outstanding scheduled dividends.
- Payment full approval is what sets commencement/maturity dates and moves the application to `PAYMENT_APPROVED`.
- Agents are limited to their own applications/network-visible downlines where backend services enforce the rule.
- Uploads should use `FileUploadService` and a module policy so audit, magic-byte validation, SHA-256, antivirus, and cleanup run consistently.
- OpenAI OCR must not bypass image type/size/signature checks or request logging.

# Configuration / Deployment Notes

Important backend app settings observed in code include `Hangfire.BaseUrl`, `UploadRootPath`, media/member URLs through `AppSettingsHelper`, `TrustNetworkBaseMemberUsername`, `WillNetworkBaseMemberUsername`, `OpenAI.ApiKey`, `OpenAI.ApiUrl`, `OpenAI.Model`, `JwtSecretKey` for SignalR token generation, and Cloudflare Turnstile settings via `CloudflareTurnstileService.cs`. Frontend Vite environment files configure API-facing deployment values; see `.env.development`, `.env.staging`, and `.env.production`.

# Known Issues / Needs Verification

- `TrustApplicationWorkflowServiceAsync.RejectAsync` attempts to change status to `REJECTED`, but `TrustApplicationStatusHelper.AllowedTransitions` does not include `REJECTED`; verify whether rejection currently works or whether the transition map is incomplete.
- `reference/scheme-2.1.sql` defines tables/constraints but no stored procedure bodies were found. Verify behavior for `USP_TrustCommission_DailyCutoff`, `USP_TrustCommission_ProcessOneOff`, `USP_Trust_ManualAgentRanking`, and `USP_MemberRegister_Trust` in the live database.
- Daily cutoff scheduling and exact process order could not be verified beyond comments and cutoff log tables.
- SignalR token generation is implemented, but no hub/server implementation was found in this repository.
- Commission overriding, co-broker commission impact, compression, and batch calculation rules are not fully verifiable without the stored procedures.
- The frontend currently skips co-broker Step 7 while backend DTO/service support still exists; confirm intended product behavior before re-enabling it.
- `TrustDividendFinanceServiceAsync` status filter for `DUE` appears to query stored `Status == "DUE"` even though comments say DUE is derived from `SCHEDULED` plus payout date; verify list filtering behavior.

# Documentation Metadata

- Last reviewed: 2026-10-05
- Source: Current repository source code and database/schema scripts
- Note: This document describes implemented behaviour, not planned behaviour.
