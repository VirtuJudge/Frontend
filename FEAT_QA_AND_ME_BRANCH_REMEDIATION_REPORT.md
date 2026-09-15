# `feat/qa-and-me-page` Branch Remediation Report

## Purpose

This report reviews the implementation on `feat/qa-and-me-page`, compares it with `FULL_WORKFLOW_UPDATE_REPORT.md`, and defines the concrete work required before the branch can participate in the real frontend-backend-AI workflow.

This is a branch-specific implementation plan. It does not replace the general workflow report; it translates that report into changes for the code introduced by this branch.

## Review Snapshot

- Branch reviewed: `feat/qa-and-me-page`
- Branch head: `69c4ce5` (`fix: greeting message`)
- Merge base with `main`: `075a92d`
- Branch divergence at review time: 4 branch-only commits and 2 `main`-only commits
- Branch change size: 59 files, approximately 5,086 insertions and 172 deletions
- Current working tree was not checked out or modified during inspection

## Executive Summary

The branch implements a substantial amount of presentation-layer work:

- A complete-looking Q&A interface
- Browser audio recording and answer upload flow
- Skip-answer UI
- Speaker mapping UI
- A session report UI
- A `/me` page and navigation changes
- Unit/component tests for the new screens

However, it does not connect those screens to the backend lifecycle that creates AI work. The recording flow still creates a draft Practice Session and navigates directly to Q&A. It never makes the session ready and never creates an Analysis Attempt. As a result, the backend creates no AI Job, the AI worker has nothing to consume, and the Q&A request returns `409 questions_not_ready`.

The branch also introduces additional integration defects that are not visible in its mocked tests:

1. The Q&A completion button links to a report route that does not exist.
2. The report view models a response shape different from the backend response.
3. The speaker mapping page expects fields the Practice Session API does not return and substitutes fabricated speaker data.
4. The SSE helper cannot authenticate and discards named event types.
5. Waiting states do not poll the resources required to advance.
6. PDF download is implemented as a field on the report, while the backend uses an asynchronous export workflow.

The branch should not be merged as a working end-to-end feature until the P0 and P1 items in this report are complete.

## What the Branch Already Implements

The following work is useful and should be retained where possible.

### Q&A presentation layer

The branch adds:

- `features/qa/qa-stage-view.tsx`
- `features/qa/question-card.tsx`
- `features/qa/qa-stepper.tsx`
- `features/qa/judges-questions-modal.tsx`
- `features/qa/review-draft-modal.tsx`
- `features/qa/skip-question-modal.tsx`
- `features/qa/qa-analyzing-card.tsx`
- `features/qa/qa-completed-card.tsx`
- `app/(auth)/sessions/[sessionId]/qa/page.tsx`

These components provide a strong visual foundation for the active-question, recording, review, skip, answer-analysis, and completion states.

### Answer audio capture

`features/qa/hooks/use-audio-recorder.ts` includes:

- Browser capability checks
- MIME type selection
- Media stream cleanup
- Recording duration tracking
- A two-minute maximum duration
- Draft playback and re-recording support

This can remain the basis of the answer recorder after the API and state-machine issues are addressed.

### Answer submission sequence

`features/qa/hooks/use-qa-session.ts` attempts the correct high-level sequence:

```text
create answer upload intent
  -> upload audio to object storage
  -> submit answer metadata/checksum
  -> refresh the Q&A Round
```

The endpoint names match the backend. Error handling, waiting semantics, and checksum behavior still require changes described below.

### Speaker mapping request method

The branch changes speaker mapping from `POST` to the backend's actual `PUT` route and supports an `If-Match` header. This is directionally correct.

### Test coverage foundation

The branch adds component and hook tests for Q&A, speaker mapping, audio recording, and reports. These tests are valuable, but their fixtures reproduce frontend assumptions rather than real backend schemas. They should be converted into contract-backed tests instead of discarded.

## Validation Evidence

### Existing branch checks

The branch was extracted into an isolated temporary directory and tested without changing the current checkout.

```text
npm run typecheck
  -> passed

npm test -- --run \
  tests/session-storage-and-create.test.tsx \
  tests/use-qa-session.test.ts \
  tests/qa-components-and-page.test.tsx \
  tests/speaker-mapping-view.test.tsx \
  tests/session-report-view.test.tsx
  -> 5 test files passed
  -> 31 tests passed
```

### Contract-aware workflow check

A deterministic static harness checked the branch for the commands and routes required by the real workflow.

```text
FAIL lifecycle: recording submission lacks updatePracticeSession and/or createAnalysisAttempt
FAIL endpoint: branch still lacks /analysis-attempts
FAIL route: completion links to /report but no report route exists
FAILURES=3
```

This explains why the branch's green test suite does not prove that the user journey works.

## Comparison With the Existing Frontend Workflow Report

| Existing report requirement | Branch state | Result |
|---|---|---|
| Make the draft session ready with `PATCH` and `If-Match` | No `updatePracticeSession` client method or call | Missing |
| Create an Analysis Attempt with consent | Still defines unused `/start-analysis`; no `/analysis-attempts` call | Missing |
| Navigate to a waiting/state coordinator | Navigates directly from recording to `/qa` | Missing |
| Normalize backend `status` to frontend state | Types and components require `state` directly | Missing |
| Reconcile `qa_in_progress` and `questions_in_progress` | Branch still uses `qa_in_progress` | Missing |
| Treat `questions_not_ready` as a waiting state | Q&A page renders a terminal error card | Missing |
| Authenticated named-event SSE | Uses unauthenticated native `EventSource` and emits every event as `message` | Missing |
| Polling fallback during initial analysis | Polling only starts after an answer submission | Missing |
| Recover canonical state after refresh | Q&A does fetch session and round, but cannot route correctly from session status | Partial |
| Map backend Problem Details to user actions | Generic error messages with limited status inspection | Partial |
| Assert the full start sequence in tests | Test asserts only session creation and direct Q&A navigation | Missing |
| Display final report from backend contract | Report screen exists but uses an incompatible DTO | Incorrect |

## Required Remediation

## P0 — Restore the Workflow Entry Point

### 1. Rebase or merge the current `main` before implementation

The branch is based on `075a92d`, while `main` contains the committed general workflow report. Bring the branch up to date first so the implementation and its documentation live together.

Do not resolve this by dropping the branch's feature files. The goal is to retain the Q&A UI while repairing its integration seams.

### 2. Replace the obsolete analysis API

In `lib/api/client.ts`, remove:

```text
POST /practice-sessions/{sessionId}/start-analysis
```

Add:

```ts
interface CreateAnalysisAttemptInput {
  consent: {
    accepted: boolean;
    policy_version: number;
  };
}

interface AnalysisAttempt {
  id: string;
  session_id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  created_at: string;
  attempt_number: number;
  version: number;
  idempotency_key?: string;
}
```

The client method must call:

```text
POST /practice-sessions/{sessionId}/analysis-attempts
Idempotency-Key: <fresh key of at least 16 characters>
Content-Type: application/json

{
  "consent": {
    "accepted": true,
    "policy_version": 1
  }
}
```

Return `AnalysisAttempt`, not `PracticeSession`.

### 3. Add `updatePracticeSession`

Add a typed method that calls:

```text
PATCH /practice-sessions/{sessionId}
If-Match: "{session.version}"
```

The request should use canonical asset version IDs:

- `presentation_asset_version_id`
- `supporting_document_version_ids`
- `name`
- `rubric`

The method must return the updated Practice Session and retain the response ETag when the client architecture supports response metadata.

### 4. Rewrite recording submission as a complete transaction

Update `app/(auth)/projects/[projectId]/session/record/page.tsx`.

The current branch performs:

```text
complete presentation upload
  -> create Practice Session
  -> save session ID locally
  -> navigate to Q&A
```

Replace it with:

```text
complete presentation upload
  -> create draft Practice Session
  -> PATCH the session using its version
  -> verify normalized state is ready
  -> create Analysis Attempt with explicit consent
  -> persist convenience identifiers locally
  -> navigate to /sessions/{id}
```

Do not navigate if the readiness update or Analysis Attempt call fails. Preserve the created session ID so the user can retry safely.

Generate one idempotency key per logical command and reuse the same key only when retrying that identical command and payload.

### 5. Turn `/sessions/[sessionId]` into the workflow coordinator

The branch currently uses `/sessions/[sessionId]` as the final report page. That route should instead load the canonical Practice Session and direct the user based on state.

Recommended routing behavior:

| Normalized session state | Behavior |
|---|---|
| `draft` | Show preparation failure/retry; do not claim AI is running |
| `ready` | Retry Analysis Attempt creation if the original command failed |
| `analyzing` | Show analysis progress and wait |
| `questions_ready` | Offer speaker mapping when real labels are available, otherwise enter Q&A |
| `questions_in_progress` | Redirect to `/sessions/{id}/qa` |
| `report_generating` | Show report-generation waiting state |
| `completed` | Redirect to `/sessions/{id}/report` |
| `failed` | Show safe failure and retry action when allowed |
| `cancelled` | Show terminal cancellation state |

Create a real report route at:

```text
app/(auth)/sessions/[sessionId]/report/page.tsx
```

This also fixes the existing completion link in `qa-completed-card.tsx`.

## P0 — Align Frontend Types With Executable Backend Schemas

### 6. Separate wire DTOs from UI models

The backend Practice Session response currently contains:

```text
id
project_id
created_by
name
status
version
created_at
updated_at
manifest
rubric
```

It does not currently contain the branch's required `state`, `team_id`, `manifest_frozen`, top-level presentation/document IDs, stage list, speaker mappings, limitations, or failure.

Define a `PracticeSessionResponse` matching the wire payload exactly, then normalize it into a smaller UI model. At minimum:

```ts
type BackendSessionStatus =
  | "draft"
  | "ready"
  | "analyzing"
  | "failed"
  | "questions_ready"
  | "questions_in_progress"
  | "report_generating"
  | "completed"
  | "cancelled";

interface SessionViewModel {
  id: string;
  projectId: string;
  name?: string;
  state: BackendSessionStatus;
  version: number;
  manifest?: SessionManifestResponse;
}
```

Do not use type assertions to pretend backend fields exist. Normalize once at the API boundary.

### 7. Use the backend's actual state name

Replace frontend `qa_in_progress` with `questions_in_progress`, unless the backend team formally changes the public contract. The executable backend currently emits `questions_in_progress`.

### 8. Derive team membership through supported resources

The speaker page reads `session.team_id`, but the backend Practice Session response does not include it.

Use this supported chain:

```text
Practice Session.project_id
  -> GET project
  -> project.team_id
  -> GET team members
```

Alternatively, request a backend contract addition. Do not keep `team_id` as a required Practice Session field unless the backend begins returning it.

## P1 — Make Initial Analysis and Question Generation Recoverable

### 9. Handle `409 questions_not_ready` as workflow state

`useQASession` currently fetches the Q&A Round immediately and exposes any query error as terminal. The page then shows “Unable to Load Q&A.”

Change the hook so it:

1. Fetches the Practice Session first.
2. Enables the Q&A query only for `questions_ready` or `questions_in_progress`.
3. Treats `questions_not_ready` as nonterminal while the session is `analyzing`.
4. Polls the Practice Session every 3–5 seconds while it is nonterminal.
5. Stops polling when completed, failed, or cancelled.
6. Refetches the Q&A Round when the state becomes ready.

The user must see the difference between:

- A session that never started analysis
- A session actively being analyzed
- A failed analysis
- Questions ready for interaction

### 10. Do not silently hide excess questions

The hook slices primary questions to three and follow-ups to two. This makes an invalid backend payload look valid.

Keep the UI caps for defensive rendering, but also:

- Sort questions deterministically by kind/position.
- Validate that exactly three primary questions exist before starting Q&A.
- Surface a safe data-integrity error when the invariant is violated.
- Emit telemetry with the session and trace identifiers.

### 11. Base “analyzing answer” on canonical state

The current `analyzingQuestionId` heuristic can end early or remain stale because it compares a local ID with the currently derived active question.

Use server data to distinguish:

- Audio upload in progress
- Answer accepted and awaiting AI analysis
- Follow-up question available
- Q&A Round completed
- Report generation started

Continue polling both session and round while awaiting an AI result, even if the active question changes or becomes null.

### 12. Fail safely when checksum calculation fails

The branch substitutes an all-zero SHA-256 checksum if hashing fails. That value is syntactically valid but does not describe the uploaded audio and should be rejected by the backend.

Remove the fallback. Stop submission and show a retryable client error if the checksum cannot be computed.

### 13. Always send a skip request body

The backend declares `SkipQuestionRequest` as a required JSON body. The branch omits the body when no reason is supplied.

Always send one of:

```json
{"reason": null}
```

or:

```json
{}
```

Add a client test for skipping without a reason.

## P1 — Repair Realtime Updates

### 14. Replace native `EventSource` with an authenticated SSE transport

The branch reads bearer tokens for normal API calls, but native `EventSource` cannot attach the `Authorization` header required by the backend.

Use an authenticated fetch-based SSE parser or a secure same-origin server proxy. Do not put the bearer token in the URL.

### 15. Preserve named SSE events

The current helper only assigns `onmessage` and converts every delivered event to:

```ts
event: "message"
```

The hook therefore never matches backend names such as:

- `practice_session.updated.v1`
- `practice_session.analysis_progressed.v1`
- `qa.question_available.v1`
- `qa.answer_updated.v1`
- `report.ready.v1`
- `practice_session.resync_required.v1`

Parse and preserve `event`, `id`, and `data` from each SSE frame.

### 16. Resume with the `Last-Event-ID` header

The helper adds `lastEventId` as a query parameter. The backend reads the standard `Last-Event-ID` header instead.

The replacement transport must:

- Send `Last-Event-ID` on reconnect
- Persist the last successfully applied event ID for the page lifetime
- Detect a resync event or sequence gap
- Refetch canonical REST resources after a gap
- Use polling as a fallback when streaming fails

## P1 — Make Speaker Mapping Real and Reachable

### 17. Remove fabricated diarization data

When the Practice Session has no mappings, `speaker-mapping-view.tsx` creates `SPEAKER_00`, `SPEAKER_01`, timestamp ranges, and transcript quotations locally.

This is unacceptable for a grounded evaluation workflow. The UI labels those strings “Authorized Transcript Preview,” even though they are fabricated.

Replace the fallback with an honest empty/waiting state. Never invent:

- Speaker labels
- Transcript quotations
- Segment times
- Detected-speaker counts

### 18. Establish a read contract for detected speakers

The backend currently exposes a `PUT /speaker-mappings` command but no frontend-readable list of detected speaker labels/previews in the Practice Session response.

Before enabling this screen, agree on one of:

1. A `GET /practice-sessions/{id}/speaker-mappings` response containing detected labels, existing mappings, and safe preview segments.
2. A dedicated diarization-result endpoint.
3. An expanded Practice Session detail response.

The frontend cannot implement correct speaker mapping from the current response alone.

There is also a backend integration blocker: the default diarization reader currently returns an empty label set, causing the mapping command to return `409 analysis_not_ready` in the normal runtime. Track this with the backend/AI owners.

### 19. Route into speaker mapping deliberately

The branch defines `/sessions/[sessionId]/speaker-mapping`, but no production code links or redirects to it.

The workflow coordinator should offer or open speaker mapping only when:

- Analysis has produced real speaker labels.
- The user has permission to map them.
- Q&A can safely continue if mapping is skipped.

### 20. Keep optimistic concurrency strict

Simplify `saveSpeakerMappings` to require a numeric version or complete ETag. Do not overload one string parameter to mean either an ETag or idempotency key.

The backend requires `If-Match` and does not require an idempotency key for this `PUT`. Type the response as `SpeakerMappingResponse[]`, update local mappings from it, and store the returned ETag/version for subsequent edits.

## P1 — Repair the Report Feature

### 21. Match the actual report payload

The branch expects:

```text
id
session_id
status
team_score
team_feedback as string
member_feedback[].speaker_id
member_feedback[].score
member_feedback[].areas_for_improvement
member_feedback[].transcript_citations
created_at
pdf_download_url
```

The backend returns:

```text
schema_version
report_id
practice_session_id
evaluation_id
title
executive_summary
overall_score
score_components[]
team_feedback as a structured object
member_feedback[] with display_name, speaker_labels, findings, and components
transcript_timeline[]
document_alignment[]
qa_review[]
recommendations[]
limitations[]
reproducibility
generated_at
```

Replace the branch `Report` type and update `SessionReportView` to render the actual structure.

Important scoring detail: `overall_score` is normalized from `0.0` to `1.0`. Display it as `Math.round(overall_score * 100)`, not `Math.round(overall_score)`.

### 22. Poll report readiness from session state

`GET /report` returns `409` until the report exists. The branch shows a manual Try Again button but does not poll.

While the session is `report_generating`:

- Poll the Practice Session.
- Retry the report when state becomes `completed` or on `report.ready.v1`.
- Stop on `failed` or `cancelled`.
- Preserve a manual retry button for degraded connectivity.

### 23. Implement the backend PDF export workflow

The report payload does not include `pdf_download_url`. The backend workflow is:

```text
POST /practice-sessions/{sessionId}/report/pdf
  -> receive ReportExport
  -> poll GET /report-exports/{exportId}
  -> when ready, POST /report-exports/{exportId}/download-intents
  -> open the returned signed download URL
```

Add typed client methods and explicit queued, ready, failed, and expired-link states. `window.print()` may remain as a separate “Print” action, but it is not a replacement for the server-generated PDF export.

## P2 — Replace Mock-Consistent Tests With Contract Tests

### 24. Fix recording workflow coverage

`tests/session-storage-and-create.test.tsx` currently mocks `startAnalysis` but never asserts that it is called. It also returns a fabricated Practice Session with `state: "ready"`, even though the backend create response uses `status` and the real session was observed in `draft`.

Replace the successful-path assertion with this ordered expectation:

```text
completeUpload
  -> createPracticeSession
  -> updatePracticeSession with version/If-Match
  -> createAnalysisAttempt with consent
  -> navigate to /sessions/{id}
```

Add failure cases for every boundary and assert that later calls/navigation do not happen after a failure.

### 25. Generate fixtures from backend schemas

The current tests hand-write frontend-shaped objects, allowing incompatible fields to go unnoticed.

Use one of:

- Generated TypeScript types from the backend OpenAPI document
- Checked-in JSON contract fixtures exported from backend integration tests
- A shared schema package used by both applications

At minimum, add fixtures for:

- Practice Session response
- Analysis Attempt response
- Q&A Round response
- Speaker Mapping response
- Report payload
- Report export response
- Problem Details

### 26. Add branch-specific regression tests

Required tests:

#### Lifecycle

- Draft session becomes ready before analysis creation.
- Consent and idempotency headers are present.
- Refresh during analysis resumes waiting.
- `409 questions_not_ready` does not render a terminal failure while analyzing.

#### Q&A

- Named SSE question events trigger a refetch.
- Polling advances to a follow-up when SSE is unavailable.
- Skip without a reason sends a valid JSON body.
- Checksum failure prevents upload submission.
- A fourth primary question creates an integrity signal instead of being silently hidden.

#### Speaker mapping

- No fabricated speakers appear when labels are unavailable.
- The page obtains team ID through a supported resource.
- `If-Match` is always supplied.
- A `412` refetches canonical data before retry.
- The route is reachable from `questions_ready`.

#### Reports

- The completion link resolves to an existing route.
- A real backend-shaped payload renders correctly.
- A normalized `0.76` score displays as `76`.
- Report generation polls until ready.
- PDF export follows create, poll, and download-intent steps.

### 27. Add one real cross-service browser test

The release-gating test should run against a deterministic backend and worker fixture, not only mocked client methods.

It must prove:

1. The presentation and document versions are verified.
2. The frontend creates the session.
3. The frontend makes it ready.
4. The frontend creates exactly one Analysis Attempt.
5. Exactly one AI Job is recorded.
6. The waiting screen survives refresh.
7. Three primary questions become visible.
8. An answer can be uploaded and submitted.
9. The next question or completion state arrives.
10. The final backend-shaped report renders.

## Recommended File-Level Plan

| File/area | Required change |
|---|---|
| `lib/api/types.ts` | Replace assumed session/report types with wire DTOs and normalized view models; add attempt/export/mapping types |
| `lib/api/client.ts` | Add PATCH session, create attempt, report export/status/download methods; correct skip body and mapping signature |
| `lib/api/sse.ts` | Replace native EventSource implementation with authenticated named-event parsing and header-based resume |
| `app/(auth)/projects/[projectId]/session/record/page.tsx` | Execute create, ready, consent/attempt, then coordinator navigation |
| `app/(auth)/sessions/[sessionId]/page.tsx` | Convert report-only page into the canonical state coordinator |
| `app/(auth)/sessions/[sessionId]/report/page.tsx` | Add the missing report route |
| `features/qa/hooks/use-qa-session.ts` | Gate Q&A by status, repair waiting/polling, validate question invariants, remove checksum fallback |
| `features/qa/qa-completed-card.tsx` | Keep `/report` link after the route exists; display server state rather than local completion alone |
| `features/session/speaker-mapping-view.tsx` | Remove fake data, use a real label source, derive team correctly, preserve ETag concurrency |
| `features/reports/session-report-view.tsx` | Render the actual structured report and normalized scoring scale |
| `tests/session-storage-and-create.test.tsx` | Assert the full lifecycle and negative paths |
| Q&A/report/mapping tests | Replace fabricated schemas with backend contract fixtures |
| `tests/e2e/app.spec.ts` | Add the cross-service release-gating workflow |

## Recommended Delivery Order

1. Bring the branch up to date with `main`.
2. Introduce exact wire DTOs and response adapters.
3. Add `updatePracticeSession` and `createAnalysisAttempt`.
4. Repair recording submission and add its red/green regression test.
5. Convert the session root route into a state coordinator.
6. Gate Q&A fetching and add initial-analysis polling.
7. Repair authenticated SSE while retaining polling fallback.
8. Correct answer submission edge cases.
9. Add the missing report route and real report DTO rendering.
10. Implement asynchronous PDF export.
11. Remove fake speaker data and integrate a backend-supported detected-speaker source.
12. Add contract tests and the cross-service browser test.

This order restores the critical path before polishing optional screens.

## Cross-Team Blockers

The frontend branch cannot complete the whole journey by itself.

### Backend/API

- Confirm `status` and `questions_in_progress` as the public Practice Session contract, or change the backend and regenerate clients.
- Expose detected speaker labels and safe previews through a read endpoint if speaker mapping is required.
- Make the production diarization reader return labels for the active attempt.
- Provide a stable OpenAPI artifact or generated client workflow.

### AI worker

- Consume the backend's Celery task/queue protocol.
- Send valid progress, questions, answer-analysis, and report callbacks.
- Generate exactly three primary questions and no more than two follow-ups.

Until the queue integration is fixed, the corrected frontend will successfully create an AI Job but remain in analysis waiting.

## Acceptance Criteria

The branch is ready to merge as an end-to-end workflow only when all of the following are true:

- Recording submission creates a session, makes it ready, and creates one Analysis Attempt.
- The UI never says “generating questions” unless an attempt exists.
- Refreshing during analysis resumes from backend state.
- `questions_not_ready` is a waiting condition while analysis is active.
- Q&A begins only after a real Q&A Round exists.
- Authenticated SSE preserves named events; polling covers stream failure.
- Answer submit and skip requests match backend schemas.
- No speaker label, quote, timestamp, score, or report field is fabricated.
- Speaker mapping is reachable only when real diarization data exists.
- The final-report link resolves to a real route.
- The report renders the backend payload and scales normalized scores correctly.
- PDF export uses the backend export endpoints.
- Tests use backend-shaped fixtures and fail when lifecycle calls are removed.
- One browser test proves the full workflow through final report generation.

## Definition of Done

The feature is done when a user can record a presentation on this branch, start a canonical Analysis Attempt, wait through document and presentation analysis, receive three grounded questions, submit or skip answers, optionally map real detected speakers, and view/download the final report without manual retries, database edits, fake data, or route errors.
