# Submission System — System Architecture

**Module:** Submission System (IT22586766)
**Updated:** 2026-03-02

---

## Overview

The submission system is a full-stack feature built on top of the Smart LMS platform. It consists of:

- **4 Spring Boot microservices** (backend)
- **2 sets of Next.js pages** (student view + lecturer view)
- **10 reusable React components**
- **6 React hooks** for data fetching and mutations
- **1 TypeScript types file** shared across all layers

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js 16)                         │
│                                                                     │
│  ┌─────────────────────────────┐  ┌──────────────────────────────┐ │
│  │     Student Pages           │  │      Lecturer Pages          │ │
│  │  /submissions/student/*     │  │  /submissions/lecturer/*     │ │
│  │                             │  │                              │ │
│  │  dashboard · my-submissions │  │  dashboard · grading         │ │
│  │  answer · submit · versions │  │  assignments · students      │ │
│  │  plagiarism · analytics     │  │  plagiarism · analytics      │ │
│  └─────────────┬───────────────┘  └────────────────┬─────────────┘ │
│                │   shared components & hooks         │              │
│  ┌─────────────▼─────────────────────────────────────▼───────────┐ │
│  │   React Hooks (data layer)                                     │ │
│  │   useSubmissions  useAssignments  useFeedback  usePlagiarism   │ │
│  │   useVersions     useAnswerEditor                              │ │
│  └─────────────┬─────────────────────────────────────────────────┘ │
│                │                                                    │
│  ┌─────────────▼─────────────────────────────────────────────────┐ │
│  │   API Services  (submission-services.ts)                       │ │
│  │   submissionService · versionService                           │ │
│  │   feedbackService  · plagiarismService                         │ │
│  └──┬──────────────┬──────────────┬──────────────┬───────────────┘ │
└─────│──────────────│──────────────│──────────────│─────────────────┘
      │              │              │              │
      ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│Submission│  │ Version  │  │AI Feedbk │  │ Plagiarism / │
│ Mgmt     │  │ Control  │  │ Service  │  │ Integrity    │
│ :8081    │  │ :8082    │  │ :8083    │  │ :8084        │
└──────────┘  └──────────┘  └──────────┘  └──────────────┘
```

---

## Service Responsibilities

| Service | Port | Responsibility |
|---------|------|----------------|
| Submission Management | 8081 | Submissions CRUD, assignments CRUD, text answers (Q&A), grading |
| Version Control | 8082 | File version history, version comparison (diffs), ZIP download |
| AI Feedback | 8083 | Async AI analysis (HuggingFace Mistral), live real-time feedback |
| Plagiarism / Integrity | 8084 | Full plagiarism reports, real-time similarity while typing |

---

## Data Flow Diagrams

### 1. Student Submits a Text-Based Assignment

```
Student opens /submissions/student/answer/[assignmentId]
        │
        ├─ GET /api/assignments/{id}          → loads questions[]
        ├─ GET /api/submissions?studentId=…   → finds existing DRAFT
        │   └─ if none → POST /api/submissions → creates DRAFT
        └─ GET /api/submissions/{id}/answers  → pre-fills editors

Student types in RichTextEditor (per question)
        │ (3s debounce)
        ├─ POST /api/feedback/live            → LiveFeedbackPanel updates
        ├─ POST /api/integrity/realtime/check → PlagiarismWarning updates
        │ (5s debounce)
        └─ PUT /api/submissions/{id}/answers/{qId} → auto-saves answer

Student clicks "Submit Assignment"
        └─ POST /api/submissions/{id}/submit
                └─ Redirect → /submissions/student/my-submissions
```

---

### 2. Student Uploads a File-Based Assignment

```
Student opens /submissions/student/submit/[assignmentId]
        │
        ├─ GET /api/assignments/{id}
        └─ POST /api/submissions              → creates DRAFT

Student drops files on FileUploader
        └─ POST /api/submissions/{id}/files   → uploads files

System automatically creates a version
        └─ POST /api/versions                 → new SubmissionVersion

Student clicks "Submit"
        └─ POST /api/submissions/{id}/submit
```

---

### 3. Lecturer Reviews & Grades a Submission

```
Lecturer opens /submissions/lecturer/grading/[submissionId]
        │
        ├─ GET /api/submissions/{id}           → submission details
        ├─ GET /api/submissions/{id}/answers   → student text answers
        ├─ GET /api/feedback?submissionId=…    → AI feedback
        └─ GET /api/plagiarism?submissionId=…  → plagiarism report

Lecturer clicks "Generate AI Feedback"
        └─ POST /api/feedback/generate
                └─ polls GET /api/feedback/{id}/status every 3s
                └─ on COMPLETED → displays full Feedback object

Lecturer fills in scores and submits grade
        └─ POST /api/submissions/{id}/grade
```

---

### 4. AI Feedback Async Polling Flow

```
Frontend calls POST /api/feedback/generate
        │
        ▼
Backend returns { id: "fb-001", status: "PENDING" }
        │
        ▼
Frontend starts polling GET /api/feedback/{id}/status every 3000ms
        │
        ├─ status == "PROCESSING" → continue polling
        ├─ status == "COMPLETED"  → fetch full feedback, stop polling
        ├─ status == "FAILED"     → show error, stop polling
        └─ 20 attempts exceeded   → timeout error, stop polling
```

---

## Frontend File Structure

```
frontend/
├── types/
│   └── submission.types.ts          ← all TypeScript interfaces
│
├── lib/api/
│   └── submission-services.ts       ← 4 service objects (API calls)
│
├── hooks/
│   ├── useSubmissions.ts            ← submission + assignment hooks
│   ├── useVersions.ts               ← version control hooks
│   ├── useFeedback.ts               ← feedback hooks + polling
│   ├── usePlagiarism.ts             ← plagiarism hooks
│   └── useAnswerEditor.ts           ← per-question debounce logic
│
├── components/submissions/
│   ├── SubmissionCard.tsx           ← displays one submission with status badge
│   ├── AIFeedbackCard.tsx           ← strengths / improvements / scores
│   ├── PlagiarismReportCard.tsx     ← traffic light + match list
│   ├── VersionTimeline.tsx          ← version list with compare checkboxes
│   ├── DiffViewer.tsx               ← line-level diff (+/- view)
│   ├── FileUploader.tsx             ← drag-and-drop with upload progress
│   ├── RichTextEditor.tsx           ← auto-resize textarea + word count bar
│   ├── LiveFeedbackPanel.tsx        ← real-time AI scores (ghost/loading/result)
│   ├── PlagiarismWarning.tsx        ← severity chip below each editor
│   └── QuestionCard.tsx             ← 2-col layout wiring editor+feedback+plagiarism
│
└── app/submissions/
    ├── layout.tsx                   ← wraps in ModuleLayout (auth gate)
    ├── page.tsx                     ← root redirect
    │
    ├── student/
    │   ├── page.tsx                 ← student dashboard
    │   ├── my-submissions/page.tsx  ← submission list + available assignments
    │   ├── answer/[assignmentId]/page.tsx  ← text-based answer writing
    │   ├── submit/[assignmentId]/page.tsx  ← file upload submission
    │   ├── analytics/page.tsx       ← personal performance charts
    │   ├── versions/page.tsx        ← version history list
    │   ├── versions/[submissionId]/page.tsx ← version comparison
    │   ├── plagiarism/page.tsx      ← plagiarism report list
    │   └── feedback/[id]/page.tsx   ← detailed feedback view
    │
    └── lecturer/
        ├── page.tsx                 ← lecturer dashboard
        ├── assignments/page.tsx     ← manage assignments
        ├── grading/page.tsx         ← grading queue
        ├── grading/[submissionId]/page.tsx ← grade one submission
        ├── analytics/page.tsx       ← class-wide analytics
        ├── students/page.tsx        ← per-student insights
        ├── plagiarism/page.tsx      ← plagiarism management
        └── submissions/page.tsx     ← all submissions view
```

---

## Backend File Structure

```
backend/
├── submission-management-service/   ← port 8081
│   └── .../submission_management_service/
│       ├── model/
│       │   ├── Submission.java
│       │   ├── SubmissionFile.java
│       │   ├── SubmissionStatus.java (enum)
│       │   ├── SubmissionType.java (enum)
│       │   └── Answer.java          ← text answer entity
│       ├── repository/
│       │   ├── SubmissionRepository.java
│       │   └── AnswerRepository.java
│       ├── service/
│       │   ├── SubmissionService.java
│       │   └── AnswerService.java
│       ├── controller/
│       │   ├── SubmissionController.java
│       │   └── AnswerController.java
│       └── dto/
│           ├── request/  (CreateSubmissionRequest, GradeSubmissionRequest, SaveAnswerRequest)
│           └── response/ (SubmissionResponse, AnswerResponse)
│
├── version_control_service/         ← port 8082
│
├── feedback-service/                ← port 8083
│   └── .../feedback_service/
│       ├── controller/FeedbackController.java  ← includes /live endpoint
│       ├── service/
│       │   ├── FeedbackService.java
│       │   └── LiveFeedbackService.java
│       └── dto/
│           ├── request/LiveFeedbackRequest.java
│           └── response/LiveFeedbackResponse.java
│
└── integrity-monitoring-service/    ← port 8084
    └── includes POST /api/integrity/realtime/check
```

---

## Authentication Flow

```
Browser localStorage['authToken'] = JWT token
        │
        ▼
ModuleLayout (wraps all /submissions/* pages)
        │
        └─ GET /api/auth/verify (Next.js API route)
                │
                ├─ valid + role == "student" → render student page
                ├─ valid + role == "lecture" → render lecturer page
                └─ invalid/missing          → redirect to /login
```

**JWT payload (decoded client-side):**
```json
{ "userId": "<MongoDB _id>", "email": "...", "userRole": "student" | "lecture" }
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Text-based Q&A over file upload | Students type essays in browser (like Google Forms) — no need to install Word/PDF tools |
| 3-second debounce for live feedback | Avoids API spam while still feeling responsive |
| 5-second debounce for auto-save | Frequent enough to not lose work; infrequent enough to not overload the backend |
| Client-side analytics computation | No dedicated analytics endpoints needed — all stats computed from raw submission arrays via `useMemo` |
| Graceful fallback everywhere | Pages never crash even if all 4 microservices are offline — shows sample data or empty state |
| Flat array + paged response duality | Frontend handles both shapes from `GET /api/submissions` — enables gradual migration to pagination |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Backend | Spring Boot 3 (Java 17) |
| AI | HuggingFace Inference API (Mistral-7B-Instruct-v0.2) |
| Auth store | `localStorage['authToken']` (JWT) |
| HTTP client | Native `fetch` API (no Axios) |
