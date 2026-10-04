# Frontend Development Guide

Last reviewed: 2026-10-05

Source: Current React source code in `src/`, shared components, service modules, route configuration, and representative pages.

Note: This document describes implemented behaviour and conventions. It does not define planned architecture.

## 1. Frontend Architecture

The frontend is a React 18 + TypeScript + Vite application.

Important entry points:

- `src/main.tsx`: creates the React root, wraps the app in `BrowserRouter` and `AuthProvider`, and imports global styles.
- `src/App.tsx`: renders routing, scroll restoration, global loading overlay, and toast container.
- `src/routes/AppRoutes.tsx`: defines public and authenticated routes.
- `src/layouts/AppLayout.tsx`: authenticated application layout.

The application uses:

- local component state for page workflows
- React Context for authentication/session state
- API/service modules for HTTP, loading, notifications, session storage, and request normalization
- page-local composition for complex business screens
- shared components for buttons, modals, status badges, pagination, empty states, and form controls

No Redux, Zustand, or equivalent global client state library was found.

## 2. Source Structure

Important folders:

- `src/api/`: API modules grouped by backend domain, such as trust applications, dividends, commissions, plans, audit logs, OpenAI request logs, users, roles, and configuration.
- `src/components/common/`: shared business UI components such as `PageHeader`, `StatusBadge`, `TableActionMenu`, `Pagination`, `Modal`, `ConfirmDialog`, `EmptyState`, `ErrorState`, and display helpers.
- `src/components/ui/`: lower-level UI primitives such as `Button`, `Dialog`, `AlertDialog`, and `Tooltip`.
- `src/components/forms/`: reusable form controls including `DatePickerInput`, `PasswordInput`, `OtpInput`, `Stepper`, and `SubmitButton`.
- `src/components/feedback/`: global toast container and page loading overlay.
- `src/components/layout/`: authenticated shell, navigation, sidebar, header, and related layout controls.
- `src/components/security/`: Turnstile and bot-protection components.
- `src/components/tables/`: generic `DataTable`.
- `src/config/`: navigation, permissions, and app configuration.
- `src/context/`: React context, especially `AuthContext`.
- `src/hooks/`: shared hooks including `usePermission` and `useBodyScrollLock`.
- `src/layouts/`: page layout components.
- `src/pages/`: route-level pages and major business workflows.
- `src/services/`: API client, auth, session, notification, loading, and request-support services.
- `src/types/`: shared TypeScript types.
- `src/utils/`: formatting, form error, file, and domain helper utilities.

## 3. Component Reuse Rules

Prefer existing shared components before adding a new pattern:

- page titles and actions: `PageHeader`
- buttons: `Button`
- confirmations: `ConfirmDialog`
- standard modals: `Modal` or `Dialog`
- row menus: `TableActionMenu`
- statuses: `StatusBadge`
- empty content: `EmptyState`
- retryable errors: `ErrorState`
- loading rows: `LoadingSkeleton`
- pagination: `Pagination`
- search input: `SearchInput`
- date picking: `DatePickerInput`
- toasts: `notificationService`

Use page-local components when the source already does so for complex workflows, especially wide drawers, multi-section details, and process-specific modals.

## 4. API Calling Pattern

`src/api/apiClient.ts` is the shared Axios client.

Implemented behaviour:

- base URL from `import.meta.env.VITE_API_URL`
- `Authorization: Bearer <token>` added from `getAuthToken()`
- `Accept: application/json`
- JSON content type added by `withJsonContentType` unless the payload is `FormData`
- global loading integration unless `skipGlobalLoading` is set
- in-flight GET request dedupe unless `skipInFlightDedupe` is set
- response and error normalization through interceptors

API modules in `src/api/` wrap `apiClient` and export typed request/response helpers. New API calls should follow the same pattern instead of using raw `fetch` or creating a second Axios client.

## 5. API Response Pattern

`apiClient` handles both direct payloads and common wrapped backend response shapes.

Observed helper behaviour:

- `unwrapApiResponse<T>()` returns useful response data from common wrappers.
- `normalizeApiError()` maps backend, HTTP, network, timeout, and auth-session failures to `ApiError`.
- `isApiError()` identifies normalized errors.

Page code usually catches errors, derives a user-facing message, and shows `notifyError`.

Important file:

- `src/api/apiClient.ts`

## 6. Authentication

Authentication is implemented through:

- `src/services/authService.ts`
- `src/services/sessionService.ts`
- `src/context/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`

Session behaviour:

- login maps backend auth responses to `LocalSession`
- `rememberMe` chooses `localStorage`; otherwise `sessionStorage`
- session data is stored with a SHA-256 hash for frontend tamper detection
- token fields are read through `getSessionToken`
- supported roles are `SA`, `AD`, `OP`, `AC`, and `AG`
- tampered sessions are signed out and routed to `/session-invalid`

Backend JWT validation and authorization remain authoritative. The session hash is frontend tamper detection only, as noted in `sessionService.ts`.

## 7. Authorization / Role-Based UI

Role-based UI is configured in:

- `src/config/permissions.ts`
- `src/config/navigation.ts`
- `src/hooks/usePermission.ts`
- `src/components/ProtectedRoute.tsx`

Observed roles:

- `SA`
- `AD`
- `OP`
- `AC`
- `AG`

Navigation visibility and page actions use permission checks. Routes are wrapped by `ProtectedRoute`, but most route definitions do not pass explicit per-route permission props; layout/navigation and page-level checks do much of the role-based UI work.

Security rule: frontend role checks are visibility and UX controls only. Do not treat them as backend authorization.

## 8. Page Implementation Pattern

Typical operational page structure:

1. import API module, shared UI components, notification helpers, icons, and types
2. define local filter/query/form state
3. load data in `useEffect`
4. normalize API response and pagination metadata
5. render `PageHeader`
6. render stats/filter/table sections
7. render modals, drawers, confirmations, or process dialogs
8. show toasts for success/failure

Best references:

- `src/pages/TrustListingPage.tsx`
- `src/pages/TrustDividendPage.tsx`
- `src/pages/CommissionPage.tsx`
- `src/pages/TrustPlanList.tsx`

## 9. Listing Page Implementation

Current listing pages commonly use:

- `PageHeader`
- statistics summary cards
- local `draftFilters`
- applied filters or query params used for API calls
- Search and Reset buttons
- server-side pagination
- rows-per-page selector
- `Pagination`
- `LoadingSkeleton`
- `EmptyState`
- `TableActionMenu` or icon buttons
- `StatusBadge`

References:

- `src/pages/TrustListingPage.tsx`
- `src/pages/TrustDividendPage.tsx`
- `src/pages/CommissionPage.tsx`
- `src/pages/TrustPlanList.tsx`

`src/components/tables/DataTable.tsx` is available, but current complex server-driven business listings mostly use custom table markup.

## 10. Form Implementation

Forms use a mixture of shared controls and page-local validation.

References:

- `src/pages/trust-plan/TrustPlanForm.tsx`
- `src/pages/TrustApplicationPage.tsx`
- `src/components/forms/FormField.tsx`
- `src/components/forms/DatePickerInput.tsx`
- `src/components/forms/PasswordInput.tsx`
- `src/components/forms/SubmitButton.tsx`
- `src/utils/formErrors.ts`

Observed rules:

- disable submit while saving
- show inline errors where form libraries are used
- show warning/error toasts for broader validation failures
- keep multi-step navigation guarded by validation
- use `ConfirmDialog` for destructive or unsaved-change decisions

## 11. Modal Implementation

Use one of these existing modal paths:

- `src/components/common/Modal.tsx` for simple shared modal panels
- `src/components/ui/dialog.tsx` for Radix Dialog-based modals
- page-local modal only when the workflow needs custom sizing, state, or layout

Shared modal visuals include a dark overlay, rounded panel, gold top accent, border, and close affordance.

## 12. Confirmation Action Pattern

Use `src/components/common/ConfirmDialog.tsx`.

Pattern:

- pass `open`
- pass `title` and `message`
- pass `onConfirm`
- use destructive variant for irreversible destructive actions
- show Cancel and Confirm actions

Examples:

- delete actions in listing pages
- unsaved-change confirmation in `src/pages/trust-plan/TrustPlanForm.tsx`

## 13. Toast Implementation

Use:

- `notifySuccess`
- `notifyError`
- `notifyWarning`
- `notifyInfo`

from `src/services/notificationService.ts`.

Do not call `toast` directly from new page code unless there is a specific reason matching existing infrastructure.

Toast container:

- `src/components/feedback/AppToastContainer.tsx`

Toast styles:

- `src/styles/toast.css`

Wording convention:

- concise
- sentence case
- user-facing
- usually end with a period

## 14. Error Handling

API errors should flow through `apiClient`.

Important behaviour:

- network and timeout errors get standard messages
- `401` auth/session errors trigger sign-out and redirect to `/login`
- `403`, `404`, `500`, and other statuses are normalized
- `ApiError` includes status, code, payload, and auth/network flags

UI handling patterns:

- action failures usually use `notifyError`
- listing load failures may show `EmptyState` or `ErrorState`
- retryable error panel exists as `src/components/common/ErrorState.tsx`

Needs Verification: error UI is not fully consistent across pages.

## 15. Formatting Helpers

Existing helpers/components:

- `src/components/common/CurrencyDisplay.tsx`
- `src/components/common/DateDisplay.tsx`
- `src/utils/formErrors.ts`
- `src/utils/fileDownload.ts`
- `src/utils/masterData.ts`

However, many pages define local formatters for:

- MYR currency
- percentages
- dates
- date/time
- file sizes
- OpenAI token/cost values

Before adding a formatter, check the target module's current display style. Cross-module formatting is a known inconsistency.

## 16. Type / Interface Patterns

TypeScript interfaces are commonly defined close to the API module or page that uses them.

Patterns:

- API modules export request/response interfaces with their functions.
- Shared domain types live in `src/types/`.
- Trust plan-specific types live in `src/types/trustPlan.ts`.
- Page-local view models are defined inside page files when only used there.

Examples:

- `src/api/trustDividendApi.ts`
- `src/api/commissionApi.ts`
- `src/api/trustPlanApi.ts`
- `src/types/index.ts`
- `src/types/trustPlan.ts`

## 17. Naming Conventions

Observed conventions:

- React components use PascalCase filenames and exports.
- hooks use `use...` names.
- API modules end with `Api.ts` or equivalent domain naming.
- service modules end with `Service.ts`.
- page files usually end with `Page.tsx`, except some feature folders use names such as `TrustPlanList.tsx` and `TrustPlanForm.tsx`.
- boolean state often uses `is...`, `has...`, or direct workflow names such as `submitting`.
- handler functions commonly use `handle...`.

No automated naming rule file was found beyond TypeScript and project conventions.

## 18. Routing

Routes are defined in `src/routes/AppRoutes.tsx`.

Observed route structure:

- public auth and account recovery routes
- authenticated routes wrapped with `ProtectedRoute` and `AppLayout`
- route paths map directly to page components
- `ScrollToTop` resets scroll on route change

Important files:

- `src/routes/AppRoutes.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/ScrollToTop.tsx`
- `src/config/navigation.ts`

## 19. State Management

State management is mostly local:

- `useState`
- `useEffect`
- `useMemo`
- `useCallback`

Shared state:

- `AuthContext` for session/auth status
- `loadingService` for global loading subscriptions
- browser storage through `sessionService`

The app does not currently use Redux/Zustand-style global stores.

## 20. Performance Patterns

Implemented performance-related patterns:

- `apiClient` deduplicates in-flight GET requests by request key.
- server-driven listings use pagination.
- filter submissions avoid request-per-keystroke behaviour on major listings.
- local derived values often use `useMemo`.
- global loading overlay has a route loading delay to avoid flicker.

Needs Verification:

- no route-level lazy code splitting was observed in `AppRoutes.tsx`.
- some older/local pages may do client-side filtering over local data.

## 21. Security Rules for Frontend Development

Follow these implemented rules and constraints:

- use `apiClient` so auth headers, loading, and error handling remain consistent
- do not log or render tokens
- do not store new secrets in frontend code
- only use Vite public environment variables by name; do not hardcode environment values
- preserve Turnstile/security components in auth flows
- use role checks for UI visibility, but rely on backend authorization for real access control
- use `FormData` through `apiClient` without forcing JSON content type
- avoid unsafe HTML rendering; no `dangerouslySetInnerHTML` usage was found during review
- use `fileDownload` helpers for downloaded blobs where already established

Important files:

- `src/api/apiClient.ts`
- `src/services/sessionService.ts`
- `src/api/apiClient.ts`
- `src/components/security/TurnstileWidget.tsx`
- `src/utils/fileDownload.ts`

## 22. New Feature Checklist

Before adding a new frontend feature:

- identify the closest existing page or component pattern
- use `PageHeader` for route pages
- use existing `Button`, `StatusBadge`, `ConfirmDialog`, `Pagination`, and toast helpers
- add API calls through `src/api/` and `apiClient`
- define request/response types close to the API module unless shared
- handle loading, empty, success, and error states
- check role visibility and navigation config
- keep date/currency/status formatting consistent with the target module
- avoid adding a new visual pattern unless the existing ones cannot fit

## 23. New Listing Page Checklist

Use current listing references:

- `src/pages/TrustListingPage.tsx`
- `src/pages/TrustDividendPage.tsx`
- `src/pages/CommissionPage.tsx`
- `src/pages/TrustPlanList.tsx`

Checklist:

- `PageHeader`
- optional stats cards
- filter card with draft/applied filter state
- Search and Reset actions
- server-side pagination if the backend supports it
- rows-per-page selector
- table with horizontal overflow
- `StatusBadge` for semantic statuses
- `TableActionMenu` for multiple row actions
- `Pagination`
- `LoadingSkeleton`
- `EmptyState`
- toast errors for failed loads and actions

## 24. New Modal Checklist

Checklist:

- prefer `Modal` or Radix `Dialog`
- use concise title and body
- keep action buttons in the footer
- disable actions while submitting
- show success/error toast after API actions
- close on successful completion when existing module patterns do so
- use `ConfirmDialog` for destructive confirmation
- use page-local modal only for complex process flows

## 25. New Form Checklist

Checklist:

- label every field
- use `h-11 rounded-lg border-line` input style through existing controls where possible
- validate before submit
- show inline errors or clear toast warnings
- disable submit while saving
- keep API errors user-facing through normalized messages
- preserve unsaved-change confirmation for multi-step or high-effort forms
- use `DatePickerInput` for date picking unless the target page already uses native date fields

## 26. Reference Implementations

Use these files as implementation references:

- page shell: `src/App.tsx`, `src/routes/AppRoutes.tsx`, `src/layouts/AppLayout.tsx`
- page header: `src/components/common/PageHeader.tsx`
- buttons: `src/components/ui/button.tsx`
- modals: `src/components/common/Modal.tsx`, `src/components/ui/dialog.tsx`
- confirmations: `src/components/common/ConfirmDialog.tsx`
- toasts: `src/components/feedback/AppToastContainer.tsx`, `src/services/notificationService.ts`
- status badges: `src/components/common/StatusBadge.tsx`
- table actions: `src/components/common/TableActionMenu.tsx`
- pagination: `src/components/common/Pagination.tsx`
- listing pages: `src/pages/TrustListingPage.tsx`, `src/pages/TrustDividendPage.tsx`, `src/pages/CommissionPage.tsx`
- multi-step form: `src/pages/trust-plan/TrustPlanForm.tsx`
- expandable rows: `src/pages/OpenAiRequestLogPage.tsx`, `src/pages/AuditLogPage.tsx`
- API client: `src/api/apiClient.ts`
- auth/session: `src/services/authService.ts`, `src/services/sessionService.ts`, `src/context/AuthContext.tsx`
- permissions: `src/config/permissions.ts`, `src/hooks/usePermission.ts`, `src/config/navigation.ts`

## 27. Inconsistencies / Needs Verification

- Drawer patterns are page-local and inconsistent in width, animation, and structure.
- Date formatting differs across `DateDisplay`, finance pages, audit logs, and OpenAI request logs.
- Currency and percentage precision differs across dashboards, tables, and details.
- `DataTable` exists but is not consistently used by major server-driven listings.
- Error states vary between toast-only, `EmptyState`, `ErrorState`, and custom page messages.
- Tooltip implementation is custom and should not be assumed to have complete accessibility behaviour.
- `src/pages/AgentsListingPage.tsx` defines a page-local `StatusBadge` while most business statuses use the shared badge component.
- Some older pages, including `src/pages/TrustPaymentPage.tsx`, do not match the newer operational listing pattern.
- Route-level permission enforcement is not obvious for every route from `AppRoutes.tsx`; page, navigation, and backend checks should be verified when changing access rules.

## 28. Instructions for Future Codex Development

When modifying the frontend:

- study the target page and its nearest reference page before editing
- preserve existing business workflow and role behaviour
- prefer shared components and current page patterns
- do not introduce a new design system or styling framework
- do not add hardcoded secrets or environment values
- do not rely on frontend permissions as security enforcement
- document uncertainty as Needs Verification instead of assuming
- after UI work, check desktop and mobile layouts for text overflow, table overflow, disabled states, loading states, and error states
- keep source changes scoped to the requested module

For UI/UX choices, pair this guide with `docs/FRONTEND_DESIGN_SYSTEM.md`.
