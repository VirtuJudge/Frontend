# Frontend Full Workflow Update Report

## Purpose

This report defines the frontend work required to make the VirtuJudge Practice Session workflow operate correctly with the current backend and AI worker contracts.

The affected journey is:

1. Record and upload a presentation.
2. Select supporting documents.
3. Create and prepare a Practice Session.
4. Start an Analysis Attempt with explicit consent.
5. Show analysis progress while the AI worker processes speech, vision, audio, and documents.
6. Enter the Q&A Round when the three Primary Questions are ready.
7. Submit or skip answers.
8. Wait for report generation.
9. Display the final Evaluation and Report.

## Executive Summary

The current frontend stops after creating a draft Practice Session and immediately opens the Q&A page. It does not perform the two commands required to start analysis:

- `PATCH /practice-sessions/{session_id}` to validate the manifest and transition the session from `draft` to `ready`.
- `POST /practice-sessions/{session_id}/analysis-attempts` to record consent, freeze the manifest, create an Analysis Attempt, and enqueue an AI Job.

The existing `startAnalysis` client method is unused and targets an endpoint that the backend does not expose. The frontend also has response-model drift, incomplete waiting behavior, and a nonfunctional SSE implementation.

These issues are confirmed by the affected production data:

- The inspected Practice Session remains `draft`.
- Its presentation and three supporting documents are all verified.
- It has no Analysis Attempt and no AI Job.
- All ten Practice Sessions created during the inspected 24-hour period remained `draft`.

## Confirmed Failure Path

The recording submission currently does this:

```text
upload presentation
  -> complete presentation upload
  -> create Practice Session
  -> navigate directly to /sessions/{session_id}/qa
```

The required path is:

```text
upload presentation
  -> complete presentation upload
  -> create Practice Session (draft)
  -> update Practice Session with If-Match (ready)
  -> create Analysis Attempt with consent (analyzing)
  -> show analysis progress
  -> wait for questions_ready
  -> optionally map detected speakers
  -> enter Q&A Round
```

## Required Updates

### 1. Implement the complete session-start transaction

After `createPracticeSession` returns:

1. Read `session.version` from the response.
2. Call `PATCH /practice-sessions/{session.id}` with `If-Match: "{session.version}"`.
3. Send the canonical presentation version, supporting document versions, name, and rubric.
4. Confirm that the returned status is `ready`.
5. Call `POST /practice-sessions/{session.id}/analysis-attempts`.
6. Include a fresh `Idempotency-Key`.
7. Send:

```json
{
  "consent": {
    "accepted": true,
    "policy_version": 1
  }
}
```

8. Confirm that the response is an `AnalysisAttempt`.
9. Navigate to an analysis waiting screen instead of directly assuming Q&A is ready.

Do not hide a failed readiness or analysis-start request by navigating to Q&A. Keep the user on the submission screen and display the backend Problem Details message.

### 2. Replace the obsolete `startAnalysis` API method

The current client calls:

```text
POST /practice-sessions/{session_id}/start-analysis
```

That route does not exist in the backend contract. Replace it with a method such as:

```ts
createAnalysisAttempt(
  sessionId: string,
  consent: { accepted: boolean; policy_version: number },
  idempotencyKey: string,
): Promise<AnalysisAttempt>
```

It must call `POST /practice-sessions/{session_id}/analysis-attempts` and return an `AnalysisAttempt`, not a `PracticeSession`.

### 3. Add an `updatePracticeSession` client method

Add a client method for:

```text
PATCH /practice-sessions/{session_id}
If-Match: "{version}"
```

It should support:

- `name`
- `presentation_asset_version_id`
- `supporting_document_version_ids`
- `rubric`

Handle `412 precondition_failed` by refetching the session and retrying only with the latest version. Do not silently reuse a stale ETag.

### 4. Align Practice Session response types

The frontend expects a `state` field and several fields that the backend response does not currently emit. The backend currently emits `status`.

Choose one canonical contract with the backend team. The shared documentation currently uses `state`, while the executable backend schema uses `status`. Until the backend contract is corrected, normalize API responses in one adapter rather than spreading `status ?? state` checks throughout components.

Recommended normalized frontend model:

```ts
interface PracticeSession {
  id: string;
  project_id: string;
  state: SessionState;
  version: number;
  name?: string;
  manifest?: SessionManifest;
  current_attempt?: number;
  current_question_id?: string;
  stages: StageProgress[];
  limitations: Limitation[];
  failure?: SafeFailure;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

Avoid TypeScript casts that claim missing response fields exist.

Also reconcile these state names:

- Frontend/documentation: `qa_in_progress`
- Current backend implementation: `questions_in_progress`

Only one value should cross the public API boundary.

### 5. Add an analysis waiting screen

The frontend needs a state-driven screen between recording submission and Q&A.

| State | Frontend behavior |
|---|---|
| `draft` | Show preparation failure or resume the readiness command. |
| `ready` | Show a start-analysis retry action if no attempt was created. |
| `analyzing` | Display stage progress and continue waiting. |
| `questions_ready` | Navigate to speaker mapping or Q&A. |
| `qa_in_progress` | Open the current Q&A Round. |
| `report_generating` | Show report generation progress. |
| `completed` | Navigate to the final report. |
| `failed` | Show the safe failure, retryability, and retry action. |
| `cancelled` | Show the terminal cancellation state. |

The screen must recover after refresh. Its state must come from the backend, not only local storage.

### 6. Treat `questions_not_ready` as a waiting condition when appropriate

The Q&A query currently turns backend `409 questions_not_ready` into a terminal error card.

Update the behavior:

1. Fetch the Practice Session first or in parallel.
2. If Q&A returns `409 questions_not_ready` and the session is `analyzing`, continue waiting and poll session progress.
3. If the session is `draft`, state that analysis has not started.
4. If the session is `ready`, offer to retry creation of the Analysis Attempt.
5. If the session is `failed`, show its safe failure.
6. Fetch the Q&A Round only after `questions_ready`, or retry it when that state is observed.

Use bounded polling as a fallback even after SSE is repaired. A suggested interval is 3–5 seconds with backoff after prolonged inactivity.

### 7. Repair SSE authentication and named-event handling

The current helper uses native `EventSource`, which cannot attach the required bearer `Authorization` header. It also handles only `onmessage`, while the backend emits named events:

- `practice_session.updated.v1`
- `practice_session.analysis_progressed.v1`
- `qa.question_available.v1`
- `qa.answer_updated.v1`
- `report.ready.v1`
- `practice_session.resync_required.v1`

The hook checks those names, but the helper rewrites every received generic event to `message`, so its invalidation branches cannot run.

Choose one supported authentication design:

1. Preferred: implement an authenticated fetch-based SSE client that attaches the bearer token and parses SSE frames.
2. Alternative: expose a same-origin server route that reads a secure server-side session and forwards the stream with backend authorization.

Do not put access tokens in the query string; the backend intentionally rejects that.

The SSE client must:

- Preserve named event types and IDs.
- Reconnect using the `Last-Event-ID` header.
- Detect sequence gaps.
- Refetch canonical REST resources on `practice_session.resync_required.v1`.
- Stop reconnecting for terminal states.

### 8. Stop relying on local storage as workflow truth

Local storage may retain recording preferences and convenience identifiers, but it must not decide whether analysis or Q&A is ready.

After refresh or cross-device login:

- Load the Practice Session from the backend.
- Derive the correct route from canonical state.
- Resume polling/SSE from backend state.
- Avoid creating a duplicate Analysis Attempt when an idempotent attempt already exists.

### 9. Improve user-visible errors

| Problem code | Recommended UI |
|---|---|
| `session_not_ready` | Explain that assets/session preparation has not completed and provide a retry. |
| `questions_not_ready` | Waiting state while analysis is active. |
| `consent_required` | Return to the consent step. |
| `precondition_failed` | Refetch and retry with the latest version. |
| `manifest_frozen` | Prevent manifest edits and continue with the active attempt. |
| `idempotency_conflict` | Do not retry a different payload under the same key. |
| `unauthorized` | Refresh authentication or return to sign-in. |

Do not display “Generating questions” unless an Analysis Attempt actually exists.

## Testing Requirements

### API client tests

- `updatePracticeSession` sends `PATCH`, `If-Match`, and the expected payload.
- `createAnalysisAttempt` calls `/analysis-attempts` with consent and an idempotency key.
- Practice Session response normalization maps the chosen canonical state field.
- Problem Details retain `status`, `code`, `detail`, and `trace_id`.
- SSE parsing preserves named events and IDs.

### Workflow component tests

Update the recording submission test to assert this order:

```text
completeUpload
  -> createPracticeSession
  -> updatePracticeSession
  -> createAnalysisAttempt
  -> navigate to analysis waiting route
```

The current test mocks `startAnalysis` but never asserts that it is called. This allowed the broken implementation to pass.

Add negative tests for:

- Readiness PATCH failure.
- Consent rejection.
- Analysis Attempt creation failure.
- Stale ETag recovery.
- Page refresh during analysis.
- `questions_not_ready` while analyzing.
- Session failure before questions.

### End-to-end regression test

Create one browser-driven test with deterministic backend/worker fixtures:

1. Upload a presentation and at least one document.
2. Complete both assets.
3. Submit the recorded session.
4. Assert progression through `draft`, `ready`, and `analyzing`.
5. Assert exactly one Analysis Attempt and one AI Job exist.
6. Publish a valid completed worker update.
7. Assert exactly three Primary Questions appear.
8. Refresh during analysis and verify recovery.

The test must fail if the frontend only creates a session and navigates to Q&A.

## Acceptance Criteria

- A newly recorded session does not remain in `draft` after successful submission.
- Exactly one Analysis Attempt is created for one submission.
- Consent version 1 is sent explicitly.
- The UI shows real analysis progress rather than a false Q&A error.
- Refreshing during analysis resumes the correct state.
- The Q&A page opens only when a canonical Q&A Round exists.
- Exactly three Primary Questions are displayed.
- Named SSE events invalidate the correct queries.
- Polling progresses the workflow when SSE is unavailable.
- Backend Problem Details are shown safely and meaningfully.
- Tests assert readiness and Analysis Attempt calls, not only session creation.

## Recommended Implementation Order

1. Add canonical DTOs and response normalization.
2. Add `updatePracticeSession`.
3. Replace `startAnalysis` with `createAnalysisAttempt`.
4. Update recording submission to execute the complete lifecycle.
5. Add the analysis waiting route/state machine.
6. Change Q&A readiness handling.
7. Repair authenticated named-event SSE.
8. Add polling fallback and refresh recovery.
9. Add end-to-end regression coverage.
10. Verify against deployed backend and AI services using a new session.

## Cross-Team Dependencies

The frontend fix can create the AI Job, but the workflow will still stop until the AI team aligns its queue consumer with the backend’s Celery producer.

Before release, frontend and backend should generate or share one executable OpenAPI type source. Hand-maintained session models have already diverged from the backend response.

## Definition of Done

The frontend work is complete only when a real browser session can be created from verified assets, starts exactly one Analysis Attempt, survives a page refresh, receives three questions from the deployed worker, completes Q&A, and displays the generated report without manual database or Redis intervention.
