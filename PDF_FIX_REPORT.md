# Load Development PDF Fix Report

Date: 2026-07-09

## Authorised Scope

Repair only the confirmed Load Development PDF View/Download failure:

- Load Development Test Detail page: book/view PDF icon.
- Load Development Test Detail page: download PDF icon.
- Test View Modal: footer PDF button.

No unrelated stock, RLS, schema, auth, offline, navigation, UI redesign, or backend-function changes were made for this request.

## Exact Root Cause

The confirmed PDF actions used mobile-fragile browser APIs with no fallback and no user-visible failure state:

1. `TestDetailPage.handleViewPDF()` generated a Blob URL and called:
   - `window.open(url, '_blank', 'noopener,noreferrer')`
2. `LoadDevelopment` passed the same Blob URL + `window.open(...)` pattern into `TestViewModal`.
3. `TestDetailPage.handleExportPDF()` called:
   - `doc.save(...)`

These approaches can silently fail in iOS Safari, installed PWAs, WKWebView, Base44 mobile wrapper, and TestFlight builds due to popup restrictions, Blob URL handling limitations, and download/save restrictions. The previous UI had no loading state, Blob validation, fallback path, or user-facing error message.

## Files Changed

| File | Change | Why necessary |
|---|---|---|
| `src/utils/loadDevelopmentPdfActions.js` | New targeted helper for filename sanitisation, jsPDF document validation, Blob validation, preview URL creation, Web Share API save/share, anchor-download fallback, and safe URL cleanup | Keeps the fix scoped to Load Development PDF actions and avoids a broad app-wide PDF refactor |
| `src/components/load-development/LoadDevelopmentPdfPreview.jsx` | New lazy wrapper around existing `MobilePdfViewer` | Reuses the project’s existing in-app PDF preview path instead of relying on `window.open(blobUrl)` |
| `src/components/load-development/TestDetailPage.jsx` | Replaced `window.open(blobUrl)` preview and `doc.save(...)` download with validated helper calls, loading/disabled state, feedback message, and in-app preview rendering | Fixes the two confirmed broken Test Detail PDF buttons |
| `src/pages/LoadDevelopment.jsx` | Replaced modal footer PDF callback with validated in-app preview flow and loading/message state | Fixes the confirmed Test View Modal PDF button |
| `src/components/load-development/TestViewModal.jsx` | Added minimal `pdfLoading` / `pdfMessage` props and disabled/loading label for the footer PDF button | Gives visible feedback instead of silent failure |
| `CHANGE_PLAN_BEFORE_IMPLEMENTATION.md` | Required pre-change plan | Documents exactly which changes were authorised before implementation |
| `FULL_PRODUCTION_FUNCTIONAL_AUDIT.md` | Required audit deliverable | Documents broader findings without repairing them |
| `PDF_FIX_REPORT.md` | This report | Required post-fix deliverable |

## Behaviour Before

- View PDF icon generated a Blob URL and attempted to open a new tab/window.
- Modal PDF button generated a Blob URL and attempted to open a new tab/window.
- Download icon called jsPDF `save()` directly.
- Mobile users could tap the buttons and see no visible result.
- Failures were silent.
- No loading state appeared.
- No success/failure feedback appeared.
- No Blob size validation existed.
- Object URL cleanup was incomplete in the affected Load Development paths.

## Behaviour After

### View PDF icon

- Generates the PDF document.
- Validates the jsPDF document object.
- Converts to Blob.
- Validates Blob existence and size.
- Creates a Blob URL.
- Opens the PDF inside the existing in-app `MobilePdfViewer` path.
- Cleans up Blob URLs when preview closes/state changes.
- Shows loading/disabled state while preparing.
- Shows visible error feedback if generation fails.

### Download PDF icon

- Generates the PDF document.
- Validates the PDF Blob.
- Uses Web Share API with a real `File` when supported, which is more suitable for iOS/mobile save/share flows.
- Falls back to anchor download on browsers that support it.
- Shows loading/disabled state while preparing.
- Shows visible success/failure feedback.

### Test View Modal footer PDF button

- No longer uses `window.open(blobUrl)`.
- Generates and previews through the in-app PDF viewer.
- Shows loading and error feedback inside the modal.

## Tests Executed

| Test | Result | Evidence |
|---|---|---|
| `npm run build` | Passed | Vite build completed successfully after the PDF repair |
| `npm run lint` | Failed | Existing unrelated unused-import lint failures remain; not repaired because outside scope |
| `npm run typecheck` | Failed | Existing unrelated target-analyzer/type errors remain; not repaired because outside scope |
| Helper regression: filename + non-empty Blob + preview URL + empty Blob failure | Passed | `load-test-N160-41-7-gr-Test.pdf`, Blob URL created, Blob size 13, empty Blob rejected |
| Actual load-test PDF generation | Passed | Sample `generateLoadTestPDF()` output Blob size 7,764 bytes, 1 page |
| iOS Safari / PWA / WKWebView / Base44 mobile wrapper / TestFlight | BLOCKED | Requires physical/device-wrapper verification |

## Mobile Limitations

- Web Share API availability varies by browser/wrapper.
- Anchor download fallback may still behave as “open” rather than “save” on some iOS contexts.
- `MobilePdfViewer` uses `react-pdf` and a PDF.js worker URL; actual mobile wrapper behaviour still requires device verification.
- This fix removes the known fragile `window.open(blobUrl)` dependency from the confirmed Load Development PDF preview actions, but it does not prove TestFlight behaviour without physical testing.

## BLOCKED — REQUIRES DEVICE VERIFICATION

The following cannot be truthfully marked as passing from this environment:

- iPhone 17 Pro Max portrait mode.
- iOS Safari PDF preview.
- Installed PWA PDF preview/save/share.
- Base44 mobile wrapper PDF preview/save/share.
- TestFlight build PDF preview/save/share.
- Offline PDF generation/preview where the PDF.js worker may not be cached.

## Unresolved Items Not Changed

The full audit documents these issues, but they were intentionally not repaired:

1. Reports page PDF downloads still use `doc.save(...)`.
2. Ammo Summary PDF still uses `doc.save(...)`.
3. Some non-PDF actions still use `window.open` or `target="_blank"`.
4. App-wide lint failures remain.
5. App-wide typecheck failures remain.
6. RLS/privacy coverage across most entities is not proven.
7. Offline repository coverage is mixed with direct entity calls.
8. Stock/refund workflows require end-to-end transactional verification.

## Git / Change Safety

Changed functional files:

- `src/components/load-development/TestDetailPage.jsx`
- `src/components/load-development/TestViewModal.jsx`
- `src/pages/LoadDevelopment.jsx`
- `src/components/load-development/LoadDevelopmentPdfPreview.jsx`
- `src/utils/loadDevelopmentPdfActions.js`

Changed documentation files:

- `CHANGE_PLAN_BEFORE_IMPLEMENTATION.md`
- `FULL_PRODUCTION_FUNCTIONAL_AUDIT.md`
- `PDF_FIX_REPORT.md`

No unrelated files were intentionally modified for this request.

## Rollback Information

To roll back only the PDF repair:

1. Revert `src/components/load-development/TestDetailPage.jsx` to the previous direct `doc.save()` / `window.open(blobUrl)` handlers.
2. Revert `src/pages/LoadDevelopment.jsx` to its previous inline `onExportPDF` callback.
3. Revert `src/components/load-development/TestViewModal.jsx` to remove `pdfLoading` / `pdfMessage` props.
4. Delete `src/components/load-development/LoadDevelopmentPdfPreview.jsx`.
5. Delete `src/utils/loadDevelopmentPdfActions.js`.

Do not revert unrelated future audit fixes unless explicitly intended.