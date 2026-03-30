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
 *  3. getOrCreateDraftSubmission(assignmentId, studentId) → Submission (any status)
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
import { useRouter, useSearchParams } from 'next/navigation';
import {
    submissionService,
    versionService,
    plagiarismService,
    getAssignmentWithFallback,
} from '@/lib/api/submission-services';
import { QuestionCard } from '@/components/submissions/QuestionCard';
import type { AssignmentWithQuestions, TextAnswer, LiveFeedback, LivePlagiarismResult } from '@/types/submission.types';

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
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.name) return payload.name;
        }
        const storedName = localStorage.getItem('userName');
        if (storedName) return storedName;
        return 'Student';
    } catch {
        return 'Student';
    }
}

/** Returns a human-friendly due-date label and whether it's overdue. */
function dueDateLabel(dueDateStr: string, nowMs: number): { label: string; overdue: boolean } {
    const due = new Date(dueDateStr).getTime();
    const now = nowMs;
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

/**
 * Reconstruct a LiveFeedback object from a saved TextAnswer.
 * Returns null if no feedback has been saved yet (all score fields are null).
 */
function feedbackFromAnswer(a: TextAnswer): LiveFeedback | null {
    if (a.grammarScore == null && a.clarityScore == null &&
        a.completenessScore == null && a.relevanceScore == null) {
        return null;
    }
    return {
        questionId:        a.questionId,
        grammarScore:      a.grammarScore      ?? 0,
        clarityScore:      a.clarityScore      ?? 0,
        completenessScore: a.completenessScore ?? 0,
        relevanceScore:    a.relevanceScore    ?? 0,
        strengths:         a.strengths    ?? [],
        improvements:      a.improvements ?? [],
        suggestions:       a.suggestions  ?? [],
        generatedAt:       a.feedbackSavedAt ?? new Date().toISOString(),
    };
}

/**
 * Reconstruct a LivePlagiarismResult from a saved TextAnswer.
 * Returns null if no plagiarism check has been saved yet.
 */
function plagiarismFromAnswer(a: TextAnswer): LivePlagiarismResult | null {
    if (a.similarityScore == null && a.plagiarismSeverity == null) return null;
    return {
        questionId:     a.questionId,
        similarityScore: a.similarityScore ?? 0,
        severity:        (a.plagiarismSeverity as 'LOW' | 'MEDIUM' | 'HIGH') ?? 'LOW',
        flagged:         a.plagiarismFlagged ?? false,
        checkedAt:       a.plagiarismCheckedAt ?? new Date().toISOString(),
    };
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
    const searchParams = useSearchParams();
    const typeHint = (searchParams.get('type') as 'project' | 'task' | null) ?? undefined;

    // ── Core state ────────────────────────────────────────────
    const [studentId, setStudentId]           = useState<string>('');
    const [assignment, setAssignment]         = useState<AssignmentWithQuestions | null>(null);
    const [submissionId, setSubmissionId]     = useState<string>('');
    const [answerMap, setAnswerMap]           = useState<Record<string, string>>({});
    const [feedbackMap, setFeedbackMap]       = useState<Record<string, LiveFeedback | null>>({});
    const [plagiarismMap, setPlagiarismMap]   = useState<Record<string, LivePlagiarismResult | null>>({});
    const [gradeMap, setGradeMap]             = useState<Record<string, number | null>>({});

    // ── UI state ──────────────────────────────────────────────
    const [loading, setLoading]               = useState<boolean>(true);
    const [error, setError]                   = useState<string | null>(null);
    const [submitting, setSubmitting]         = useState<boolean>(false);
    const [submitDone, setSubmitDone]         = useState<boolean>(false);
    const [showConfirm, setShowConfirm]       = useState<boolean>(false);

    // ── Real-time clock for deadline countdown ────────────────
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(id);
    }, []);

    console.debug('[AnswerPage] assignmentId:', assignmentId, '| submissionId:', submissionId);

    // ── Load data on mount ────────────────────────────────────
    useEffect(() => {
        const sid = getStudentId();
        const sName = getStudentName();
        setStudentId(sid);

        async function load() {
            try {
                setLoading(true);
                console.debug('[AnswerPage] load START — assignmentId:', assignmentId, '| studentId:', sid);

                // 1. Fetch assignment (with questions); falls back to sample data if API is down
                const raw = await getAssignmentWithFallback(assignmentId, typeHint);
                // Cast — questions[] is returned by the backend but typed as optional
                const asg = raw as AssignmentWithQuestions;
                setAssignment(asg);
                console.debug('[AnswerPage] Assignment loaded — title:', asg.title, '| questions:', asg.questions?.length ?? 0, '| type:', asg.assignmentType ?? '(none)', '| dueDate:', asg.dueDate ?? '(none)');

                // 2. Deadline guard: if the assignment deadline has passed, only allow
                //    access if the student has already submitted. Otherwise redirect to
                //    my-submissions (deadline enforcement per requirements §8).
                if (asg.dueDate) {
                    const deadlineMs = new Date(asg.dueDate).getTime();
                    if (deadlineMs < Date.now()) {
                        // Check whether the student already submitted this assignment
                        let hasSubmitted = false;
                        try {
                            const subs = await submissionService.getStudentSubmissionsForAssignment(sid, assignmentId);
                            hasSubmitted = subs.some(
                                (s) => s.status === 'SUBMITTED' || s.status === 'GRADED'
                            );
                        } catch { /* non-fatal — default to redirect */ }

                        if (!hasSubmitted) {
                            console.debug('[AnswerPage] Deadline passed & no submission — redirecting (404 equivalent)');
                            router.replace('/submissions/student/my-submissions');
                            return;
                        }
                        console.debug('[AnswerPage] Deadline passed but student has a submission — allowing read-only view');
                    }
                }

                // 3. Get or create draft submission
                const draft = await submissionService.getOrCreateDraftSubmission(
                    assignmentId,
                    sid,
                    sName,
                    asg.title,
                    asg.moduleCode,
                    asg.moduleName,
                );
                setSubmissionId(draft.id);
                console.debug('[AnswerPage] Draft submission — id:', draft.id, '| status:', draft.status);

                if (!draft.id) {
                    console.error('[AnswerPage] WARNING: draft.id is falsy — auto-save will be skipped! draft:', draft);
                }

                // 3. Pre-load saved answers (+ their persisted feedback/plagiarism)
                try {
                    const answers = await submissionService.getAnswers(draft.id);

                    const textMap:  Record<string, string>                    = {};
                    const fbMap:    Record<string, LiveFeedback | null>        = {};
                    const plagMap:  Record<string, LivePlagiarismResult | null> = {};

                    for (const a of answers) {
                        textMap[a.questionId]  = a.answerText;
                        fbMap[a.questionId]    = feedbackFromAnswer(a);
                        plagMap[a.questionId]  = plagiarismFromAnswer(a);
                    }

                    setAnswerMap(textMap);
                    setFeedbackMap(fbMap);
                    setPlagiarismMap(plagMap);

                    const withFeedback   = answers.filter(a => fbMap[a.questionId]   != null).length;
                    const withPlagiarism = answers.filter(a => plagMap[a.questionId] != null).length;
                    console.debug('[AnswerPage] Pre-loaded', answers.length, 'saved answers for submissionId:', draft.id,
                        '| withSavedFeedback:', withFeedback, '| withSavedPlagiarism:', withPlagiarism);
                } catch (ansErr) {
                    // No answers yet — that's fine
                    console.debug('[AnswerPage] No saved answers (or fetch failed) for submissionId:', draft.id, '—', ansErr);
                }

                console.debug('[AnswerPage] Load COMPLETE — submissionId:', draft.id, '| questions:', asg.questions?.length ?? 0);
            } catch (err) {
                console.error('[AnswerPage] Load FAILED:', err);
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

    const handleGradeChange = useCallback((questionId: string, grade: number | null) => {
        setGradeMap((prev) => ({ ...prev, [questionId]: grade }));
    }, []);

    const handleFeedbackChange = useCallback((questionId: string, feedback: LiveFeedback | null) => {
        setFeedbackMap((prev) => ({ ...prev, [questionId]: feedback }));
    }, []);

    const handlePlagiarismChange = useCallback((questionId: string, result: LivePlagiarismResult | null) => {
        setPlagiarismMap((prev) => ({ ...prev, [questionId]: result }));
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

    /** Running projected grade totals across all questions that have AI feedback. */
    const projectedTotal = (() => {
        const totalMax = questions.reduce((s, q) => s + (q.maxPoints ?? 10), 0);
        const gradedQuestions = questions.filter(q => gradeMap[q.id] != null);
        if (gradedQuestions.length === 0) return null;
        const earned = gradedQuestions.reduce((s, q) => s + (gradeMap[q.id] ?? 0), 0);
        // Scale to full assignment total only when all questions have feedback
        const isComplete = gradedQuestions.length === questions.length;
        return { earned: Math.round(earned * 10) / 10, max: totalMax, isComplete, gradedCount: gradedQuestions.length };
    })();

    // ── Submit handler ────────────────────────────────────────

    async function handleSubmit() {
        if (!submissionId) {
            console.error('[AnswerPage] handleSubmit called but submissionId is empty!');
            return;
        }
        console.debug('[AnswerPage] handleSubmit — submissionId:', submissionId, '| answeredCount:', answeredCount, '/', questions.length, '| totalWords:', totalWords);
        setSubmitting(true);
        try {
            const submittedResult = await submissionService.submitSubmission(submissionId);
            const versionNumber = submittedResult?.totalVersions ?? submittedResult?.versionNumber ?? 1;
            setSubmitDone(true);
            setShowConfirm(false);
            console.debug('[AnswerPage] Submit SUCCESS — submissionId:', submissionId, '| versionNumber:', versionNumber);

            // The backend creates the version snapshot atomically in the same transaction
            // as submitSubmission — no frontend fallback needed.
            console.debug('[AnswerPage] Server-side snapshot created — v', versionNumber);

            // ── Persist plagiarism sources to the new version ─────────────
            // The realtime plagiarism checks stored internetMatches in plagiarismMap,
            // but those aren't saved to the version snapshot automatically.
            // If the student left the page and came back, internetMatches are lost — re-run
            // a quick realtime check for those questions to get fresh sources.
            try {
                const latestVersion = await versionService.getLatestVersion(submissionId);
                if (latestVersion?.id) {
                    const savedQuestionIds = new Set<string>();
                    const savePromises: Promise<void>[] = [];

                    // 1. Save sources already in memory from the current session
                    for (const [qId, pResult] of Object.entries(plagiarismMap)) {
                        const matches = pResult?.internetMatches;
                        if (matches && matches.length > 0) {
                            savedQuestionIds.add(qId);
                            console.debug('[AnswerPage] Saving', matches.length, 'plagiarism sources for questionId:', qId);
                            savePromises.push(
                                versionService.savePlagiarismSources(submissionId, latestVersion.id, qId, {
                                    sources: matches.map(m => ({
                                        sourceUrl: m.url,
                                        sourceTitle: m.title,
                                        sourceSnippet: m.snippet,
                                        matchedText: m.matchedStudentText,
                                        similarityPercentage: m.similarityScore,
                                    })),
                                })
                            );
                        }
                    }

                    // 2. For questions with plagiarism scores but no internetMatches in memory,
                    //    re-run a quick realtime check to get fresh source details.
                    for (const [qId, pResult] of Object.entries(plagiarismMap)) {
                        if (savedQuestionIds.has(qId)) continue;
                        if (!pResult || pResult.similarityScore <= 0) continue;
                        const answerText = answerMap[qId];
                        if (!answerText || answerText.trim().length === 0) continue;

                        savePromises.push(
                            plagiarismService.checkLiveSimilarity({
                                sessionId: `submit-refresh-${submissionId}-${qId}`,
                                studentId,
                                questionId: qId,
                                textContent: answerText,
                                questionText: questions.find(q => q.id === qId)?.text,
                                submissionId,
                            }).then(freshResult => {
                                const fm = freshResult.internetMatches;
                                if (fm && fm.length > 0) {
                                    console.debug('[AnswerPage] Re-fetched', fm.length, 'sources for questionId:', qId);
                                    return versionService.savePlagiarismSources(submissionId, latestVersion.id, qId, {
                                        sources: fm.map(m => ({
                                            sourceUrl: m.url,
                                            sourceTitle: m.title,
                                            sourceSnippet: m.snippet,
                                            matchedText: m.matchedStudentText,
                                            similarityPercentage: m.similarityScore,
                                        })),
                                    });
                                }
                            }).catch(() => { /* non-fatal */ })
                        );
                    }

                    if (savePromises.length > 0) {
                        await Promise.all(savePromises);
                        console.debug('[AnswerPage] Plagiarism sources saved for', savePromises.length, 'questions');
                    }
                }
            } catch (srcErr) {
                console.warn('[AnswerPage] Failed to save plagiarism sources (non-fatal):', srcErr);
            }

            // ── Notify the lecturer about the new submission ─────────────
            try {
                const lecturerId = assignment?.createdBy;
                if (lecturerId) {
                    const token = localStorage.getItem('authToken') ?? '';
                    await fetch('/api/submissions/notifications', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            recipientId: lecturerId,
                            submissionId,
                            type: 'submission_submitted',
                            title: 'New Submission',
                            message: `${getStudentName()} submitted "${assignment?.title ?? 'Assignment'}" (v${versionNumber}).`,
                            link: `/submissions/lecturer/grading/${submissionId}`,
                        }),
                    });
                }
            } catch { /* notification is best-effort */ }

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
                        className="mt-4 text-sm underline text-red-600 hover:text-red-800 cursor-pointer"
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
                    <p className="text-sm text-green-700 mb-3">Redirecting to your submissions…</p>
                    <p className="text-xs text-green-600 opacity-80">
                        Your report has been saved. View it on your submissions page.
                    </p>
                </div>
            </div>
        );
    }

    const due = assignment?.dueDate ? dueDateLabel(assignment.dueDate, now) : null;

    /** True when the deadline has passed — editing is locked. */
    const isDeadlinePassed = due?.overdue === true;

    // ── Fallback if assignment has no questions ────────────────
    const hasQuestions = questions.length > 0;

    // ── Render: main ─────────────────────────────────────────
    return (
        <div className="max-w-5xl mx-auto px-4 py-6 pb-28">

            {/* ── Back link ─────────────────────────────────── */}
            <button
                onClick={() => router.push('/submissions/student/my-submissions')}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-700 mb-5 transition-colors cursor-pointer group"
            >
                <svg className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to My Submissions
            </button>

            {/* ── Error banner (non-fatal) ───────────────────── */}
            {error && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* ── Deadline-passed notice ─────────────────────── */}
            {isDeadlinePassed && (
                <div className="mb-4 rounded-md bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                    <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <span>
                        <span className="font-semibold">Deadline has passed.</span>
                        {' '}Your answers are now read-only and cannot be edited.
                    </span>
                </div>
            )}

            {/* ── Assignment header card ────────────────────── */}
            <div className={`rounded-xl shadow-sm border p-6 mb-6 ${due?.overdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {assignment?.assignmentType === 'project' && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Project</span>
                            )}
                            {assignment?.assignmentType === 'task' && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">Task</span>
                            )}
                            {(assignment?.moduleName || assignment?.moduleCode) && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{assignment.moduleName ?? assignment.moduleCode}</span>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                            {assignment?.title ?? 'Assignment'}
                        </h1>
                        {assignment?.moduleName && (
                            <p className="mt-1 text-sm text-gray-500">{assignment.moduleName}</p>
                        )}
                        {assignment?.description && (
                            <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
                                {assignment.description}
                            </p>
                        )}
                    </div>

                    {/* Due date */}
                    {due && (
                        <div className={`flex-shrink-0 rounded-xl border px-5 py-4 text-center min-w-[120px] ${
                            due.overdue
                                ? 'border-red-300 bg-red-100'
                                : 'border-amber-200 bg-amber-50'
                        }`}>
                            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Due</p>
                            <p className="text-sm font-bold text-gray-800">
                                {new Date(assignment!.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            <p className={`text-xs font-semibold mt-1 ${due.overdue ? 'text-red-600' : 'text-amber-600'}`}>
                                {due.label}
                            </p>
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                {hasQuestions && (
                    <div className="mt-5 pt-5 border-t border-gray-100">
                        <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
                            <span>
                                <span className="text-purple-700 font-bold">{answeredCount}</span>
                                <span className="text-gray-400"> / {questions.length} questions answered</span>
                            </span>
                            <span className="text-gray-500">{totalWords.toLocaleString()} words total</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    answeredCount === questions.length ? 'bg-green-500' : 'bg-purple-500'
                                }`}
                                style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
                            />
                        </div>
                        {answeredCount === questions.length && questions.length > 0 && (
                            <p className="text-xs text-green-600 font-medium mt-1.5">All questions answered — ready to submit!</p>
                        )}
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
                                assignmentDescription={assignment?.description ?? undefined}
                                initialAnswer={answerMap[question.id] ?? ''}
                                initialFeedback={feedbackMap[question.id] ?? null}
                                initialPlagiarism={plagiarismMap[question.id] ?? null}
                                disabled={submitDone || isDeadlinePassed}
                                onAnswerChange={handleAnswerChange}
                                onGradeChange={handleGradeChange}
                                onFeedbackChange={handleFeedbackChange}
                                onPlagiarismChange={handlePlagiarismChange}
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
                <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg px-4 py-3 z-30">
                    <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {/* Mini progress */}
                            <div className="hidden sm:block">
                                <div className="w-28 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${answeredCount === questions.length ? 'bg-green-500' : 'bg-purple-500'}`}
                                        style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                            <div className="text-sm text-gray-600">
                                <span className="font-bold text-gray-900">{answeredCount}</span>
                                <span className="text-gray-400">/{questions.length}</span>
                                <span className="ml-1 text-gray-500">answered</span>
                                <span className="mx-2 text-gray-300">·</span>
                                <span className="font-semibold text-gray-700">{totalWords.toLocaleString()}</span>
                                <span className="ml-1 text-gray-400">words</span>
                            </div>

                            {/* Live projected grade pill */}
                            {projectedTotal ? (
                                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${
                                    projectedTotal.isComplete
                                        ? projectedTotal.earned / projectedTotal.max >= 0.75
                                            ? 'bg-green-50 border-green-300 text-green-700'
                                            : projectedTotal.earned / projectedTotal.max >= 0.50
                                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                                            : 'bg-red-50 border-red-300 text-red-700'
                                        : 'bg-purple-50 border-purple-200 text-purple-700'
                                }`}>
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    AI projected: {projectedTotal.earned} / {projectedTotal.max}
                                    {!projectedTotal.isComplete && (
                                        <span className="font-normal text-purple-500">
                                            ({projectedTotal.gradedCount}/{questions.length})
                                        </span>
                                    )}
                                </div>
                            ) : answeredCount > 0 ? (
                                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-400">
                                    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    AI grading…
                                </span>
                            ) : null}
                        </div>

                        {isDeadlinePassed ? (
                            <span className="rounded-xl px-7 py-2.5 text-sm font-bold text-white bg-gray-400 cursor-not-allowed shadow-none">
                                Deadline Passed
                            </span>
                        ) : (
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={!canSubmit || submitting}
                                title={!canSubmit ? 'Answer all required questions to submit' : undefined}
                                className={`rounded-xl px-7 py-2.5 text-sm font-bold text-white transition-all shadow-md ${
                                    canSubmit && !submitting
                                        ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 cursor-pointer hover:shadow-lg'
                                        : 'bg-gray-300 cursor-not-allowed shadow-none'
                                }`}
                            >
                                {submitting ? 'Submitting…' : canSubmit ? 'Submit Assignment ✓' : 'Submit Assignment'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Submission summary modal ──────────────────── */}
            {showConfirm && (() => {
                const gradedQuestions = questions.filter(q => gradeMap[q.id] != null);
                const totalEarned = gradedQuestions.reduce((s, q) => s + (gradeMap[q.id] ?? 0), 0);
                const totalMax    = questions.reduce((s, q) => s + (q.maxPoints ?? 10), 0);
                const hasGrades   = gradedQuestions.length > 0;
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Submit assignment?</h3>
                            <p className="text-sm text-gray-500 mb-5">
                                Once submitted your answers are locked. Review your projected scores below.
                            </p>

                            {/* Per-question grade table */}
                            {hasGrades && (
                                <div className="mb-5 rounded-lg border border-gray-200 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="text-left px-4 py-2 font-medium text-gray-600">Question</th>
                                                <th className="text-right px-4 py-2 font-medium text-gray-600">Projected</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {questions
                                                .slice()
                                                .sort((a, b) => a.order - b.order)
                                                .map((q, i) => {
                                                    const g = gradeMap[q.id];
                                                    const mp = q.maxPoints ?? 10;
                                                    const pct = g != null ? g / mp : null;
                                                    return (
                                                        <tr key={q.id} className="border-b border-gray-100 last:border-0">
                                                            <td className="px-4 py-2 text-gray-700 truncate max-w-[260px]">
                                                                <span className="text-xs font-semibold text-purple-600 mr-1">Q{i + 1}</span>
                                                                {q.text.length > 60 ? q.text.slice(0, 60) + '…' : q.text}
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-semibold whitespace-nowrap">
                                                                {g != null ? (
                                                                    <span className={
                                                                        pct! >= 0.75 ? 'text-green-600'
                                                                        : pct! >= 0.50 ? 'text-amber-600'
                                                                        : 'text-red-600'
                                                                    }>
                                                                        {g} / {mp}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400 font-normal">–</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                        {hasGrades && (
                                            <tfoot className="bg-purple-50 border-t border-purple-200">
                                                <tr>
                                                    <td className="px-4 py-2 font-semibold text-purple-800">Total (projected)</td>
                                                    <td className="px-4 py-2 text-right font-bold text-purple-800">
                                                        {Math.round(totalEarned * 10) / 10} / {totalMax}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            )}

                            {!hasGrades && (
                                <div className="mb-5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                                    AI feedback has not loaded yet — projected grades are unavailable.
                                    You can still submit.
                                </div>
                            )}

                            <p className="text-xs text-gray-400 mb-5">
                                These are AI-projected grades. Your instructor may adjust them during review.
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    disabled={submitting}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-gray-300 cursor-pointer"
                                >
                                    {submitting ? 'Submitting…' : 'Confirm & Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
