// ============================================================
// Submission System - TypeScript Types
// Matches Spring Boot backend DTOs from all 4 microservices
// ============================================================

// ─── File ───────────────────────────────────────────────────

export interface SubmissionFile {
    id: string;
    fileName: string;
    originalFileName: string;
    fileSize: number;          // bytes
    fileType: string;          // MIME type
    fileUrl: string;           // S3 or backend URL
    uploadedAt: string;        // ISO date string
}

// ─── Assignment ──────────────────────────────────────────────

export interface Assignment {
    id: string;
    title: string;
    description?: string;
    moduleCode: string;
    moduleName?: string;
    dueDate: string;
    totalMarks: number;
    status: 'OPEN' | 'CLOSED' | 'DRAFT';
    maxFileSizeMB?: number;
    allowedFileTypes?: string[];
    submissionsCount?: number;
    gradedCount?: number;
    /** 'project' | 'task' from the projects-and-tasks service; undefined for legacy assignments */
    assignmentType?: 'project' | 'task';
}

// ─── Submission ──────────────────────────────────────────────

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'GRADED' | 'LATE' | 'PENDING_REVIEW' | 'FLAGGED';

export interface Submission {
    id: string;
    studentId: string;
    studentName?: string;
    studentEmail?: string;
    studentRegistrationId?: string;
    assignmentId: string;
    assignmentTitle?: string;
    moduleCode?: string;
    moduleName?: string;
    status: SubmissionStatus;
    title?: string;
    comments?: string;
    files: SubmissionFile[];
    versionNumber?: number;
    currentVersionNumber: number;
    totalVersions: number;
    grade?: number;
    totalMarks?: number;
    plagiarismScore?: number;
    aiScore?: number;
    wordCount?: number;
    submittedAt?: string;
    gradedAt?: string;
    createdAt: string;
    updatedAt?: string;
    isLate?: boolean;
    dueDate?: string;
    lecturerFeedback?: string;
    lecturerName?: string;
    aiFeedbackId?: string;
}

// Create / update payloads
export interface CreateSubmissionPayload {
    studentId: string;
    studentName?: string;
    studentEmail?: string;
    studentRegistrationId?: string;
    assignmentId: string;
    assignmentTitle?: string;
    moduleCode?: string;
    moduleName?: string;
    comments?: string;
    title?: string;
    submissionType?: string;
    dueDate?: string;
    maxGrade?: number;
}

export interface UpdateSubmissionPayload {
    comments?: string;
    title?: string;
}

export interface GradeSubmissionPayload {
    grade: number;
    lecturerFeedback: string;
    questionScores?: Record<string, number>;
}

// ─── Version ─────────────────────────────────────────────────

export interface VersionFile {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
    changes?: string;   // e.g. "+45 -12" or "new file"
}

export interface SubmissionVersion {
    id: string;
    submissionId: string;
    versionNumber: number;
    files: VersionFile[];
    wordCount: number;
    plagiarismScore: number;
    aiScore: number;
    changes?: string;        // human-readable description
    commitMessage?: string;
    createdAt: string;
    isSubmitted: boolean;
    aiFeedback?: string;
    plagiarismDetails?: string;
}

export interface VersionComparison {
    versionA: SubmissionVersion;
    versionB: SubmissionVersion;
    diffs: FileDiff[];
    wordCountChange: number;
    aiScoreChange: number;
    plagiarismChange: number;
}

export interface FileDiff {
    fileName: string;
    additions: number;
    deletions: number;
    hunks: DiffHunk[];
}

export interface DiffHunk {
    oldStart: number;
    newStart: number;
    lines: DiffLine[];
}

export interface DiffLine {
    type: 'add' | 'remove' | 'context';
    content: string;
    lineNumber?: number;
}

// ─── AI Feedback ─────────────────────────────────────────────

export type FeedbackStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface FeedbackScore {
    codeQuality?: number;
    correctness?: number;
    style?: number;
    documentation?: number;
    overall: number;
}

export interface QuestionFeedback {
    questionId: string;
    questionNumber: number;
    aiFeedback: string;
    aiScore: number;        // 0-100
    maxMarks: number;
}

export interface Feedback {
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
    rawFeedback?: string;
    createdAt: string;
    completedAt?: string;
    processingError?: string;
}

export interface GenerateFeedbackPayload {
    submissionId: string;
    versionId?: string;
    force?: boolean;   // regenerate even if exists
}

// ─── Plagiarism ───────────────────────────────────────────────

export type PlagiarismStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type PlagiarismReviewStatus = 'PENDING_REVIEW' | 'REVIEWED' | 'FALSE_POSITIVE' | 'CONFIRMED';

export interface PlagiarismMatch {
    source: string;
    percentage: number;
    type: string;          // e.g. "Direct content match", "Code snippet"
    url?: string;
    description?: string;
}

export interface PlagiarismReport {
    id: string;
    submissionId: string;
    versionId?: string;
    overallScore: number;  // 0-100
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

export interface CheckPlagiarismPayload {
    submissionId: string;
    versionId?: string;
    force?: boolean;
}

export interface UpdatePlagiarismReviewPayload {
    reviewStatus: PlagiarismReviewStatus;
    reviewNotes?: string;
}

// ─── API Response wrappers ────────────────────────────────────

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    errors?: Record<string, string[]>;
}

export interface PagedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;    // current page (0-indexed)
}

// ─── Text-Based Q&A System (IT22586766) ──────────────────────────
//
// These interfaces support the text-based assignment answer system
// where students type answers to questions in the browser.
// They are distinct from the existing file-upload interfaces above.

/**
 * A single question within an assignment.
 * Questions are created by the lecturer's component and fetched
 * via GET /api/assignments/{id} as part of the Assignment object.
 */
export interface Question {
    id: string;
    assignmentId: string;
    text: string;             // The question prompt shown to students
    description?: string;     // Optional additional context / hints
    order: number;            // Display order (1-based)
    expectedWordCount?: number;
    maxWordCount?: number;
    isRequired?: boolean;     // If true, submission blocked until answered
    maxPoints?: number;       // Maximum marks for this question (default 10)
}

// Extend the existing Assignment interface to carry its questions.
// questions is optional so existing code using Assignment without questions stays valid.
// The field is appended here as a module augmentation via declaration merging is not
// supported in .ts type files — instead, consume as (assignment as AssignmentWithQuestions).
export interface AssignmentWithQuestions extends Assignment {
    questions: Question[];
}

/**
 * A student's typed text answer for one question.
 * Stored in submission-management-service via PUT /api/submissions/{id}/answers/{questionId}.
 * Also carries persisted AI feedback and plagiarism results once generated.
 */
export interface TextAnswer {
    id?: string;
    submissionId: string;
    questionId: string;
    questionText?: string;    // Snapshot stored at save time
    answerText: string;
    wordCount: number;
    characterCount: number;
    lastModified: string;     // ISO-8601
    createdAt?: string;       // ISO-8601

    // Persisted AI feedback (null until first feedback is received and saved)
    grammarScore?: number | null;
    clarityScore?: number | null;
    completenessScore?: number | null;
    relevanceScore?: number | null;
    strengths?: string[] | null;
    improvements?: string[] | null;
    suggestions?: string[] | null;
    feedbackSavedAt?: string | null;   // ISO-8601

    // Persisted plagiarism result (null until first check is run and saved)
    similarityScore?: number | null;
    plagiarismSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
    plagiarismFlagged?: boolean | null;
    plagiarismCheckedAt?: string | null;  // ISO-8601

    // Lecturer per-question grading (populated after lecturer grades)
    lecturerMark?: number | null;
    lecturerFeedbackText?: string | null;
}

/** Payload for PATCH /api/submissions/{id}/answers/{questionId}/analysis */
export interface SaveAnswerAnalysisPayload {
    // AI feedback (all optional — send only what you have)
    grammarScore?: number;
    clarityScore?: number;
    completenessScore?: number;
    relevanceScore?: number;
    strengths?: string[];
    improvements?: string[];
    suggestions?: string[];
    // Plagiarism (all optional)
    similarityScore?: number;
    plagiarismSeverity?: string;
    plagiarismFlagged?: boolean;
    // Lecturer per-question grading (all optional)
    lecturerMark?: number;
    lecturerFeedbackText?: string;
}

/** Payload for PUT /api/submissions/{id}/answers/{questionId} */
export interface SaveAnswerPayload {
    questionText?: string;
    answerText: string;
    wordCount: number;
    characterCount: number;
    /** Student ID — stored on the Answer row so peer comparison can exclude all of a student's versions. */
    studentId?: string;
}

/**
 * Real-time AI feedback returned by POST /api/feedback/live.
 * Lightweight — scores 0-10, not persisted to DB.
 */
export interface LiveFeedback {
    questionId: string;
    grammarScore: number;       // 0-10
    clarityScore: number;       // 0-10
    completenessScore: number;  // 0-10
    relevanceScore: number;     // 0-10
    suggestions: string[];
    strengths: string[];
    improvements: string[];
    generatedAt: string;        // ISO-8601
}

/**
 * Real-time plagiarism result from POST /api/integrity/realtime/check.
 * Severity mapped from the numeric similarity score:
 *   < 0.40  → LOW
 *   0.40-0.70 → MEDIUM
 *   ≥ 0.70  → HIGH
 */
export type InternetMatchCategory =
    | 'ACADEMIC' | 'ENCYCLOPEDIA' | 'NEWS' | 'GOVERNMENT'
    | 'EDUCATIONAL' | 'BLOG' | 'TECH_COMMUNITY' | 'OTHER';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface InternetMatch {
    title: string;
    url: string;
    snippet: string;
    similarityScore: number;        // 0-100
    sourceDomain?: string;
    /** Source type: ACADEMIC | ENCYCLOPEDIA | NEWS | GOVERNMENT | EDUCATIONAL | BLOG | TECH_COMMUNITY | OTHER */
    sourceCategory?: InternetMatchCategory;
    /** Match confidence based on similarity score */
    confidenceLevel?: ConfidenceLevel;
    /** Excerpt from the student's own answer that overlaps with this source */
    matchedStudentText?: string;
}

export type RiskLevel = 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface LivePlagiarismResult {
    questionId: string;
    similarityScore: number;        // 0-100 (converted from 0.0-1.0 backend value)
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    flagged: boolean;
    matchedText?: string;           // excerpt of matched content
    checkedAt: string;              // ISO-8601
    internetMatches?: InternetMatch[];
    /** Raw internet similarity score 0-100 (before peer comparison) */
    internetSimilarityScore?: number;
    /** Raw peer similarity score 0-100 */
    peerSimilarityScore?: number;
    /** Aggregate risk score 0-100 (includes match-count bonus) */
    riskScore?: number;
    /** CLEAN | LOW | MEDIUM | HIGH */
    riskLevel?: RiskLevel;
}

// ─── Hook state shapes ─────────────────────────────────────────

export interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

export interface MutationState {
    loading: boolean;
    error: string | null;
    success: boolean;
}
