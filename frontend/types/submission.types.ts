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
    assignmentId: string;
    comments?: string;
    title?: string;
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
