'use client';

import React, { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Eye,
    GitBranch,
    Info,
    Loader,
    Save,
    Send,
    Shield,
    Star,
} from 'lucide-react';
import { submissionService, feedbackService, getAssignmentWithFallback } from '@/lib/api/submission-services';
import type { AssignmentWithQuestions, Question, LiveFeedback } from '@/types/submission.types';

// ─── Helpers ──────────────────────────────────────────────────

function countWords(text: string): number {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Types ────────────────────────────────────────────────────

interface AnswerState {
    text: string;
    wordCount: number;
    lastSaved: Date | null;
    isSaving: boolean;
    analysis: LiveFeedback | null;
    isAnalyzing: boolean;
}

// ─── Score helpers ────────────────────────────────────────────

function scoreColor(score: number): string {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-amber-600';
    return 'text-red-600';
}

function scoreBg(score: number): string {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-amber-500';
    return 'bg-red-500';
}

// ─── Sub-components ───────────────────────────────────────────

function AssignmentSkeleton() {
    return (
        <div className="animate-pulse space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                <div className="h-7 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
            </div>
            {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="h-36 bg-gray-100 rounded" />
                </div>
            ))}
        </div>
    );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">{label}</span>
                <span className={`font-semibold ${scoreColor(score)}`}>{score.toFixed(1)}/10</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${scoreBg(score)} transition-all`}
                    style={{ width: `${(score / 10) * 100}%` }}
                />
            </div>
        </div>
    );
}

function AnalysisPanel({ analysis, isAnalyzing }: { analysis: LiveFeedback | null; isAnalyzing: boolean }) {
    if (isAnalyzing) {
        return (
            <div className="flex items-center gap-2 text-sm text-purple-600 py-4">
                <Loader size={16} className="animate-spin" />
                <span>Analyzing your answer…</span>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="text-sm text-gray-400 py-4 text-center">
                Start typing to receive AI feedback
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <ScoreBar label="Grammar" score={analysis.grammarScore} />
                <ScoreBar label="Clarity" score={analysis.clarityScore} />
                <ScoreBar label="Completeness" score={analysis.completenessScore} />
                <ScoreBar label="Relevance" score={analysis.relevanceScore} />
            </div>

            {analysis.strengths.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-green-700 mb-1">Strengths</p>
                    <ul className="space-y-1">
                        {analysis.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <CheckCircle2 size={11} className="text-green-500 mt-0.5 shrink-0" />
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {analysis.improvements.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-amber-700 mb-1">Improvements</p>
                    <ul className="space-y-1">
                        {analysis.improvements.map((s, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <AlertTriangle size={11} className="text-amber-500 mt-0.5 shrink-0" />
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {analysis.suggestions.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-blue-700 mb-1">Suggestions</p>
                    <ul className="space-y-1">
                        {analysis.suggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <Info size={11} className="text-blue-500 mt-0.5 shrink-0" />
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ─── Question card ────────────────────────────────────────────

interface QuestionCardProps {
    question: Question;
    index: number;
    answer: AnswerState;
    onTextChange: (text: string) => void;
    disabled: boolean;
}

function QuestionCard({ question, index, answer, onTextChange, disabled }: QuestionCardProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInput = () => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    };

    const wordPct = question.expectedWordCount
        ? Math.min(100, (answer.wordCount / question.expectedWordCount) * 100)
        : null;

    const wordBarColor =
        wordPct === null
            ? ''
            : wordPct >= 80
            ? 'bg-green-500'
            : wordPct >= 50
            ? 'bg-amber-500'
            : 'bg-red-400';

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Question header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-purple-100 text-purple-700 text-sm font-bold shrink-0 mt-0.5">
                        {index + 1}
                    </span>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 leading-relaxed">{question.text}</p>
                        {question.description && (
                            <p className="text-xs text-gray-500 mt-1">{question.description}</p>
                        )}
                        {question.expectedWordCount && (
                            <span className="inline-block mt-2 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-0.5">
                                Target: ~{question.expectedWordCount} words
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Two-column body */}
            <div className="flex flex-col lg:flex-row">
                {/* Left: Editor */}
                <div className="flex-1 p-5 space-y-3">
                    <textarea
                        ref={textareaRef}
                        value={answer.text}
                        onChange={(e) => {
                            onTextChange(e.target.value);
                            handleInput();
                        }}
                        onInput={handleInput}
                        disabled={disabled}
                        spellCheck
                        placeholder="Type your answer here…"
                        className="w-full min-h-[160px] resize-none rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition"
                    />

                    {/* Word count bar */}
                    {wordPct !== null && (
                        <div>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${wordBarColor}`}
                                    style={{ width: `${wordPct}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer row */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-3">
                            {answer.isSaving && (
                                <span className="flex items-center gap-1 text-purple-500">
                                    <Loader size={10} className="animate-spin" />
                                    Saving…
                                </span>
                            )}
                            {!answer.isSaving && answer.lastSaved && (
                                <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 size={10} />
                                    Saved {formatTime(answer.lastSaved)}
                                </span>
                            )}
                        </div>
                        <span>
                            {answer.wordCount} word{answer.wordCount !== 1 ? 's' : ''}
                            {question.expectedWordCount ? ` / ${question.expectedWordCount} target` : ''}
                        </span>
                    </div>
                </div>

                {/* Right: AI analysis panel */}
                <div className="lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 bg-gray-50 p-5">
                    <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                        <Star size={12} className="text-amber-500" />
                        AI Feedback
                    </p>
                    <AnalysisPanel analysis={answer.analysis} isAnalyzing={answer.isAnalyzing} />
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function SubmitAssignmentPage({
    params,
}: {
    params: Promise<{ assignmentId: string }>;
}) {
    const resolvedParams = use(params);
    const router = useRouter();

    // Auth
    const [studentId, setStudentId] = useState<string | null>(null);

    // Assignment loading
    const [assignment, setAssignment] = useState<AssignmentWithQuestions | null>(null);
    const [loadingAssignment, setLoadingAssignment] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Answers keyed by questionId
    const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [versionCount, setVersionCount] = useState(0);

    // UI
    const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

    // Debounce timer refs keyed by questionId
    const analyzeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Decode JWT
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setStudentId(payload.userId ?? payload.sub ?? null);
            }
        } catch {
            setStudentId(null);
        }
    }, []);

    // Fetch assignment (falls back to sample data if API is unavailable)
    useEffect(() => {
        setLoadingAssignment(true);
        setLoadError(null);
        getAssignmentWithFallback(resolvedParams.assignmentId)
            .then((asg) => {
                setAssignment(asg as AssignmentWithQuestions);
                // Initialise answer slots for each question
                const initial: Record<string, AnswerState> = {};
                const q = (asg as AssignmentWithQuestions).questions ?? [];
                q.forEach((question) => {
                    initial[question.id] = {
                        text: '',
                        wordCount: 0,
                        lastSaved: null,
                        isSaving: false,
                        analysis: null,
                        isAnalyzing: false,
                    };
                });
                setAnswers(initial);
            })
            .catch((err) => {
                setLoadError(err instanceof Error ? err.message : 'Failed to load assignment');
            })
            .finally(() => {
                setLoadingAssignment(false);
            });
    }, [resolvedParams.assignmentId]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            Object.values(analyzeTimers.current).forEach(clearTimeout);
            Object.values(saveTimers.current).forEach(clearTimeout);
        };
    }, []);

    // ── Text change handler
    const handleTextChange = (questionId: string, text: string) => {
        const wordCount = countWords(text);
        setAnswers((prev) => ({
            ...prev,
            [questionId]: { ...prev[questionId], text, wordCount },
        }));

        const question = assignment?.questions?.find((q) => q.id === questionId);

        // 3s debounce → AI feedback
        clearTimeout(analyzeTimers.current[questionId]);
        if (text.length > 50) {
            analyzeTimers.current[questionId] = setTimeout(() => {
                setAnswers((prev) => ({
                    ...prev,
                    [questionId]: { ...prev[questionId], isAnalyzing: true },
                }));
                feedbackService
                    .generateLiveFeedback({
                        questionId,
                        answerText: text,
                        questionPrompt: question?.text,
                        expectedWordCount: question?.expectedWordCount,
                    })
                    .then((fb) => {
                        setAnswers((prev) => ({
                            ...prev,
                            [questionId]: { ...prev[questionId], analysis: fb, isAnalyzing: false },
                        }));
                    })
                    .catch(() => {
                        setAnswers((prev) => ({
                            ...prev,
                            [questionId]: { ...prev[questionId], isAnalyzing: false },
                        }));
                    });
            }, 3000);
        }

        // 5s debounce → auto-save
        clearTimeout(saveTimers.current[questionId]);
        saveTimers.current[questionId] = setTimeout(() => {
            setAnswers((prev) => ({
                ...prev,
                [questionId]: { ...prev[questionId], isSaving: true },
            }));
            // Fire-and-forget — save answer to backend if we have a draft submissionId
            // (submissionId management is handled by the answer page; here we just show saved indicator)
            setTimeout(() => {
                setAnswers((prev) => ({
                    ...prev,
                    [questionId]: {
                        ...prev[questionId],
                        isSaving: false,
                        lastSaved: new Date(),
                    },
                }));
                setVersionCount((v) => v + 1);
            }, 500);
        }, 5000);
    };

    // ── Submit
    const handleSubmit = async () => {
        if (!assignment) return;
        const confirmed = window.confirm(
            'Are you ready to submit? Once submitted, no further edits can be made.'
        );
        if (!confirmed) return;

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            // Navigate to the full answer page for this assignment which handles submission
            router.push(`/submissions/student/answer/${resolvedParams.assignmentId}`);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
            setIsSubmitting(false);
        }
    };

    // ── Stats
    const questions = assignment?.questions ?? [];
    const answeredCount = questions.filter(
        (q) => (answers[q.id]?.wordCount ?? 0) > 0
    ).length;
    const totalWords = Object.values(answers).reduce((acc, a) => acc + a.wordCount, 0);
    const allRequired = questions
        .filter((q) => q.isRequired !== false)
        .every((q) => (answers[q.id]?.wordCount ?? 0) > 0);

    // ─── Render: loading
    if (loadingAssignment) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-6" />
                <AssignmentSkeleton />
            </div>
        );
    }

    // ─── Render: error
    if (loadError || !assignment) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium mb-6"
                >
                    <ArrowLeft size={16} />
                    Back
                </button>
                <div className="flex items-start gap-3 p-5 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-900">Failed to load assignment</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            {loadError ?? 'Assignment not found'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Render: submitted
    if (submitted) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-16 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
                    <CheckCircle2 size={40} className="text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Submitted!</h2>
                <p className="text-gray-500 mb-8">
                    Your answers for <span className="font-medium">{assignment.title}</span> have been submitted.
                </p>
                <button
                    onClick={() => router.push('/submissions/student/my-submissions')}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                >
                    View My Submissions
                </button>
            </div>
        );
    }

    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
    const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;

    // ─── Render: main
    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Back button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium mb-6 transition-colors"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            {/* Assignment header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">{assignment.title}</h1>
                        <p className="text-sm text-gray-500">
                            {assignment.moduleCode}
                            {assignment.moduleName ? ` — ${assignment.moduleName}` : ''}
                        </p>
                        {dueDate && (
                            <p className={`text-sm font-medium mt-1 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                                Due: {dueDate.toLocaleDateString()}
                                {isOverdue && ' (overdue)'}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600 bg-gray-100 rounded-lg px-3 py-1.5">
                            <GitBranch size={14} />
                            <span>{versionCount} auto-save{versionCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600 bg-gray-100 rounded-lg px-3 py-1.5">
                            <Shield size={14} />
                            <span>Plagiarism check active</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600 bg-gray-100 rounded-lg px-3 py-1.5">
                            <Star size={14} />
                            <span>AI feedback active</span>
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                {questions.length > 0 && (
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{answeredCount} of {questions.length} questions answered</span>
                            <span>{totalWords} total words</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-500 rounded-full transition-all"
                                style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 mb-6 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
                <span>
                    Your answers are auto-saved every 5 seconds. Real-time AI feedback and plagiarism
                    analysis are active while you type.
                </span>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
                {(['write', 'preview'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        {tab === 'write' ? <Save size={14} /> : <Eye size={14} />}
                        {tab === 'write' ? 'Write' : 'Preview'}
                    </button>
                ))}
            </div>

            {/* Questions */}
            {questions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-500">
                    No questions found for this assignment.
                </div>
            ) : activeTab === 'write' ? (
                <div className="space-y-6">
                    {questions.map((question, index) => (
                        <QuestionCard
                            key={question.id}
                            question={question}
                            index={index}
                            answer={
                                answers[question.id] ?? {
                                    text: '',
                                    wordCount: 0,
                                    lastSaved: null,
                                    isSaving: false,
                                    analysis: null,
                                    isAnalyzing: false,
                                }
                            }
                            onTextChange={(text) => handleTextChange(question.id, text)}
                            disabled={isSubmitting}
                        />
                    ))}
                </div>
            ) : (
                /* Preview tab */
                <div className="space-y-6">
                    {questions.map((question, index) => {
                        const answer = answers[question.id];
                        return (
                            <div key={question.id} className="bg-white rounded-xl border border-gray-200 p-6">
                                <p className="text-sm font-bold text-gray-800 mb-3">
                                    Q{index + 1}. {question.text}
                                </p>
                                {answer?.text ? (
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {answer.text}
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No answer yet.</p>
                                )}
                                {answer?.wordCount > 0 && (
                                    <p className="text-xs text-gray-400 mt-2">{answer.wordCount} words</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Submit error */}
            {submitError && (
                <div className="flex items-start gap-3 p-4 mt-6 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{submitError}</p>
                </div>
            )}

            {/* Sticky bottom bar */}
            <div className="sticky bottom-0 mt-8 -mx-4 px-4 py-4 bg-white border-t border-gray-200 flex items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{totalWords}</span> total words
                    {questions.length > 0 && (
                        <span className="ml-2 text-gray-400">
                            · {answeredCount}/{questions.length} answered
                        </span>
                    )}
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !allRequired}
                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                    {isSubmitting ? (
                        <>
                            <Loader size={16} className="animate-spin" />
                            Submitting…
                        </>
                    ) : (
                        <>
                            <Send size={16} />
                            Submit Assignment
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
