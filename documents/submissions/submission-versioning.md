# Submission Versioning System

## What Is a Submission Version?

A **submission version** is a frozen, immutable snapshot of a student's answers at a specific point in time.

Every time a student officially submits (or resubmits) an assignment, a new version is created and saved permanently. Think of it like a Git commit — each version captures the full state of that submission, including the answers written, the AI feedback received, and the plagiarism analysis results.

Versions are **never modified or deleted**. They are read-only records of history.

---

## When Is a New Version Created?

A new version is created **only when a student clicks Submit**. It is NOT created:

- During auto-save (every 5 seconds while typing)
- When AI feedback is generated in the background
- When plagiarism is checked in the background
- When the lecturer grades or leaves comments

| Action | Creates Version? |
|--------|-----------------|
| Student auto-save (typing) | No |
| AI feedback generated | No |
| Plagiarism check runs | No |
| Student clicks **Submit** | **Yes** |
| Student clicks **Resubmit** | **Yes** |
| Lecturer grades submission | No |

---

## What Data Is Saved in Each Version?

Each version stores a complete snapshot of the submission at that moment.

### Top-Level Version Fields

| Field | Description |
|-------|-------------|
| `id` | Unique version ID (auto-generated) |
| `submissionId` | The parent submission this version belongs to |
| `versionNumber` | 1, 2, 3, ... (increments on each submit) |
| `commitHash` | Auto-generated unique hash (like a Git commit hash) |
| `parentVersionId` | ID of the previous version (null for v1) |
| `commitMessage` | Label, e.g. "Student submission v1" |
| `triggerType` | `TEXT_SNAPSHOT` for text answers |
| `createdBy` | Student ID |
| `createdAt` | Timestamp of submission |
| `isSnapshot` | `true` for text-based submissions |
| `metadata` | Full per-question snapshot (JSONB) — see below |

### Metadata (JSONB) — Per-Question Snapshot

The `metadata` field stores everything that was true at the moment of submit:

```json
{
  "type": "text_snapshot",
  "overallGrade": 72.5,
  "maxGrade": 100.0,
  "totalWordCount": 820,
  "answers": [
    {
      "questionId": "q1",
      "questionText": "Explain the OSI model.",
      "answerText": "The OSI model has 7 layers...",
      "wordCount": 210,

      "grammarScore": 8.5,
      "clarityScore": 7.0,
      "completenessScore": 6.5,
      "relevanceScore": 9.0,

      "strengths": ["Clear structure", "Good use of examples"],
      "improvements": ["Expand on Layer 4"],
      "suggestions": ["Add a diagram description"],

      "similarityScore": 12.5,
      "plagiarismSeverity": "LOW",
      "internetSimilarityScore": 10.0,
      "peerSimilarityScore": 2.5,
      "riskScore": 0.18,
      "riskLevel": "LOW",

      "internetMatches": [
        {
          "title": "OSI Model - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/OSI_model",
          "snippet": "The OSI model is a conceptual framework...",
          "similarityScore": 10.0,
          "sourceDomain": "wikipedia.org",
          "sourceCategory": "ENCYCLOPEDIA",
          "confidenceLevel": "HIGH",
          "matchedStudentText": "7 layers of the OSI model"
        }
      ],

      "projectedGrade": 18.5,
      "maxPoints": 25.0
    }
  ]
}
```

This snapshot is **frozen at submit time**. Even if the student resubmits later, this version's data never changes.

---

## How Version 1, Version 2, Version 3 Work

```
First Submit
    │
    ▼
Version 1 ──── metadata: { answers as they were at first submit }
    │
    │  (student resubmits with improved answers)
    │
    ▼
Version 2 ──── metadata: { answers as they were at second submit }
    │           parentVersionId → Version 1
    │
    │  (student resubmits again)
    │
    ▼
Version 3 ──── metadata: { answers as they were at third submit }
                parentVersionId → Version 2
```

- Version 1 is always the **first submission**
- Each new version links to its parent via `parentVersionId`
- The **latest version** is always the one with the highest `versionNumber`
- The **latest version** is what lecturers see by default for grading
- Students can always browse back to any previous version

---

## How Old Versions Are Kept

Old versions are **never deleted or overwritten**.

- Each version is a separate row in the `version_schema.submission_versions` table
- The `metadata` JSONB column stores the complete per-question snapshot for that version
- Old versions remain accessible forever for audit, comparison, and academic integrity purposes
- If a lecturer grades Version 2 and the student resubmits as Version 3, the lecturer's grade is on the submission record — not tied to a specific version

---

## How Students Can View Old Versions

Students can view any version of their submission through two routes:

### 1. Submission Report Page
- URL: `/submissions/student/feedback/{submissionId}`
- Shows the **latest version** by default
- A **version selector** appears at the top if multiple versions exist
- Clicking `v1`, `v2`, `v3` switches the report to that version's data
- URL updates to `?version=N` so the page is shareable/bookmarkable

### 2. Version History Page
- URL: `/submissions/student/version-history/{submissionId}`
- Shows a **timeline** of all versions (newest first)
- Each version shows: version number, timestamp, commit message, word count
- A "View Report" link navigates to the feedback page for that specific version

---

## How Version Comparison Works

Version comparison lets students (and lecturers) see **what changed** between two versions.

### What Can Be Compared
- Answer text changes (word-level diff)
- Score changes (grammar, clarity, completeness, relevance)
- Plagiarism score changes
- Word count changes

### UI Flow
1. Student opens Version History
2. Checks two version checkboxes (e.g. v1 and v3)
3. Clicks "Compare"
4. A **side-by-side diff view** opens showing:
   - Left: older version
   - Right: newer version
   - Added text highlighted in green
   - Removed text highlighted in red
   - Score improvements/regressions shown as arrows (↑ ↓)

### Backend Endpoint
```
GET /api/versions/compare?versionAId={id}&versionBId={id}
```
Returns structured diff data per question.

---

## Example Database Structure

### Table: `version_schema.submission_versions`

```
id              BIGSERIAL PRIMARY KEY
submission_id   BIGINT NOT NULL           -- FK to submissions table
version_number  INTEGER NOT NULL          -- 1, 2, 3, ...
commit_hash     VARCHAR(64) UNIQUE        -- auto-generated hash
parent_version_id BIGINT                  -- null for v1
commit_message  VARCHAR(1000)
trigger_type    VARCHAR(50)               -- TEXT_SNAPSHOT | FILE_UPLOAD
created_by      VARCHAR(100)              -- studentId
metadata        JSONB                     -- full per-question snapshot
changes_summary VARCHAR(2000)
total_files     INTEGER DEFAULT 0
total_size_bytes BIGINT DEFAULT 0
created_at      TIMESTAMP NOT NULL
is_snapshot     BOOLEAN DEFAULT false
```

### Index Strategy
```sql
CREATE INDEX idx_submission_id ON submission_versions(submission_id);
CREATE INDEX idx_commit_hash   ON submission_versions(commit_hash);
```

### Relationship to Other Tables

```
submissions (submission_schema)
    │
    │  1 submission : many versions
    │
    ▼
submission_versions (version_schema)
    │
    │  1 version : many files (for file-based submissions)
    │
    ▼
version_files (version_schema)
```

For **text-based** assignments (essays, Q&A), there are no `version_files` rows — everything is in the `metadata` JSONB column.

---

## Example Flow

### First Submission (Version 1 Created)

```
1. Student opens assignment page
2. Student types answers for Q1, Q2, Q3
3. Every 5s → auto-save fires → answer text saved to DB (no version created)
4. AI feedback runs every 3s → scores saved to answer rows (no version created)
5. Plagiarism check runs every 3s → scores saved to answer rows (no version created)
6. Student clicks "Submit"
7. System calls POST /api/submissions/{id}/submit → submission status = SUBMITTED
8. Backend calls POST /api/versions/text-snapshot server-side with:
   - All question IDs, answer texts
   - All AI scores and feedback (from Answer rows)
   - All plagiarism scores and internet matches (from Answer rows)
   - Projected grades, max points
9. Version 1 is created with versionNumber=1, parentVersionId=null
10. metadata.answers[] contains frozen snapshot of all per-question data
11. Frontend fetches the latest version via GET /api/versions/{submissionId}/latest
12. For each question with internet matches in plagiarismMap, frontend calls
    POST /api/submissions/{id}/versions/{versionId}/answers/{questionId}/sources
    to persist plagiarism sources (internetMatches) to the version_plagiarism_sources table
13. Student sees success screen → redirected to submissions list
```

### Resubmission (Version 2 Created)

```
1. Student opens the same assignment again (status allows resubmit)
2. Student edits answers — auto-save runs as normal
3. New AI feedback and plagiarism scores are generated for the updated text
4. Student clicks "Resubmit"
5. System calls POST /api/submissions/{id}/submit → submission status updated
6. Backend calls POST /api/versions/text-snapshot server-side with:
   - Updated answers and new AI scores/plagiarism data
7. Frontend fetches latest version and saves plagiarism sources (same as first submit)
8. Version 2 is created with:
   - versionNumber = 2
   - parentVersionId = Version 1's ID
   - metadata = new snapshot
8. Version 1 is untouched and still accessible
```

### Lecturer Grading (No Version Created)

```
1. Lecturer opens submission → sees Version 2 (latest) by default
2. Lecturer reads per-question answers and AI scores from Version 2's metadata
3. Lecturer sets marks for each question and writes feedback
4. Lecturer submits grade
5. Grade is saved on the submission record (not version-specific)
6. No new version is created
```

---

## Important Rules and Edge Cases

### Rules
- A version is created **only on submit/resubmit**, never during auto-save
- Each version's `metadata` is **immutable** — never update it after creation
- The version with the **highest `versionNumber`** for a submission is the "latest"
- `versionNumber` is assigned by the backend inside a **database transaction with a row-level lock** — never derived on the frontend
- `commitHash` must be unique across all versions (generated as SHA-256 of submissionId + timestamp + random)
- Only **one** new version may be created per successful submit action

### Concurrent Submit — The Real Concurrency Risk

The real risk is **not** two different students submitting at the same time (their version numbers are independent — they each have their own `submissionId`). The real risk is:

> **The same student sends two submit (or resubmit) requests for the same submission almost simultaneously.**

This can happen because:
- The student double-clicks the Submit button
- A slow network causes the frontend to retry
- Two browser tabs are open for the same assignment

#### The Problem Without Protection

```
Request A: reads MAX(versionNumber) = 1  →  will insert versionNumber = 2
Request B: reads MAX(versionNumber) = 1  →  will also insert versionNumber = 2
              ↓
Both succeed → two rows with versionNumber = 2 for the same submissionId ✗
```

This corrupts the version chain and makes it impossible to determine which is the true latest version.

#### The Solution — Pessimistic Row-Level Lock

The backend `createTextSnapshot` method must run inside a `@Transactional` block and acquire a **pessimistic write lock** on the submission row before computing the next `versionNumber`:

```java
// 1. Lock the parent submission row for the duration of the transaction.
//    Any concurrent request for the same submissionId will block here
//    until the first transaction commits or rolls back.
submissionRepository.findByIdWithLock(submissionId);   // SELECT ... FOR UPDATE

// 2. Now safely compute the next version number — no other transaction
//    can read or write this submission concurrently.
int nextVersion = versionRepository
    .findMaxVersionNumber(submissionId)
    .orElse(0) + 1;

// 3. Build and save the new version row.
SubmissionVersion version = SubmissionVersion.builder()
    .submissionId(submissionId)
    .versionNumber(nextVersion)
    ...
    .build();
versionRepository.save(version);
// 4. Transaction commits → lock is released → second request may now proceed.
```

Additionally, a **unique database constraint** on `(submission_id, version_number)` acts as a last-resort safety net: if two transactions somehow compute the same number, only one INSERT will succeed and the other will throw a constraint violation, which is caught and returned as a `409 Conflict` to the client.

```sql
ALTER TABLE version_schema.submission_versions
    ADD CONSTRAINT uq_submission_version
    UNIQUE (submission_id, version_number);
```

#### What Happens to the Losing Request

| Outcome | Response |
|---------|----------|
| Second request blocks on lock, then succeeds after first commits | Creates version N+2 correctly (rare — only if the student genuinely resubmits twice) |
| Second request is a true duplicate (same content, same session) | Backend detects the duplicate via `commitHash` uniqueness and returns `409 Conflict` |
| Frontend double-click guard fires before second request is sent | Second HTTP call never made — handled client-side |

The **frontend should also disable the Submit button immediately after the first click** and re-enable it only if the request fails, preventing most duplicate requests before they reach the backend.

### Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Student submits with empty answers | Submit is blocked on frontend (word count check); if it somehow reaches backend, version is still created with empty `answerText` |
| AI feedback not yet loaded at submit time | `feedbackMap` will be empty for that question; snapshot saves `null` for all score fields — no error |
| Plagiarism not yet checked at submit time | Same as above — `null` fields in snapshot |
| Student submits the exact same text twice (sequential) | A new version is still created (no content-duplicate detection); both versions are valid history |
| Student double-clicks Submit (near-simultaneous requests) | Row-level lock + unique constraint ensures only one version is created; second request gets `409 Conflict` |
| Network error during snapshot creation | Submission status may already be SUBMITTED; student retries — a second version is created, which is acceptable |
| Student deletes a draft before any submit | No versions exist yet — deletion is allowed |
| Version service is down at submit time | Show an error banner; student should retry when the service recovers |
| Lecturer grades v2, student resubmits as v3 | Grade stays on the submission record (not version-linked); lecturer must re-grade v3 manually |
| Assignment deadline passes | Submission status set to CLOSED; no new versions can be created |

---

## Summary

```
Auto-save every 5s      → saves answer TEXT only         → no version
AI feedback every 3s    → saves scores to Answer rows    → no version
Plagiarism every 3s     → saves scores to Answer rows    → no version
Student clicks SUBMIT   → freezes everything → VERSION CREATED ✓
Student clicks RESUBMIT → freezes everything → NEW VERSION CREATED ✓
```

Each version is a **complete, frozen, independently viewable report** of the submission at that point in time.
