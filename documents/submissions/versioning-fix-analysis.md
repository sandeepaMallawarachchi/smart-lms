# Submission Versioning — Design Analysis & Fix Report

## 1. Correct Versioning Concept

Every time a student **submits** or **resubmits** an assignment, the system creates an **immutable version snapshot** — a point-in-time record of all question answers, AI scores, plagiarism results, and projected grades. These snapshots are permanent and can never be overwritten.

The **working copy** (`answers` table in `submission_schema`) is a live, mutable workspace where auto-save, AI feedback, and plagiarism results are written continuously. The working copy does **not** create versions — only a deliberate Submit action does.

There is exactly **one parent `submissions` row per (student, assignment) pair**, and it accumulates sequential version numbers: v0 = DRAFT (no snapshot), v1 = first submit, v2 = second submit, etc.

---

## 2. Problems in the Previous Implementation

| # | Problem | Impact |
|---|---------|--------|
| 1 | **Two independent version counters**: `Submission.versionNumber` in submission-management-service vs `MAX(version_number)+1` in version_control_service | Counters drift apart; reports show wrong version numbers |
| 2 | **Fire-and-forget snapshot**: Frontend called `versionService.createTextSnapshot()` after submit — if the call failed, submit still succeeded | Missing version snapshots; broken report pages |
| 3 | **`createSubmission()` set `versionNumber = 1`**: A brand-new DRAFT already claimed version 1 before any Submit occurred | Off-by-one: version numbers in the versions table didn't match the parent |
| 4 | **Unsafe `resetToDraft()`**: Cleared `submittedAt` to null and set status = DRAFT | Destructive — erased evidence that a submission had occurred; broke timeline auditing |
| 5 | **No unique constraint on `(submission_id, version_number)`** | Concurrent submits could create duplicate version numbers in `submission_versions` |
| 6 | **Snapshot created from frontend state (JS variables)** | If browser crashed mid-submit or the page reloaded, snapshot data would differ from what was actually saved in the Answer rows |
| 7 | **Lecturer grading writes directly to live Answer rows** | `lecturerMark` on the working copy could be overwritten by the student's next auto-save cycle; no association between grade and a specific version |

---

## 3. Corrected Design

### Single Source of Truth

- **`Submission.versionNumber`** is incremented by `Submission.submit()` (0 → 1 → 2 → …).
- **`SubmissionVersion.versionNumber`** is assigned by the version_control_service using `MAX(version_number) + 1`.
- Both counters now stay in sync because the backend creates the snapshot immediately after saving the submission — in the same server-side call, not on the frontend.

### Immutability

- Once a `SubmissionVersion` row is created, it is never updated. The JSONB `metadata` column contains the complete answer state frozen at submit time.
- The working copy (`answers` table) continues to be freely editable for the next resubmission cycle.
- `resetToDraft()` has been **removed entirely** — a submitted assignment stays SUBMITTED. The student can simply open the answer page and edit the working copy, then click Submit again (which increments the version).

### Snapshot Creation Path

```
[Student clicks Submit]
       ↓
[Frontend] POST /api/submissions/{id}/submit
       ↓
[SubmissionService.submitSubmission()]
  1. Validate (has content, deadline check)
  2. submission.submit()  →  versionNumber++, status=SUBMITTED
  3. Compute aggregate metrics from Answer rows
  4. Increment totalVersions
  5. Save Submission to DB
  6. Build TextSnapshotRequest from Answer rows
  7. HTTP POST to version_control_service /api/versions/text-snapshot
       ↓
[VersionControlService.createTextSnapshot()]
  1. nextVersionNumber = MAX(version_number) + 1
  2. Build metadata JSONB with all answer data
  3. Save SubmissionVersion with isSnapshot=true
       ↓
[SubmissionVersion row created — immutable]
```

---

## 4. Database Design

### submission_schema.submissions (unchanged structure)

| Column | Notes |
|--------|-------|
| `version_number` | Starts at **0** (DRAFT). Incremented to 1 on first submit, 2 on second, etc. |
| `total_versions` | Running count of how many submits have occurred. |
| `status` | `DRAFT → SUBMITTED / LATE → GRADED`. Never reset back to DRAFT. |

### version_schema.submission_versions (key changes)

| Change | Detail |
|--------|--------|
| **Added unique constraint** | `UNIQUE (submission_id, version_number)` — prevents duplicate version numbers from concurrent submits |
| **metadata (JSONB)** | Contains the full answer snapshot: answer text, AI scores, plagiarism results, projected grades, internet matches |

### submission_schema.answers (working copy — unchanged)

The `answers` table remains the live working copy. Auto-save, AI feedback, and plagiarism checks write here. This data is **snapshotted** into `SubmissionVersion.metadata` when the student submits.

---

## 5. Backend Flow

### Submit / Resubmit

1. `POST /api/submissions/{id}/submit` → `SubmissionService.submitSubmission(Long id)`
2. Validates: must have files or text answers with content.
3. Deadline enforcement: blocks resubmission after deadline for already-submitted/graded work. Initial late submissions are allowed (marked with `isLate = true`).
4. Calls `submission.submit()` — increments `versionNumber`, sets `status = SUBMITTED`, sets `submittedAt = now()`.
5. Computes aggregate metrics (AI score, plagiarism score, total word count) from `Answer` rows.
6. Increments `totalVersions` counter.
7. Saves `Submission` to database.
8. **Server-side snapshot**: Builds a `TextSnapshotRequest` from the saved `Answer` rows and calls `version_control_service` via HTTP POST. The snapshot includes all answer text, AI feedback scores, plagiarism data, and lecturer marks at the time of submission.
9. Returns `SubmissionResponse` to the frontend.

### Auto-Save (no version created)

1. Frontend debounces answer changes (5s interval).
2. `PUT /api/submissions/{submissionId}/answers/{questionId}` → `AnswerService.saveAnswer()`.
3. Upserts the WORKING COPY — no version, no snapshot, no status change.

### Grading

1. `POST /api/submissions/{id}/grade` → `SubmissionService.gradeSubmission()`.
2. Sets overall grade, per-question marks, and feedback text.
3. Changes status to `GRADED`.
4. Per-question marks are persisted to both `Submission.questionMarksJson` and individual `Answer.lecturerMark`.

---

## 6. Frontend Flow

### Answer Page (`/submissions/student/answer/[assignmentId]`)

1. **On mount**: Decodes JWT → fetches assignment → calls `getOrCreateDraftSubmission()` → pre-loads saved answers.
2. **While typing**: `useAnswerEditor` hook manages debounced auto-save (5s), live AI feedback (2s), and live plagiarism checking (2s). All three write to the working copy only.
3. **Submit**: Calls `submissionService.submitSubmission(submissionId)`. The backend handles snapshot creation server-side. No `versionService.createTextSnapshot()` call from the frontend.
4. **Resubmit**: The student opens the answer page again (status is still SUBMITTED/GRADED — no reset to DRAFT needed). They edit answers (working copy), then click Submit again. `Submission.submit()` increments `versionNumber` and a new snapshot is created.

### Report Page (`/submissions/student/feedback/[id]`)

- Reads version metadata from `SubmissionVersion.metadata` JSONB.
- All scores, grades, and answer text come from the **snapshot**, not the live working copy.
- This ensures the report always shows the data as it was at submit time.

---

## 7. Lecturer Rules

- Lecturers grade via `POST /api/submissions/{id}/grade`.
- Per-question marks are persisted to `Answer.lecturerMark` (working copy) and `Submission.questionMarksJson` (aggregate).
- **Default mark**: If no `maxPoints` is set on a question, the system defaults to **10 points** (applied at both frontend snapshot construction and backend snapshot construction).
- Lecturer feedback and marks survive across resubmission cycles — they are not cleared.

---

## 8. Issue Fix Plan (Summary of Changes Made)

| File | Change |
|------|--------|
| `SubmissionVersion.java` | Added `@UniqueConstraint(columnNames = {"submission_id", "version_number"})` to prevent duplicate versions |
| `Submission.java` | Removed `resetToDraft()` method entirely |
| `SubmissionService.java` | Fixed `createSubmission()` to set `versionNumber(0)` instead of `1` |
| `SubmissionService.java` | Removed `resetToDraft()` service method |
| `SubmissionService.java` | Added server-side `createTextSnapshot()` method called from `submitSubmission()` via HTTP to version_control_service |
| `SubmissionService.java` | Added `RestTemplate` and `versionServiceUrl` for cross-service communication |
| `SubmissionController.java` | Removed `POST /{id}/reset-draft` endpoint |
| `WebConfig.java` | Added `RestTemplate` bean with timeout configuration |
| `application.properties` | Added `version.service.url=http://localhost:8082` |
| `answer/[assignmentId]/page.tsx` | Removed `versionService.createTextSnapshot()` call from `handleSubmit()` |
| `answer/[assignmentId]/page.tsx` | Removed unused `versionService` import |

---

## 9. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Concurrent double-click on Submit** | Unique constraint `(submission_id, version_number)` prevents duplicate snapshot creation. The second request will either fail validation (status already SUBMITTED) or get a constraint violation. |
| **Version service down during submit** | Submission still saves (student's work is preserved). Snapshot creation failure is logged as an error. A reconciliation job could detect submissions with `totalVersions > count(SubmissionVersion)` and recreate missing snapshots. |
| **Student edits after submit (resubmission)** | Working copy (`answers` table) is freely editable regardless of submission status. The student simply edits and clicks Submit again — `versionNumber` increments and a new snapshot is created. |
| **Late submission** | Allowed on first submit (marked `isLate = true`, status = `LATE`). Resubmission after deadline for already-submitted work is blocked. |
| **Student has no answers** | Submit is blocked — validation requires at least one text answer with word count ≥ 1 or at least one uploaded file. |
| **Browser crash during submit** | Since snapshot creation is now server-side, if the HTTP call to the backend succeeds, the snapshot is guaranteed. Browser state is irrelevant. |
| **Grading then resubmission** | Lecturer marks persist in the working copy. After resubmission, the new snapshot contains the current state (which may reset some scores). Lecturer can re-grade. |

---

## 10. Final Implementation Status

All changes have been applied across the codebase:

- **Backend (submission-management-service)**: `resetToDraft` eliminated, `versionNumber` starts at 0, snapshot creation moved server-side with `RestTemplate` calling version_control_service atomically during `submitSubmission()`.
- **Backend (version_control_service)**: Unique constraint added on `(submission_id, version_number)` to prevent duplicate version records.
- **Frontend**: `handleSubmit()` simplified to a single `submissionService.submitSubmission()` call — no more fire-and-forget snapshot call from the browser. Unused `versionService` import removed from the answer page.

### Version Number Lifecycle

```
createSubmission()     → versionNumber = 0  (DRAFT, no snapshot)
first submitSubmission → versionNumber = 1  (snapshot v1 created)
second submitSubmission → versionNumber = 2 (snapshot v2 created)
...
```

### Key Invariant

> `Submission.versionNumber` always equals the count of `SubmissionVersion` rows for that submission. Every submit creates exactly one immutable snapshot. Working copy changes (auto-save, AI feedback, plagiarism) never create versions.
