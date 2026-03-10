# Submission System — User Flows

**Module:** Submission System (IT22586766)
**Updated:** 2026-03-10

---

## Student User Flows

---

### Flow 1: Answer a Text-Based Assignment

This is the primary student workflow — typing essay answers directly in the browser.

```
1. Student logs in → JWT stored in localStorage
2. Student navigates to /submissions/student/my-submissions
3. Sees "Assignments to Answer" section at top
   - OPEN assignments with no submission → "Start Answering" button
   - OPEN assignments with a DRAFT → "Continue" button
4. Clicks "Start Answering" → /submissions/student/answer/[assignmentId]
5. Page loads:
   - Fetches assignment with questions[]
   - Finds or creates a DRAFT submission
   - Pre-fills any previously saved answers
6. For each question:
   - Student sees question text + expected word count hint
   - Types answer in RichTextEditor
   - After 3 seconds of no typing:
     → AI feedback panel updates on the right (grammar, clarity, completeness, relevance scores)
     → Plagiarism warning updates below editor (LOW / MEDIUM / HIGH chip)
   - After 5 seconds of no typing:
     → "Saving…" indicator appears → changes to "Saved ✓ HH:MM"
7. Student reviews word count bar (green ≥80%, amber 50–79%, red <50%)
8. When all required questions answered → "Submit Assignment" button becomes active
9. Student clicks "Submit" → confirmation dialog
10. Confirmed → POST /api/submissions/{id}/submit
11. Backend creates version snapshot atomically (server-side)
12. Frontend fetches latest version, saves plagiarism sources:
    → For each question with internetMatches:
       POST /api/submissions/{id}/versions/{vId}/answers/{qId}/sources
13. Redirect → /submissions/student/my-submissions with success toast
```

**Error states handled:**
- Assignment not found → amber error banner
- Backend offline → graceful fallback, answers saved locally in textarea
- Live feedback fails → panel stays in ghost state silently (no error shown to user)
- Live plagiarism fails → warning chip shows nothing (no error shown)

---

### Flow 2: Upload a File-Based Assignment

```
1. Student navigates to /submissions/student/submit/[assignmentId]
2. Page fetches assignment details (title, due date, allowed file types, max size)
3. Student drags files onto FileUploader or clicks to browse
4. Upload starts → progress bars per file
5. On complete → files listed with checkmarks
6. Student adds optional comments in textarea
7. Clicks "Submit Assignment"
8. POST /api/submissions/{id}/submit
9. Redirect to my-submissions
```

---

### Flow 3: View My Submissions

```
1. /submissions/student/my-submissions
2. Two sections:
   a. "Assignments to Answer" (OPEN assignments without submission)
   b. "My Submissions" grid — all submissions as SubmissionCards
3. SubmissionCard shows:
   - Assignment title + module code
   - Status badge (DRAFT / SUBMITTED / GRADED / LATE)
   - Grade if graded
   - Plagiarism score badge if available
   - AI score badge if available
4. Click "View" → submission detail page
```

---

### Flow 4: View AI Feedback

```
1. /submissions/student/my-submissions/[submissionId]
   OR
   /submissions/student/feedback/[id]
2. Page shows:
   - Submission details (status, grade, dates)
   - AIFeedbackCard: overall assessment + strengths + improvements + recommendations
     with score gauge (green/amber/red based on overall score)
   - PlagiarismReportCard: traffic light + similarity % + source matches
   - Lecturer feedback (text) if graded
3. Student can click "Request New Feedback" → triggers useGenerateFeedback
   → spinner while polling → updates when COMPLETED
```

---

### Flow 5: Compare Versions

```
1. /submissions/student/versions
   → lists all submissions with version counts
2. Click "View Versions" → /submissions/student/versions/[submissionId]
3. VersionTimeline shows each version:
   - Version number, date, word count, AI score, plagiarism score
   - Commit message
   - "Download" button per version
4. Student checks two versions using checkboxes
5. DiffViewer appears below:
   - File-by-file diff with green (+) additions and red (−) removals
   - Context lines (plain) between changes
   - Summary: +X words, AI score change, plagiarism change
```

---

### Flow 6: View Analytics

```
1. /submissions/student/analytics
2. Sections:
   - Overall stats: total assignments, submitted, graded, avg grade, submission rate
   - Grades by module: bar chart of average grade per module code
   - Submission timeline: monthly submission activity
   - Recent grades: last 5 graded submissions with grade + assignment name
```

---

## Lecturer User Flows

---

### Flow 7: Grade a Submission

```
1. /submissions/lecturer/grading
   → shows queue filtered to SUBMITTED + PENDING_REVIEW + FLAGGED
   → sorted by priority (HIGH = plagiarism ≥25% or late, MEDIUM = plagiarism ≥10% or >3 versions)
2. Click "Grade" on a submission → /submissions/lecturer/grading/[submissionId]
3. Page loads:
   a. Submission metadata (student name, ID, module, submitted at, late indicator)
   b. AI feedback card (auto-generated or "Generate AI Feedback" button)
   c. Plagiarism report card with match list
   d. Per-question grading:
      - Student's typed answer (read-only, scrollable box)
      - Word count shown below
      - Score input (0 to maxMarks for this question)
      - AI feedback text for this question (pre-filled, editable)
4. Overall feedback textarea (free text)
5. Total grade auto-sums from question scores
6. Lecturer clicks "Submit Grade"
7. POST /api/submissions/{id}/grade with { grade, lecturerFeedback, questionScores }
8. Status changes to GRADED, removed from queue
```

---

### Flow 8: Lecturer Analytics

```
1. /submissions/lecturer/analytics
2. Module filter at top (all modules OR specific module code)
3. Sections:
   - Overall stats: total submissions, unique students, avg grade, submission rate, on-time rate
   - Grade distribution: A+ / A / B / C / D / F bucket counts + percentages
   - Plagiarism spread: 0-10% / 10-20% / 20-30% / 30%+ counts
   - Submission trends: last 6 months bar chart
   - Module performance table: avg grade, avg plagiarism, completion rate per module
   - Top performers: top 5 students by avg grade
   - At-risk students: students with avg grade < 65 OR plagiarism > 25%
```

---

## Status Transition Diagram

```
                      ┌──────────────┐
  Student creates  → │    DRAFT     │
  submission          └──────┬───────┘
                             │ POST /submit
                             ▼
                      ┌──────────────┐
                      │  SUBMITTED   │◄──── Past due date: status = LATE
                      └──────┬───────┘
                             │ (manual flag or high plagiarism)
                    ┌────────┼────────┐
                    ▼        ▼        ▼
             ┌──────────┐  ┌─────┐  ┌────────────────┐
             │  GRADED  │  │LATE │  │ PENDING_REVIEW │
             └──────────┘  └─────┘  └────────┬───────┘
                                             │ Lecturer flags
                                             ▼
                                        ┌─────────┐
                                        │ FLAGGED │
                                        └─────────┘
```

---

## Navigation Map

```
/submissions
├── /student
│   ├── /                         ← dashboard
│   ├── /my-submissions           ← list + available assignments
│   ├── /answer/[assignmentId]    ← text answer writing
│   ├── /submit/[assignmentId]    ← file upload
│   ├── /analytics                ← personal performance
│   ├── /versions                 ← version history list
│   ├── /versions/[submissionId]  ← compare versions
│   ├── /plagiarism               ← plagiarism reports
│   ├── /feedback/[id]            ← detailed feedback
│   └── /guidelines               ← academic integrity info
│
└── /lecturer
    ├── /                         ← dashboard
    ├── /submissions              ← all submissions view
    ├── /grading                  ← grading queue
    ├── /grading/[submissionId]   ← grade one submission
    ├── /analytics                ← class analytics
    └── /settings                 ← system configuration
```

---

## UX Principles Applied

| Principle | Implementation |
|-----------|----------------|
| Never crash | All pages have graceful fallback to empty state or error banner when APIs offline |
| Loading skeletons | Animated pulse placeholders shown while data fetches |
| Auto-save | Answers auto-saved every 5s — student never loses work |
| Silent background checks | Live feedback and plagiarism check silently fail — no error interrupts typing |
| Instant feedback | Debounce set to 3s so feedback feels responsive without spamming the API |
| Accessibility | spellCheck enabled on all text areas, colour contrast meets WCAG 2.1 AA |
| Mobile-first | All pages work on small screens; 2-column layouts collapse to stacked on mobile |
