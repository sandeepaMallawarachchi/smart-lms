'use client';

import React, { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Save,
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
    Eye,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { useSubmission, useGradeSubmission } from '@/hooks/useSubmissions';
import { useFeedback } from '@/hooks/useFeedback';
import type { Feedback } from '@/types/submission.types';

// ─── Types for per-question grading ──────────────────────────

interface QuestionAnswer {
    questionId: string;
    subQuestionId?: string;
    text: string;
    wordCount: number;
    aiFeedback: string;
    aiScore: number;
    lecturerFeedback: string;
    lecturerScore?: number;
    maxMarks: number;
}

interface QuestionDef {
    id: string;
    number: number;
    text: string;
    marks: number;
    subQuestions?: {
        id: string;
        letter: string;
        text: string;
        marks: number;
    }[];
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/** Build initial answers from optional AI feedback */
function buildInitialAnswers(
    questions: QuestionDef[],
    feedback: Feedback | null
): Record<string, QuestionAnswer> {
    const result: Record<string, QuestionAnswer> = {};
    const overallFeedback = feedback?.overallAssessment ?? 'AI feedback not yet available.';

    questions.forEach((q) => {
        if (!q.subQuestions) {
            result[q.id] = {
                questionId: q.id,
                text: '',
                wordCount: 0,
                aiFeedback: overallFeedback,
                aiScore: feedback ? 80 : 0,
                lecturerFeedback: '',
                maxMarks: q.marks,
            };
        } else {
            q.subQuestions.forEach((sq) => {
                const key = `${q.id}-${sq.id}`;
                result[key] = {
                    questionId: q.id,
                    subQuestionId: sq.id,
                    text: '',
                    wordCount: 0,
                    aiFeedback: overallFeedback,
                    aiScore: feedback ? 80 : 0,
                    lecturerFeedback: '',
                    maxMarks: sq.marks,
                };
            });
        }
    });
    return result;
}

// ─── Static question definitions (assignment-level data) ──────
// In production these would come from the assignment API.
// For now we use a representative structure that reflects the
// assignment linked to this submission.
const DEFAULT_QUESTIONS: QuestionDef[] = [
    {
        id: 'q1', number: 1,
        text: 'Explain the key concepts covered in this assignment.',
        marks: 25,
    },
    {
        id: 'q2', number: 2,
        text: 'Design and implement the core solution.',
        marks: 35,
        subQuestions: [
            { id: 'q2a', letter: 'a', text: 'Provide a design diagram or outline.', marks: 15 },
            { id: 'q2b', letter: 'b', text: 'Implement and document your solution.', marks: 20 },
        ],
    },
    {
        id: 'q3', number: 3,
        text: 'Evaluate and test your implementation.',
        marks: 25,
    },
    {
        id: 'q4', number: 4,
        text: 'Write a reflection on what you learned.',
        marks: 15,
    },
];

// ─── Sub-components ──────────────────────────────────────────

function FeedbackBlock({
    questionKey,
    answer,
    questionMarks,
    isEditing,
    isGenerating,
    onEdit,
    onSave,
    onCancel,
    onRegenerate,
    tempFeedback,
    setTempFeedback,
    tempScore,
    setTempScore,
}: {
    questionKey: string;
    answer: QuestionAnswer;
    questionMarks: number;
    isEditing: boolean;
    isGenerating: boolean;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onRegenerate: () => void;
    tempFeedback: string;
    setTempFeedback: (v: string) => void;
    tempScore: number | undefined;
    setTempScore: (v: number) => void;
}) {
    const isModified = !!answer.lecturerFeedback;
    const displayFeedback = answer.lecturerFeedback || answer.aiFeedback;
    const displayScore = answer.lecturerScore ?? answer.aiScore;

    if (isEditing) {
        return (
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Feedback:
                    </label>
                    <textarea
                        value={tempFeedback}
                        onChange={e => setTempFeedback(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Enter your feedback..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Score (out of 100):
                    </label>
                    <input
                        type="number"
                        value={tempScore ?? ''}
                        onChange={e => setTempScore(Number(e.target.value))}
                        min={0}
                        max={100}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {tempScore != null && (
                        <p className="text-xs text-gray-500 mt-1">
                            ≈ {Math.round((tempScore / 100) * questionMarks)} / {questionMarks} marks
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onSave}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                    >
                        <Check size={16} /> Save
                    </button>
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                    >
                        <X size={16} /> Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className={`p-4 rounded-lg border-l-4 ${
                isModified ? 'bg-blue-50 border-blue-500' : 'bg-purple-50 border-purple-500'
            }`}>
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {isModified
                            ? <Edit className="text-blue-600" size={18} />
                            : <Sparkles className="text-purple-600" size={18} />
                        }
                        <span className="font-medium text-sm">
                            {isModified ? 'Your Feedback' : 'AI-Generated Feedback'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-gray-900">{displayScore}/100</span>
                        <span className="text-sm text-gray-600">
                            ({Math.round((displayScore / 100) * questionMarks)}/{questionMarks})
                        </span>
                    </div>
                </div>
                <p className="text-sm text-gray-700">{displayFeedback}</p>
            </div>

            <div className="flex gap-2 mt-3">
                <button
                    onClick={onEdit}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                >
                    <Edit size={16} />
                    {isModified ? 'Edit Feedback' : 'Modify AI Feedback'}
                </button>
                {!isModified && (
                    <button
                        onClick={onRegenerate}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                        Regenerate
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function LecturerGradingInterfacePage({
    params,
}: {
    params: Promise<{ submissionId: string }>;
}) {
    const { submissionId } = use(params);
    const router = useRouter();

    // API hooks
    const { data: submission, loading: subLoading } = useSubmission(submissionId);
    const { data: feedback, loading: fbLoading } = useFeedback(submissionId);
    const {
        loading: grading,
        error: gradeError,
        success: gradeSuccess,
        gradeSubmission,
    } = useGradeSubmission();

    // Local grading state
    const [answers, setAnswers]             = useState<Record<string, QuestionAnswer>>({});
    const [editingKey, setEditingKey]       = useState<string | null>(null);
    const [tempFeedback, setTempFeedback]   = useState('');
    const [tempScore, setTempScore]         = useState<number | undefined>();
    const [overallComment, setOverallComment] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [showAnswers, setShowAnswers]     = useState(true);
    const [submitted, setSubmitted]         = useState(false);

    // Build initial answers once feedback loads
    useEffect(() => {
        if (!fbLoading) {
            setAnswers(buildInitialAnswers(DEFAULT_QUESTIONS, feedback));
        }
    }, [feedback, fbLoading]);

    // Show AI overall assessment in overall comment when feedback arrives
    useEffect(() => {
        if (feedback?.overallAssessment && !overallComment) {
            setOverallComment(feedback.overallAssessment);
        }
    }, [feedback]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Handlers ────────────────────────────────────────────

    const handleEditFeedback = (key: string) => {
        setEditingKey(key);
        setTempFeedback(answers[key]?.lecturerFeedback || answers[key]?.aiFeedback || '');
        setTempScore(answers[key]?.lecturerScore ?? answers[key]?.aiScore);
    };

    const handleSaveFeedback = (key: string) => {
        setAnswers(prev => ({
            ...prev,
            [key]: { ...prev[key], lecturerFeedback: tempFeedback, lecturerScore: tempScore },
        }));
        setEditingKey(null);
    };

    const handleRegenerate = async (key: string) => {
        setIsGeneratingAI(true);
        await new Promise(r => setTimeout(r, 1500));
        setAnswers(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                aiFeedback: feedback?.overallAssessment ?? 'Regenerated AI feedback.',
            },
        }));
        setIsGeneratingAI(false);
    };

    const calculateGrade = () => {
        let scored = 0;
        let maxTotal = 0;
        Object.values(answers).forEach(a => {
            const pct = (a.lecturerScore ?? a.aiScore) / 100;
            scored += a.maxMarks * pct;
            maxTotal += a.maxMarks;
        });
        const percentage = maxTotal > 0 ? Math.round((scored / maxTotal) * 100) : 0;
        return { scored: Math.round(scored * 10) / 10, total: maxTotal, percentage };
    };

    const handleSubmitGrade = async () => {
        if (!confirm('Submit this grade? The student will be notified.')) return;

        const grade = calculateGrade();
        const questionScores = Object.fromEntries(
            Object.entries(answers).map(([k, a]) => [k, a.lecturerScore ?? a.aiScore])
        );

        const result = await gradeSubmission(submissionId, {
            grade: grade.percentage,
            lecturerFeedback: overallComment,
            questionScores,
        });

        if (result) {
            setSubmitted(true);
            router.push('/submissions/lecturer/submissions');
        }
    };

    const grade = calculateGrade();

    // ── Loading skeleton ─────────────────────────────────────
    if (subLoading && !submission) {
        return (
            <div className="max-w-7xl mx-auto animate-pulse space-y-6">
                <div className="h-6 bg-gray-200 rounded w-36" />
                <div className="h-32 bg-gray-100 rounded-lg" />
                <div className="h-64 bg-gray-100 rounded-lg" />
                <div className="h-64 bg-gray-100 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Submissions
                </button>

                {/* Submission info card */}
                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="text-blue-600" size={32} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {submission?.studentId ?? submissionId}
                                </h1>
                                <p className="text-gray-600">
                                    {submission?.assignmentTitle ?? 'Assignment'}
                                    {submission?.moduleCode ? ` • ${submission.moduleCode}` : ''}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{grade.percentage}%</div>
                            <div className="text-sm text-gray-600">{grade.scored}/{grade.total} marks</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="text-blue-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Submitted</div>
                                <div className="font-medium text-sm">
                                    {formatDate(submission?.submittedAt)}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <GitBranch className="text-purple-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Version</div>
                                <div className="font-medium text-sm">
                                    {submission?.currentVersionNumber ?? '—'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Shield className="text-green-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Plagiarism</div>
                                <div className="font-medium text-sm">
                                    {submission?.plagiarismScore != null
                                        ? `${submission.plagiarismScore}%`
                                        : '—'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Star className="text-amber-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">AI Score</div>
                                <div className="font-medium text-sm">
                                    {submission?.aiScore != null ? `${submission.aiScore}/100` : '—'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grading error / success */}
            {gradeError && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-800">Grade submission failed</p>
                        <p className="text-sm text-red-700 mt-0.5">{gradeError}</p>
                    </div>
                </div>
            )}
            {gradeSuccess && !submitted && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
                    <p className="font-medium text-green-800">Grade submitted successfully!</p>
                </div>
            )}

            {/* AI Feedback banner (overall) */}
            {feedback && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="text-purple-600" size={20} />
                        <span className="font-semibold text-purple-800">AI Overall Assessment</span>
                        {fbLoading && <RefreshCw size={14} className="text-purple-500 animate-spin ml-1" />}
                    </div>
                    {feedback.overallAssessment && (
                        <p className="text-sm text-purple-700 mb-3">{feedback.overallAssessment}</p>
                    )}
                    {feedback.strengths && feedback.strengths.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs font-semibold text-purple-700 mb-1">Strengths:</p>
                            <ul className="space-y-1">
                                {feedback.strengths.slice(0, 3).map((s, i) => (
                                    <li key={i} className="text-xs text-purple-600 flex items-start gap-1">
                                        <span className="mt-0.5">•</span>{s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Toggle answers */}
            <div className="mb-4 flex justify-end">
                <button
                    onClick={() => setShowAnswers(!showAnswers)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                    <Eye size={18} />
                    {showAnswers ? 'Hide' : 'Show'} Submitted Files
                </button>
            </div>

            {/* Questions & grading */}
            <div className="space-y-6">
                {DEFAULT_QUESTIONS.map((question) => {
                    if (!question.subQuestions) {
                        const key = question.id;
                        const answer = answers[key];
                        if (!answer) return null;

                        return (
                            <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                                            Question {question.number}
                                        </h3>
                                        <p className="text-gray-700">{question.text}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium ml-4 shrink-0">
                                        {question.marks} marks
                                    </span>
                                </div>

                                {/* Student files reference */}
                                {showAnswers && submission?.files && submission.files.length > 0 && (
                                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                                            <FileText size={14} />
                                            Submitted Files
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {submission.files.map(f => (
                                                <span
                                                    key={f.id}
                                                    className="text-xs px-2 py-1 bg-white border border-gray-200 rounded text-gray-700"
                                                >
                                                    {f.originalFileName ?? f.fileName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <FeedbackBlock
                                    questionKey={key}
                                    answer={answer}
                                    questionMarks={question.marks}
                                    isEditing={editingKey === key}
                                    isGenerating={isGeneratingAI}
                                    onEdit={() => handleEditFeedback(key)}
                                    onSave={() => handleSaveFeedback(key)}
                                    onCancel={() => setEditingKey(null)}
                                    onRegenerate={() => handleRegenerate(key)}
                                    tempFeedback={tempFeedback}
                                    setTempFeedback={setTempFeedback}
                                    tempScore={tempScore}
                                    setTempScore={setTempScore}
                                />
                            </div>
                        );
                    }

                    // Question with sub-questions
                    return (
                        <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                                        Question {question.number}
                                    </h3>
                                    <p className="text-gray-700">{question.text}</p>
                                </div>
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium ml-4 shrink-0">
                                    {question.marks} marks
                                </span>
                            </div>

                            <div className="space-y-6">
                                {question.subQuestions?.map((sq) => {
                                    const key = `${question.id}-${sq.id}`;
                                    const answer = answers[key];
                                    if (!answer) return null;

                                    return (
                                        <div key={sq.id} className="pl-6 border-l-2 border-gray-200">
                                            <div className="flex items-start justify-between mb-3">
                                                <h4 className="font-semibold text-gray-900">
                                                    ({sq.letter}) {sq.text}
                                                </h4>
                                                <span className="ml-4 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium whitespace-nowrap">
                                                    {sq.marks} marks
                                                </span>
                                            </div>

                                            <FeedbackBlock
                                                questionKey={key}
                                                answer={answer}
                                                questionMarks={sq.marks}
                                                isEditing={editingKey === key}
                                                isGenerating={isGeneratingAI}
                                                onEdit={() => handleEditFeedback(key)}
                                                onSave={() => handleSaveFeedback(key)}
                                                onCancel={() => setEditingKey(null)}
                                                onRegenerate={() => handleRegenerate(key)}
                                                tempFeedback={tempFeedback}
                                                setTempFeedback={setTempFeedback}
                                                tempScore={tempScore}
                                                setTempScore={setTempScore}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Overall Comment */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Overall Comment</h3>
                    <textarea
                        value={overallComment}
                        onChange={e => setOverallComment(e.target.value)}
                        rows={4}
                        placeholder="Add an overall comment for the student..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Grade Summary */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold mb-1">Final Grade</h3>
                            <p className="text-blue-100">{grade.scored} out of {grade.total} marks</p>
                        </div>
                        <div className="text-right">
                            <div className="text-5xl font-bold">{grade.percentage}%</div>
                            <p className="text-blue-100 mt-1">
                                {grade.percentage >= 90 ? 'A+' :
                                 grade.percentage >= 80 ? 'A'  :
                                 grade.percentage >= 70 ? 'B'  :
                                 grade.percentage >= 60 ? 'C'  :
                                 grade.percentage >= 50 ? 'D'  : 'F'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Action Bar */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 mt-8 shadow-lg rounded-t-lg">
                <div className="flex gap-4 max-w-7xl mx-auto">
                    <button
                        onClick={() => router.back()}
                        disabled={grading}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        Save as Draft
                    </button>
                    <button
                        onClick={handleSubmitGrade}
                        disabled={grading}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {grading ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                Submitting…
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                Submit Grade &amp; Notify Student
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
