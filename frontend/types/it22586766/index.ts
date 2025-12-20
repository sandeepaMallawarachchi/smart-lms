// Submission Types
export interface Submission {
    id: number;
    title: string;
    description: string;
    studentId: string;
    studentName: string;
    assignmentId: string;
    assignmentTitle?: string;
    status: SubmissionStatus;
    submissionType: SubmissionType;
    dueDate?: string;
    submittedAt?: string;
    grade?: number;
    maxGrade?: number;
    feedbackText?: string;
    isLate: boolean;
    versionNumber: number;
    createdAt: string;
    updatedAt: string;
    files: FileInfo[];
    fileCount: number;
}

export enum SubmissionStatus {
    DRAFT = 'DRAFT',
    SUBMITTED = 'SUBMITTED',
    UNDER_REVIEW = 'UNDER_REVIEW',
    GRADED = 'GRADED',
    RETURNED = 'RETURNED',
    RESUBMITTED = 'RESUBMITTED',
}

export enum SubmissionType {
    ASSIGNMENT = 'ASSIGNMENT',
    PROJECT = 'PROJECT',
    LAB = 'LAB',
    ESSAY = 'ESSAY',
    CODE = 'CODE',
    PRESENTATION = 'PRESENTATION',
    OTHER = 'OTHER',
}

export interface FileInfo {
    id: number;
    originalFilename: string;
    storedFilename: string;
    fileSize: number;
    contentType: string;
    fileExtension: string;
    uploadedAt: string;
    downloadUrl: string;
}

// Version Control Types
export interface Version {
    id: number;
    submissionId: number;
    versionNumber: number;
    commitHash: string;
    parentVersionId?: number;
    commitMessage?: string;
    triggerType: VersionTriggerType;
    createdBy?: string;
    metadata: Record<string, any>;
    changesSummary?: string;
    totalFiles: number;
    totalSizeBytes: number;
    createdAt: string;
    isSnapshot: boolean;
    files: VersionFile[];
}

export enum VersionTriggerType {
    MANUAL = 'MANUAL',
    AUTO_SAVE = 'AUTO_SAVE',
    FILE_UPLOAD = 'FILE_UPLOAD',
    AI_FEEDBACK = 'AI_FEEDBACK',
    SUBMISSION = 'SUBMISSION',
    GRADE_RECEIVED = 'GRADE_RECEIVED',
    MILESTONE = 'MILESTONE',
}

export interface VersionFile {
    id: number;
    filePath: string;
    fileName: string;
    fileSizeBytes: number;
    contentType: string;
    fileExtension: string;
    contentHash: string;
}

export interface FileDiff {
    filePath: string;
    changeType: FileChangeType;
    unifiedDiff: string;
    diffLines: DiffLine[];
    linesAdded: number;
    linesDeleted: number;
    linesModified: number;
}

export enum FileChangeType {
    ADDED = 'ADDED',
    MODIFIED = 'MODIFIED',
    DELETED = 'DELETED',
    UNCHANGED = 'UNCHANGED',
}

export interface DiffLine {
    type: DiffLineType;
    lineNumber: number;
    content: string;
}

export enum DiffLineType {
    ADDED = 'ADDED',
    DELETED = 'DELETED',
    UNCHANGED = 'UNCHANGED',
    CONTEXT = 'CONTEXT',
}

// Feedback Types
export interface Feedback {
    id: number;
    submissionId: number;
    versionId?: number;
    studentId: string;
    rubricId?: number;
    overallFeedback: string;
    overallScore?: number;
    maxScore?: number;
    status: FeedbackStatus;
    generatedBy: string;
    modelUsed?: string;
    tokensUsed?: number;
    generationTimeMs?: number;
    metadata: Record<string, any>;
    isAiGenerated: boolean;
    cacheHit: boolean;
    criterionFeedbacks: CriterionFeedback[];
    createdAt: string;
    updatedAt: string;
}

export enum FeedbackStatus {
    PENDING = 'PENDING',
    GENERATING = 'GENERATING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REVIEWED = 'REVIEWED',
    PUBLISHED = 'PUBLISHED',
}

export interface CriterionFeedback {
    id: number;
    criterionId: number;
    criterionName: string;
    criterionDescription?: string;
    score?: number;
    maxScore?: number;
    feedbackText?: string;
    strengths?: string;
    improvements?: string;
    suggestions?: string;
}

export interface Rubric {
    id: number;
    title: string;
    description?: string;
    assignmentType?: string;
    totalPoints?: number;
    createdBy?: string;
    isActive: boolean;
    criteria: RubricCriterion[];
    createdAt: string;
    updatedAt: string;
}

export interface RubricCriterion {
    id?: number;
    name: string;
    description?: string;
    maxScore: number;
    weight?: number;
    orderIndex?: number;
    evaluationGuidelines?: string;
}

// Plagiarism Check Types
export interface PlagiarismCheck {
    id: number;
    submissionId: number;
    studentId: string;
    assignmentId?: string;
    checkType: CheckType;
    status: CheckStatus;
    overallSimilarityScore?: number;
    maxSimilarityScore?: number;
    flagged: boolean;
    matchesFound: number;
    filesChecked: number;
    checkDurationMs?: number;
    reportPath?: string;
    metadata: Record<string, any>;
    summary?: string;
    matches: SimilarityMatch[];
    createdAt: string;
    updatedAt: string;
}

export enum CheckType {
    CODE_JPLAG = 'CODE_JPLAG',
    TEXT_COSINE = 'TEXT_COSINE',
    COMBINED = 'COMBINED',
}

export enum CheckStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    FLAGGED_FOR_REVIEW = 'FLAGGED_FOR_REVIEW',
}

export interface SimilarityMatch {
    id: number;
    matchedSubmissionId?: number;
    matchedStudentId?: string;
    similarityScore: number;
    fileName?: string;
    matchedFileName?: string;
    matchingLines?: number;
    totalLines?: number;
    tokensMatched?: number;
    details?: string;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
    timestamp: string;
}

// Form Types
export interface SubmissionFormData {
    title: string;
    description: string;
    studentId: string;
    studentName: string;
    assignmentId: string;
    assignmentTitle?: string;
    submissionType: SubmissionType;
    dueDate?: string;
    maxGrade?: number;
}

export interface FeedbackRequestData {
    submissionId: number;
    studentId: string;
    rubricId?: number;
    submissionContent: string;
    forceRegenerate?: boolean;
}

export interface PlagiarismCheckRequest {
    submissionId: number;
    studentId: string;
    assignmentId?: string;
    checkType: CheckType;
    compareWithSubmissionIds?: number[];
    checkAllInAssignment?: boolean;
    customThreshold?: number;
}