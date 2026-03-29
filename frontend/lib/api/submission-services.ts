// ============================================================
// Submission System - API Services
// Connects to all 4 Spring Boot microservices
// ============================================================

import type {
    Submission,
    CreateSubmissionPayload,
    UpdateSubmissionPayload,
    GradeSubmissionPayload,
    SubmissionVersion,
    VersionAnswer,
    SavePlagiarismSourcesPayload,
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
} from '@/types/submission.types';

// ─── Base URLs ────────────────────────────────────────────────

const SUBMISSION_API =
    process.env.NEXT_PUBLIC_SUBMISSION_API_URL ?? 'http://localhost:8081';
const FEEDBACK_API =
    process.env.NEXT_PUBLIC_FEEDBACK_API_URL ?? 'http://localhost:8083';
const PLAGIARISM_API =
    process.env.NEXT_PUBLIC_PLAGIARISM_API_URL ?? 'http://localhost:8084';

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

    console.debug(`[apiRequest] ${method} ${url}`);

    const response = await fetch(url, { ...options, headers });

    console.debug(`[apiRequest] ${method} ${url} → HTTP ${response.status}`);

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
        console.debug('[submissionService] getOrCreateDraftSubmission — assignmentId:', assignmentId, '| studentId:', studentId);

        // Backend returns ApiResponse<Page<Submission>> → { data: { content: Submission[] } }
        const existing = await apiRequest<unknown>(
            `${SUBMISSION_API}/api/submissions?studentId=${encodeURIComponent(studentId)}&assignmentId=${encodeURIComponent(assignmentId)}`
        );
        console.debug('[submissionService] getOrCreateDraftSubmission — raw response type:', typeof existing, '| isArray:', Array.isArray(existing));

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

        console.debug('[submissionService] getOrCreateDraftSubmission — found', list.length, 'submissions; statuses:', list.map(s => s.status));

        // ONE submission row per student+assignment pair.
        // Return any existing submission as-is — regardless of status.
        // The working copy (Answer rows) is always editable; immutable snapshots are
        // created only when the student clicks Submit. Never reset to DRAFT.
        if (list.length > 0) {
            const sub = list[0];
            console.debug('[submissionService] getOrCreateDraftSubmission — reusing existing submission id:', sub.id, '| status:', sub.status);
            return sub;
        }

        console.debug('[submissionService] getOrCreateDraftSubmission — no submission found, creating new one');

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

        console.debug('[submissionService] getOrCreateDraftSubmission — created raw type:', typeof created, '| keys:', created && typeof created === 'object' ? Object.keys(created as object) : '(none)');

        if (created && typeof created === 'object') {
            const obj = created as Record<string, unknown>;
            if (obj.data && typeof obj.data === 'object') {
                const submission = obj.data as Submission;
                console.debug('[submissionService] getOrCreateDraftSubmission — new submissionId (from .data):', submission.id);
                return submission;
            }
        }
        const submission = created as Submission;
        console.debug('[submissionService] getOrCreateDraftSubmission — new submissionId (direct):', submission?.id);
        return submission;
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
        console.debug('[submissionService] saveAnswer — submissionId:', submissionId, '| questionId:', questionId, '| wordCount:', payload.wordCount, '| chars:', payload.characterCount);
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
        console.debug('[submissionService] saveAnswerAnalysis — submissionId:', submissionId, '| questionId:', questionId);
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
        console.debug('[submissionService] getAnswers — submissionId:', submissionId);
        const res = await apiRequest<unknown>(
            `${SUBMISSION_API}/api/submissions/${submissionId}/answers`
        );
        console.debug('[submissionService] getAnswers — raw response type:', typeof res, '| isArray:', Array.isArray(res));
        let answers: TextAnswer[] = [];
        if (Array.isArray(res)) {
            answers = res as TextAnswer[];
        } else if (res && typeof res === 'object') {
            const obj = res as Record<string, unknown>;
            if (Array.isArray(obj.data)) answers = obj.data as TextAnswer[];
        }
        console.debug('[submissionService] getAnswers — returning', answers.length, 'answers; questionIds:', answers.map(a => a.questionId));
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

// ─── Version Service (new — port 8081, /api/submissions/{id}/versions) ────────
//
// All version endpoints now live inside submission-management-service (port 8081).
// Snapshots are created server-side inside submitSubmission() — no client-side
// createTextSnapshot() call needed any more.

function unwrapData<T>(raw: unknown): T {
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if ('data' in obj) return obj.data as T;
    }
    return raw as T;
}

export const versionService = {
    /**
     * List all version headers for a submission (newest first).
     * Answers are NOT included in the list response — use getVersion() for detail.
     * GET /api/submissions/{submissionId}/versions
     */
    async getVersions(submissionId: string): Promise<SubmissionVersion[]> {
        const raw = await apiRequest<unknown>(
            `${SUBMISSION_API}/api/submissions/${encodeURIComponent(submissionId)}/versions`
        );
        const list = unwrapData<SubmissionVersion[]>(raw);
        return Array.isArray(list) ? list : [];
    },

    /**
     * Get the latest version with full answer+plagiarism detail.
     * Used as the default report view.
     * GET /api/submissions/{submissionId}/versions/latest
     */
    async getLatestVersion(submissionId: string): Promise<SubmissionVersion> {
        const raw = await apiRequest<unknown>(
            `${SUBMISSION_API}/api/submissions/${encodeURIComponent(submissionId)}/versions/latest`
        );
        return unwrapData<SubmissionVersion>(raw);
    },

    /**
     * Get a specific version with full answer+plagiarism detail.
     * Used for historical version report pages.
     * GET /api/submissions/{submissionId}/versions/{versionId}
     */
    async getVersion(submissionId: string, versionId: string): Promise<SubmissionVersion> {
        const raw = await apiRequest<unknown>(
            `${SUBMISSION_API}/api/submissions/${encodeURIComponent(submissionId)}/versions/${encodeURIComponent(versionId)}`
        );
        return unwrapData<SubmissionVersion>(raw);
    },

    /**
     * Save detailed internet plagiarism sources for one answer in one version.
     * Called immediately after a submit completes, once the plagiarism check
     * result is received. Replaces any previously saved sources for the same answer.
     * POST /api/submissions/{submissionId}/versions/{versionId}/answers/{questionId}/sources
     */
    savePlagiarismSources(
        submissionId: string,
        versionId: string,
        questionId: string,
        payload: SavePlagiarismSourcesPayload,
    ): Promise<void> {
        return apiRequest<void>(
            `${SUBMISSION_API}/api/submissions/${encodeURIComponent(submissionId)}/versions/${encodeURIComponent(versionId)}/answers/${encodeURIComponent(questionId)}/sources`,
            { method: 'POST', body: JSON.stringify(payload) }
        );
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
     * POST /api/feedback/live
     */
    async generateLiveFeedback(payload: {
        questionId: string;
        answerText: string;
        questionPrompt?: string;
        expectedWordCount?: number;
        maxPoints?: number;
    }): Promise<LiveFeedback> {
        console.debug('[feedbackService] generateLiveFeedback — questionId:', payload.questionId, '| textLen:', payload.answerText.length, '| expectedWords:', payload.expectedWordCount ?? '(none)');
        // Backend wraps in ApiResponse<LiveFeedbackResponse> → unwrap .data
        const res = await apiRequest<{ data: LiveFeedback }>(`${FEEDBACK_API}/api/feedback/live`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const fb = res.data;
        console.debug('[feedbackService] generateLiveFeedback — received scores: grammar=', fb?.grammarScore, '| clarity=', fb?.clarityScore, '| completeness=', fb?.completenessScore, '| relevance=', fb?.relevanceScore);
        return fb;
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
        console.debug('[plagiarismService] checkLiveSimilarity — questionId:', payload.questionId, '| textLen:', payload.textContent.length, '| sessionId:', payload.sessionId, '| submissionId:', payload.submissionId);
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

        console.debug('[plagiarismService] checkLiveSimilarity — rawScore:', rawScore, '| normalised:', result.similarityScore, '%', '| severity:', severity, '| flagged:', result.flagged);
        return result;
    },

    async downloadPlagiarismReport(submissionId: string): Promise<Blob> {
        const url = `${PLAGIARISM_API}/api/integrity/reports/${submissionId}/plagiarism`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to generate report: ${response.statusText}`);
        return response.blob();
    },

    async downloadFeedbackReport(submissionId: string): Promise<Blob> {
        const url = `${PLAGIARISM_API}/api/integrity/reports/${submissionId}/feedback`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to generate report: ${response.statusText}`);
        return response.blob();
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
