# Submission System — API Integration Documentation

**Module:** Submission System (IT22586766)
**Branch:** `IT22586766/feature/007/integration`
**Updated:** 2026-03-02

This document has **two audiences:**

- **My own backend team** → Section A describes the 4 Spring Boot microservices I need implemented
- **Other team members** → Section B describes what data my submission components depend on from your services, and what field names must match exactly

---

## Table of Contents

- [System Overview](#system-overview)
- [Section A — My 4 Microservices (for my backend team)](#section-a--my-4-microservices)
  - [A1. Submission Management Service (port 8081)](#a1-submission-management-service-port-8081)
  - [A2. Version Control Service (port 8082)](#a2-version-control-service-port-8082)
  - [A3. AI Feedback Service (port 8083)](#a3-ai-feedback-service-port-8083)
  - [A4. Plagiarism / Integrity Service (port 8084)](#a4-plagiarism--integrity-service-port-8084)
- [Section B — Other Members' APIs My Components Consume](#section-b--other-members-apis-my-components-consume)
  - [B1. Authentication Service (Auth Team)](#b1-authentication-service-auth-team)
  - [B2. Course / Module Service (Course Team)](#b2-course--module-service-course-team)
  - [B3. User Profile Service (Auth Team)](#b3-user-profile-service-auth-team)
- [Section C — Events My System Emits (for Notification Team)](#section-c--events-my-system-emits-for-notification-team)
- [Field Mapping Reference](#field-mapping-reference)
- [Environment Variables](#environment-variables)

---

## System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (port 3000)                       │
│                                                                        │
│   /submissions/student/*          /submissions/lecturer/*              │
│                                                                        │
│   USES FROM OTHER MEMBERS:        USES FROM OTHER MEMBERS:             │
│   • Auth verify (auth team)       • Auth verify (auth team)            │
│   • Student profile (auth team)   • Lecturer profile (auth team)       │
│   • Course list (course team)     • Course list (course team)          │
└───────┬──────────┬────────┬──────────────────┬─────────────────────────┘
        │          │        │                  │
  ┌─────▼──┐  ┌───▼───┐ ┌──▼────┐       ┌────▼────────┐
  │ Submit │  │Version│ │  AI   │       │ Plagiarism  │
  │ Mgmt   │  │Control│ │Feedbk │       │ Integrity   │
  │ :8081  │  │ :8082 │ │ :8083 │       │ :8084       │
  └────────┘  └───────┘ └───────┘       └─────────────┘
  MY SERVICE  MY SVC    MY SVC          MY SERVICE
```

---

## Section A — My 4 Microservices

These are the Spring Boot services **I need my backend team to implement**. Other teams don't need to touch these — but they need to understand the data shapes so they can send me the right field names.

---

### A1. Submission Management Service (port 8081)

**Base URL:** `http://localhost:8081`

All endpoints require `Authorization: Bearer <jwt>` header.

---

#### Submissions

##### `GET /api/submissions`

Returns submissions list. Supports both student and lecturer views.

| Query Param    | Type   | Description                                     |
|----------------|--------|-------------------------------------------------|
| `studentId`    | string | Filter by student (MongoDB `_id` from auth)     |
| `assignmentId` | string | Filter by assignment                            |
| `status`       | string | `DRAFT` `SUBMITTED` `GRADED` `LATE` `PENDING_REVIEW` `FLAGGED` |
| `page`         | int    | Page number (0-indexed)                         |
| `size`         | int    | Page size                                       |

Response — **flat array** (no page params) or **paged** (when page param present). Frontend handles both:

```json
[
  {
    "id": "sub-001",
    "studentId": "6507c1a2b3d4e5f6a7b8c9d0",
    "studentName": "John Smith",
    "studentEmail": "john@uni.ac.lk",
    "studentRegistrationId": "IT22001234",
    "assignmentId": "asg-01",
    "assignmentTitle": "Operating Systems Essay",
    "moduleCode": "CS301",
    "moduleName": "Operating Systems",
    "status": "SUBMITTED",
    "title": "My Submission",
    "comments": "Final version",
    "files": [],
    "currentVersionNumber": 2,
    "totalVersions": 2,
    "grade": null,
    "totalMarks": 100,
    "plagiarismScore": 12.5,
    "aiScore": 78,
    "wordCount": 1240,
    "submittedAt": "2026-02-28T14:30:00Z",
    "gradedAt": null,
    "createdAt": "2026-02-25T10:00:00Z",
    "updatedAt": "2026-02-28T14:30:00Z",
    "isLate": false,
    "dueDate": "2026-03-01T23:59:00Z",
    "lecturerFeedback": null,
    "lecturerName": null,
    "aiFeedbackId": null
  }
]
```

**Paged variant:**
```json
{
  "content": [ ... ],
  "totalElements": 45,
  "totalPages": 3,
  "size": 20,
  "number": 0
}
```

> **`studentId` field:** This is the MongoDB `_id` from the auth service. The auth service's JWT payload `userId` is passed directly as `studentId` when creating a submission.

---

##### `GET /api/submissions/{id}`

Single submission by its own ID.

---

##### `POST /api/submissions`

Creates a new DRAFT submission.

```json
{
  "studentId": "6507c1a2b3d4e5f6a7b8c9d0",
  "studentName": "John Smith",
  "assignmentId": "asg-01",
  "title": "Text Submission",
  "comments": null,
  "submissionType": "ASSIGNMENT"
}
```

> Returns the created `Submission` with a generated `id`. Status is `DRAFT`.

---

##### `PUT /api/submissions/{id}`

Updates metadata (title, comments only). No status change.

```json
{ "comments": "Updated", "title": "Revised title" }
```

---

##### `POST /api/submissions/{id}/submit`

No body. Changes `DRAFT → SUBMITTED`. Auto-sets `isLate: true` and `status: LATE` if `submittedAt > assignment.dueDate`.

---

##### `DELETE /api/submissions/{id}`

Deletes a DRAFT. Returns `204 No Content`.

---

##### `POST /api/submissions/{submissionId}/files`

Multipart upload. Field name: `files` (multiple files OK).

Response: updated `Submission` with `files[]` populated.

**`SubmissionFile` schema:**
```json
{
  "id": "file-001",
  "fileName": "essay.pdf",
  "originalFileName": "essay.pdf",
  "fileSize": 204800,
  "fileType": "application/pdf",
  "fileUrl": "https://storage.example.com/essay.pdf",
  "uploadedAt": "2026-02-28T14:00:00Z"
}
```

---

##### `POST /api/submissions/{id}/grade`

Lecturer grades a submission.

```json
{
  "grade": 85,
  "lecturerFeedback": "Well-structured essay.",
  "questionScores": {
    "q-001": 28,
    "q-002": 22,
    "q-003": 35
  }
}
```

Response: `Submission` with `grade`, `lecturerFeedback`, `status: GRADED`, `gradedAt` set.

---

#### Assignments

##### `GET /api/assignments`

| Query Param  | Description                        |
|--------------|------------------------------------|
| `status`     | `OPEN` `CLOSED` `DRAFT`            |
| `moduleCode` | e.g. `CS301`                       |

```json
[
  {
    "id": "asg-01",
    "title": "Operating Systems Essay",
    "description": "Write a 1500-word essay...",
    "moduleCode": "CS301",
    "moduleName": "Operating Systems",
    "dueDate": "2026-03-15T23:59:00Z",
    "totalMarks": 100,
    "status": "OPEN",
    "maxFileSizeMB": 10,
    "allowedFileTypes": ["pdf", "docx"],
    "submissionsCount": 18,
    "gradedCount": 5,
    "questions": [
      {
        "id": "q-001",
        "assignmentId": "asg-01",
        "text": "Explain preemptive vs non-preemptive scheduling.",
        "description": "Include at least two real-world examples.",
        "order": 1,
        "expectedWordCount": 400,
        "maxWordCount": 600,
        "isRequired": true
      }
    ]
  }
]
```

> **`questions` array is required.** Always include it — return `[]` if no questions. The student answer page will not render without it.

---

##### `GET /api/assignments/{id}`

Single assignment with `questions[]`.

---

##### `POST /api/assignments`

Creates assignment. Payload: any subset of the `Assignment` schema above.

---

##### `PUT /api/assignments/{id}`

Updates assignment. Payload: any subset of `Assignment`.

---

#### Text Answers (Q&A System)

##### `PUT /api/submissions/{submissionId}/answers/{questionId}`

Upsert a student's typed answer. Called every 5 seconds while student types.

```json
{
  "questionText": "Explain preemptive vs non-preemptive scheduling.",
  "answerText": "Preemptive scheduling allows the OS to interrupt...",
  "wordCount": 245,
  "characterCount": 1432
}
```

> **Upsert logic:** If `(submissionId, questionId)` already exists, update it. Otherwise insert. Always update `lastModified`.

Response:
```json
{
  "id": "ans-001",
  "submissionId": "sub-001",
  "questionId": "q-001",
  "questionText": "Explain preemptive...",
  "answerText": "Preemptive scheduling allows...",
  "wordCount": 245,
  "characterCount": 1432,
  "lastModified": "2026-02-28T10:15:30Z",
  "createdAt": "2026-02-28T09:00:00Z"
}
```

---

##### `GET /api/submissions/{submissionId}/answers`

All saved answers for a submission. Returns `TextAnswer[]` or `[]` if none saved yet.

---

#### Database Schema for Answers

```sql
CREATE TABLE submission_schema.answers (
    id              BIGSERIAL PRIMARY KEY,
    submission_id   VARCHAR(255) NOT NULL,
    question_id     VARCHAR(255) NOT NULL,
    question_text   TEXT,
    answer_text     TEXT NOT NULL,
    word_count      INTEGER,
    character_count INTEGER,
    last_modified   TIMESTAMP NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (submission_id, question_id)
);
```

---

### A2. Version Control Service (port 8082)

**Base URL:** `http://localhost:8082`

##### `GET /api/versions?submissionId={id}`

All versions sorted by `versionNumber` ascending.

```json
[
  {
    "id": "ver-001",
    "submissionId": "sub-001",
    "versionNumber": 1,
    "files": [
      {
        "fileName": "essay_v1.pdf",
        "fileSize": 102400,
        "fileType": "application/pdf",
        "fileUrl": "https://storage.example.com/essay_v1.pdf",
        "changes": "new file"
      }
    ],
    "wordCount": 980,
    "plagiarismScore": 8.5,
    "aiScore": 72,
    "changes": "Initial draft",
    "commitMessage": "First draft",
    "createdAt": "2026-02-25T10:00:00Z",
    "isSubmitted": false
  }
]
```

##### `GET /api/versions/{id}` — single version by ID

##### `GET /api/versions/latest?submissionId={id}` — highest version number

##### `GET /api/versions/compare?v1={id}&v2={id}`

```json
{
  "versionA": { ... },
  "versionB": { ... },
  "wordCountChange": 260,
  "aiScoreChange": 6,
  "plagiarismChange": 4.0,
  "diffs": [
    {
      "fileName": "essay.pdf",
      "additions": 45,
      "deletions": 12,
      "hunks": [
        {
          "oldStart": 10,
          "newStart": 10,
          "lines": [
            { "type": "context", "content": "Scheduling algorithms..." },
            { "type": "remove",  "content": "The OS simply runs each process.", "lineNumber": 11 },
            { "type": "add",     "content": "The OS prioritises by burst time.", "lineNumber": 11 }
          ]
        }
      ]
    }
  ]
}
```

##### `POST /api/versions` — multipart: `submissionId`, `commitMessage`, `files[]`

##### `GET /api/versions/{versionId}/download` — returns `application/zip` blob

---

### A3. AI Feedback Service (port 8083)

**Base URL:** `http://localhost:8083`
**Model:** HuggingFace `mistralai/Mistral-7B-Instruct-v0.2`

##### `GET /api/feedback?submissionId={id}` — latest feedback

##### `GET /api/feedback/{id}` — feedback by ID

##### `GET /api/feedback/all?submissionId={id}` — all feedback across versions (desc by `createdAt`)

##### `POST /api/feedback/generate`

Triggers async analysis. Frontend polls until `status: COMPLETED`.

```json
{ "submissionId": "sub-001", "versionId": "ver-002", "force": false }
```

Full `Feedback` response:
```json
{
  "id": "fb-001",
  "submissionId": "sub-001",
  "status": "COMPLETED",
  "overallAssessment": "Well-structured essay.",
  "strengths": ["Clear thesis", "Good examples"],
  "improvements": ["Weak conclusion", "Missing citations"],
  "recommendations": ["Review paragraph structure"],
  "scores": { "correctness": 82, "style": 75, "overall": 78 },
  "questionFeedback": [
    { "questionId": "q-001", "questionNumber": 1, "aiFeedback": "Good explanation...", "aiScore": 82, "maxMarks": 40 }
  ],
  "createdAt": "2026-02-28T14:05:00Z",
  "completedAt": "2026-02-28T14:05:23Z"
}
```

##### `GET /api/feedback/{id}/status` — returns `{ "id": "fb-001", "status": "COMPLETED" }`

Frontend polls every 3 seconds, max 20 attempts (~60 seconds).

---

##### `POST /api/feedback/live` ← CRITICAL

Real-time feedback while student types. Called 3 seconds after typing stops. **Not persisted to DB.**

```json
{
  "questionId": "q-001",
  "answerText": "Preemptive scheduling allows the OS to interrupt...",
  "questionPrompt": "Explain the difference between preemptive and non-preemptive scheduling.",
  "expectedWordCount": 400
}
```

**Required response — scores must be 0.0–10.0:**
```json
{
  "questionId": "q-001",
  "grammarScore": 8.5,
  "clarityScore": 7.0,
  "completenessScore": 6.5,
  "relevanceScore": 8.0,
  "strengths": ["Clear sentences", "Accurate terminology"],
  "improvements": ["Expand on consequences", "Add concrete example"],
  "suggestions": ["Mention Round Robin", "Spell out all acronyms"],
  "generatedAt": "2026-02-28T10:15:30.123Z"
}
```

> **Graceful fallback required:** If HuggingFace unavailable, return scores of `5.0` and generic text. Do NOT return 500.

**Suggested HuggingFace prompt:**
```
Analyze this student answer briefly.
Question: {questionPrompt}
Answer: {answerText}

Score 0-10 (one decimal): grammar, clarity, completeness, relevance.
Give exactly 2 strengths, 2 improvements, 2 suggestions.
Return JSON only:
{
  "grammarScore": X.X, "clarityScore": X.X,
  "completenessScore": X.X, "relevanceScore": X.X,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "suggestions": ["...", "..."]
}
```

---

### A4. Plagiarism / Integrity Service (port 8084)

**Base URL:** `http://localhost:8084`

##### `GET /api/plagiarism?submissionId={id}` — single report

##### `GET /api/plagiarism/{id}` — report by ID

##### `GET /api/plagiarism` (lecturer, with filters)

| Query Param    | Description                              |
|----------------|------------------------------------------|
| `minScore`     | Minimum `overallScore` (0-100)           |
| `reviewStatus` | `PENDING_REVIEW` `REVIEWED` etc.         |
| `assignmentId` | All reports for one assignment           |

Full `PlagiarismReport`:
```json
{
  "id": "pr-001",
  "submissionId": "sub-001",
  "overallScore": 12.5,
  "status": "COMPLETED",
  "reviewStatus": "PENDING_REVIEW",
  "sourcesChecked": 150,
  "matchesFound": 3,
  "topMatches": [
    {
      "source": "Smith, J. (2024). OS Concepts.",
      "percentage": 8.2,
      "type": "Direct content match",
      "url": "https://textbook.example.com/ch5",
      "description": "Paragraph 2 matches pages 142-143"
    }
  ],
  "createdAt": "2026-02-28T14:05:00Z",
  "completedAt": "2026-02-28T14:05:45Z"
}
```

##### `POST /api/plagiarism/check` — `{ submissionId, versionId?, force? }`

##### `GET /api/plagiarism/{id}/status` — `{ id, status, overallScore }`

##### `PUT /api/plagiarism/{id}/review`

```json
{ "reviewStatus": "FALSE_POSITIVE", "reviewNotes": "Properly cited." }
```

---

##### `POST /api/integrity/realtime/check` ← CRITICAL

Real-time similarity while student types. Called 3 seconds after typing stops.

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "studentId": "6507c1a2b3d4e5f6a7b8c9d0",
  "questionId": 1,
  "textContent": "Preemptive scheduling allows the OS to interrupt...",
  "questionText": "Explain preemptive vs non-preemptive scheduling.",
  "questionType": "TEXT"
}
```

> **`questionId` must be a Long integer.** Frontend parses the string question ID to number before sending.

**Required response — `similarityScore` must be 0.0–1.0:**
```json
{
  "sessionId": "550e8400-...",
  "similarityScore": 0.12,
  "flagged": false,
  "matchedText": null
}
```

**Frontend severity mapping:**
```
< 0.40      → LOW    → green chip "✓ No plagiarism detected"
0.40–0.70   → MEDIUM → amber banner "⚠ Similarity detected (X%)"
≥ 0.70      → HIGH   → red alert "🚨 High similarity (X%) detected"
```

---

## Section B — Other Members' APIs My Components Consume

> This section is **for other team members**. Field names and types must match exactly — my frontend reads these fields by name.

---

### B1. Authentication Service (Auth Team)

**Used by:** Every submission page via `ModuleLayout.tsx`.

#### `GET /api/auth/verify`

**Header:** `Authorization: Bearer <token>`

**My code reads `data.data?.userRole` — must be exactly `"student"` or `"lecture"`:**

```json
{
  "success": true,
  "data": {
    "userRole": "student",
    "isSuperAdmin": false,
    "user": {
      "_id": "6507c1a2b3d4e5f6a7b8c9d0",
      "name": "John Smith",
      "email": "john@uni.ac.lk",
      "studentIdNumber": "IT22001234",
      "academicYear": "3",
      "semester": "1",
      "specialization": "SE"
    }
  }
}
```

---

#### JWT Token Structure

My frontend decodes the JWT client-side to get `studentId`:

```javascript
const payload = JSON.parse(atob(token.split('.')[1]));
const studentId = payload.userId ?? payload.sub;
```

**JWT payload must include `userId` (MongoDB `_id`):**
```json
{ "userId": "6507c1a2b3d4e5f6a7b8c9d0", "email": "...", "userRole": "student" }
```

---

#### Student Profile Fields

| Submission field                    | Source                     |
|-------------------------------------|----------------------------|
| `submission.studentId`              | JWT `payload.userId`       |
| `submission.studentName`            | `user.name`                |
| `submission.studentEmail`           | `user.email`               |
| `submission.studentRegistrationId`  | `user.studentIdNumber`     |

---

### B2. Course / Module Service (Course Team)

`moduleCode` and `moduleName` in my assignments/submissions map to your course data.

#### `GET /api/student/get-courses`

**My code reads `result.data.courses[].courseCode` and `.courseName`:**

```json
{
  "success": true,
  "data": {
    "courses": [
      { "courseCode": "CS301", "courseName": "Operating Systems", ... }
    ]
  }
}
```

**Field mapping:**

| Course Service Field | My Assignment Field   |
|----------------------|-----------------------|
| `course.courseCode`  | `assignment.moduleCode` |
| `course.courseName`  | `assignment.moduleName` |

> Course codes must be stable and consistent (always `CS301`, never `cs301` or `CS-301`).

---

### B3. User Profile Lookup (Auth Team)

For my backend to auto-populate student name/email when a submission is created:

```
GET /api/student/{studentId}
Authorization: Bearer <token>
```

Expected response: `{ data: { student: { _id, name, email, studentIdNumber } } }`

---

## Section C — Events My System Emits (for Notification Team)

| Event                | Trigger                                           | Notify        | Data                                     |
|----------------------|---------------------------------------------------|---------------|------------------------------------------|
| `SUBMISSION_RECEIVED`| `POST /api/submissions/{id}/submit`               | Lecturer      | studentName, assignmentTitle, submittedAt|
| `SUBMISSION_GRADED`  | `POST /api/submissions/{id}/grade`                | Student       | grade, assignmentTitle, lecturerFeedback |
| `PLAGIARISM_FLAGGED` | Realtime score ≥ 0.70                             | Lecturer      | studentName, similarityScore             |
| `ASSIGNMENT_DEADLINE`| 24h before `assignment.dueDate`                   | All students  | assignmentTitle, dueDate                 |
| `NEW_ASSIGNMENT`     | `POST /api/assignments` with `status: OPEN`       | All students  | assignmentTitle, moduleCode, dueDate     |
| `FEEDBACK_READY`     | Feedback `status` → `COMPLETED`                   | Student       | submissionId, overallScore               |

---

## Field Mapping Reference

| Field                                | Source System             | Notes                                       |
|--------------------------------------|---------------------------|---------------------------------------------|
| `submission.studentId`               | Auth Service (JWT)        | `payload.userId`                            |
| `submission.studentName`             | Auth Service              | `user.name`                                 |
| `submission.studentEmail`            | Auth Service              | `user.email`                                |
| `submission.studentRegistrationId`   | Auth Service              | `user.studentIdNumber`                      |
| `submission.moduleCode`              | Course Service            | `course.courseCode`                         |
| `submission.moduleName`              | Course Service            | `course.courseName`                         |
| `submission.plagiarismScore`         | Plagiarism Service (mine) | `PlagiarismReport.overallScore`             |
| `submission.aiScore`                 | AI Feedback Service (mine)| `Feedback.scores.overall`                   |
| `submission.grade`                   | Submission Mgmt (mine)    | Set by lecturer                             |
| `submission.isLate`                  | Submission Mgmt (mine)    | `submittedAt > assignment.dueDate`          |

---

## Environment Variables

```bash
NEXT_PUBLIC_SUBMISSION_API_URL=http://localhost:8081
NEXT_PUBLIC_VERSION_API_URL=http://localhost:8082
NEXT_PUBLIC_FEEDBACK_API_URL=http://localhost:8083
NEXT_PUBLIC_PLAGIARISM_API_URL=http://localhost:8084
```

---

## Quick Checklist per Team

### Auth Team
- [ ] `GET /api/auth/verify` → `data.data.userRole` is exactly `"student"` or `"lecture"`
- [ ] JWT payload includes `userId` (MongoDB `_id`)
- [ ] `GET /api/student/{id}` available for service-to-service lookup

### Course Team
- [ ] `GET /api/student/get-courses` → `data.courses[]` has `courseCode` and `courseName`
- [ ] Course codes are stable and consistently formatted

### Notification Team
- [ ] Provide webhook endpoint URL + expected payload format
- [ ] Confirm which of the 6 events above you need

### My Backend Team
- [ ] CORS enabled for `http://localhost:3000` on all 4 services
- [ ] Bearer token validation on every endpoint
- [ ] `GET /api/assignments/{id}` always includes `questions: []`
- [ ] `POST /api/feedback/live` is synchronous with graceful HuggingFace fallback
- [ ] `POST /api/integrity/realtime/check` accepts `questionId` as Long integer
- [ ] `similarityScore` in realtime check is `0.0–1.0` range
