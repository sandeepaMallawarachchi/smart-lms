'use client';

import React, { useState, use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Send,
    Star,
    Edit,
    Check,
    X,
    Sparkles,
    User,
    FileText,
    GitBranch,
    Shield,
    Clock,
    Calendar,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Lock,
    Unlock,
    Info,
} from 'lucide-react';
import { useSubmission, useGradeSubmission } from '@/hooks/useSubmissions';
import { getAssignmentWithFallback } from '@/lib/api/submission-services';
import { useLatestVersion } from '@/hooks/useVersions';
import type { AssignmentWithQuestions, Question } from '@/types/submission.types';
import LecturerAnnotatedText from '@/components/submissions/LecturerAnnotatedText';

// ─── Types ─────────────────────────────────────────────────────

interface QuestionGradeState {
    questionId: string;
    /** AI-suggested mark scaled to maxMarks (from aiGeneratedMark 0–10). */
    aiMark: number;
    /** Lecturer-set mark. Null until lecturer overrides post-deadline. */
    lecturerMark: number | null;
    /** AI feedback summary from stored bullets. */
    aiFeedback: string;
    /** Lecturer feedback. Null until lecturer overrides. */
    lecturerFeedback: string | null;
    maxMarks: number;
    /** Audit trail from backend. */
    lecturerUpdatedBy: string | null;
    lecturerUpdatedAt: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function getLetterGrade(pct: number) {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
}

function getLecturerId(): string {
    try {
        const token = localStorage.getItem('authToken') ?? '';
        if (!token) return 'unknown';
        const payload = JSON.parse(atob(token.split('.')[1]));
        return String(payload.userId ?? payload.sub ?? 'unknown');
    } catch {
        return 'unknown';
    }
}

// ─── Read-only question card (pre-deadline) ─────────────────────

function ReadOnlyQuestionCard({
    idx,
    question,
    state,
    studentAnswerText,
    submissionId,
    versionId,
}: {
    idx: number;
    question: Question;
    state: QuestionGradeState;
    studentAnswerText?: string;
    submissionId: string;
    versionId: string;
}) {
    const displayMark = state.lecturerMark ?? state.aiMark;
    const isOverridden = state.lecturerMark != null;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Question {idx + 1}
                        <span className="ml-2 text-sm font-normal text-gray-500">({state.maxMarks} marks)</span>
                    </h3>
                    <p className="text-gray-700">{question.text}</p>
                </div>
                <div className={`ml-4 flex-shrink-0 px-4 py-2 rounded-xl font-bold text-lg ${
                    isOverridden ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                    {displayMark}/{state.maxMarks}
                </div>
            </div>

            {/* Student answer */}
            <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                    <FileText size={13} className="text-gray-400" /> Student&apos;s Answer
                </p>
                {studentAnswerText?.trim() ? (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <LecturerAnnotatedText
                            text={studentAnswerText}
                            submissionId={submissionId}
                            versionId={versionId}
                            questionId={state.questionId}
                        />
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400 italic">
                        No answer provided
                    </div>
                )}
            </div>

            {/* AI mark */}
            <div className="flex gap-3">
                <div className="flex-1 rounded-lg bg-purple-50 border border-purple-100 px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles size={14} className="text-purple-600" />
                        <span className="text-xs font-semibold text-purple-700">AI Generated Mark</span>
                    </div>
                    <p className="text-xl font-bold text-purple-900">{state.aiMark}/{state.maxMarks}</p>
                    <p className="text-xs text-purple-600 mt-0.5 line-clamp-2">{state.aiFeedback}</p>
                </div>

                {isOverridden && (
                    <div className="flex-1 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Edit size={14} className="text-blue-600" />
                            <span className="text-xs font-semibold text-blue-700">Lecturer Override</span>
                        </div>
                        <p className="text-xl font-bold text-blue-900">{state.lecturerMark}/{state.maxMarks}</p>
                        {state.lecturerFeedback && (
                            <p className="text-xs text-blue-600 mt-0.5 line-clamp-2">{state.lecturerFeedback}</p>
                        )}
                        {state.lecturerUpdatedBy && (
                            <p className="text-xs text-gray-400 mt-1">
                                by {state.lecturerUpdatedBy} · {formatDate(state.lecturerUpdatedAt)}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Editable question card (post-deadline) ─────────────────────

function EditableQuestionCard({
    idx,
    question,
    state,
    studentAnswerText,
    onSave,
    submissionId,
    versionId,
}: {
    idx: number;
    question: Question;
    state: QuestionGradeState;
    studentAnswerText?: string;
    onSave: (questionId: string, mark: number, feedback: string) => void;
    submissionId: string;
    versionId: string;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempMark, setTempMark] = useState<number>(state.lecturerMark ?? state.aiMark);
    const [tempFeedback, setTempFeedback] = useState<string>(state.lecturerFeedback ?? state.aiFeedback);

    const displayMark = state.lecturerMark ?? state.aiMark;
    const isOverridden = state.lecturerMark != null;

    const handleEdit = () => {
        setTempMark(state.lecturerMark ?? state.aiMark);
        setTempFeedback(state.lecturerFeedback ?? state.aiFeedback);
        setIsEditing(true);
    };

    const handleSave = () => {
        const clamped = Math.min(Math.max(tempMark, 0), state.maxMarks);
        onSave(state.questionId, clamped, tempFeedback);
        setIsEditing(false);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Question {idx + 1}
                        <span className="ml-2 text-sm font-normal text-gray-500">({state.maxMarks} marks)</span>
                    </h3>
                    <p className="text-gray-700">{question.text}</p>
                </div>
                <div className={`ml-4 flex-shrink-0 px-4 py-2 rounded-xl font-bold text-lg ${
                    isOverridden ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                    {displayMark}/{state.maxMarks}
                </div>
            </div>

            {/* Student answer */}
            <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                    <FileText size={13} className="text-gray-400" /> Student&apos;s Answer
                </p>
                {studentAnswerText?.trim() ? (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <LecturerAnnotatedText
                            text={studentAnswerText}
                            submissionId={submissionId}
                            versionId={versionId}
                            questionId={state.questionId}
                        />
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400 italic">
                        No answer provided
                    </div>
                )}
            </div>

            {/* AI mark — always shown, never hidden */}
            <div className="rounded-lg bg-purple-50 border border-purple-100 px-4 py-3 mb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Sparkles size={14} className="text-purple-600" />
                        <span className="text-xs font-semibold text-purple-700">AI Generated Mark</span>
                        <span className="text-xs text-purple-400">(original — immutable)</span>
                    </div>
                    <span className="font-bold text-purple-900">{state.aiMark}/{state.maxMarks}</span>
                </div>
                <p className="text-xs text-purple-600 mt-1.5 line-clamp-3">{state.aiFeedback}</p>
            </div>

            {/* Lecturer override */}
            {isEditing ? (
                <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                        <Edit size={14} /> Override Mark &amp; Feedback
                    </p>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Mark (0 – {state.maxMarks}):
                        </label>
                        <input
                            type="number"
                            value={tempMark}
                            onChange={e => setTempMark(Number(e.target.value))}
                            min={0} max={state.maxMarks} step={0.5}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Feedback:</label>
                        <textarea
                            value={tempFeedback}
                            onChange={e => setTempFeedback(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Check size={15} /> Save Override
                        </button>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <X size={15} /> Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {isOverridden && (
                        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 mb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Edit size={14} className="text-blue-600" />
                                    <span className="text-xs font-semibold text-blue-700">Lecturer Override</span>
                                </div>
                                <span className="font-bold text-blue-900">{state.lecturerMark}/{state.maxMarks}</span>
                            </div>
                            {state.lecturerFeedback && (
                                <p className="text-xs text-blue-600 mt-1.5 line-clamp-3">{state.lecturerFeedback}</p>
                            )}
                            {state.lecturerUpdatedBy && (
                                <p className="text-xs text-gray-400 mt-1">
                                    by {state.lecturerUpdatedBy} · {formatDate(state.lecturerUpdatedAt)}
                                </p>
                            )}
                        </div>
                    )}
                    <button
                        onClick={handleEdit}
                        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Edit size={15} />
                        {isOverridden ? 'Edit Override' : 'Override AI Mark & Feedback'}
                    </button>
                </>
            )}
        </div>
    );
}

// ─── Page ───────────────────────────────────────────────────────

export default function LecturerGradingPage({
    params,
}: {
    params: Promise<{ submissionId: string }>;
}) {
    const { submissionId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeHint = (searchParams.get('type') as 'project' | 'task' | null) ?? undefined;

    const { data: submission, loading: subLoading } = useSubmission(submissionId);
    const { data: latestVersion, loading: versionLoading } = useLatestVersion(submissionId);
    const { loading: grading, error: gradeError, success: gradeSuccess, gradeSubmission } = useGradeSubmission();

    const [questionStates, setQuestionStates] = useState<Record<string, QuestionGradeState>>({});
    const [overallComment, setOverallComment]   = useState('');
    const [apiQuestions, setApiQuestions]       = useState<Question[] | null>(null);
    const [submitDone, setSubmitDone]           = useState(false);

    // Compute deadline status. Prefer the backend-computed field; fall back to local check.
    const isDeadlinePassed: boolean = (() => {
        if (submission?.isDeadlinePassed != null) return submission.isDeadlinePassed as unknown as boolean;
        if (!submission?.dueDate) return false;
        return new Date() > new Date(submission.dueDate as unknown as string);
    })();

    // Load assignment questions
    useEffect(() => {
        if (!submission?.assignmentId) return;
        getAssignmentWithFallback(submission.assignmentId, typeHint)
            .then(asg => {
                const withQ = asg as AssignmentWithQuestions;
                if (withQ.questions?.length) setApiQuestions(withQ.questions);
            })
            .catch(() => {});
    }, [submission?.assignmentId]);

    // Build per-question state from version snapshot answers
    useEffect(() => {
        if (!apiQuestions || !latestVersion?.answers) return;
        setQuestionStates(prev => {
            const next = { ...prev };
            for (const q of apiQuestions) {
                const maxMarks = q.maxPoints ?? 10;
                const va = latestVersion.answers!.find(a => a.questionId === q.id);

                // aiGeneratedMark is already on 0–10 scale; scale to maxMarks
                let aiMark = 0;
                if (va?.aiGeneratedMark != null) {
                    aiMark = Math.round((va.aiGeneratedMark / 10) * maxMarks * 10) / 10;
                } else if (va) {
                    const comps = [va.grammarScore, va.clarityScore, va.completenessScore, va.relevanceScore]
                        .filter((s): s is number => s != null);
                    if (comps.length > 0) {
                        const avg = comps.reduce((s, v) => s + v, 0) / comps.length;
                        aiMark = Math.round((avg / 10) * maxMarks * 10) / 10;
                    }
                }

                const bullets: string[] = [];
                if (va?.strengths?.length)    bullets.push(...va.strengths.slice(0, 2));
                if (va?.improvements?.length) bullets.push(...va.improvements.slice(0, 1));
                const aiFeedback = bullets.length > 0 ? bullets.join(' · ') : 'AI feedback not available.';

                if (!next[q.id]) {
                    next[q.id] = {
                        questionId:        q.id,
                        aiMark,
                        lecturerMark:      va?.lecturerMark ?? null,
                        aiFeedback,
                        lecturerFeedback:  va?.lecturerFeedbackText ?? null,
                        maxMarks,
                        lecturerUpdatedBy: va?.lecturerUpdatedBy ?? null,
                        lecturerUpdatedAt: va?.lecturerUpdatedAt ?? null,
                    };
                } else if (next[q.id].aiMark === 0 && aiMark > 0) {
                    next[q.id] = { ...next[q.id], aiMark };
                }
            }
            return next;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiQuestions, latestVersion?.answers]);

    // Pre-fill overall comment from stored feedback
    useEffect(() => {
        if (submission?.feedbackText && !overallComment) setOverallComment(submission.feedbackText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submission?.feedbackText]);

    // ── Handlers ───────────────────────────────────────────────

    const handleQuestionSave = (questionId: string, mark: number, feedback: string) => {
        setQuestionStates(prev => ({
            ...prev,
            [questionId]: { ...prev[questionId], lecturerMark: mark, lecturerFeedback: feedback },
        }));
    };

    const calculateGrade = () => {
        let scored = 0, maxTotal = 0;
        Object.values(questionStates).forEach(s => {
            scored   += s.lecturerMark ?? s.aiMark ?? 0;
            maxTotal += s.maxMarks;
        });
        const percentage = maxTotal > 0 ? Math.round((scored / maxTotal) * 100) : 0;
        return { scored: Math.round(scored * 10) / 10, total: maxTotal, percentage };
    };

    const handleSubmitGrade = async () => {
        if (!isDeadlinePassed) return;
        if (!confirm('Submit this grade? The student will be notified and this becomes the final grade.')) return;

        const grade = calculateGrade();
        const questionScores = Object.fromEntries(
            Object.entries(questionStates).map(([k, s]) => [k, s.lecturerMark ?? s.aiMark ?? 0])
        );
        const questionFeedbacks = Object.fromEntries(
            Object.entries(questionStates)
                .filter(([, s]) => s.lecturerFeedback != null)
                .map(([k, s]) => [k, s.lecturerFeedback!])
        );

        const result = await gradeSubmission(submissionId, {
            grade:            grade.percentage,
            lecturerFeedback: overallComment,
            questionScores,
            questionFeedbacks,
            lecturerId:       getLecturerId(),
        } as Parameters<typeof gradeSubmission>[1]);

        if (result) {
            // Notify the student about the grading
            try {
                const token = localStorage.getItem('authToken') ?? '';
                await fetch('/api/submissions/notifications', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientId: submission?.studentId,
                        submissionId,
                        type: 'grade_submitted',
                        title: 'Submission Graded',
                        message: `Your submission for "${submission?.assignmentTitle ?? 'Assignment'}" has been graded — ${grade.percentage}%.`,
                        link: `/submissions/student/feedback/${submissionId}`,
                    }),
                });
            } catch { /* notification is best-effort */ }

            setSubmitDone(true);
            setTimeout(() => router.push('/submissions/lecturer/submissions'), 1500);
        }
    };

    const grade = calculateGrade();

    // ── Loading ─────────────────────────────────────────────────

    if ((subLoading || versionLoading) && !submission) {
        return (
            <div className="max-w-7xl mx-auto animate-pulse space-y-4 py-8">
                <div className="h-6 bg-gray-200 rounded w-36" />
                <div className="h-32 bg-gray-100 rounded-lg" />
                <div className="h-64 bg-gray-100 rounded-lg" />
            </div>
        );
    }

    const sortedQuestions = apiQuestions ? [...apiQuestions].sort((a, b) => a.order - b.order) : [];

    return (
        <div className="max-w-7xl mx-auto pb-40">
            {/* Back */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
            >
                <ArrowLeft size={20} /> Back to Submissions
            </button>

            {/* ── Deadline status banner ───────────────────────────── */}
            {isDeadlinePassed ? (
                <div className="flex items-start gap-3 p-4 mb-6 bg-green-50 border border-green-200 rounded-lg">
                    <Unlock size={20} className="text-green-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-green-800">Assignment deadline has passed — grading unlocked</p>
                        <p className="text-sm text-green-700 mt-0.5">
                            You can now override AI-generated marks and feedback. Your changes are saved separately
                            from the original AI values and are fully attributed to your account for audit.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <Lock size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-800">Grading locked — deadline has not yet passed</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            The current grade is AI-generated and cannot be changed before the deadline.
                            You can read the submission but all marks are locked.
                            {submission?.dueDate && (
                                <> Deadline: <strong>{formatDate(String(submission.dueDate))}</strong>.</>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Submission info card ─────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="text-blue-600" size={28} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                {submission?.studentName ?? 'Student'}
                            </h1>
                            <p className="text-gray-500 text-sm">
                                {submission?.assignmentTitle ?? 'Assignment'}
                                {(submission?.moduleName ?? submission?.moduleCode) ? ` · ${submission?.moduleName ?? submission?.moduleCode}` : ''}
                            </p>
                            {submission?.isLate && (
                                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium mt-0.5">
                                    <Clock size={12} /> Submitted late
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">{grade.percentage}%</div>
                        <div className="text-sm text-gray-500">{grade.scored}/{grade.total} marks</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="text-blue-500 shrink-0" size={18} />
                        <div>
                            <div className="text-xs text-gray-400">Submitted</div>
                            <div className="font-medium">{formatDate(submission?.submittedAt as unknown as string)}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                        <Clock className={`shrink-0 ${isDeadlinePassed ? 'text-green-500' : 'text-amber-500'}`} size={18} />
                        <div>
                            <div className="text-xs text-gray-400">Deadline</div>
                            <div className={`font-medium ${isDeadlinePassed ? 'text-green-700' : 'text-amber-700'}`}>
                                {formatDate(submission?.dueDate as unknown as string)}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                        <GitBranch className="text-purple-500 shrink-0" size={18} />
                        <div>
                            <div className="text-xs text-gray-400">Version</div>
                            <div className="font-medium">{latestVersion?.versionNumber ?? submission?.currentVersionNumber ?? '—'}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                        <Shield className="text-green-500 shrink-0" size={18} />
                        <div>
                            <div className="text-xs text-gray-400">Plagiarism</div>
                            <div className="font-medium">
                                {submission?.plagiarismScore != null ? `${submission.plagiarismScore}%` : '—'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI grade · Lecturer grade · Final grade summary */}
                <div className="grid grid-cols-3 gap-4 text-sm pt-4 border-t border-gray-100">
                    <div className="rounded-lg bg-purple-50 border border-purple-100 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles size={13} className="text-purple-600" />
                            <span className="text-xs font-semibold text-purple-700">AI Grade</span>
                        </div>
                        <p className="text-lg font-bold text-purple-900">
                            {submission?.aiScore != null ? `${submission.aiScore}/100` : '—'}
                        </p>
                        <p className="text-xs text-purple-500">Quality score · immutable</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Edit size={13} className="text-blue-600" />
                            <span className="text-xs font-semibold text-blue-700">Lecturer Grade</span>
                        </div>
                        <p className="text-lg font-bold text-blue-900">
                            {latestVersion?.hasLecturerOverride
                                ? `${grade.percentage}%`
                                : 'Not set'}
                        </p>
                        <p className="text-xs text-blue-500">
                            {latestVersion?.hasLecturerOverride
                                ? 'Override active'
                                : isDeadlinePassed ? 'Set below' : 'Available after deadline'}
                        </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Star size={13} className="text-gray-600" />
                            <span className="text-xs font-semibold text-gray-700">Final Grade</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                            {latestVersion?.finalGrade != null
                                ? `${Math.round(latestVersion.finalGrade * 10) / 10}%`
                                : `${grade.percentage}%`}
                        </p>
                        <p className="text-xs text-gray-500">
                            {latestVersion?.hasLecturerOverride
                                ? 'Lecturer override'
                                : 'AI generated'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Error / success ──────────────────────────────────── */}
            {gradeError && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-800">Grade submission failed</p>
                        <p className="text-sm text-red-700 mt-0.5">{gradeError}</p>
                    </div>
                </div>
            )}
            {gradeSuccess && submitDone && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
                    <p className="font-semibold text-green-800">Grade submitted successfully. Redirecting…</p>
                </div>
            )}

            {/* Pre-deadline read-only notice */}
            {!isDeadlinePassed && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                        <strong>Read-only view.</strong> All marks below are AI-generated and cannot be changed
                        before the deadline. Override buttons will appear after the deadline passes.
                    </p>
                </div>
            )}

            {/* ── Question cards ───────────────────────────────────── */}
            <div className="space-y-5">
                {sortedQuestions.length > 0 ? (
                    sortedQuestions.map((question, idx) => {
                        const state = questionStates[question.id] ?? {
                            questionId: question.id,
                            aiMark: 0,
                            lecturerMark: null,
                            aiFeedback: 'AI feedback not available.',
                            lecturerFeedback: null,
                            maxMarks: question.maxPoints ?? 10,
                            lecturerUpdatedBy: null,
                            lecturerUpdatedAt: null,
                        };
                        const studentAnswerText = latestVersion?.answers?.find(a => a.questionId === question.id)?.answerText;

                        return isDeadlinePassed ? (
                            <EditableQuestionCard
                                key={question.id}
                                idx={idx}
                                question={question}
                                state={state}
                                studentAnswerText={studentAnswerText}
                                onSave={handleQuestionSave}
                                submissionId={submissionId}
                                versionId={latestVersion?.id ?? ''}
                            />
                        ) : (
                            <ReadOnlyQuestionCard
                                key={question.id}
                                idx={idx}
                                question={question}
                                state={state}
                                studentAnswerText={studentAnswerText}
                                submissionId={submissionId}
                                versionId={latestVersion?.id ?? ''}
                            />
                        );
                    })
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                        <FileText size={36} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No questions loaded</p>
                        <p className="text-sm mt-1">Questions appear once assignment data is available.</p>
                    </div>
                )}

                {/* Overall comment */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        Overall Comment
                        {!isDeadlinePassed && <Lock size={15} className="text-amber-500" />}
                    </h3>
                    {isDeadlinePassed ? (
                        <textarea
                            value={overallComment}
                            onChange={e => setOverallComment(e.target.value)}
                            rows={4}
                            placeholder="Add an overall comment for the student..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    ) : (
                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 italic">
                            {submission?.feedbackText ?? 'Overall comment can be set after the deadline passes.'}
                        </div>
                    )}
                </div>

                {/* Grade summary */}
                <div className={`rounded-lg shadow-lg p-6 text-white ${
                    isDeadlinePassed
                        ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                        : 'bg-gradient-to-br from-gray-500 to-gray-600'
                }`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold mb-1">
                                {isDeadlinePassed ? 'Lecturer Final Grade' : 'AI Grade (read-only)'}
                            </h3>
                            <p className="opacity-80 text-sm">{grade.scored} / {grade.total} marks</p>
                        </div>
                        <div className="text-right">
                            <div className="text-5xl font-bold">{grade.percentage}%</div>
                            <p className="opacity-80 mt-1">{getLetterGrade(grade.percentage)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Sticky action bar ────────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg z-10">
                <div className="max-w-7xl mx-auto flex gap-4">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium flex items-center gap-2 cursor-pointer"
                    >
                        <ArrowLeft size={18} /> Back
                    </button>

                    {isDeadlinePassed ? (
                        <button
                            onClick={handleSubmitGrade}
                            disabled={grading || submitDone}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {grading
                                ? <><RefreshCw size={18} className="animate-spin" /> Submitting…</>
                                : <><Send size={18} /> Submit Grade &amp; Notify Student</>
                            }
                        </button>
                    ) : (
                        <div className="flex-1 px-6 py-3 bg-gray-100 text-gray-400 rounded-lg font-medium flex items-center justify-center gap-2 select-none cursor-not-allowed border border-dashed border-gray-300">
                            <Lock size={18} /> Grading locked — deadline has not yet passed
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
