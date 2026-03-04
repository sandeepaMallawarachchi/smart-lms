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
    VersionComparison,
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
    LiveFeedback,
    LivePlagiarismResult,
} from '@/types/submission.types';

// ─── Base URLs ────────────────────────────────────────────────

const SUBMISSION_API =
    process.env.NEXT_PUBLIC_SUBMISSION_API_URL ?? 'http://localhost:8081';
const VERSION_API =
    process.env.NEXT_PUBLIC_VERSION_API_URL ?? 'http://localhost:8082';
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
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();

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
            errorMessage = errorBody.message ?? errorMessage;
        } catch {
            // ignore parse error
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
    getStudentSubmissions(studentId: string): Promise<Submission[]> {
        return apiRequest<Submission[]>(
            `${SUBMISSION_API}/api/submissions?studentId=${encodeURIComponent(studentId)}`
        );
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
    getSubmission(id: string): Promise<Submission> {
        return apiRequest<Submission>(`${SUBMISSION_API}/api/submissions/${id}`);
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

    /** Officially submit (change status to SUBMITTED) */
    submitSubmission(id: string): Promise<Submission> {
        return apiRequest<Submission>(`${SUBMISSION_API}/api/submissions/${id}/submit`, {
            method: 'POST',
        });
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
    ): Promise<Submission> {
        // Try to find an existing DRAFT
        const existing = await apiRequest<Submission[] | { content: Submission[] }>(
            `${SUBMISSION_API}/api/submissions?studentId=${encodeURIComponent(studentId)}&assignmentId=${encodeURIComponent(assignmentId)}`
        );
        const list: Submission[] = Array.isArray(existing)
            ? existing
            : (existing as { content: Submission[] }).content ?? [];

        const draft = list.find((s) => s.status === 'DRAFT');
        if (draft) return draft;

        // Create new draft
        return apiRequest<Submission>(`${SUBMISSION_API}/api/submissions`, {
            method: 'POST',
            body: JSON.stringify({
                studentId,
                studentName,
                assignmentId,
                title: 'Text Submission',
                submissionType: 'ASSIGNMENT',
            }),
        });
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
     * Get all saved answers for a submission.
     * GET /api/submissions/{submissionId}/answers
     */
    getAnswers(submissionId: string): Promise<TextAnswer[]> {
        return apiRequest<TextAnswer[]>(
            `${SUBMISSION_API}/api/submissions/${submissionId}/answers`
        );
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
    completed?: boolean;
}

interface _RawMainTask {
    id: string;
    title: string;
    description?: string;
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
    }));
}

function _mapProject(p: _RawProject): Assignment {
    return {
        id:             String(p._id),
        title:          p.projectName,
        description:    p.description?.text ?? '',
        moduleCode:     p.course?.courseCode ?? p.courseId,
        moduleName:     p.course?.courseName,
        dueDate:        _toDeadlineISO(p.deadlineDate, p.deadlineTime),
        totalMarks:     100,
        status:         _deriveStatus(p.deadlineDate, p.deadlineTime),
        assignmentType: 'project',
    };
}

function _mapTask(t: _RawTask): Assignment {
    return {
        id:             String(t._id),
        title:          t.taskName,
        description:    t.description?.text ?? '',
        moduleCode:     t.course?.courseCode ?? t.courseId,
        moduleName:     t.course?.courseName,
        dueDate:        _toDeadlineISO(t.deadlineDate, t.deadlineTime),
        totalMarks:     100,
        status:         _deriveStatus(t.deadlineDate, t.deadlineTime),
        assignmentType: 'task',
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
    async getStudentProjects(): Promise<Assignment[]> {
        const res = await apiRequest<{ data: { projects: _RawProject[] } }>(
            '/api/projects-and-tasks/student/projects'
        );
        return (res.data?.projects ?? []).map(_mapProject);
    },

    /** Student: all tasks for enrolled courses. */
    async getStudentTasks(): Promise<Assignment[]> {
        const res = await apiRequest<{ data: { tasks: _RawTask[] } }>(
            '/api/projects-and-tasks/student/tasks'
        );
        return (res.data?.tasks ?? []).map(_mapTask);
    },

    /** Lecturer: all projects for a specific course. */
    async getLecturerProjects(courseId: string, lecturerId: string): Promise<Assignment[]> {
        const res = await apiRequest<{ data: { projects: _RawProject[] } }>(
            `/api/projects-and-tasks/lecturer/create-projects-and-tasks/project?courseId=${encodeURIComponent(courseId)}&lecturerId=${encodeURIComponent(lecturerId)}`
        );
        return (res.data?.projects ?? []).map(_mapProject);
    },

    /** Lecturer: all tasks for a specific course. */
    async getLecturerTasks(courseId: string, lecturerId: string): Promise<Assignment[]> {
        const res = await apiRequest<{ data: { tasks: _RawTask[] } }>(
            `/api/projects-and-tasks/lecturer/create-projects-and-tasks/task?courseId=${encodeURIComponent(courseId)}&lecturerId=${encodeURIComponent(lecturerId)}`
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

// ─── Version Control Service (port 8082) ─────────────────────

export const versionService = {
    /** Get all versions for a submission */
    getVersions(submissionId: string): Promise<SubmissionVersion[]> {
        return apiRequest<SubmissionVersion[]>(
            `${VERSION_API}/api/versions?submissionId=${encodeURIComponent(submissionId)}`
        );
    },

    /** Get a specific version */
    getVersion(id: string): Promise<SubmissionVersion> {
        return apiRequest<SubmissionVersion>(`${VERSION_API}/api/versions/${id}`);
    },

    /** Get the latest version of a submission */
    getLatestVersion(submissionId: string): Promise<SubmissionVersion> {
        return apiRequest<SubmissionVersion>(
            `${VERSION_API}/api/versions/latest?submissionId=${encodeURIComponent(submissionId)}`
        );
    },

    /** Compare two versions */
    compareVersions(versionAId: string, versionBId: string): Promise<VersionComparison> {
        return apiRequest<VersionComparison>(
            `${VERSION_API}/api/versions/compare?v1=${encodeURIComponent(versionAId)}&v2=${encodeURIComponent(versionBId)}`
        );
    },

    /** Create a new version (usually triggered automatically on file upload) */
    createVersion(payload: {
        submissionId: string;
        files: File[];
        commitMessage?: string;
    }): Promise<SubmissionVersion> {
        const formData = new FormData();
        formData.append('submissionId', payload.submissionId);
        if (payload.commitMessage) {
            formData.append('commitMessage', payload.commitMessage);
        }
        payload.files.forEach((f) => formData.append('files', f));

        return apiRequest<SubmissionVersion>(`${VERSION_API}/api/versions`, {
            method: 'POST',
            body: formData,
        });
    },

    /** Download a specific version as ZIP */
    downloadVersion(versionId: string): Promise<Blob> {
        const token = getToken();
        return fetch(`${VERSION_API}/api/versions/${versionId}/download`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((res) => {
            if (!res.ok) throw new Error(`Download failed: ${res.status}`);
            return res.blob();
        });
    },
};

// ─── AI Feedback Service (port 8083) ─────────────────────────

export const feedbackService = {
    /** Get feedback for a submission (latest) */
    getFeedback(submissionId: string): Promise<Feedback> {
        return apiRequest<Feedback>(
            `${FEEDBACK_API}/api/feedback?submissionId=${encodeURIComponent(submissionId)}`
        );
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
    generateLiveFeedback(payload: {
        questionId: string;
        answerText: string;
        questionPrompt?: string;
        expectedWordCount?: number;
    }): Promise<LiveFeedback> {
        return apiRequest<LiveFeedback>(`${FEEDBACK_API}/api/feedback/live`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
};

// ─── Plagiarism Service (port 8084) ──────────────────────────

export const plagiarismService = {
    /** Get plagiarism report for a submission */
    getReport(submissionId: string): Promise<PlagiarismReport> {
        return apiRequest<PlagiarismReport>(
            `${PLAGIARISM_API}/api/plagiarism?submissionId=${encodeURIComponent(submissionId)}`
        );
    },

    /** Get report by ID */
    getReportById(id: string): Promise<PlagiarismReport> {
        return apiRequest<PlagiarismReport>(`${PLAGIARISM_API}/api/plagiarism/${id}`);
    },

    /** Get all plagiarism reports (lecturer - flagged submissions) */
    getAllReports(params?: {
        minScore?: number;
        reviewStatus?: string;
        assignmentId?: string;
    }): Promise<PlagiarismReport[]> {
        const query = new URLSearchParams();
        if (params?.minScore != null)   query.set('minScore', String(params.minScore));
        if (params?.reviewStatus)       query.set('reviewStatus', params.reviewStatus);
        if (params?.assignmentId)       query.set('assignmentId', params.assignmentId);
        const qs = query.toString() ? `?${query}` : '';
        return apiRequest<PlagiarismReport[]>(`${PLAGIARISM_API}/api/plagiarism${qs}`);
    },

    /** Trigger plagiarism check */
    checkPlagiarism(payload: CheckPlagiarismPayload): Promise<PlagiarismReport> {
        return apiRequest<PlagiarismReport>(`${PLAGIARISM_API}/api/plagiarism/check`, {
            method: 'POST',
            body: JSON.stringify(payload),
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
    }): Promise<LivePlagiarismResult> {
        // The backend questionId field is a Long — parse string to number
        const backendPayload = {
            sessionId: payload.sessionId,
            studentId: payload.studentId,
            questionId: parseInt(payload.questionId, 10) || 0,
            textContent: payload.textContent,
            questionText: payload.questionText ?? '',
            questionType: 'TEXT',
        };

        const raw = await apiRequest<{
            similarityScore?: number;
            flagged?: boolean;
            matchedText?: string;
            sessionId?: string;
        }>(`${PLAGIARISM_API}/api/integrity/realtime/check`, {
            method: 'POST',
            body: JSON.stringify(backendPayload),
        });

        // Normalise similarity from [0.0-1.0] or [0-100] to [0-100]
        const rawScore = raw.similarityScore ?? 0;
        const normalised = rawScore <= 1.0 ? rawScore * 100 : rawScore;
        const severity: LivePlagiarismResult['severity'] =
            normalised >= 70 ? 'HIGH' : normalised >= 40 ? 'MEDIUM' : 'LOW';

        return {
            questionId: payload.questionId,
            similarityScore: Math.round(normalised * 10) / 10,
            severity,
            flagged: raw.flagged ?? normalised >= 70,
            matchedText: raw.matchedText,
            checkedAt: new Date().toISOString(),
        };
    },
};

/**
 * Fetch a single assignment by ID and return it with questions[].
 *
 * Resolution order:
 *  1. Try the project endpoint (mainTasks → Question[])
 *  2. Try the task endpoint (subtasks → Question[])
 *  3. Fall back to the submission-management-service assignments endpoint
 *     (questions[] will be empty — legacy / non-P&T assignments)
 */
export async function getAssignmentWithFallback(id: string): Promise<AssignmentWithQuestions> {
    // 1. Try as a project
    try {
        return await projectsAndTasksService.getProjectById(id);
    } catch {
        // not a project — try next
    }

    // 2. Try as a task
    try {
        return await projectsAndTasksService.getTaskById(id);
    } catch {
        // not a task — fall back to legacy
    }

    // 3. Legacy submission-management-service assignment
    const assignment = await submissionService.getAssignment(id);
    return { ...assignment, questions: [] };
}
