# Change Plan Before Implementation

## Scope Control

This document separates the authorised PDF repair from the full-application audit. Only items classified as **AUTHORISED PDF FIX** may be implemented now. All other findings remain audit-only and must not be modified without explicit approval.

## Proposed File Modifications

| File path | Function/component to change | Why the change is necessary | Confirmed bug fixed | Dependencies/callers affected | Regression risk | Classification |
|---|---|---|---|---|---|---|
| `src/utils/loadDevelopmentPdfActions.js` | New targeted helper: PDF document validation, Blob creation, filename creation, preview URL creation, mobile-aware save/share/download handling, safe URL cleanup | Current Load Development PDF actions directly use `window.open(blobUrl)` and `doc.save()`, both of which can silently fail in iOS Safari, installed PWAs, WKWebView, Base44 mobile wrapper, and popup-restricted mobile contexts. A small helper keeps the fix limited to Load Development PDF actions and avoids broad PDF architecture changes. | Broken Load Development PDF View/Download actions on mobile | Called only by Load Development PDF UI after implementation | Low-to-medium: browser differences around Web Share API and downloads; scoped to Load Development PDFs only | AUTHORISED PDF FIX |
| `src/components/load-development/LoadDevelopmentPdfPreview.jsx` | New focused wrapper around existing `MobilePdfViewer` loaded lazily | Preview must not rely only on opening a blob URL in a new tab. Existing `MobilePdfViewer` is the suitable in-app preview path, but it should be loaded lazily to avoid making the main Load Development screen heavier. | Broken PDF View action in mobile app | Used only by `TestDetailPage` and optionally modal preview path | Low: isolated preview component; no business logic | AUTHORISED PDF FIX |
| `src/components/load-development/TestDetailPage.jsx` | `handleViewPDF`, `handleExportPDF`, local PDF UI state, preview modal rendering, loading/disabled/error feedback | Current handlers call `window.open(blobUrl)` and `doc.save()` directly with no validation, no mobile fallback, no visible failure, and no loading state. | Book/view PDF icon and download PDF icon do nothing or fail silently on mobile | Calls `generateLoadTestPDF`, new helper, and preview component; no stock/entity logic | Medium: touches visible buttons; scoped only to PDF handlers and rendering | AUTHORISED PDF FIX |
| `src/pages/LoadDevelopment.jsx` | Modal PDF export callback state/handler and feedback for `TestViewModal` footer PDF button | The modal currently generates a blob URL and calls `window.open`, which is the same mobile failure pattern. | Test View Modal footer PDF button does nothing/fails silently on mobile | Calls `generateLoadTestPDF`, new helper; passes state/label to modal | Low-to-medium: scoped to modal PDF button only | AUTHORISED PDF FIX |
| `src/components/load-development/TestViewModal.jsx` | PDF footer button disabled/loading/error label support only | The modal button currently has no loading or failure feedback. Needs minimal prop support so the parent can show action progress. | Test View Modal footer PDF button appears available but gives no visible feedback | Called by `LoadDevelopment`; no data or business logic affected | Low: display-state only | AUTHORISED PDF FIX |
| `FULL_PRODUCTION_FUNCTIONAL_AUDIT.md` | Audit deliverable | Required audit output. Documents issues only; no repairs. | N/A | None | None | AUDIT ONLY / DO NOT MODIFY |
| `PDF_FIX_REPORT.md` | Post-fix report | Required post-fix deliverable. | N/A | None | None | AUDIT ONLY / DO NOT MODIFY |

## Explicitly Not Authorised for Modification

The following areas may be inspected and documented only:

- Entity schemas and RLS rules
- Offline repository, queue, and sync logic
- Stock deduction/refund/reversal logic
- Authentication
- Navigation and route architecture
- Non-Load-Development PDF/report flows
- Backend functions
- App-wide UI redesign or modal redesign
- Broad refactoring or dependency upgrades

## Pre-change Root-Cause Hypothesis

The confirmed PDF failure is most likely caused by mobile/WebView-incompatible output handling rather than PDF document generation itself:

- `TestDetailPage.handleViewPDF()` generates a blob URL then calls `window.open(blobUrl, '_blank', ...)`.
- `LoadDevelopment` passes the same blob URL + `window.open` pattern to `TestViewModal`.
- `TestDetailPage.handleExportPDF()` calls `doc.save(...)`, which can silently fail or produce no visible user result in iOS/PWA/WKWebView contexts.
- There is no Blob validation, no user-visible error, no loading state, no fallback, and no in-app PDF preview path for these actions.

This plan authorises only a tightly scoped repair for those PDF paths.