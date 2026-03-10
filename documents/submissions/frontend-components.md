# Submission System — Frontend Components Reference

**Module:** Submission System (IT22586766)
**Updated:** 2026-03-10

All frontend files live under `frontend/` in the monorepo.

---

## Table of Contents

- [React Hooks](#react-hooks)
- [Shared Components](#shared-components)
- [Student Pages](#student-pages)
- [Lecturer Pages](#lecturer-pages)
- [API Services](#api-services)

---

## React Hooks

All hooks return `{ data, loading, error, refetch }` unless noted otherwise.

---

### `useSubmissions(studentId)` — `hooks/useSubmissions.ts`

Fetches all submissions for one student.

```typescript
const { data: submissions, loading, error, refetch } = useSubmissions(studentId);
// data: Submission[] | null
```

- Called on mount when `studentId` is non-null
- Calls `GET /api/submissions?studentId={studentId}`

---

### `useAllSubmissions(params?)` — `hooks/useSubmissions.ts`

Fetches all submissions (lecturer view). Handles both flat array and paged responses.

```typescript
const { data: submissions, loading, error, refetch } = useAllSubmissions({
  assignmentId?: string;
  status?: string;
});
// data: Submission[] | null  (always normalized to flat array)
```

---

### `useSubmission(id)` — `hooks/useSubmissions.ts`

Fetches a single submission.

```typescript
const { data: submission, loading, error, refetch } = useSubmission(submissionId);
// data: Submission | null
```

---

### `useAssignments(params?)` — `hooks/useSubmissions.ts`

Fetches assignments list.

```typescript
const { data: assignments, loading, error, refetch } = useAssignments({
  status?: 'OPEN' | 'CLOSED' | 'DRAFT';
  moduleCode?: string;
});
// data: Assignment[] | null
```

---

### `useCreateSubmission()` — `hooks/useSubmissions.ts`

Mutation hook for creating submissions.

```typescript
const { loading, error, success, createSubmission, reset } = useCreateSubmission();
const result: Submission | null = await createSubmission({ studentId, assignmentId, title });
```

---

### `useGradeSubmission()` — `hooks/useSubmissions.ts`

Mutation hook for lecturer grading.

```typescript
const { loading, error, success, gradeSubmission } = useGradeSubmission();
await gradeSubmission(submissionId, { grade: 85, lecturerFeedback: "...", questionScores: {...} });
```

---

### `useUploadFiles()` — `hooks/useSubmissions.ts`

Handles file uploads with per-file progress tracking.

```typescript
const { uploading, error, progress, uploadFiles, reset } = useUploadFiles();
// progress: UploadProgress[]  → { fileName, progress: 0-100, status: 'pending'|'uploading'|'done'|'error' }
const result: Submission | null = await uploadFiles(submissionId, filesArray);
```

---

### `useVersions(submissionId)` — `hooks/useVersions.ts`

Fetches all versions for a submission, sorted descending by version number.

```typescript
const { data: versions, loading, error, refetch } = useVersions(submissionId);
// data: SubmissionVersion[] | null
```

---

### `useVersionComparison(versionAId, versionBId)` — `hooks/useVersions.ts`

Fetches diff between two versions.

```typescript
const { data: comparison, loading, error } = useVersionComparison(v1Id, v2Id);
// data: VersionComparison | null  (fetches only when both IDs are non-null)
```

---

### `useDownloadVersion()` — `hooks/useVersions.ts`

Downloads a version as a ZIP and triggers browser download.

```typescript
const { downloading, error, downloadVersion } = useDownloadVersion();
await downloadVersion(versionId, 'essay-v2.zip');
```

---

### `useFeedback(submissionId)` — `hooks/useFeedback.ts`

Fetches latest AI feedback for a submission.

```typescript
const { data: feedback, loading, error, refetch } = useFeedback(submissionId);
// data: Feedback | null
```

---

### `useGenerateFeedback()` — `hooks/useFeedback.ts`

Triggers AI feedback generation with automatic polling until completion.

```typescript
const { loading, error, success, feedback, generateFeedback, reset } = useGenerateFeedback();
await generateFeedback({ submissionId, versionId?, force? });
// Polls GET /api/feedback/{id}/status every 3s, up to 20 attempts (~60s)
// feedback: Feedback | null  → populated on success
```

---

### `usePlagiarismReport(submissionId)` — `hooks/usePlagiarism.ts`

Fetches plagiarism report for a submission.

```typescript
const { data: report, loading, error, refetch } = usePlagiarismReport(submissionId);
// data: PlagiarismReport | null
```

---

### `useAllPlagiarismReports(params?)` — `hooks/usePlagiarism.ts`

Fetches all plagiarism reports (lecturer view).

```typescript
const { data: reports, loading, error } = useAllPlagiarismReports({
  minScore?: number;
  reviewStatus?: string;
  assignmentId?: string;
});
```

---

### `useCheckPlagiarism()` — `hooks/usePlagiarism.ts`

Triggers plagiarism check with polling.

```typescript
const { loading, error, success, report, checkPlagiarism } = useCheckPlagiarism();
await checkPlagiarism({ submissionId, versionId?, force? });
```

---

### `useUpdatePlagiarismReview()` — `hooks/usePlagiarism.ts`

Lecturer updates review decision on a plagiarism report.

```typescript
const { loading, error, success, updateReview } = useUpdatePlagiarismReview();
await updateReview(reportId, { reviewStatus: 'FALSE_POSITIVE', reviewNotes: '...' });
```

---

### `useAnswerEditor(params)` — `hooks/useAnswerEditor.ts`

Per-question hook that manages the full text-answer lifecycle: typing → debounced live feedback + plagiarism check + auto-save.

```typescript
const {
  answerText,
  wordCount,
  liveFeedback,      // LiveFeedback | null
  feedbackLoading,   // boolean
  plagiarismResult,  // LivePlagiarismResult | null
  plagiarismLoading, // boolean
  autoSaving,        // boolean
  lastSaved,         // Date | null
  handleChange,      // (newText: string) => void
} = useAnswerEditor({
  submissionId: string;
  questionId: string;
  questionText?: string;
  studentId: string;
  assignmentId?: string;
  initialText?: string;
});
```

**Debounce timers (no external library — uses `useRef` + `setTimeout`):**

| Action | Debounce | Min text |
|--------|----------|----------|
| AI live feedback | 3 seconds | 50 chars |
| Plagiarism check | 3 seconds | 50 chars |
| Auto-save | 5 seconds | any |

All timers are cleared on component unmount.

---

## Shared Components

All in `frontend/components/submissions/`.

---

### `SubmissionCard` — `SubmissionCard.tsx`

Displays a submission summary card with status badge, progress indicators, and action buttons.

```typescript
<SubmissionCard
  submission={Submission}
  onView={() => router.push(`/submissions/student/my-submissions/${id}`)}
  onSubmit={() => handleSubmit(id)}
/>
```

**Status badges:** `DRAFT` (gray) · `SUBMITTED` (blue) · `GRADED` (green) · `LATE` (red) · `PENDING_REVIEW` (amber) · `FLAGGED` (red)

---

### `AIFeedbackCard` — `AIFeedbackCard.tsx`

Displays AI-generated feedback with score gauge, strengths, improvements, and recommendations sections.

```typescript
<AIFeedbackCard
  feedback={Feedback | null}
  loading={boolean}
/>
```

**Score gauge colours:** ≥ 80 → green · ≥ 60 → amber · < 60 → red

---

### `PlagiarismReportCard` — `PlagiarismReportCard.tsx`

Displays a plagiarism report with traffic light indicator and match list.

```typescript
<PlagiarismReportCard
  report={PlagiarismReport | null}
  loading={boolean}
/>
```

**Traffic light:** ≤ 15% → green · 15–30% → amber · > 30% → red

---

### `VersionTimeline` — `VersionTimeline.tsx`

Displays version history as a vertical timeline. Supports checkbox selection for comparison.

```typescript
<VersionTimeline
  versions={SubmissionVersion[]}
  onCompare={(v1Id: string, v2Id: string) => void}
  onDownload={(versionId: string) => void}
/>
```

---

### `DiffViewer` — `DiffViewer.tsx`

Shows a line-level diff between two versions. Lines are colour-coded: green for additions, red for removals, plain for context.

```typescript
<DiffViewer comparison={VersionComparison | null} loading={boolean} />
```

---

### `FileUploader` — `FileUploader.tsx`

Drag-and-drop file upload area with per-file progress bars.

```typescript
<FileUploader
  onFilesSelected={(files: File[]) => void}
  uploading={boolean}
  progress={UploadProgress[]}
  acceptedTypes={string[]}
  maxFileSizeMB={number}
/>
```

---

### `RichTextEditor` — `RichTextEditor.tsx`

Auto-resizing `<textarea>` with word count bar and colour-coded progress toward target word count.

```typescript
<RichTextEditor
  value={string}
  onChange={(text: string) => void}
  placeholder={string}
  disabled={boolean}
  expectedWordCount={number}
  maxWordCount={number}
/>
```

**Word count bar colours:** ≥ 80% of target → green · 50–79% → amber · < 50% → red

**Features:** `spellCheck="true"`, auto-resize on input, min height 160px, no max height.

---

### `LiveFeedbackPanel` — `LiveFeedbackPanel.tsx`

Right-panel showing real-time AI feedback. Three display states:

```typescript
<LiveFeedbackPanel
  feedback={LiveFeedback | null}
  loading={boolean}
/>
```

| State | Display |
|-------|---------|
| `null + !loading` | Ghost state: "Start typing to receive AI feedback" |
| `loading` | Spinner: "Analyzing your answer…" |
| `feedback` | 4 score bars (0–10) + strengths + improvements + suggestions |

**Score bar colours:** ≥ 8 → green · ≥ 6 → amber · < 6 → red

---

### `PlagiarismWarning` — `PlagiarismWarning.tsx`

Inline severity chip displayed below each question editor.

```typescript
<PlagiarismWarning
  result={LivePlagiarismResult | null}
  loading={boolean}
/>
```

| Severity | Display |
|----------|---------|
| `null + !loading` | Nothing (takes no space) |
| `loading` | Nothing (silent — avoids distraction while typing) |
| `LOW` (no matches) | Green chip: "✓ No internet plagiarism detected" + peer similarity % if present |
| `LOW` (with matches) | Blue info panel: "Low similarity detected" with source list and signal bars for internet/peer similarity |
| `MEDIUM` | Amber banner: "⚠ Similarity detected (X%) — try rephrasing" with matched sources, signal bars, and guidance panel |
| `HIGH` | Red alert: "🚨 High similarity (X%) detected — review required" with matched sources/text and guidance panel |

---

### `QuestionCard` — `QuestionCard.tsx`

Per-question container that wires together the editor, live feedback, and plagiarism warning.

```typescript
<QuestionCard
  question={Question}
  submissionId={string}
  studentId={string}
  assignmentId={string}
  initialAnswer={string}     // pre-filled from saved draft
  disabled={boolean}         // true after submission
  onAnswerChange={(questionId: string, text: string) => void}
  questionIndex={number}
/>
```

**Layout (responsive):**
- Mobile: stacked (editor top, feedback below)
- Desktop (`lg:`): 2-column — editor left (`flex-1`), feedback panel right (`w-80 sticky top-4`)

Uses `useAnswerEditor` hook internally — all debounce logic is encapsulated here.

---

## Student Pages

### `/submissions/student` — `app/submissions/student/page.tsx`

**Student dashboard.** Shows personal stats, upcoming deadlines, recent submissions, and recent feedback.

**Data:** `useSubmissions(studentId)` + `useAssignments()`

**Stats computed via `useMemo`:**
- `totalAssignments` — all OPEN assignments
- `pending` — OPEN assignments with no submission yet
- `inProgress` — DRAFT submissions
- `submitted` / `graded`
- `averageGrade` — mean of all graded submission scores
- `submissionRate` — `(submitted + graded) / totalAssignments * 100`

---

### `/submissions/student/my-submissions` — `app/submissions/student/my-submissions/page.tsx`

**Submission history + available assignments.**

Two sections:
1. **"Assignments to Answer"** — OPEN assignments with no submission, shows "Start Answering" → `/answer/[id]` or "Continue" if DRAFT exists
2. **Submission grid** — all submissions using `SubmissionCard`

---

### `/submissions/student/answer/[assignmentId]` — `app/submissions/student/answer/[assignmentId]/page.tsx`

**Main text-answer writing page.**

On mount:
1. Decode JWT → `studentId`, `studentName` (from `payload.name` or `localStorage.getItem('userName')` fallback)
2. `GET /api/assignments/{id}` → load `questions[]`
3. `getOrCreateDraftSubmission(assignmentId, studentId, studentName, assignmentTitle, moduleCode, moduleName)` → get/create DRAFT
4. `GET /api/submissions/{id}/answers` → pre-fill editors

Renders one `QuestionCard` per question. Sticky bottom bar shows total word count and "Submit Assignment" button. Submission is blocked until all required questions have > 0 words.

**On Submit:**
1. Calls `submissionService.submitSubmission(submissionId)` — backend creates version snapshot atomically
2. Fetches `versionService.getLatestVersion(submissionId)` to get the new version ID
3. For each question with `plagiarismMap[qId]?.internetMatches`, calls `versionService.savePlagiarismSources()` to persist the detected internet sources to the version
4. Redirects to `/submissions/student/my-submissions` after a brief success state

---

### `/submissions/student/submit/[assignmentId]` — `app/submissions/student/submit/[assignmentId]/page.tsx`

**File-upload submission page.** For assignments that require PDF/document uploads.

Uses `FileUploader` component and `useUploadFiles` hook.

---

### `/submissions/student/analytics` — `app/submissions/student/analytics/page.tsx`

**Personal performance analytics.** All stats derived client-side from `useSubmissions` data.

Charts/sections: overall stats · grades by module · submission timeline · recent grades list.

---

### `/submissions/student/versions/[submissionId]` — `app/submissions/student/versions/[submissionId]/page.tsx`

**Version comparison page.** Shows `VersionTimeline` for selection and `DiffViewer` for the diff.

---

### `/submissions/student/plagiarism` — `app/submissions/student/plagiarism/page.tsx`

**Student plagiarism reports list** across all submissions.

---

## Lecturer Pages

### `/submissions/lecturer` — `app/submissions/lecturer/page.tsx`

**Lecturer dashboard.** Shows pending submissions, flagged students, recent activity, and quick stats.

**Data:** `useAllSubmissions()` + `useAssignments()`

**Priority queue logic (computed, not from API):**
- `plagiarismScore ≥ 25` OR `isLate` → `high`
- `plagiarismScore ≥ 10` OR `totalVersions > 3` → `medium`
- else → `low`

---

### `/submissions/lecturer/assignments` — `app/submissions/lecturer/assignments/page.tsx`

**Assignment management.** Lists all assignments with status badges, submission/graded counts, and progress bars. Links to create/edit/view individual assignments.

---

### `/submissions/lecturer/grading` — `app/submissions/lecturer/grading/page.tsx`

**Grading queue.** Filters to `SUBMITTED | PENDING_REVIEW | FLAGGED` submissions. Sortable by priority, date, plagiarism score, AI score. Dynamic module filter dropdown populated from actual data.

---

### `/submissions/lecturer/grading/[submissionId]` — `app/submissions/lecturer/grading/[submissionId]/page.tsx`

**Grade one submission.** Fetches submission + text answers + AI feedback + plagiarism report. Shows student's typed answers above each feedback field. Provides score inputs per question and overall feedback textarea.

---

### `/submissions/lecturer/analytics` — `app/submissions/lecturer/analytics/page.tsx`

**Class analytics.** Module-filterable. Sections: overall stats · grade distribution buckets (A+/A/B/C/D/F) · plagiarism spread · submission trends (last 6 months) · module performance table · top performers · at-risk students.

---

### `/submissions/lecturer/submissions` — `app/submissions/lecturer/submissions/page.tsx`

**All submissions view.** Lists all student submissions across all assignments with filtering and sorting.

---

## API Services

All in `frontend/lib/api/submission-services.ts`.

### `submissionService` → port 8081
| Method | Endpoint |
|--------|----------|
| `getStudentSubmissions(studentId)` | `GET /api/submissions?studentId=…` |
| `getAllSubmissions(params?)` | `GET /api/submissions` |
| `getSubmission(id)` | `GET /api/submissions/{id}` |
| `createSubmission(payload)` | `POST /api/submissions` |
| `updateSubmission(id, payload)` | `PUT /api/submissions/{id}` |
| `submitSubmission(id)` | `POST /api/submissions/{id}/submit` |
| `deleteSubmission(id)` | `DELETE /api/submissions/{id}` |
| `uploadFiles(submissionId, files)` | `POST /api/submissions/{id}/files` |
| `gradeSubmission(id, payload)` | `POST /api/submissions/{id}/grade` |
| `getOrCreateDraftSubmission(asgId, stdId, name?, title?, moduleCode?, moduleName?)` | `GET` then `POST /api/submissions` |
| `saveAnswer(submissionId, questionId, payload)` | `PUT /api/submissions/{id}/answers/{qId}` |
| `getAnswers(submissionId)` | `GET /api/submissions/{id}/answers` |

### `versionService` → port 8081
| Method | Endpoint |
|--------|----------|
| `getVersions(submissionId)` | `GET /api/submissions/{id}/versions` |
| `getVersion(submissionId, versionId)` | `GET /api/submissions/{id}/versions/{vId}` |
| `getLatestVersion(submissionId)` | `GET /api/submissions/{id}/versions/latest` |
| `savePlagiarismSources(submissionId, versionId, questionId, payload)` | `POST /api/submissions/{id}/versions/{vId}/answers/{qId}/sources` |

### `feedbackService` → port 8083
| Method | Endpoint |
|--------|----------|
| `getFeedback(submissionId)` | `GET /api/feedback?submissionId=…` |
| `getFeedbackById(id)` | `GET /api/feedback/{id}` |
| `getAllFeedbackForSubmission(submissionId)` | `GET /api/feedback/all?submissionId=…` |
| `generateFeedback(payload)` | `POST /api/feedback/generate` |
| `getFeedbackStatus(feedbackId)` | `GET /api/feedback/{id}/status` |
| `generateLiveFeedback(payload)` | `POST /api/feedback/live` |

### `plagiarismService` → port 8084
| Method | Endpoint |
|--------|----------|
| `getReport(submissionId)` | `GET /api/plagiarism?submissionId=…` |
| `getReportById(id)` | `GET /api/plagiarism/{id}` |
| `getAllReports(params?)` | `GET /api/plagiarism` |
| `checkPlagiarism(payload)` | `POST /api/plagiarism/check` |
| `getCheckStatus(reportId)` | `GET /api/plagiarism/{id}/status` |
| `updateReview(reportId, payload)` | `PUT /api/plagiarism/{id}/review` |
| `checkLiveSimilarity(payload)` | `POST /api/integrity/realtime/check` |

### `projectsAndTasksService` → Next.js API routes (MongoDB)
| Method | Endpoint |
|--------|----------|
| `getStudentProjects()` | `GET /api/projects-and-tasks/student/projects` |
| `getStudentTasks()` | `GET /api/projects-and-tasks/student/tasks` |
| `getLecturerProjects(courseId, lecturerId)` | `GET /api/submissions/lecturer/published-projects?courseId=…&lecturerId=…` |
| `getLecturerTasks(courseId, lecturerId)` | `GET /api/submissions/lecturer/published-tasks?courseId=…&lecturerId=…` |
| `getProjectById(id)` | `GET /api/projects-and-tasks/lecturer/create-projects-and-tasks/project/{id}` |
| `getTaskById(id)` | `GET /api/projects-and-tasks/lecturer/create-projects-and-tasks/task/{id}` |

> **Note:** `getLecturerProjects` and `getLecturerTasks` use dedicated published-only endpoints under `/api/submissions/lecturer/` that filter by `isPublished: { $ne: false }` and `isArchived: { $ne: true }`. The original `/api/projects-and-tasks/lecturer/...` endpoints are used by other team members and return all projects/tasks regardless of publish status.

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Pages | `page.tsx` in folder | `app/submissions/student/answer/[assignmentId]/page.tsx` |
| Components | PascalCase `.tsx` | `LiveFeedbackPanel.tsx` |
| Hooks | camelCase starting with `use` | `useAnswerEditor.ts` |
| Service files | kebab-case | `submission-services.ts` |
| Types file | kebab-case | `submission.types.ts` |

All interactive components and pages start with `'use client'` directive.
Route params for dynamic segments use `use(params)` (React 19 async pattern).
