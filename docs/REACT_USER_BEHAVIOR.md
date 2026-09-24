# React User Behavior Guide

This document records the current React user interaction conventions for
theTrust. Follow this guide when adding or updating pages, forms, API flows, and
confirmation actions.

## Core Rule

User feedback and loading behavior must be consistent across the app.

Do not create one-off alert boxes, browser `alert()` calls, raw confirm dialogs,
custom spinner markup, or direct API loading handlers in pages when an existing
shared pattern already exists.

Use these shared pieces:

- Toast messages: `src/services/notificationService.ts`
- Toast container: `src/components/feedback/AppToastContainer.tsx`
- Full page loading overlay: `src/components/feedback/PageLoadingOverlay.tsx`
- Loading service: `src/services/loadingService.ts`
- Submit buttons: `src/components/forms/SubmitButton.tsx`
- Confirm dialog: `src/components/common/ConfirmDialog.tsx`
- Informational alert dialog: `src/components/common/AppAlertDialog.tsx`
- shadcn/Radix alert primitives: `src/components/ui/alert-dialog.tsx`
- Central API client: `src/api/apiClient.ts`

## App-Level Feedback Mounting

`App.tsx` mounts feedback components globally:

```tsx
<>
  <AppRoutes />
  <PageLoadingOverlay />
  <AppToastContainer />
</>
```

Do not mount extra toast containers or duplicate global loading overlays inside
individual pages.

## Toast Messages

Use installed `react-toastify` through `notificationService`.

Allowed helpers:

```ts
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo
} from "../services/notificationService";
```

Use toast for:

- Successful form submit or saved changes.
- API validation error messages.
- Failed API actions.
- Non-blocking warnings.
- Informational prompts that do not require user confirmation.

Examples:

```ts
notifySuccess("Signed in successfully.", "login-success");
notifyError("Unable to save changes.", "profile-save-error");
notifyWarning("Please upload the required document.", "kyc-required");
notifyInfo("Draft saved.", "trust-draft-saved");
```

Always pass a stable `toastId` for common repeated messages. This prevents
duplicate stacked messages during repeated clicks, retries, or validation loops.

Do not use toast for decisions that require confirmation. Use `ConfirmDialog`
instead.

## Success and Error API Feedback

API calls should be wrapped in `try/catch`.

Success:

- Show `notifySuccess(...)` when the action changes data or completes an
  important workflow.
- Navigate only after the success toast is triggered when the action moves the
  user to another page.

Error:

- Show `notifyError(...)`.
- Prefer backend `Message` from normalized `ApiError` when available.
- Fall back to a friendly generic message.
- Do not leave the form disabled after an error.

Example:

```tsx
const submit = async (values: FormValues) => {
  try {
    await profileApi.updateProfile(values);
    notifySuccess("Profile updated successfully.", "profile-update-success");
  } catch (error) {
    notifyError(
      error instanceof Error ? error.message : "Unable to update profile.",
      "profile-update-error"
    );
  }
};
```

## Confirm Boxes

Use the shadcn/Radix-based `ConfirmDialog` for confirmation flows.

Use confirm dialog for:

- Delete actions.
- Submit/finalize actions that cannot be casually undone.
- Cancel/discard flows where user input may be lost.
- Payment submission or sensitive state transitions.

Example:

```tsx
const [confirmOpen, setConfirmOpen] = useState(false);

<button type="button" onClick={() => setConfirmOpen(true)}>
  Delete
</button>

<ConfirmDialog
  open={confirmOpen}
  title="Delete resource?"
  message="This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  destructive
  onClose={() => setConfirmOpen(false)}
  onConfirm={async () => {
    setConfirmOpen(false);
    await deleteResource();
  }}
/>
```

Use `destructive` for delete, remove, reject, or irreversible actions.

Do not use browser `window.confirm()`.

## Informational Alert Dialogs

Use `AppAlertDialog` only when a modal acknowledgement is needed.

Use `AppAlertDialog` for:

- Important notices that must be acknowledged.
- Completion messages where the user must click OK before continuing.
- Redirect-after-acknowledgement flows.

For normal success or error feedback, prefer toast.

## Full Page Loading Overlay

The app has a full page overlay with spinner:

- Component: `PageLoadingOverlay`
- Service: `loadingService`
- API integration: `apiClient` request/response interceptors

The overlay appears when:

- A centralized `apiClient` request is in progress.
- A route transition triggers the short route-loading delay.
- A page manually calls `beginLoading()` for non-`apiClient` async work.

The overlay hides when all tracked requests finish.

For API data loading, prefer calling backend endpoints through `apiClient`.
`apiClient` already starts and stops the global overlay through interceptors.

Manual loading is only for async work that does not go through `apiClient`.
Always end manual loading in both success and error paths.

Recommended manual pattern:

```ts
const loadingId = beginLoading();

try {
  await doNonApiAsyncWork();
} catch (error) {
  notifyError("Unable to complete action.", "action-error");
} finally {
  endLoading(loadingId);
}
```

Prefer `finally` for new code so the overlay cannot remain stuck after an
exception.

## Page Initial Data Loading

When a page needs API data before it is fully usable:

- Start loading when the API request begins.
- Show the full page overlay while data is loading.
- Hide the overlay when data is loaded or when the request fails.
- Show `notifyError(...)` on failure.
- Render an empty state or retry state when there is no data.

If the request uses `apiClient`, the overlay is automatic.

Example:

```tsx
useEffect(() => {
  let mounted = true;

  async function loadData() {
    try {
      const response = await trustApplicationApi.getById(trustId);
      if (mounted) setApplication(response.Data);
    } catch (error) {
      if (mounted) {
        notifyError("Unable to load application.", "application-load-error");
      }
    }
  }

  loadData();

  return () => {
    mounted = false;
  };
}, [trustId]);
```

Use local skeletons such as `LoadingSkeleton` only for partial sections that can
load independently while the rest of the page remains usable.

## Submit Button Behavior

Any button that submits a form or triggers an API write action must prevent
double-clicks.

Required behavior:

- Disable the button immediately when submission starts.
- Replace the normal button text with a spinner and loading text.
- Keep the button disabled while the API call is pending.
- Re-enable the button when the API returns success or error.
- Show success or error feedback after the API returns.

Use `SubmitButton` for form submits.

Current reference pattern from `LoginPage`:

```tsx
const {
  register,
  handleSubmit,
  formState: { isSubmitting }
} = useForm<FormValues>();

const submit = async (values: FormValues) => {
  try {
    await login(values.email, values.password);
    notifySuccess("Signed in successfully.", "login-success");
  } catch (caught) {
    notifyError("Something went wrong. Please try again.", "login-error");
  }
};

<form onSubmit={handleSubmit(submit)}>
  <SubmitButton loading={isSubmitting} loadingText="Signing in...">
    Sign in
  </SubmitButton>
</form>
```

`SubmitButton` already renders:

- `Loader2`
- `animate-spin`
- disabled state
- loading text

Do not hand-roll submit spinners in every page.

## Non-Form Action Button Behavior

For API actions outside a form, use a local pending state.

Example:

```tsx
const [saving, setSaving] = useState(false);

const save = async () => {
  if (saving) return;

  setSaving(true);

  try {
    await resourceApi.updateResource(id, payload);
    notifySuccess("Resource saved.", "resource-save-success");
  } catch (error) {
    notifyError("Unable to save resource.", "resource-save-error");
  } finally {
    setSaving(false);
  }
};

<button type="button" onClick={save} disabled={saving}>
  {saving ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Saving...
    </>
  ) : (
    "Save"
  )}
</button>
```

If the same pattern appears more than once, prefer extracting or extending a
shared button component instead of duplicating markup.

## Form Validation Feedback

Use inline validation for field-specific errors when the form already supports
it.

Use toast for:

- First validation error on submit.
- Cross-field validation errors.
- Backend validation errors.

Existing pattern:

```tsx
<form
  onSubmit={handleSubmit(
    submit,
    (formErrors) =>
      notifyError(
        getFirstFormError<FormValues>(formErrors),
        "login-validation-error"
      )
  )}
>
```

Use `getFirstFormError` when a form should show one clear submit-level
validation prompt.

## API Loading and Button Loading Are Separate

The global page overlay and the submit button spinner should both be active
during form submission.

They serve different purposes:

- Global overlay tells the user the page/app is processing an API request.
- Button spinner tells the user which action is currently being submitted.
- Disabled button prevents duplicate writes.

Do not remove button loading just because the global overlay exists.

## Implementation Checklist

Before finishing any page or action that calls the API, confirm:

- API calls go through `src/api/apiClient.ts` and a domain wrapper in `src/api/`.
- Success feedback uses `notifySuccess`.
- Error feedback uses `notifyError`.
- Confirmation flows use `ConfirmDialog`.
- Important acknowledgement flows use `AppAlertDialog`.
- Initial API loading shows the global overlay through `apiClient` or
  `beginLoading` / `endLoading`.
- Form submit buttons use `SubmitButton`.
- Submit buttons show spinner text and are disabled while pending.
- Non-form write buttons use local pending state and disable while pending.
- Pending state is reset in `finally` or by React Hook Form `isSubmitting`.
- Repeated toasts use stable `toastId` values.

## Anti-Patterns

Avoid these:

- Calling `axios` directly inside a page/component.
- Calling `fetch` directly for backend API traffic.
- Using `window.alert()`.
- Using `window.confirm()`.
- Adding another `ToastContainer`.
- Adding another full page loading overlay.
- Leaving buttons clickable during API write actions.
- Showing success/error messages only in the console.
- Swallowing API errors without user feedback.
- Manually setting `Content-Type: application/json` for `FormData`.
