# Submission System — TypeScript Types Reference

**Module:** Submission System (IT22586766)
**File:** `frontend/types/submission.types.ts`
**Updated:** 2026-03-10

All Spring Boot DTOs must produce JSON that matches these TypeScript interfaces exactly. Field names, types, and nullability must correspond.

---

## Core Types

### `SubmissionFile`

Represents a single uploaded file attached to a submission.

```typescript
interface SubmissionFile {
    id: string;
    fileName: string;
    originalFileName: string;
    fileSize: number;          // bytes
    fileType: string;          // MIME type e.g. "application/pdf"
    fileUrl: string;           // publicly accessible download URL
    uploadedAt: string;        // ISO-8601 e.g. "2026-02-28T14:00:00Z"
}
```

---

### `Assignment`

An assignment created by a lecturer.

```typescript
interface Assignment {
    id: string;
    title: string;
    description?: string;
    moduleCode: string;        // e.g. "CS301" — must match course service courseCode
    moduleName?: string;       // e.g. "Operating Systems"
    dueDate: string;           // ISO-8601
    totalMarks: number;
    status: 'OPEN' | 'CLOSED' | 'DRAFT';
    maxFileSizeMB?: number;
    allowedFileTypes?: string[];
    submissionsCount?: number; // computed by backend
    gradedCount?: number;      // computed by backend
}
```

**Status values:**
- `OPEN` — visible to students, accepting submissions
- `CLOSED` — no longer accepting submissions
- `DRAFT` — lecturer still editing, not visible to students

---

### `AssignmentWithQuestions`

Extends `Assignment` with an array of questions (for text-based assignments).

```typescript
interface AssignmentWithQuestions extends Assignment {
    questions: Question[];     // always present; empty array if no questions
}
```

---

### `Question`

A single question within an assignment.

```typescript
interface Question {
    id: string;
    assignmentId: string;
    text: string;              // The question prompt shown to students
    description?: string;      // Optional hints / context
    order: number;             // Display order (1-based)
    expectedWordCount?: number;
    maxWordCount?: number;
    isRequired?: boolean;      // If true, student cannot submit without answering
}
```

---

### `SubmissionStatus`

```typescript
type SubmissionStatus =
    | 'DRAFT'           // created but not submitted
    | 'SUBMITTED'       // officially submitted
    | 'GRADED'          // lecturer has graded
    | 'LATE'            // submitted after due date
    | 'PENDING_REVIEW'  // flagged for manual review
    | 'FLAGGED';        // academic integrity concern
```

---

### `Submission`

The core submission object returned by the Submission Management Service.

```typescript
interface Submission {
    id: string;
    studentId: string;                 // MongoDB _id from auth service
    studentName?: string;
    studentEmail?: string;
    studentRegistrationId?: string;    // e.g. "IT22001234"
    assignmentId: string;
    assignmentTitle?: string;
    moduleCode?: string;
    moduleName?: string;
    status: SubmissionStatus;
    title?: string;
    comments?: string;
    files: SubmissionFile[];           // empty array if no files
    currentVersionNumber: number;
    totalVersions: number;
    grade?: number;                    // null until graded
    totalMarks?: number;
    plagiarismScore?: number;          // 0–100
    aiScore?: number;                  // 0–100
    wordCount?: number;
    submittedAt?: string;              // ISO-8601; null if DRAFT
    gradedAt?: string;                 // ISO-8601; null if not graded
    createdAt: string;                 // ISO-8601; always present
    updatedAt?: string;
    isLate?: boolean;
    dueDate?: string;                  // ISO-8601
    lecturerFeedback?: string;
    lecturerName?: string;
    aiFeedbackId?: string;             // links to feedback service record
}
```

---

### Create / Update Payloads

```typescript
interface CreateSubmissionPayload {
    studentId: string;
    assignmentId: string;
    comments?: string;
    title?: string;
    studentName?: string;      // optional — backend can look up from auth
}

interface UpdateSubmissionPayload {
    comments?: string;
    title?: string;
}

interface GradeSubmissionPayload {
    grade: number;
    lecturerFeedback: string;
    questionScores?: Record<string, number>;  // questionId → score
}
```

---

## Version Types

### `VersionFile`

```typescript
interface VersionFile {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
    changes?: string;          // e.g. "+45 -12" or "new file"
}
```

### `SubmissionVersion`

```typescript
interface SubmissionVersion {
    id: string;
    submissionId: string;
    versionNumber: number;
    files: VersionFile[];
    wordCount: number;
    plagiarismScore: number;
    aiScore: number;
    changes?: string;          // human-readable description
    commitMessage?: string;
    createdAt: string;         // ISO-8601
    isSubmitted: boolean;
    aiFeedback?: string;
    plagiarismDetails?: string;
}
```

### `VersionComparison`

```typescript
interface VersionComparison {
    versionA: SubmissionVersion;
    versionB: SubmissionVersion;
    diffs: FileDiff[];
    wordCountChange: number;
    aiScoreChange: number;
    plagiarismChange: number;
}

interface FileDiff {
    fileName: string;
    additions: number;
    deletions: number;
    hunks: DiffHunk[];
}

interface DiffHunk {
    oldStart: number;
    newStart: number;
    lines: DiffLine[];
}

interface DiffLine {
    type: 'add' | 'remove' | 'context';
    content: string;
    lineNumber?: number;
}
```

---

## Feedback Types

### `FeedbackStatus`

```typescript
type FeedbackStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
```

### `FeedbackScore`

```typescript
interface FeedbackScore {
    codeQuality?: number;    // optional — for code submissions
    correctness?: number;    // 0–100
    style?: number;          // 0–100
    documentation?: number;  // optional
    overall: number;         // 0–100; always present when COMPLETED
}
```

### `QuestionFeedback`

Per-question AI assessment inside a `Feedback` record.

```typescript
interface QuestionFeedback {
    questionId: string;
    questionNumber: number;
    aiFeedback: string;
    aiScore: number;         // 0–100
    maxMarks: number;
}
```

### `Feedback`

Full AI feedback record from the Feedback Service.

```typescript
interface Feedback {
    id: string;
    submissionId: string;
    versionId?: string;
    status: FeedbackStatus;
    overallAssessment?: string;
    strengths?: string[];
    improvements?: string[];
    recommendations?: string[];
    scores?: FeedbackScore;
    questionFeedback?: QuestionFeedback[];
    rawFeedback?: string;    // unparsed AI output (debug only)
    createdAt: string;
    completedAt?: string;
    processingError?: string;
}

interface GenerateFeedbackPayload {
    submissionId: string;
    versionId?: string;
    force?: boolean;         // regenerate even if record already exists
}
```

### `LiveFeedback`

Returned by `POST /api/feedback/live`. Lightweight, not persisted. Scores are **0–10** (not 0–100).

```typescript
interface LiveFeedback {
    questionId: string;
    grammarScore: number;       // 0.0–10.0
    clarityScore: number;       // 0.0–10.0
    completenessScore: number;  // 0.0–10.0
    relevanceScore: number;     // 0.0–10.0
    suggestions: string[];      // 2 items
    strengths: string[];        // 2 items
    improvements: string[];     // 2 items
    generatedAt: string;        // ISO-8601
}
```

> **Note:** `LiveFeedback` scores are 0–10. `FeedbackScore` (full feedback) uses 0–100. They are different scales.

---

## Plagiarism Types

### `PlagiarismStatus` / `PlagiarismReviewStatus`

```typescript
type PlagiarismStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

type PlagiarismReviewStatus =
    | 'PENDING_REVIEW'   // not yet reviewed by lecturer
    | 'REVIEWED'         // lecturer reviewed, no action taken
    | 'FALSE_POSITIVE'   // lecturer confirmed it is not plagiarism
    | 'CONFIRMED';       // lecturer confirmed it is plagiarism
```

### `PlagiarismMatch`

A single matched source within a plagiarism report.

```typescript
interface PlagiarismMatch {
    source: string;        // citation or URL of source
    percentage: number;    // 0–100 similarity with this source
    type: string;          // e.g. "Direct content match", "Code snippet"
    url?: string;
    description?: string;
}
```

### `PlagiarismReport`

Full report from the Plagiarism Service.

```typescript
interface PlagiarismReport {
    id: string;
    submissionId: string;
    versionId?: string;
    overallScore: number;            // 0–100 combined similarity
    status: PlagiarismStatus;
    reviewStatus?: PlagiarismReviewStatus;
    sourcesChecked: number;
    matchesFound: number;
    topMatches: PlagiarismMatch[];
    details?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    createdAt: string;
    completedAt?: string;
}

interface CheckPlagiarismPayload {
    submissionId: string;
    versionId?: string;
    force?: boolean;
}

interface UpdatePlagiarismReviewPayload {
    reviewStatus: PlagiarismReviewStatus;
    reviewNotes?: string;
}
```

### `LivePlagiarismResult`

Returned by `POST /api/integrity/realtime/check` after frontend mapping. Scores are **0–100**.

```typescript
interface LivePlagiarismResult {
    questionId: string;
    similarityScore: number;          // 0–100 (converted from 0.0–1.0 backend value)
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    flagged: boolean;
    matchedText?: string;             // excerpt of matched content
    checkedAt: string;                // ISO-8601
    internetSimilarity?: number;      // 0–100 internet-only similarity
    peerSimilarity?: number;          // 0–100 peer-only similarity
    riskScore?: number;               // 0–100 aggregate risk score
    riskLevel?: string;               // CLEAN | LOW | MEDIUM | HIGH
    internetMatches?: InternetMatch[]; // matched internet sources
}

interface InternetMatch {
    title: string;                    // source page title
    url: string;                      // source URL
    snippet: string;                  // excerpt from source
    similarityScore: number;          // 0–100 similarity with this source
    sourceDomain?: string;            // e.g. "wikipedia.org"
    sourceCategory?: string;          // ENCYCLOPEDIA | ACADEMIC | NEWS etc.
    confidenceLevel?: string;         // HIGH | MEDIUM | LOW
    matchedStudentText?: string;      // the student's text that matched
}
```

**Severity thresholds (computed in frontend):**
```
similarityScore < 40  → LOW
similarityScore 40–70 → MEDIUM
similarityScore ≥ 70  → HIGH
```

> **Important:** Backend returns `similarityScore` as `0.0–1.0`. Frontend multiplies by 100 to get `0–100`. If backend returns `0–100` directly, the frontend will show `7000%`.

> **FACTUAL question optimization (added 2026-03-10):** For FACTUAL question types, plagiarism checking is skipped if the answer has fewer than 15 words. CALCULATION and OBJECTIVE questions always skip plagiarism checks. All other question types always run checks.

---

### `VersionPlagiarismSource`

Persisted plagiarism source for a version answer. Saved at submit time from `internetMatches` in the realtime check results.

```typescript
interface VersionPlagiarismSource {
    id: number;
    sourceUrl?: string;
    sourceTitle?: string;
    sourceSnippet?: string;
    matchedText?: string;
    similarityPercentage?: number;    // 0–100
    detectedAt?: string;              // ISO-8601
}

interface SavePlagiarismSourcesPayload {
    sources: Array<{
        sourceUrl?: string;
        sourceTitle?: string;
        sourceSnippet?: string;
        matchedText?: string;
        similarityPercentage?: number;
        detectedAt?: string;
    }>;
}
```

> **Data flow:** Realtime checks store `internetMatches` in `plagiarismMap` state. At submit time, `handleSubmit()` fetches the latest version and calls `versionService.savePlagiarismSources()` to persist these matches. The feedback page (`/submissions/student/feedback/[id]`) reads `answer.plagiarismSources` from the version data.

---

## Text Answer Types

### `TextAnswer`

A student's typed answer for one question. Stored in Submission Management Service.

```typescript
interface TextAnswer {
    id?: string;
    submissionId: string;
    questionId: string;
    questionText?: string;     // snapshot of question at save time
    answerText: string;
    wordCount: number;
    characterCount: number;
    lastModified: string;      // ISO-8601
    createdAt?: string;        // ISO-8601
}

interface SaveAnswerPayload {
    questionText?: string;
    answerText: string;
    wordCount: number;
    characterCount: number;
}
```

---

## API Response Wrappers

### `ApiResponse<T>`

Standard success/error wrapper used by Spring Boot services.

```typescript
interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    errors?: Record<string, string[]>;  // field-level validation errors
}
```

### `PagedResponse<T>`

Paged list response.

```typescript
interface PagedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;    // current page (0-indexed)
}
```

---

## Hook State Types

### `AsyncState<T>`

Return shape for read hooks (`useSubmissions`, `useFeedback`, etc.).

```typescript
interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}
```

### `MutationState`

Return shape for mutation hooks (`useGradeSubmission`, `useCreateSubmission`, etc.).

```typescript
interface MutationState {
    loading: boolean;
    error: string | null;
    success: boolean;
}
```

---

## Quick Type Map — Backend ↔ Frontend

| Frontend Type | Backend DTO | Service |
|---------------|-------------|---------|
| `Assignment` | `AssignmentResponse.java` | Submission Mgmt (8081) |
| `Question` | `QuestionResponse.java` | Submission Mgmt (8081) |
| `Submission` | `SubmissionResponse.java` | Submission Mgmt (8081) |
| `TextAnswer` | `AnswerResponse.java` | Submission Mgmt (8081) |
| `SaveAnswerPayload` | `SaveAnswerRequest.java` | Submission Mgmt (8081) |
| `GradeSubmissionPayload` | `GradeSubmissionRequest.java` | Submission Mgmt (8081) |
| `SubmissionVersion` | `VersionResponse.java` | Version Control (8082) |
| `VersionComparison` | `VersionComparisonResponse.java` | Version Control (8082) |
| `Feedback` | `FeedbackResponse.java` | AI Feedback (8083) |
| `LiveFeedback` | `LiveFeedbackResponse.java` | AI Feedback (8083) |
| `PlagiarismReport` | `PlagiarismReportResponse.java` | Plagiarism (8084) |
| `LivePlagiarismResult` | mapped from `RealtimeCheckResponse.java` | Plagiarism (8084) |
