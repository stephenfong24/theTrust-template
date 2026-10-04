# Frontend Design System

Last reviewed: 2026-10-05

Source: Current React source code in `src/`, especially shared components, layouts, styles, and representative pages.

Note: This document describes implemented behaviour and observed UI conventions. It is not a redesign proposal.

## 1. Design Philosophy

The frontend is a business operations interface for trust applications, payments, dividends, commissions, configuration, audit logs, OpenAI logs, and agent workflows. The implemented visual language is restrained and administrative: white or soft gray surfaces, black primary actions, gold accents, compact tables, and dense but readable detail layouts.

The design relies on Tailwind utility classes, a small set of shared React components, and page-local compositions for more complex workflows. Important references:

- `tailwind.config.js`: design tokens for `brandGold`, `ink`, `textPrimary`, `textSecondary`, `line`, `soft`, `fontFamily.sans`, and `shadow.soft`.
- `src/styles.css`: global font, focus treatment, base button shadow, body background, and reduced-motion handling.
- `src/components/common/PageHeader.tsx`: standard page title/header pattern.
- `src/components/ui/button.tsx`: shared button variants and sizes.
- `src/components/common/Modal.tsx`, `src/components/ui/dialog.tsx`, `src/components/common/ConfirmDialog.tsx`: modal and confirmation patterns.
- `src/pages/TrustListingPage.tsx`, `src/pages/TrustDividendPage.tsx`, `src/pages/CommissionPage.tsx`: best current examples for operational listing pages.
- `src/pages/trust-plan/TrustPlanForm.tsx`: best current example for a large multi-step configuration form.

## 2. Page Layout

Authenticated application pages are rendered through `src/layouts/AppLayout.tsx` with navigation/sidebar/header components under `src/components/layout/`. The app root in `src/App.tsx` renders:

- `ScrollToTop`
- `AppRoutes`
- `PageLoadingOverlay`
- `AppToastContainer`

Most pages use a constrained content width inherited from the layout, then compose:

- `PageHeader`
- optional statistic cards
- filter/search card
- table/list/card content
- modal, drawer, or confirmation components mounted at page level

Representative pages:

- `src/pages/TrustListingPage.tsx`
- `src/pages/TrustDividendPage.tsx`
- `src/pages/CommissionPage.tsx`
- `src/pages/TrustPlanList.tsx`
- `src/pages/AuditLogPage.tsx`
- `src/pages/OpenAiRequestLogPage.tsx`

## 3. Page Header Pattern

`src/components/common/PageHeader.tsx` is the standard header.

Implemented structure:

- wrapper: bottom margin, responsive flex layout, bottom border, `pb-5`
- gold accent bar above the title
- title: `text-[28px] font-semibold tracking-normal text-textPrimary`
- optional description: `max-w-3xl text-sm text-textSecondary`
- optional actions aligned right on large screens and wrapped on smaller screens

Use this component for ordinary pages. Page-local headings inside cards, drawers, and modals use smaller typography.

## 4. Cards

Cards are usually white panels with `rounded-lg`, `border border-line`, and sometimes `shadow-soft`.

Observed card uses:

- filter/search panels in `TrustListingPage`, `TrustDividendPage`, `CommissionPage`, and `TrustPlanList`
- table containers
- detail sections inside drawers
- statistic cards
- form step panels in `TrustPlanForm`

Cards generally have an 8px radius through `rounded-lg`. Nested card-like sections exist in detail drawers, but new UI should prefer simple bordered sections instead of deeply nested cards unless matching an existing page.

## 5. Statistic Cards

Statistic cards appear on operational pages and dashboards. Examples:

- `src/pages/TrustListingPage.tsx`: status totals above the application table.
- `src/pages/TrustDividendPage.tsx`: dividend totals.
- `src/pages/CommissionPage.tsx`: commission totals.
- `src/pages/Dashboard.tsx`: broader dashboard stats.

Common traits:

- small label in muted text
- prominent numeric value
- optional icon, status, or trend treatment
- white card with border and subtle shadow
- compact spacing suitable for scanning

Financial statistic formatting is not fully centralized. Some cards display whole-ringgit values, while finance tables often display two decimals. See "Financial Values" and "Known Issues / Needs Verification".

## 6. Buttons

`src/components/ui/button.tsx` defines the shared `Button` component using `class-variance-authority`.

Implemented variants:

- `default`: black/ink background, white text
- `destructive`: red background
- `outline`: white background with border
- `secondary`: soft gray background
- `ghost`
- `link`

Implemented sizes:

- `default`: `h-11 px-4`
- `sm`: `h-9 px-3`
- `lg`: `h-12 px-6`
- `icon`: `h-10 w-10`

Buttons usually include `lucide-react` icons for actions such as add, search, reset, view, edit, process, download, delete, and close. Icon-only buttons normally include an `aria-label`; representative examples are in `TrustListingPage`, `TrustDividendPage`, `CommissionPage`, `OpenAiRequestLogPage`, and shared components.

Typical action ordering:

- destructive or cancel action on the left, primary confirm action on the right on desktop
- filter forms often render Reset then Search on desktop
- mobile filter forms may use `flex-col-reverse`, so the primary Search button can appear above Reset

## 7. Toast Messages

Toast UI is configured in:

- `src/components/feedback/AppToastContainer.tsx`
- `src/styles/toast.css`
- `src/services/notificationService.ts`

Implemented toast behaviour:

- `react-toastify`
- top-right position
- `autoClose={3000}`
- hidden progress bar
- newest on top
- stacked
- limit of 3 visible toasts
- toast dedupe by `toastId ?? message` in `notificationService`

Toast styling:

- white background
- 12px border radius
- subtle border and shadow
- type-specific left border colors for success, error, warning, and info

Observed wording pattern:

- concise sentence case
- usually ends with a period
- examples: "Signed in successfully.", "Trust application deleted successfully.", "Unable to load trust application list.", "Please select at least one role."

Use `notifySuccess`, `notifyError`, `notifyWarning`, and `notifyInfo` from `src/services/notificationService.ts` instead of calling `toast` directly in new page code.

## 8. Modal Pattern

There are two shared modal implementations:

- `src/components/common/Modal.tsx`
- `src/components/ui/dialog.tsx`

`Modal.tsx` pattern:

- fixed overlay with `bg-black/45`
- centered panel
- `rounded-lg`
- soft background
- brand-gold tinted border
- gold top bar via pseudo-element
- header with title and close icon
- body content supplied by caller

`components/ui/dialog.tsx` pattern:

- Radix Dialog primitive
- portal and overlay
- same gold top-bar visual language
- header/body/footer helpers

Use shared modals for ordinary dialogs. Several complex workflows still use page-local modals because they need custom size, form layout, or process-specific state.

## 9. Confirmation Dialogs

`src/components/common/ConfirmDialog.tsx` is the standard confirmation component.

Implementation details:

- built on `src/components/ui/alert-dialog.tsx`
- title, message, cancel label, confirm label
- optional destructive variant
- destructive confirmation uses red styling
- footer uses Cancel then Confirm in code, matching desktop left-to-right order

Use this for delete, leave-page, and irreversible action confirmations. Browser-native `window.alert` and `window.confirm` were not found in the inspected source.

## 10. Slide-Out / Drawer Pattern

The shared `src/components/common/Drawer.tsx` currently wraps `Modal` and is not the main slide-out implementation.

True drawers are page-local. Important examples:

- `TrustApplicationViewDrawer` in `src/pages/TrustListingPage.tsx`
- dividend detail drawer in `src/pages/TrustDividendPage.tsx`
- commission detail drawer in `src/pages/CommissionPage.tsx`
- audit detail drawer in `src/pages/AuditLogPage.tsx`
- `TrustPlanViewDrawer` in `src/pages/TrustPlanList.tsx`

Observed drawer traits:

- fixed overlay
- right-aligned panel
- full height
- white or soft background
- border-left and shadow
- close icon in header
- scrollable content body
- body scroll locking through `src/hooks/useBodyScrollLock.ts`

Needs Verification: drawer sizing and animation are not centralized. Different pages use different max widths, background colors, and transition handling.

## 11. Forms

Shared form components:

- `src/components/forms/FormField.tsx`
- `src/components/forms/DatePickerInput.tsx`
- `src/components/forms/PasswordInput.tsx`
- `src/components/forms/OtpInput.tsx`
- `src/components/forms/SubmitButton.tsx`
- `src/components/forms/Stepper.tsx`

Typical controls:

- labels use `text-sm font-medium text-textPrimary`
- inputs are generally `h-11`, `rounded-lg`, `border-line`
- focus state uses black/ink border and ring from global CSS or component classes
- required indicators use red asterisks in some components
- disabled controls use reduced opacity or gray backgrounds

Large forms often use page-local structure rather than only shared components. Key references:

- `src/pages/trust-plan/TrustPlanForm.tsx`: multi-step configuration form
- `src/pages/TrustApplicationPage.tsx`: trust application workflow form
- `src/pages/UserProfilePage.tsx`: profile and password dialog forms

## 12. Form Validation

Validation is implemented with a mixture of:

- `react-hook-form`
- `zod`
- manual page-level checks
- API error mapping

References:

- `src/pages/trust-plan/TrustPlanForm.tsx`: step validation before navigation and submission
- `src/utils/formErrors.ts`: helper for extracting the first form error
- `src/pages/LoginPage.tsx` and authentication pages: form validation with Turnstile/auth state

Observed validation UX:

- inline field errors where form libraries are used
- toast warnings for step-level or submit-level validation failures
- disabled submit buttons during submission
- API errors normalized through `src/api/apiClient.ts`

Needs Verification: validation display is not fully standardized across all pages and forms.

## 13. Tables / Listings

The current preferred operational listing pattern is page-local table markup with shared support components:

- `PageHeader`
- filter card
- table container card
- `TableActionMenu`
- `StatusBadge`
- `Pagination`
- `EmptyState`
- `LoadingSkeleton`

Best current references:

- `src/pages/TrustListingPage.tsx`
- `src/pages/TrustDividendPage.tsx`
- `src/pages/CommissionPage.tsx`
- `src/pages/TrustPlanList.tsx`

Shared generic table:

- `src/components/tables/DataTable.tsx`

`DataTable` includes search, sorting, column selection, pagination, and row actions. It is useful as an existing component reference, but complex server-driven pages currently use page-local table implementations instead.

Common table visual style:

- `overflow-x-auto`
- `min-w-full`
- header background `bg-soft`
- uppercase small header labels
- `text-[13px]` or `text-sm` body text
- row hover background
- bottom borders between rows
- empty state inside the table card

## 14. Table Action Column

`src/components/common/TableActionMenu.tsx` is the preferred row action menu.

Implementation:

- icon button with `MoreHorizontal`
- fixed-position dropdown rendered based on button location
- closes on outside click and Escape
- menu items are supplied by the page
- supports viewport-aware up/down placement

Common row actions include:

- View
- Edit
- Delete
- Process
- Approve
- Download
- Payment
- Documents
- Early Withdrawal

Some pages still use inline icon buttons instead of `TableActionMenu`, especially for simple two-action rows.

## 15. Expandable Table Rows

Expandable rows are implemented page-locally. Important references:

- `src/pages/OpenAiRequestLogPage.tsx`
- `src/pages/AuditLogPage.tsx`

Observed pattern:

- action column contains a chevron button
- expanded row is a second `<tr>` with a `colSpan`
- expanded content uses compact detail cards or key-value grids
- one page stores the expanded row id in local state

Needs Verification: there is no shared expandable-row component, and implementations differ between audit logs and OpenAI request logs.

## 16. Status Badges

`src/components/common/StatusBadge.tsx` is the shared semantic badge component.

Implemented statuses include:

- Draft / `DRAFT`
- Pending
- Pending Review
- Pending Approval
- Pending Payment Approval / `PENDING_PAYMENT_APPROVAL`
- Pending Admin Approval / `PENDING_ADMIN_APPROVAL`
- Approved
- Active
- Inactive
- Rejected / `REJECTED`
- Sent Out / `SENT_OUT`
- Stamping / `STAMPING`
- Completed / `COMPLETED`
- Early Withdrawn / `EARLY_WITHDRAWN`
- Matured / `MATURED`
- Scheduled / `SCHEDULED`
- Due / `DUE`
- Cancelled / `CANCELLED`
- Overdue
- Paid
- Payment Approved / `PAYMENT_APPROVED`
- Unpaid
- Partially Paid
- Expired
- Expiring
- Processing
- Failed

Badge style:

- inline-flex
- `rounded-lg`
- `px-3 py-1`
- `text-xs font-medium`

Some log and technical pages define page-local badges, such as success/method/scan status badges. New business workflow statuses should prefer the shared `StatusBadge` unless a page has a justified technical badge pattern.

Needs Verification: `src/pages/AgentsListingPage.tsx` also defines a page-local `StatusBadge`, so agent-listing status styling should be checked before reusing or changing it.

## 17. Search and Filters

Shared search input:

- `src/components/common/SearchInput.tsx`

Common server-driven filter pattern:

- maintain draft filter state separately from applied filter state
- submit Search to apply filters
- Reset clears filters and returns to page 1
- page size changes reset the page index
- date ranges use `DatePickerInput` or page-local date inputs

References:

- `src/pages/TrustListingPage.tsx`
- `src/pages/TrustDividendPage.tsx`
- `src/pages/CommissionPage.tsx`
- `src/pages/TrustPlanList.tsx`

No consistent debounce pattern was found for primary server-side listings.

## 18. Tabs

`src/components/common/Tabs.tsx` provides a simple tab bar:

- border-bottom container
- active tab has brand-gold underline
- inactive tabs use muted text

The component exists but is not the dominant pattern for large workflows. `TrustPlanForm` uses step navigation instead of tabs for multi-step configuration.

## 19. Detail / Read-Only Pages

Read-only detail views are usually implemented as drawers or detail sections rather than separate full pages.

Examples:

- trust application drawer in `TrustListingPage`
- dividend detail drawer in `TrustDividendPage`
- commission detail drawer in `CommissionPage`
- audit request drawer in `AuditLogPage`
- trust plan drawer in `TrustPlanList`

Observed detail layout:

- header with title, status, and close button
- summary/stat cards near the top
- grouped sections with labels and values
- empty values shown as `-`
- action buttons in the header or footer when available

## 20. Financial Values

Financial values are commonly formatted inline with `Number(...).toLocaleString("en-MY")`.

Observed patterns:

- finance tables often display `RM` with two decimals, for example `RM 10,000.00`
- dashboard and shared `CurrencyDisplay` can display MYR with zero decimals
- percentages vary between two and four decimal places depending on page
- OpenAI cost values use USD formatting with fixed decimal places

References:

- `src/components/common/CurrencyDisplay.tsx`
- `src/pages/TrustDividendPage.tsx`
- `src/pages/CommissionPage.tsx`
- `src/pages/TrustListingPage.tsx`
- `src/pages/OpenAiRequestLogPage.tsx`

Needs Verification: currency and percentage formatting are not centralized, so exact precision differs by page.

## 21. Dates and Times

Date formatting is not centralized.

Observed patterns:

- `DateDisplay` uses `date-fns` format `dd MMM yyyy`
- finance pages commonly use `toLocaleDateString("en-MY", { day, month: "short", year })`
- audit logs use `date-fns` with `dd/MM/yyyy hh:mm:ss a`
- OpenAI request logs use a page-local date/time formatter
- date input values use `YYYY-MM-DD`
- missing values are commonly displayed as `-`

References:

- `src/components/common/DateDisplay.tsx`
- `src/pages/AuditLogPage.tsx`
- `src/pages/OpenAiRequestLogPage.tsx`
- `src/components/forms/DatePickerInput.tsx`

Needs Verification: date/time display has multiple formats across modules.

## 22. Loading States

Loading is handled globally and locally.

Global:

- `src/services/loadingService.ts`
- `src/components/feedback/PageLoadingOverlay.tsx`
- `src/api/apiClient.ts`

`apiClient` starts global loading for requests unless `skipGlobalLoading` is set. `PageLoadingOverlay` displays a delayed full-page overlay with a spinner and "Loading...".

Local:

- `src/components/common/LoadingSkeleton.tsx`
- disabled submit/action buttons with spinner icons
- page-specific `isLoading` states

Use local skeletons inside table/card regions where the rest of the page should remain visible.

## 23. Empty States

`src/components/common/EmptyState.tsx` is the shared empty state.

Implementation:

- centered dashed bordered panel
- `Inbox` icon
- title
- optional description

Used by listing pages for empty result sets and sometimes for failed load states with error wording.

## 24. Error States

Error handling is split between:

- toasts for action failures
- `EmptyState` with error-oriented text in some listing areas
- `src/components/common/ErrorState.tsx` for retryable red error panels
- normalized API errors from `src/api/apiClient.ts`

Needs Verification: `ErrorState` exists but many pages use page-local error or empty-state handling instead.

## 25. Tooltips

`src/components/ui/tooltip.tsx` provides a custom tooltip.

Implementation:

- hover/focus state
- absolute positioned content
- dark background and white text
- no portal

Needs Verification: the tooltip implementation uses a repeated `id` value and is not Radix-backed, so it should not be assumed to provide complete accessibility behaviour.

## 26. Icons

Icons primarily come from `lucide-react`.

Common icon usage:

- navigation items in `src/config/navigation.ts`
- row actions
- buttons
- empty states
- filter/search controls
- detail summaries

Use existing lucide icons when adding UI. Avoid manually drawn SVG icons unless matching an existing asset or specialized requirement.

## 27. Colors

Primary tokens from `tailwind.config.js`:

- `brandGold`: `#D4AF37`
- `ink`: `#111111`
- `textPrimary`: `#1F2937`
- `textSecondary`: `#6B7280`
- `line`: `#E5E7EB`
- `soft`: `#F8F9FA`

Additional semantic colors are used directly through Tailwind classes, especially green, amber, red, blue, indigo, and purple for statuses.

Primary action color is `ink`; gold is used as an accent, not as the default button background.

## 28. Typography

Global font stack from `src/styles.css` and Tailwind config:

- Inter
- Segoe UI
- Roboto
- Arial
- sans-serif

Observed sizes:

- page title: `28px`
- modal title: `text-lg`
- section headings: `text-base` or `text-sm font-semibold`
- table body: `text-sm` or `text-[13px]`
- helper and metadata text: `text-xs` or `text-sm`

Letter spacing is usually normal. Table headers sometimes use uppercase and tracking for compact labels.

## 29. Spacing and Sizing

Common sizing:

- controls: `h-10` or `h-11`
- icon buttons: `h-9 w-9` or `h-10 w-10`
- card radius: `rounded-lg`
- panel padding: commonly `p-4`, `p-5`, or `p-6`
- table cell padding: commonly `px-4 py-3`
- page section gaps: commonly `gap-4` or `gap-6`

Modals and drawers set explicit max widths based on use case. Complex drawers use wide responsive panels to support dense details.

## 30. Responsive Design

Implemented responsive patterns:

- `PageHeader` stacks on mobile and aligns horizontally on large screens
- filter forms use responsive grids
- tables use horizontal overflow wrappers
- action areas use wrapping flex layouts
- modal width uses `calc(100% - 2rem)` or similar constraints
- drawers often become nearly full-width on small screens
- form steppers switch between horizontal overflow and desktop side navigation in `TrustPlanForm`

The app is responsive, but many workflows are data-table-heavy and rely on horizontal scrolling rather than fully transformed mobile cards.

## 31. Accessibility

Observed accessibility support:

- global focus-visible outline in `src/styles.css`
- many icon buttons include `aria-label`
- Radix Dialog and AlertDialog primitives provide stronger modal semantics where used
- search input has screen-reader label in `SearchInput`
- disabled states are applied during loading/submission
- labels are present for many form controls

Needs Verification:

- page-local drawers and custom modals may not trap focus
- custom tooltip accessibility is limited
- no full accessibility audit was found in source

## 32. Preferred UI Patterns

Use these as current references:

- Page header: `src/components/common/PageHeader.tsx`
- Buttons: `src/components/ui/button.tsx`
- Confirmation: `src/components/common/ConfirmDialog.tsx`
- Toasts: `src/services/notificationService.ts`
- Status badges: `src/components/common/StatusBadge.tsx`
- Row action menus: `src/components/common/TableActionMenu.tsx`
- Pagination: `src/components/common/Pagination.tsx`
- Empty state: `src/components/common/EmptyState.tsx`
- Loading skeleton: `src/components/common/LoadingSkeleton.tsx`
- Operational listings: `src/pages/TrustListingPage.tsx`, `src/pages/TrustDividendPage.tsx`, `src/pages/CommissionPage.tsx`
- Large multi-step form: `src/pages/trust-plan/TrustPlanForm.tsx`
- Expandable technical log rows: `src/pages/OpenAiRequestLogPage.tsx`

## 33. UI Patterns to Avoid

Avoid these unless matching an existing module intentionally:

- browser-native `alert` or `confirm`
- ad hoc primary button colors when `Button` variants fit
- new semantic status badge styles outside `StatusBadge`
- uncontrolled date, currency, or percentage formatting without checking existing module conventions
- adding a new drawer pattern without checking existing page-local drawers
- deeply nested card layouts
- using global toasts directly instead of `notificationService`
- relying on frontend role visibility as a security boundary

## Known Issues / Needs Verification

- Drawer implementation is not centralized. `Drawer.tsx` exists but most real drawers are page-local.
- Currency, percentage, date, and file-size formatting are not fully centralized.
- `DataTable` exists, but many major server-driven listings use custom table markup.
- Error display varies between toasts, `EmptyState`, `ErrorState`, and page-local messages.
- `src/pages/AgentsListingPage.tsx` has a page-local `StatusBadge` in addition to the shared `src/components/common/StatusBadge.tsx`.
- Tooltip accessibility and custom drawer focus management need verification before claiming accessibility compliance.
- Some pages use older or mock-style patterns, such as `src/pages/TrustPaymentPage.tsx`, and should not automatically be copied as current best practice.
