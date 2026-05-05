// ============================================================
// Submission System - API Services
// Connects to 4 Spring Boot microservices:
//   8081 submission-management-service (submissions, answers, grading)
//   8082 version-control-service       (version history, diff, download)
//   8083 feedback-service              (live AI feedback)
//   8084 integrity-monitoring-service  (plagiarism detection)
// ============================================================

import type {
    Submission,
    CreateSubmissionPayload,
    UpdateSubmissionPayload,
    GradeSubmissionPayload,
    SubmissionVersion,
    TextSnapshotPayload,
    VcsDiffRequest,
    VcsDiffResponse,
    Feedback,
    GenerateFeedbackPayload,
    PlagiarismReport,
    CheckPlagiarismPayload,
    UpdatePlagiarismReviewPayload,
    Assignment,
    AssignmentWithQuestions,
    Question,
    PagedResponse,
    TextAnswer,
    SaveAnswerPayload,
    SaveAnswerAnalysisPayload,
    LiveFeedback,
    LivePlagiarismResult,
    VcsAnswerSnapshot,
    AiDetectionResult,
} from '@/types/submission.types';

// ─── Base URLs ────────────────────────────────────────────────

const SUBMISSION_API =
    process.env.NEXT_PUBLIC_SUBMISSION_API_URL ?? 'https://api.smartapi.infinityfreeapp.com/submissions';
const VERSION_API =
    process.env.NEXT_PUBLIC_VERSION_API_URL ?? 'https://api.smartapi.infinityfreeapp.com/versions';
const FEEDBACK_API =
    process.env.NEXT_PUBLIC_FEEDBACK_API_URL ?? 'https://api.smartapi.infinityfreeapp.com/feedback';
const PLAGIARISM_API =
    process.env.NEXT_PUBLIC_PLAGIARISM_API_URL ?? 'https://api.smartapi.infinityfreeapp.com/integrity';

// ─── Auth helper ──────────────────────────────────────────────

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
}

// ─── Core fetch wrapper ───────────────────────────────────────

async function apiRequest<T>(
    url: string,
    options: RequestInit = {},
    /** When true, suppress console.error for non-OK responses (used for probe/fallback calls). */
    silent = false,
): Promise<T> {
    const token = getToken();
    const method = options.method ?? 'GET';

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Only set Content-Type to JSON if not sending FormData
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
            const errorBody = await response.json();
            if (!silent) console.error(`[apiRequest] ERROR ${method} ${url} → HTTP ${response.status}`, errorBody);
            errorMessage = errorBody.message ?? errorMessage;
        } catch {
            if (!silent) console.error(`[apiRequest] ERROR ${method} ${url} → HTTP ${response.status} (no parseable body)`);
        }
        throw new Error(errorMessage);
    }

    // 204 No Content — return null
    if (response.status === 204) return null as unknown as T;

    return response.json() as Promise<T>;
}

// ─── Letter grade helper ──────────────────────────────────────

export function scoreToLetterGrade(pct: number): string {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 75) return 'A-';
    if (pct >= 70) return 'B+';
    if (pct >= 65) return 'B';
    if (pct >= 60) return 'B-';
    if (pct >= 55) return 'C+';
    if (pct >= 45) return 'C';
    if (pct >= 40) return 'C-';
    if (pct >= 35) return 'D+';
    if (pct >= 30) return 'D';
    return 'E';
}

// ─── Submission Service (port 8081) ───────────────────────────

export const submissionService = {
    /** Get all submissions for the current student */
    async getStudentSubmissions(studentId: string): Promise<Submission[]> {
        const res = await apiRequest<Submission[] | { data?: Submission[]; content?: Submission[] }>(
            `${SUBMISSION_API}/api/submissions?studentId=${encodeURIComponent(studentId)}`
        );
        if (Array.isArray(res)) return res;
        return (res as { data?: Submission[]; content?: Submission[] }).data
            ?? (res as { data?: Submission[]; content?: Submission[] }).content
            ?? [];
    },

    /** Get submissions for a student scoped to a single assignment */
    async getStudentSubmissionsForAssignment(studentId: string, assignmentId: string): Promise<Submission[]> {
        const res = await apiRequest<Submission[] | { data?: Submission[]; content?: Submission[] }>(
            `${SUBMISSION_API}/api/submissions?studentId=${encodeURIComponent(studentId)}&assignmentId=${encodeURIComponent(assignmentId)}`
        );
        if (Array.isArray(res)) return res;
        return (res as { data?: Submission[]; content?: Submission[] }).data
            ?? (res as { data?: Submission[]; content?: Submission[] }).content
            ?? [];
    },

    /** Get all submissions (lecturer view) */
    getAllSubmissions(params?: {
        assignmentId?: string;
        status?: string;
        page?: number;
        size?: number;
    }): Promise<PagedResponse<Submission> | Submission[]> {
        const query = new URLSearchParams();
        if (params?.assignmentId) query.set('assignmentId', params.assignmentId);
        if (params?.status)       query.set('status', params.status);
        if (params?.page != null) query.set('page', String(params.page));
        if (params?.size != null) query.set('size', String(params.size));
        const qs = query.toString() ? `?${query}` : '';
        return apiRequest<PagedResponse<Submission> | Submission[]>(
            `${SUBMISSION_API}/api/submissions${qs}`
        );
    },

    /** Get a single submission by ID */
    async getSubmission(id: string): Promise<Submission> {
        const res = await apiRequest<unknown>(`${SUBMISSION_API}/api/submissions/${id}`);
        if (res && typeof res === 'object') {
            const obj = res as Record<string, unknown>;
            if (obj.data && typeof obj.data === 'object') return obj.data as Submission;
        }
        return res as Submission;
    },

    /** Create a new submission (returns submission with an ID) */
    createSubmission(payload: CreateSubmissionPayload): Promise<Submission> {
        return apiRequest<Submission>(`${SUBMISSION_API}/api/submissions`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    /** Update submission metadata (comments, title) */
    updateSubmission(id: string, payload: UpdateSubmissionPayload): Promise<Submission> {
        return apiRequest<Submission>(`${SUBMISSION_API}/api/submissions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    /** Officially submit (change status to SUBMITTED), returns the updated Submission with the new versionNumber. */
    async submitSubmission(id: string): Promise<Submission> {
        // Backend wraps in ApiResponse<Submission> → { data: Submission }
        const res = await apiRequest<unknown>(`${SUBMISSION_API}/api/submissions/${id}/submit`, {
            method: 'POST',
        });
        if (res && typeof res === 'object') {
            const obj = res as Record<string, unknown>;
            if (obj.data && typeof obj.data === 'object') return obj.data as Submission;
        }
        return res as Submission;
    },

    /** Delete a draft submission */
    deleteSubmission(id: string): Promise<void> {
        return apiRequest<void>(`${SUBMISSION_API}/api/submissions/${id}`, {
            method: 'DELETE',
        });
    },

    /** Upload files to a submission */
    uploadFiles(submissionId: string, files: File[]): Promise<Submission> {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        return apiRequest<Submission>(
            `${SUBMISSION_API}/api/submissions/${submissionId}/files`,
            { method: 'POST', body: formData }
        );
    },

    /** Grade a submission (lecturer) */
    gradeSubmission(id: string, payload: GradeSubmissionPayload): Promise<Submission> {
        return apiRequest<Submission>(
            `${SUBMISSION_API}/api/submissions/${id}/grade`,
            { method: 'POST', body: JSON.stringify(payload) }
        );
    },

    // ─── Assignments ─────────────────────────────────────────

    /** Get all open assignments */
    getAssignments(params?: { status?: string; moduleCode?: string }): Promise<Assignment[]> {
        const query = new URLSearchParams();
        if (params?.status)     query.set('status', params.status);
        if (params?.moduleCode) query.set('moduleCode', params.moduleCode);
        const qs = query.toString() ? `?${query}` : '';
        return apiRequest<Assignment[]>(`${SUBMISSION_API}/api/assignments${qs}`);
    },

    /** Get a single assignment */
    getAssignment(id: string): Promise<Assignment> {
        return apiRequest<Assignment>(`${SUBMISSION_API}/api/assignments/${id}`);
    },

    /** Create assignment (lecturer) */
    createAssignment(payload: Partial<Assignment>): Promise<Assignment> {
        return apiRequest<Assignment>(`${SUBMISSION_API}/api/assignments`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    /** Update assignment (lecturer) */
    updateAssignment(id: string, payload: Partial<Assignment>): Promise<Assignment> {
        return apiRequest<Assignment>(`${SUBMISSION_API}/api/assignments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    // ─── Text-Answer endpoints (text-based Q&A system) ────────

    /**
     * Find an existing DRAFT submission for this student + assignment, or create one.
     * Used by the answer page to get (or create) the draft before the student starts typing.
     */
    async getOrCreateDraftSubmission(
        assignmentId: string,
        studentId: string,
        studentName: string = 'Student',
        assignmentTitle?: string,
        moduleCode?: string,
        moduleName?: string,
    ): Promise<Submission> {
        // Backend returns ApiResponse<Page<Submission>> → { data: { content: Submission[] } }
        const existing = await apiRequest<unknown>(
            `${SUBMISSION_API}/api/submissions?studentId=${encodeURIComponent(studentId)}&assignmentId=${encodeURIComponent(assignmentId)}`
        );

        let list: Submission[] = [];
        if (Array.isArray(existing)) {
            list = existing as Submission[];
        } else if (existing && typeof existing === 'object') {
            const obj = existing as Record<string, unknown>;
            const inner = obj.data ?? existing;
            if (Array.isArray(inner)) {
                list = inner as Submission[];
            } else if (inner && typeof inner === 'object') {
                const page = inner as Record<string, unknown>;
                list = (page.content as Submission[]) ?? [];
            }
        }

        // ONE submission row per student+assignment pair.
        // Return any existing submission as-is — regardless of status.
        // The working copy (Answer rows) is always editable; immutable snapshots are
        // created only when the student clicks Submit. Never reset to DRAFT.
        if (list.length > 0) {
            return list[0];
        }

        // Create new draft — backend returns ApiResponse<Submission> → { data: Submission }
        const created = await apiRequest<unknown>(`${SUBMISSION_API}/api/submissions`, {
            method: 'POST',
            body: JSON.stringify({
                studentId,
                studentName,
                assignmentId,
                assignmentTitle: assignmentTitle || undefined,
                title: assignmentTitle || 'Text Submission',
                moduleCode: moduleCode || undefined,
                moduleName: moduleName || undefined,
                submissionType: 'ASSIGNMENT',
            }),
        });

        if (created && typeof created === 'object') {
            const obj = created as Record<string, unknown>;
            if (obj.data && typeof obj.data === 'object') {
                return obj.data as Submission;
            }
        }
        return created as Submission;
    },

    /**
     * Save (upsert) a student's typed answer for one question.
     * PUT /api/submissions/{submissionId}/answers/{questionId}
     */
    saveAnswer(
        submissionId: string,
        questionId: string,
        payload: SaveAnswerPayload,
    ): Promise<void> {
        return apiRequest<void>(
            `${SUBMISSION_API}/api/submissions/${submissionId}/answers/${questionId}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        );
    },

    /**
     * Persist AI feedback and/or plagiarism results for a specific answer.
     * PATCH /api/submissions/{submissionId}/answers/{questionId}/analysis
     * Silently skips if submissionId is empty (server also guards wordCount >= 1).
     */
    saveAnswerAnalysis(
        submissionId: string,
        questionId: string,
        payload: SaveAnswerAnalysisPayload,
    ): Promise<void> {
        if (!submissionId) return Promise.resolve();
        return apiRequest<void>(
            `${SUBMISSION_API}/api/submissions/${submissionId}/answers/${questionId}/analysis`,
            { method: 'PATCH', body: JSON.stringify(payload) }
        );
    },

    /**
     * Get all saved answers for a submission.
     * GET /api/submissions/{submissionId}/answers
     */
    async getAnswers(submissionId: string): Promise<TextAnswer[]> {
        const res = await apiRequest<unknown>(
            `${SUBMISSION_API}/api/submissions/${submissionId}/answers`
        );
        let answers: TextAnswer[] = [];
        if (Array.isArray(res)) {
            answers = res as TextAnswer[];
        } else if (res && typeof res === 'object') {
            const obj = res as Record<string, unknown>;
            if (Array.isArray(obj.data)) answers = obj.data as TextAnswer[];
        }
        return answers;
    },
};

// ─── Projects & Tasks Integration ────────────────────────────
//
// Raw response shapes from the Next.js API routes created by the
// projects-and-tasks teammate component.  These are same-origin
// routes so no base URL or CORS config is needed.

interface _RawDocument { url: string; name: string; fileSize: number; }
interface _RawCourse   { _id: string; courseName: string; courseCode: string; }

interface _RawSubtask {
    id: string;
    title: string;
    description?: string;
    marks?: number;
    completed?: boolean;
}

interface _RawMainTask {
    id: string;
    title: string;
    description?: string;
    marks?: number;
    subtasks?: _RawSubtask[];
    completed?: boolean;
}

interface _RawProject {
    _id: string;
    courseId: string;
    lecturerId: string | { name?: string };
    projectName: string;
    description: { html: string; text: string };
    projectType: 'group' | 'individual';
    assignedGroupIds?: string[];
    assignedGroups?: { _id: string; groupName: string }[];
    deadlineDate: string;
    deadlineTime?: string;
    specialNotes?: { html: string; text: string };
    templateDocuments?: _RawDocument[];
    otherDocuments?: _RawDocument[];
    images?: _RawDocument[];
    mainTasks?: _RawMainTask[];
    course?: _RawCourse;
    createdAt?: string;
    updatedAt?: string;
}

interface _RawTask {
    _id: string;
    courseId: string;
    lecturerId: string | { name?: string };
    taskName: string;
    description: { html: string; text: string };
    deadlineDate?: string;
    deadlineTime?: string;
    specialNotes?: { html: string; text: string };
    templateDocuments?: _RawDocument[];
    otherDocuments?: _RawDocument[];
    images?: _RawDocument[];
    subtasks?: _RawSubtask[];
    course?: _RawCourse;
    createdAt?: string;
    updatedAt?: string;
}

// Combine "YYYY-MM-DD" + "HH:MM" into an ISO string.
// Falls back to 30 days from now when date is absent (task with no deadline).
function _toDeadlineISO(date?: string, time?: string): string {
    if (!date) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return new Date(`${date}T${time ?? '23:59'}:00`).toISOString();
}

// Derive open/closed status from the deadline.
function _deriveStatus(date?: string, time?: string): 'OPEN' | 'CLOSED' {
    if (!date) return 'OPEN';
    return new Date(`${date}T${time ?? '23:59'}:00`) < new Date() ? 'CLOSED' : 'OPEN';
}

/** Map a project's mainTasks[] to Question[] for the text-answer page. */
function _mapMainTasksToQuestions(projectId: string, mainTasks: _RawMainTask[]): Question[] {
    return mainTasks.map((mt, i) => ({
        id:           mt.id || String(i + 1),
        assignmentId: projectId,
        text:         mt.title,
        description:  mt.description,
        order:        i + 1,
        isRequired:   true,
        maxPoints:    mt.marks ?? 5,
    }));
}

/** Map a task's subtasks[] to Question[] for the text-answer page. */
function _mapSubtasksToQuestions(taskId: string, subtasks: _RawSubtask[]): Question[] {
    return subtasks.map((st, i) => ({
        id:           st.id || String(i + 1),
        assignmentId: taskId,
        text:         st.title,
        description:  st.description,
        order:        i + 1,
        isRequired:   true,
        maxPoints:    st.marks ?? 5,
    }));
}

function _mapProject(p: _RawProject): Assignment {
    const totalMarks = (p.mainTasks ?? []).reduce((sum, mt) => sum + (mt.marks ?? 5), 0);
    return {
        id:             String(p._id),
        title:          p.projectName,
        description:    p.description?.text ?? '',
        moduleCode:     p.course?.courseCode ?? p.courseId,
        moduleName:     p.course?.courseName,
        dueDate:        _toDeadlineISO(p.deadlineDate, p.deadlineTime),
        totalMarks:     totalMarks || 100,
        status:         _deriveStatus(p.deadlineDate, p.deadlineTime),
        assignmentType: 'project',
        createdBy:      typeof p.lecturerId === 'string' ? p.lecturerId : undefined,
    };
}

function _mapTask(t: _RawTask): Assignment {
    const totalMarks = (t.subtasks ?? []).reduce((sum, st) => sum + (st.marks ?? 5), 0);
    return {
        id:             String(t._id),
        title:          t.taskName,
        description:    t.description?.text ?? '',
        moduleCode:     t.course?.courseCode ?? t.courseId,
        moduleName:     t.course?.courseName,
        dueDate:        _toDeadlineISO(t.deadlineDate, t.deadlineTime),
        totalMarks:     totalMarks || 100,
        status:         _deriveStatus(t.deadlineDate, t.deadlineTime),
        assignmentType: 'task',
        createdBy:      typeof t.lecturerId === 'string' ? t.lecturerId : undefined,
    };
}

/** Full mapping of a project including questions[] — for the answer/grading pages. */
function _mapProjectFull(p: _RawProject): AssignmentWithQuestions {
    return {
        ..._mapProject(p),
        questions: _mapMainTasksToQuestions(String(p._id), p.mainTasks ?? []),
    };
}

/** Full mapping of a task including questions[] — for the answer/grading pages. */
function _mapTaskFull(t: _RawTask): AssignmentWithQuestions {
    return {
        ..._mapTask(t),
        questions: _mapSubtasksToQuestions(String(t._id), t.subtasks ?? []),
    };
}

/**
 * Fetches projects and tasks from the teammate's projects-and-tasks
 * Next.js API routes.  Same-origin calls — no extra env var or CORS needed.
 */
export const projectsAndTasksService = {
    /** Student: all projects for enrolled courses (JWT identifies the student). */
    async getStudentProjects(): Promise<AssignmentWithQuestions[]> {
        const res = await apiRequest<{ data: { projects: _RawProject[] } }>(
            '/api/projects-and-tasks/student/projects'
        );
        return (res.data?.projects ?? []).map(_mapProjectFull);
    },

    /** Student: all tasks for enrolled courses. */
    async getStudentTasks(): Promise<AssignmentWithQuestions[]> {
        const res = await apiRequest<{ data: { tasks: _RawTask[] } }>(
            '/api/projects-and-tasks/student/tasks'
        );
        return (res.data?.tasks ?? []).map(_mapTaskFull);
    },

    /** Lecturer: published projects for a specific course. */
    async getLecturerProjects(courseId: string, lecturerId: string): Promise<Assignment[]> {
        const res = await apiRequest<{ data: { projects: _RawProject[] } }>(
            `/api/submissions/lecturer/published-projects?courseId=${encodeURIComponent(courseId)}&lecturerId=${encodeURIComponent(lecturerId)}`
        );
        return (res.data?.projects ?? []).map(_mapProject);
    },

    /** Lecturer: published tasks for a specific course. */
    async getLecturerTasks(courseId: string, lecturerId: string): Promise<Assignment[]> {
        const res = await apiRequest<{ data: { tasks: _RawTask[] } }>(
            `/api/submissions/lecturer/published-tasks?courseId=${encodeURIComponent(courseId)}&lecturerId=${encodeURIComponent(lecturerId)}`
        );
        return (res.data?.tasks ?? []).map(_mapTask);
    },

    /**
     * Fetch a single project by ID with its mainTasks mapped to Question[].
     * GET /api/projects-and-tasks/lecturer/create-projects-and-tasks/project/{projectId}
     */
    async getProjectById(id: string): Promise<AssignmentWithQuestions> {
        const res = await apiRequest<{ data: _RawProject }>(
            `/api/projects-and-tasks/lecturer/create-projects-and-tasks/project/${encodeURIComponent(id)}`
        );
        return _mapProjectFull(res.data);
    },

    /**
     * Fetch a single task by ID with its subtasks mapped to Question[].
     * GET /api/projects-and-tasks/lecturer/create-projects-and-tasks/task/{taskId}
     */
    async getTaskById(id: string): Promise<AssignmentWithQuestions> {
        const res = await apiRequest<{ data: _RawTask }>(
            `/api/projects-and-tasks/lecturer/create-projects-and-tasks/task/${encodeURIComponent(id)}`
        );
        return _mapTaskFull(res.data);
    },
};

/** Silent variants used by the parallel probe in getAssignmentWithFallback — no console.error on 404. */
async function _probeProjectById(id: string): Promise<AssignmentWithQuestions> {
    const res = await apiRequest<{ data: _RawProject }>(
        `/api/projects-and-tasks/lecturer/create-projects-and-tasks/project/${encodeURIComponent(id)}`,
        {},
        true,
    );
    return _mapProjectFull(res.data);
}
async function _probeTaskById(id: string): Promise<AssignmentWithQuestions> {
    const res = await apiRequest<{ data: _RawTask }>(
        `/api/projects-and-tasks/lecturer/create-projects-and-tasks/task/${encodeURIComponent(id)}`,
        {},
        true,
    );
    return _mapTaskFull(res.data);
}

// ─── VCS response normaliser ──────────────────────────────────
//
// The version-control-service returns VersionResponse (Java) wrapped in
// ApiResponse<T> → { success, message, data }.  The metadata JSONB field
// holds the full answer snapshots for text submissions.
// This function maps the VCS shape to the shared SubmissionVersion type so
// all existing hooks and components continue working unchanged.

interface VcsRaw {
    id: number;
    submissionId: number;
    versionNumber: number;
    commitHash?: string;
    parentVersionId?: number;
    commitMessage?: string;
    triggerType?: 'SUBMISSION' | 'MANUAL' | 'AUTO_SAVE';
    createdBy?: string;
    metadata?: Record<string, unknown>;
    changesSummary?: string;
    totalFiles?: number;
    totalSizeBytes?: number;
    createdAt: string;
    isSnapshot?: boolean;
    files?: unknown[];
}

function normalizeVcsVersion(v: VcsRaw): SubmissionVersion {
    const meta = v.metadata ?? {};
    const answers = Array.isArray(meta.answers) ? meta.answers : [];
    const avgSimilarity = answers.length
        ? (answers as Array<{ similarityScore?: number | null }>)
              .reduce((s, a) => s + (a.similarityScore ?? 0), 0) / answers.length
        : undefined;

    const mappedAnswers = (answers as VcsAnswerSnapshot[]).map((a, idx) => ({
        id:                  `${v.id}-q${idx}`,
        versionId:           String(v.id),
        questionId:          a.questionId,
        questionText:        a.questionText,
        answerText:          a.answerText,
        wordCount:           a.wordCount,
        grammarScore:        a.grammarScore ?? null,
        clarityScore:        a.clarityScore ?? null,
        completenessScore:   a.completenessScore ?? null,
        relevanceScore:      a.relevanceScore ?? null,
        strengths:           a.strengths ?? null,
        improvements:        a.improvements ?? null,
        suggestions:         a.suggestions ?? null,
        similarityScore:     a.similarityScore ?? null,
        plagiarismSeverity:  (a.plagiarismSeverity as 'LOW' | 'MEDIUM' | 'HIGH' | null) ?? null,
        aiGeneratedMark:     a.projectedGrade ?? null,
        maxPoints:           a.maxPoints ?? null,
        plagiarismSources:   (a.internetMatches ?? []).map((m, mi) => ({
            id:                   `${v.id}-q${idx}-m${mi}`,
            sourceUrl:            (m as Record<string, unknown>).url as string ?? '',
            sourceTitle:          (m as Record<string, unknown>).title as string ?? (m as Record<string, unknown>).sourceDomain as string ?? 'Unknown source',
            sourceSnippet:        (m as Record<string, unknown>).snippet as string ?? undefined,
            matchedText:          (m as Record<string, unknown>).matchedStudentText as string ?? undefined,
            similarityPercentage: (m as Record<string, unknown>).similarityScore as number ?? 0,
        })),
    }));

    return {
        id:            String(v.id),
        submissionId:  String(v.submissionId),
        versionNumber: v.versionNumber,
        studentId:     v.createdBy,
        submittedAt:   v.createdAt,
        createdAt:     v.createdAt,
        commitHash:    v.commitHash,
        commitMessage: v.commitMessage,
        changesSummary: v.changesSummary,
        changes:       v.commitMessage,
        triggerType:   v.triggerType,
        createdBy:     v.createdBy,
        isSnapshot:    v.isSnapshot,
        isSubmitted:   v.triggerType === 'SUBMISSION',
        metadata:      meta as SubmissionVersion['metadata'],
        totalWordCount: typeof meta.totalWordCount === 'number' ? meta.totalWordCount : undefined,
        wordCount:      typeof meta.totalWordCount === 'number' ? meta.totalWordCount : undefined,
        // overallGrade is 0-100. Fallback: compute from per-question AI scores
        // so old snapshots (where overallGrade was not stored) still show a value.
        ...(() => {
            const stored = typeof meta.overallGrade === 'number' ? meta.overallGrade : null;
            const overallPct = stored ?? (() => {
                // Use per-question aiGeneratedMark (actual earned marks) + maxPoints when available (new snapshots).
                const rawAnswers = answers as VcsAnswerSnapshot[];
                const hasProjected = mappedAnswers.some(a => a.aiGeneratedMark != null);
                if (hasProjected) {
                    const totalMax = rawAnswers.reduce((s, a) => s + (a.maxPoints ?? 10), 0);
                    if (!totalMax) return null;
                    // aiGeneratedMark is already actual earned marks (e.g. 15.5 out of 20) — sum directly
                    const totalEarned = mappedAnswers.reduce((s, a) => {
                        if (a.aiGeneratedMark == null) return s;
                        return s + a.aiGeneratedMark;
                    }, 0);
                    return Math.round((totalEarned / totalMax) * 1000) / 10;
                }
                // Fallback for very old snapshots: avg AI quality scores over ALL
                // questions (unanswered questions implicitly contribute 0).
                if (!mappedAnswers.length) return null;
                const sumScores = mappedAnswers.reduce((sum, a) => {
                    const s = [a.grammarScore, a.clarityScore, a.completenessScore, a.relevanceScore]
                        .filter((x): x is number => x != null);
                    return sum + (s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0);
                }, 0);
                return Math.round((sumScores / mappedAnswers.length) * 10);
            })();
            const maxGrade = typeof meta.maxGrade === 'number' ? meta.maxGrade : null;
            const scaledGrade = overallPct != null && maxGrade != null
                ? Math.round((overallPct / 100) * maxGrade * 10) / 10
                : overallPct;
            return {
                aiScore:    overallPct  ?? undefined,
                aiGrade:    scaledGrade ?? undefined,
                finalGrade: scaledGrade ?? undefined,
                maxGrade:   maxGrade    ?? undefined,
            };
        })(),
        plagiarismScore: avgSimilarity != null ? Math.round(avgSimilarity * 10) / 10 : undefined,
        answers:        mappedAnswers.length > 0 ? mappedAnswers : undefined,
    };
}

// ─── Version Service (port 8082 — version-control-service) ───

export const versionService = {
    /**
     * List all version headers for a submission (newest first).
     * GET /api/versions/submission/{submissionId}
     */
    async getVersions(submissionId: string): Promise<SubmissionVersion[]> {
        const raw = await apiRequest<{ success: boolean; data: VcsRaw[] }>(
            `${VERSION_API}/api/versions/submission/${encodeURIComponent(submissionId)}`
        );
        const list = (raw as { data?: VcsRaw[] }).data ?? [];
        return (Array.isArray(list) ? list : []).map(normalizeVcsVersion);
    },

    /**
     * Get the latest version with full metadata (answer snapshots).
     * GET /api/versions/submission/{submissionId}/latest
     */
    async getLatestVersion(submissionId: string): Promise<SubmissionVersion> {
        const raw = await apiRequest<{ success: boolean; data: VcsRaw }>(
            `${VERSION_API}/api/versions/submission/${encodeURIComponent(submissionId)}/latest`
        );
        return normalizeVcsVersion((raw as { data: VcsRaw }).data);
    },

    /**
     * Get a specific version by its VCS id.
     * submissionId is accepted for API compatibility but not sent to VCS
     * (VCS uses a flat /api/versions/{id} endpoint).
     * GET /api/versions/{versionId}
     */
    async getVersion(_submissionId: string, versionId: string): Promise<SubmissionVersion> {
        const raw = await apiRequest<{ success: boolean; data: VcsRaw }>(
            `${VERSION_API}/api/versions/${encodeURIComponent(versionId)}`
        );
        return normalizeVcsVersion((raw as { data: VcsRaw }).data);
    },

    /**
     * Create an immutable text snapshot in VCS immediately after submit.
     * All answer content, AI scores, and plagiarism data are embedded in
     * the version's JSONB metadata field — no separate save calls needed.
     * POST /api/versions/text-snapshot
     */
    async createTextSnapshot(payload: TextSnapshotPayload): Promise<SubmissionVersion> {
        const raw = await apiRequest<{ success: boolean; data: VcsRaw }>(
            `${VERSION_API}/api/versions/text-snapshot`,
            { method: 'POST', body: JSON.stringify(payload) }
        );
        return normalizeVcsVersion((raw as { data: VcsRaw }).data);
    },

    /**
     * Download a version as JSON (text snapshots) or ZIP (file snapshots).
     * Returns a Blob so the caller can trigger a browser download.
     * GET /api/versions/{versionId}/download
     */
    async downloadVersion(versionId: string): Promise<{ blob: Blob; filename: string }> {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const res = await fetch(`${VERSION_API}/api/versions/${encodeURIComponent(versionId)}/download`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        const disposition = res.headers.get('content-disposition') ?? '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match?.[1] ?? `version-${versionId}.json`;
        const blob = await res.blob();
        return { blob, filename };
    },

    /**
     * Generate a line-level diff between two versions.
     * For text snapshots, each "filePath" in the result is a questionId.
     * POST /api/versions/diff
     */
    async diffVersions(request: VcsDiffRequest): Promise<VcsDiffResponse> {
        const raw = await apiRequest<{ success: boolean; data: VcsDiffResponse }>(
            `${VERSION_API}/api/versions/diff`,
            { method: 'POST', body: JSON.stringify(request) }
        );
        return (raw as { data: VcsDiffResponse }).data;
    },
};

// ─── AI Feedback Service (port 8083) ─────────────────────────

export const feedbackService = {
    /** Get feedback for a submission (latest) — GET /api/feedback/submission/{submissionId} */
    async getFeedback(submissionId: string): Promise<Feedback> {
        // Backend returns ApiResponse<List<FeedbackResponse>> — unwrap and take the most recent
        const res = await apiRequest<{ success: boolean; data: Feedback[] }>(
            `${FEEDBACK_API}/api/feedback/submission/${encodeURIComponent(submissionId)}`
        );
        const items = res.data;
        if (!items || items.length === 0) {
            throw new Error('No feedback found for this submission');
        }
        return items[0];
    },

    /** Get feedback by ID */
    getFeedbackById(id: string): Promise<Feedback> {
        return apiRequest<Feedback>(`${FEEDBACK_API}/api/feedback/${id}`);
    },

    /** Get all feedback records for a submission (across versions) */
    getAllFeedbackForSubmission(submissionId: string): Promise<Feedback[]> {
        return apiRequest<Feedback[]>(
            `${FEEDBACK_API}/api/feedback/all?submissionId=${encodeURIComponent(submissionId)}`
        );
    },

    /** Trigger AI feedback generation */
    generateFeedback(payload: GenerateFeedbackPayload): Promise<Feedback> {
        return apiRequest<Feedback>(`${FEEDBACK_API}/api/feedback/generate`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    /**
     * Generate overall AI feedback for a text-based submission after submit.
     * Sends the concatenated Q&A content as submissionContent.
     * POST /api/feedback/generate
     */
    async generateSubmissionFeedback(
        submissionId: string,
        studentId: string,
        submissionContent: string,
    ): Promise<void> {
        await apiRequest<{ data: unknown }>(`${FEEDBACK_API}/api/feedback/generate`, {
            method: 'POST',
            body: JSON.stringify({
                submissionId:    Number(submissionId),
                studentId,
                submissionContent,
                forceRegenerate: false,
            }),
        });
    },

    /** Poll feedback status (for long-running analysis) */
    getFeedbackStatus(feedbackId: string): Promise<Pick<Feedback, 'id' | 'status'>> {
        return apiRequest<Pick<Feedback, 'id' | 'status'>>(
            `${FEEDBACK_API}/api/feedback/${feedbackId}/status`
        );
    },

    /**
     * Generate real-time lightweight feedback while the student types.
     * Called ~3 seconds after typing stops. Not persisted to DB.
     * The backend also returns projectedGrade/projectedGradePercent/letterGrade
     * when maxPoints is supplied (grade formula runs server-side).
     * POST /api/feedback/live
     */
    async generateLiveFeedback(payload: {
        questionId: string;
        answerText: string;
        questionPrompt?: string;
        expectedWordCount?: number;
        maxPoints?: number;
        /** Current plagiarism similarity score (0–100) — used by backend for grade penalty. */
        similarityScore?: number;
        /** AI-generated content probability (0.0–1.0) — used by backend for AI penalty. */
        aiDetectionScore?: number;
    }): Promise<LiveFeedback> {
        const res = await apiRequest<{ data: LiveFeedback }>(`${FEEDBACK_API}/api/feedback/live`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return res.data;
    },

    /**
     * Re-compute projected grade from existing AI scores + updated plagiarism score.
     * Called when the plagiarism result arrives after live feedback has already been shown.
     * POST /api/feedback/grade
     */
    async calculateGrade(payload: {
        grammarScore: number;
        clarityScore: number;
        completenessScore: number;
        relevanceScore: number;
        maxPoints: number;
        wordCount: number;
        expectedWordCount?: number;
        similarityScore?: number;
        aiDetectionScore?: number;
    }): Promise<{ projectedGrade: number; projectedGradePercent: number; letterGrade: string }> {
        const res = await apiRequest<{ data: { projectedGrade: number; projectedGradePercent: number; letterGrade: string } }>(
            `${FEEDBACK_API}/api/feedback/grade`,
            { method: 'POST', body: JSON.stringify(payload) },
        );
        return res.data;
    },

    /**
     * Classify answer text as AI-generated or human-written.
     * POST /api/feedback/ai-detect
     * Returns aiScore 0.0–1.0 (probability of AI authorship), or -1.0 if unavailable.
     */
    async detectAiContent(answerText: string): Promise<AiDetectionResult> {
        console.log('[AI-Detection] POST /api/feedback/ai-detect — textLen:', answerText.length);
        const res = await apiRequest<{ data: AiDetectionResult }>(
            `${FEEDBACK_API}/api/feedback/ai-detect`,
            { method: 'POST', body: JSON.stringify({ answerText }) },
        );
        console.log('[AI-Detection] Response — aiScore:', res.data?.aiScore,
            '| label:', res.data?.label,
            '| isAiGenerated:', res.data?.isAiGenerated);
        return res.data;
    },
};

// ─── Plagiarism Service (port 8084) ──────────────────────────

export const plagiarismService = {
    /** Get plagiarism checks for a submission — GET /api/integrity/checks/submission/{submissionId} */
    async getReport(submissionId: string): Promise<PlagiarismReport> {
        // Backend returns ApiResponse<List<PlagiarismCheckResponse>> — unwrap and take the most recent
        const res = await apiRequest<{ success: boolean; data: PlagiarismReport[] }>(
            `${PLAGIARISM_API}/api/integrity/checks/submission/${encodeURIComponent(submissionId)}`
        );
        const items = res.data;
        if (!items || items.length === 0) {
            throw new Error('No plagiarism report found for this submission');
        }
        return items[0];
    },

    /** Get report by ID */
    getReportById(id: string): Promise<PlagiarismReport> {
        return apiRequest<PlagiarismReport>(`${PLAGIARISM_API}/api/integrity/checks/${id}`);
    },

    /** Get all plagiarism reports (lecturer - flagged submissions) */
    async getAllReports(params?: {
        minScore?: number;
        reviewStatus?: string;
        assignmentId?: string;
    }): Promise<PlagiarismReport[]> {
        // Fetch aggregated plagiarism data from our Next.js API route
        // which merges submission-level scores with integrity service data.
        const reports: PlagiarismReport[] = await apiRequest<PlagiarismReport[]>(
            '/api/submissions/lecturer/plagiarism-reports',
        );
        // Apply client-side filters when provided
        return reports.filter((r) => {
            if (params?.minScore != null && r.overallScore < params.minScore) return false;
            if (params?.assignmentId && r.assignmentId !== params.assignmentId) return false;
            return true;
        });
    },

    /** Trigger plagiarism check (legacy endpoint — kept for backward compat) */
    checkPlagiarism(payload: CheckPlagiarismPayload): Promise<PlagiarismReport> {
        return apiRequest<PlagiarismReport>(`${PLAGIARISM_API}/api/integrity/checks`, {
            method: 'POST',
            body: JSON.stringify({
                submissionId: Number(payload.submissionId),
                checkType:    'COMBINED',
                checkInternet: true,
            }),
        });
    },

    /**
     * Run a full COMBINED plagiarism check for a submitted text-answer submission.
     * Checks both internet similarity and peer similarity.
     * POST /api/integrity/checks
     */
    async runCombinedCheck(
        submissionId: string,
        studentId: string,
        assignmentId: string,
        textContent: string,
    ): Promise<void> {
        await apiRequest<{ data: unknown }>(`${PLAGIARISM_API}/api/integrity/checks`, {
            method: 'POST',
            body: JSON.stringify({
                submissionId:  Number(submissionId),
                studentId,
                assignmentId,
                checkType:     'COMBINED',
                textContent,
                checkInternet: true,
            }),
        });
    },

    /** Poll check status */
    getCheckStatus(reportId: string): Promise<Pick<PlagiarismReport, 'id' | 'status' | 'overallScore'>> {
        return apiRequest<Pick<PlagiarismReport, 'id' | 'status' | 'overallScore'>>(
            `${PLAGIARISM_API}/api/plagiarism/${reportId}/status`
        );
    },

    /** Lecturer: update review decision */
    updateReview(reportId: string, payload: UpdatePlagiarismReviewPayload): Promise<PlagiarismReport> {
        return apiRequest<PlagiarismReport>(
            `${PLAGIARISM_API}/api/plagiarism/${reportId}/review`,
            { method: 'PUT', body: JSON.stringify(payload) }
        );
    },

    /**
     * Real-time similarity check using the existing
     * POST /api/integrity/realtime/check endpoint.
     *
     * Maps the backend's RealtimeCheckResponse into LivePlagiarismResult:
     *   similarity ≥ 0.70 → HIGH, ≥ 0.40 → MEDIUM, else LOW
     */
    async checkLiveSimilarity(payload: {
        sessionId: string;
        studentId: string;
        questionId: string;
        textContent: string;
        questionText?: string;
        /** Actual integer submission ID — sent so the backend can exclude the student's own answer from peer comparison. */
        submissionId?: string;
    }): Promise<LivePlagiarismResult> {
        // The backend questionId field is a Long — parse string to number
        const backendPayload = {
            sessionId: payload.sessionId,
            studentId: payload.studentId,
            questionId: parseInt(payload.questionId, 10) || 0,
            textContent: payload.textContent,
            questionText: payload.questionText ?? '',
            questionType: 'TEXT',
            submissionId: payload.submissionId ?? null,
        };

        const res = await apiRequest<{
            data: {
                similarityScore?: number;
                flagged?: boolean;
                warningMessage?: string;
                internetSimilarityScore?: number;
                peerSimilarityScore?: number;
                riskScore?: number;
                riskLevel?: string;
                internetMatches?: {
                    title?: string;
                    url?: string;
                    snippet?: string;
                    similarityScore?: number;
                    sourceDomain?: string;
                    sourceCategory?: string;
                    confidenceLevel?: string;
                    matchedStudentText?: string;
                }[];
            };
        }>(`${PLAGIARISM_API}/api/integrity/realtime/check`, {
            method: 'POST',
            body: JSON.stringify(backendPayload),
        });
        const raw = res.data ?? {};

        // Normalise similarity from [0.0-1.0] or [0-100] to [0-100]
        const rawScore = raw.similarityScore ?? 0;
        const normalised = rawScore <= 1.0 ? rawScore * 100 : rawScore;
        const severity: LivePlagiarismResult['severity'] =
            normalised >= 70 ? 'HIGH' : normalised >= 40 ? 'MEDIUM' : 'LOW';

        const normScore = (v?: number) => {
            if (v == null) return undefined;
            return v <= 1.0 ? Math.round(v * 1000) / 10 : Math.round(v * 10) / 10;
        };

        const result: LivePlagiarismResult = {
            questionId: payload.questionId,
            similarityScore: Math.round(normalised * 10) / 10,
            severity,
            flagged: raw.flagged ?? normalised >= 70,
            matchedText: raw.warningMessage,
            checkedAt: new Date().toISOString(),
            internetSimilarityScore: normScore(raw.internetSimilarityScore),
            peerSimilarityScore:     normScore(raw.peerSimilarityScore),
            riskScore:               raw.riskScore ?? undefined,
            riskLevel:               (raw.riskLevel ?? undefined) as LivePlagiarismResult['riskLevel'],
            internetMatches: (raw.internetMatches ?? []).map(m => ({
                title:               m.title ?? '',
                url:                 m.url ?? '',
                snippet:             m.snippet ?? '',
                similarityScore:     m.similarityScore ?? 0,
                sourceDomain:        m.sourceDomain,
                sourceCategory:      m.sourceCategory as import('@/types/submission.types').InternetMatchCategory | undefined,
                confidenceLevel:     m.confidenceLevel as import('@/types/submission.types').ConfidenceLevel | undefined,
                matchedStudentText:  m.matchedStudentText,
            })),
        };

        return result;
    },

    async downloadReport(submissionId: string): Promise<Blob> {
        const url = `${PLAGIARISM_API}/api/integrity/reports/${submissionId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to generate report: ${response.statusText}`);
        return response.blob();
    },

    /** @deprecated use downloadReport */
    async downloadPlagiarismReport(submissionId: string): Promise<Blob> {
        return this.downloadReport(submissionId);
    },

    /** @deprecated use downloadReport */
    async downloadFeedbackReport(submissionId: string): Promise<Blob> {
        return this.downloadReport(submissionId);
    },
};

/**
 * Fetch a single assignment by ID and return it with questions[].
 *
 * @param typeHint  When known ('project' | 'task'), only the matching endpoint
 *                  is called — avoids a wasted 404 round-trip.
 *
 * Resolution order (when typeHint is not provided):
 *  1. Try project and task endpoints in parallel — use whichever succeeds
 *  2. Fetch full student P&T lists and find by id (no port 8081 required)
 */
export async function getAssignmentWithFallback(
    id: string,
    typeHint?: 'project' | 'task',
): Promise<AssignmentWithQuestions> {
    // Fast path: caller already knows the type
    if (typeHint === 'project') {
        return projectsAndTasksService.getProjectById(id);
    }
    if (typeHint === 'task') {
        return projectsAndTasksService.getTaskById(id);
    }

    // Unknown type — try both endpoints in parallel (silent — no console.error for the expected 404)
    const [projectResult, taskResult] = await Promise.allSettled([
        _probeProjectById(id),
        _probeTaskById(id),
    ]);

    if (projectResult.status === 'fulfilled') return projectResult.value;
    if (taskResult.status === 'fulfilled') return taskResult.value;

    // Both failed — search student lists as last resort
    const [projects, tasks] = await Promise.all([
        projectsAndTasksService.getStudentProjects().catch(() => [] as AssignmentWithQuestions[]),
        projectsAndTasksService.getStudentTasks().catch(() => [] as AssignmentWithQuestions[]),
    ]);
    const found = [...projects, ...tasks].find((a) => a.id === id);
    if (found) return found;

    throw new Error(`Assignment "${id}" not found`);
}
