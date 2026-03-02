'use client';

/**
 * Student Answer Page
 * Route: /submissions/student/answer/[assignmentId]
 * ─────────────────────────────────────────────────────────────
 * The main page where students type their text answers to questions.
 *
 * Data flow on mount:
 *  1. Decode JWT from localStorage → studentId
 *  2. GET /api/assignments/{assignmentId} → Assignment with questions[]
 *  3. getOrCreateDraftSubmission(assignmentId, studentId) → Submission (DRAFT)
 *  4. GET /api/submissions/{submissionId}/answers → TextAnswer[] (pre-fill editors)
 *
 * Layout:
 *  • Back button → /submissions/student/my-submissions
 *  • AssignmentHeader card  (title, due date countdown, progress)
 *  • N × QuestionCard       (one per question — auto-resize editor + AI feedback)
 *  • Sticky bottom bar      (total word count + "Submit Assignment" button)
 *
 * Submit flow:
 *  Confirm dialog → submissionService.submitSubmission(id)
 *  → toast → redirect to /submissions/student/my-submissions
 *
 * Debug:
 *  All console.debug calls are prefixed with "[AnswerPage]".
 */

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { submissionService } from '@/lib/api/submission-services';
import { QuestionCard } from '@/components/submissions/QuestionCard';
import type { AssignmentWithQuestions, TextAnswer } from '@/types/submission.types';

// ─── Helpers ──────────────────────────────────────────────────

/** Decode JWT stored in localStorage to extract the student's userId. */
function getStudentId(): string {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return '';
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId ?? payload.sub ?? '';
    } catch {
        return '';
    }
}

function getStudentName(): string {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return 'Student';
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.name ?? payload.username ?? 'Student';
    } catch {
        return 'Student';
    }
}

/** Returns a human-friendly due-date label and whether it's overdue. */
function dueDateLabel(dueDateStr: string): { label: string; overdue: boolean } {
    const now = Date.now();
    const due = new Date(dueDateStr).getTime();
    const diffMs = due - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
        const overdueDays = Math.abs(diffDays);
        return {
            label: overdueDays === 0 ? 'Due today (overdue)' : `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`,
            overdue: true,
        };
    }
    if (diffDays === 0) return { label: 'Due today!', overdue: false };
    return { label: `${diffDays} day${diffDays !== 1 ? 's' : ''} left`, overdue: false };
}

/** Count words in a string. */
function countWords(text: string): number {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

// ─── Skeleton ─────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="animate-pulse space-y-4">
            {/* Header skeleton */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-1/4" />
            </div>
            {/* 3 question skeletons */}
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                    <div className="h-40 bg-gray-100 rounded" />
                </div>
            ))}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function AnswerPage({
    params,
}: {
    params: Promise<{ assignmentId: string }>;
}) {
    const { assignmentId } = use(params);
    const router = useRouter();

    // ── Core state ────────────────────────────────────────────
    const [studentId, setStudentId]           = useState<string>('');
    const [studentName, setStudentName]       = useState<string>('Student');
    const [assignment, setAssignment]         = useState<AssignmentWithQuestions | null>(null);
    const [submissionId, setSubmissionId]     = useState<string>('');
    const [savedAnswers, setSavedAnswers]     = useState<TextAnswer[]>([]);
    const [answerMap, setAnswerMap]           = useState<Record<string, string>>({});

    // ── UI state ──────────────────────────────────────────────
    const [loading, setLoading]               = useState<boolean>(true);
    const [error, setError]                   = useState<string | null>(null);
    const [submitting, setSubmitting]         = useState<boolean>(false);
    const [submitDone, setSubmitDone]         = useState<boolean>(false);
    const [showConfirm, setShowConfirm]       = useState<boolean>(false);

    console.debug('[AnswerPage] assignmentId:', assignmentId, '| submissionId:', submissionId);

    // ── Load data on mount ────────────────────────────────────
    useEffect(() => {
        const sid = getStudentId();
        const sName = getStudentName();
        setStudentId(sid);
        setStudentName(sName);

        async function load() {
            try {
                setLoading(true);

                // 1. Fetch assignment (with questions)
                const raw = await submissionService.getAssignment(assignmentId);
                // Cast — questions[] is returned by the backend but typed as optional
                const asg = raw as AssignmentWithQuestions;
                setAssignment(asg);

                // 2. Get or create draft submission
                const draft = await submissionService.getOrCreateDraftSubmission(
                    assignmentId,
                    sid,
                    sName,
                );
                setSubmissionId(draft.id);

                // 3. Pre-load saved answers
                try {
                    const answers = await submissionService.getAnswers(draft.id);
                    setSavedAnswers(answers);
                    // Build a lookup map questionId → answerText for fast lookup in props
                    const map: Record<string, string> = {};
                    for (const a of answers) {
                        map[a.questionId] = a.answerText;
                    }
                    setAnswerMap(map);
                } catch {
                    // No answers yet — that's fine
                }

                console.debug('[AnswerPage] Loaded — submissionId:', draft.id, '| questions:', asg.questions?.length ?? 0);
            } catch (err) {
                console.error('[AnswerPage] Load failed:', err);
                setError('Could not load the assignment. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assignmentId]);

    // ── Track live answers for progress + submit validation ───
    const handleAnswerChange = useCallback((questionId: string, text: string) => {
        setAnswerMap((prev) => ({ ...prev, [questionId]: text }));
    }, []);

    // ── Derived values ────────────────────────────────────────

    const questions = assignment?.questions ?? [];

    /** Number of questions that have at least 1 word typed. */
    const answeredCount = questions.filter(
        (q) => countWords(answerMap[q.id] ?? '') > 0
    ).length;

    /** True if all required questions have at least 1 word. */
    const canSubmit = questions
        .filter((q) => q.isRequired)
        .every((q) => countWords(answerMap[q.id] ?? '') > 0);

    /** Total word count across all answers. */
    const totalWords = Object.values(answerMap).reduce(
        (sum, text) => sum + countWords(text),
        0
    );

    // ── Submit handler ────────────────────────────────────────

    async function handleSubmit() {
        if (!submissionId) return;
        setSubmitting(true);
        try {
            await submissionService.submitSubmission(submissionId);
            setSubmitDone(true);
            setShowConfirm(false);
            console.debug('[AnswerPage] Submitted successfully — submissionId:', submissionId);
            // Short delay so the user sees the success state before redirect.
            setTimeout(() => {
                router.push('/submissions/student/my-submissions');
            }, 1800);
        } catch (err) {
            console.error('[AnswerPage] Submit failed:', err);
            setError('Submission failed. Please try again.');
            setSubmitting(false);
            setShowConfirm(false);
        }
    }

    // ── Render: loading ───────────────────────────────────────
    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-6">
                <PageSkeleton />
            </div>
        );
    }

    // ── Render: error ─────────────────────────────────────────
    if (error && !assignment) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-6">
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
                    <p className="font-semibold">{error}</p>
                    <button
                        onClick={() => router.push('/submissions/student/my-submissions')}
                        className="mt-4 text-sm underline text-red-600 hover:text-red-800"
                    >
                        Back to submissions
                    </button>
                </div>
            </div>
        );
    }

    // ── Render: success ───────────────────────────────────────
    if (submitDone) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-6">
                <div className="rounded-lg border border-green-200 bg-green-50 p-10 text-center">
                    <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-green-800 mb-2">Assignment Submitted!</h2>
                    <p className="text-sm text-green-700">Redirecting to your submissions…</p>
                </div>
            </div>
        );
    }

    const due = assignment?.dueDate ? dueDateLabel(assignment.dueDate) : null;

    // ── Fallback if assignment has no questions ────────────────
    const hasQuestions = questions.length > 0;

    // ── Render: main ─────────────────────────────────────────
    return (
        <div className="max-w-5xl mx-auto px-4 py-6 pb-28">

            {/* ── Back link ─────────────────────────────────── */}
            <button
                onClick={() => router.push('/submissions/student/my-submissions')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
            >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                My Submissions
            </button>

            {/* ── Error banner (non-fatal) ───────────────────── */}
            {error && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* ── Assignment header card ────────────────────── */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">
                            {assignment?.title ?? 'Assignment'}
                        </h1>
                        {assignment?.moduleName && (
                            <p className="mt-1 text-sm text-gray-500">
                                {assignment.moduleCode} — {assignment.moduleName}
                            </p>
                        )}
                        {assignment?.description && (
                            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                                {assignment.description}
                            </p>
                        )}
                    </div>

                    {/* Due date */}
                    {due && (
                        <div className={`flex-shrink-0 rounded-lg border px-4 py-3 text-center ${
                            due.overdue
                                ? 'border-red-200 bg-red-50'
                                : 'border-amber-200 bg-amber-50'
                        }`}>
                            <p className="text-xs text-gray-500 mb-0.5">Due date</p>
                            <p className="text-sm font-semibold text-gray-800">
                                {new Date(assignment!.dueDate).toLocaleDateString()}
                            </p>
                            <p className={`text-xs font-medium mt-0.5 ${due.overdue ? 'text-red-600' : 'text-amber-600'}`}>
                                {due.label}
                            </p>
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                {hasQuestions && (
                    <div className="mt-5">
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                            <span>{answeredCount} of {questions.length} question{questions.length !== 1 ? 's' : ''} answered</span>
                            <span>{totalWords} total words</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-purple-500 transition-all duration-500"
                                style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Questions ─────────────────────────────────── */}
            {hasQuestions ? (
                <div className="space-y-6">
                    {questions
                        .slice()
                        .sort((a, b) => a.order - b.order)
                        .map((question, idx) => (
                            <QuestionCard
                                key={question.id}
                                question={question}
                                submissionId={submissionId}
                                studentId={studentId}
                                assignmentId={assignmentId}
                                initialAnswer={answerMap[question.id] ?? ''}
                                disabled={submitDone}
                                onAnswerChange={handleAnswerChange}
                                questionIndex={idx}
                            />
                        ))}
                </div>
            ) : (
                /* Graceful fallback when the assignment has no questions yet */
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
                    <svg className="mx-auto mb-3 h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <p className="text-sm font-semibold text-amber-800">No questions available</p>
                    <p className="mt-1 text-xs text-amber-700">
                        The lecturer has not added any questions to this assignment yet. Check back later.
                    </p>
                </div>
            )}

            {/* ── Sticky submit bar ─────────────────────────── */}
            {hasQuestions && (
                <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3 z-30">
                    <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                        <div className="text-sm text-gray-600">
                            <span className="font-semibold">{answeredCount}</span>
                            <span className="text-gray-400"> / </span>
                            <span>{questions.length}</span>
                            <span className="ml-1 text-gray-400">answered</span>
                            <span className="ml-3 text-gray-400">·</span>
                            <span className="ml-3 font-semibold text-gray-700">{totalWords}</span>
                            <span className="ml-1 text-gray-400">total words</span>
                        </div>

                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={!canSubmit || submitting}
                            title={!canSubmit ? 'Answer all required questions to submit' : undefined}
                            className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors ${
                                canSubmit && !submitting
                                    ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
                                    : 'bg-gray-300 cursor-not-allowed'
                            }`}
                        >
                            {submitting ? 'Submitting…' : 'Submit Assignment'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Confirmation modal ────────────────────────── */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Submit assignment?</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Once submitted, you will not be able to edit your answers.
                            Make sure all your answers are complete.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={submitting}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-gray-300"
                            >
                                {submitting ? 'Submitting…' : 'Yes, Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
