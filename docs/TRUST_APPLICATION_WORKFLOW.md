# Trust Application Workflow Notes

## Add/Edit Trust Application Skips Step 7

The add/edit trust application frontend currently skips the old Step 7 co-broker screen.

Current behavior:

- Step 6, `supporting-documents`, saves and moves agents directly to `review`.
- The `co-broker` route is hidden from normal navigation.
- If `/trust/applications/:id/co-broker` is opened directly, it redirects to `review`.
- Backend submission still uses step 8 for final review/submit.

Primary frontend file:

- `src/pages/TrustApplicationPage.tsx`

Places to check if Step 7 needs to be reopened in the future:

- `steps`: keep or re-add `{ slug: "co-broker", label: "Co-broker" }` as a visible step.
- `SupportingDocumentsStep`: change `onSaveNext` from `review` back to `co-broker` for agents.
- `isCoBroker` render branch: replace the redirect with the real `CoBrokerStep` UI.
- `getStepSlug`: remove the special `if (stepNumber === 7) return "review";` mapping.
- `normalizeHiddenCoBrokerStepNumber`: remove or change the `7 -> 8` normalization.
- `getVisibleApplicationSteps`: stop filtering out `co-broker`.

Related mapping is intentionally still present:

- `buildTrustApplicationStepPayload("co-broker", ...)` builds the Step 7 payload.
- `mapStep7ToDraft(...)` maps existing Step 7/co-broker API data into the draft.

If Step 7 is reopened later, keep backend numbering aligned: co-broker is step 7 and review submission remains step 8.
