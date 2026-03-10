'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    GitBranch,
    Clock,
    Shield,
    Star,
    Eye,
    CheckCircle2,
    Award,
    Calendar,
    TrendingUp,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { useSubmission } from '@/hooks/useSubmissions';
import { useVersions, useVersion } from '@/hooks/useVersions';
import type { VersionAnswer, VersionPlagiarismSource } from '@/types/submission.types';

export default function SubmissionDetailPage({ params }: { params: Promise<{ submissionId: string }> }) {
    const resolvedParams = use(params);
    const submissionId = resolvedParams.submissionId;
    const router = useRouter();
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [showAnswers, setShowAnswers] = useState(false);

    const { data: submission, loading: subLoading, error: subError } = useSubmission(submissionId);
    const { data: versions, loading: verLoading, error: verError } = useVersions(submissionId);
    const { data: selectedVersionDetail, loading: verDetailLoading } = useVersion(submissionId, selectedVersionId);

    // Auto-select latest version when versions load
    useEffect(() => {
        if (versions && versions.length > 0 && !selectedVersionId) {
            setSelectedVersionId(versions[0].id); // sorted newest-first
        }
    }, [versions, selectedVersionId]);

    const loading = subLoading || verLoading;
    const error = subError || verError;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-purple-600" size={40} />
            </div>
        );
    }

    if (error || !submission) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="text-red-500" size={40} />
                <p className="text-red-600 font-medium">{error || 'Submission not found'}</p>
                <button onClick={() => router.back()} className="text-purple-600 hover:underline">Go back</button>
            </div>
        );
    }

    const currentVersion = selectedVersionDetail;
    const versionList = versions || [];

    // Build timeline with improvement deltas (chronological, then reversed for display)
    const getVersionTimeline = () => {
        const chronological = [...versionList].reverse(); // oldest-first
        return chronological.map((v, index) => ({
            ...v,
            improvement:
                index > 0 && v.aiScore != null && chronological[index - 1].aiScore != null
                    ? (v.aiScore ?? 0) - (chronological[index - 1].aiScore ?? 0)
                    : 0,
        }));
    };

    // Status badge config
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        SUBMITTED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Submitted' },
        GRADED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Graded' },
        DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
        LATE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Late' },
        PENDING_REVIEW: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Review' },
        FLAGGED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Flagged' },
    };
    const badge = statusConfig[submission.status] || statusConfig.SUBMITTED;

    // Collect all plagiarism sources from every answer in the current version
    const allPlagiarismSources: VersionPlagiarismSource[] =
        currentVersion?.answers?.flatMap((a) => a.plagiarismSources || []) ?? [];

    // Compute per-answer AI score as average of 4 sub-scores
    const computeAnswerAiScore = (a: VersionAnswer): number | null => {
        const scores = [a.grammarScore, a.clarityScore, a.completenessScore, a.relevanceScore].filter(
            (s): s is number => s != null,
        );
        if (scores.length === 0) return null;
        return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
    };

    // Format AI feedback from strengths / improvements / suggestions arrays
    const formatAiFeedback = (a: VersionAnswer): string | null => {
        const parts: string[] = [];
        if (a.strengths?.length) parts.push(`Strengths: ${a.strengths.join(', ')}`);
        if (a.improvements?.length) parts.push(`Areas for improvement: ${a.improvements.join(', ')}`);
        if (a.suggestions?.length) parts.push(`Suggestions: ${a.suggestions.join(', ')}`);
        return parts.length > 0 ? parts.join('. ') : null;
    };

    // Plagiarism label & styling (uses full class names for Tailwind JIT)
    const getPlagiarismConfig = (score: number) => {
        if (score < 20)
            return {
                label: 'Excellent Originality',
                desc: 'Your work shows high originality',
                bg: 'bg-green-50',
                border: 'border-green-200',
                circleBg: 'bg-green-100',
                circleText: 'text-green-600',
                titleText: 'text-green-900',
                descText: 'text-green-700',
                barBg: 'bg-green-200',
                barFill: 'bg-green-600',
            };
        if (score < 50)
            return {
                label: 'Moderate Similarity',
                desc: 'Some similarities detected',
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                circleBg: 'bg-amber-100',
                circleText: 'text-amber-600',
                titleText: 'text-amber-900',
                descText: 'text-amber-700',
                barBg: 'bg-amber-200',
                barFill: 'bg-amber-600',
            };
        return {
            label: 'High Similarity',
            desc: 'Significant similarities found',
            bg: 'bg-red-50',
            border: 'border-red-200',
            circleBg: 'bg-red-100',
            circleText: 'text-red-600',
            titleText: 'text-red-900',
            descText: 'text-red-700',
            barBg: 'bg-red-200',
            barFill: 'bg-red-600',
        };
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to My Submissions
                </button>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {submission.assignmentTitle || submission.title || 'Untitled Submission'}
                            </h1>
                            <p className="text-gray-600">
                                {submission.moduleCode}
                                {submission.moduleName ? ` • ${submission.moduleName}` : ''}
                            </p>
                        </div>
                        <div className="text-right">
                            <span
                                className={`inline-flex items-center gap-2 px-4 py-2 ${badge.bg} ${badge.text} rounded-full font-medium`}
                            >
                                <CheckCircle2 size={18} />
                                {badge.label}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Award className="text-purple-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Total Marks</div>
                                <div className="font-bold">{submission.totalMarks ?? '—'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <GitBranch className="text-blue-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Total Versions</div>
                                <div className="font-bold">{submission.totalVersions}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="text-green-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Submitted</div>
                                <div className="font-bold text-sm">
                                    {submission.submittedAt
                                        ? new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : '—'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="text-amber-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Due Date</div>
                                <div className="font-bold text-sm">
                                    {submission.dueDate
                                        ? new Date(submission.dueDate).toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : '—'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {versionList.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                    No versions found for this submission.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Version Timeline */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <GitBranch className="text-purple-600" size={24} />
                                Version Timeline
                            </h2>

                            <div className="space-y-3">
                                {getVersionTimeline()
                                    .reverse()
                                    .map((version) => (
                                        <div
                                            key={version.id}
                                            onClick={() => setSelectedVersionId(version.id)}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                selectedVersionId === version.id
                                                    ? 'border-purple-500 bg-purple-50 shadow-md'
                                                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900">
                                                        Version {version.versionNumber}
                                                    </span>
                                                    {version.versionNumber === versionList[0]?.versionNumber && (
                                                        <CheckCircle2 className="text-green-600" size={16} />
                                                    )}
                                                </div>
                                                {version.improvement > 0 && (
                                                    <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                        <TrendingUp size={14} />
                                                        +{version.improvement}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-xs text-gray-500 mb-3">
                                                {new Date(version.submittedAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="text-center p-2 bg-purple-50 rounded">
                                                    <div className="text-xs text-gray-600">AI Score</div>
                                                    <div className="text-sm font-bold text-purple-600">
                                                        {version.aiScore ?? '—'}
                                                    </div>
                                                </div>
                                                <div
                                                    className={`text-center p-2 rounded ${
                                                        (version.plagiarismScore ?? 0) < 20
                                                            ? 'bg-green-50'
                                                            : 'bg-red-50'
                                                    }`}
                                                >
                                                    <div className="text-xs text-gray-600">Plagiarism</div>
                                                    <div
                                                        className={`text-sm font-bold ${
                                                            (version.plagiarismScore ?? 0) < 20
                                                                ? 'text-green-600'
                                                                : 'text-red-600'
                                                        }`}
                                                    >
                                                        {version.plagiarismScore != null
                                                            ? `${version.plagiarismScore}%`
                                                            : '—'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-2 text-xs text-gray-600">
                                                {version.totalWordCount ?? 0} words
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Version Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {verDetailLoading ? (
                            <div className="flex items-center justify-center min-h-[200px]">
                                <Loader2 className="animate-spin text-purple-600" size={32} />
                            </div>
                        ) : currentVersion ? (
                            <>
                                {/* Version Stats */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-gray-900">
                                            Version {currentVersion.versionNumber} Details
                                        </h2>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="text-xs text-gray-600 mb-1">Word Count</div>
                                            <div className="text-2xl font-bold text-gray-900">
                                                {currentVersion.totalWordCount ?? 0}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                            <div className="text-xs text-gray-600 mb-1">AI Score</div>
                                            <div className="text-2xl font-bold text-purple-600">
                                                {currentVersion.aiScore != null
                                                    ? `${currentVersion.aiScore}/100`
                                                    : '—'}
                                            </div>
                                        </div>
                                        <div
                                            className={`p-4 rounded-lg border ${
                                                (currentVersion.plagiarismScore ?? 0) < 20
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-red-50 border-red-200'
                                            }`}
                                        >
                                            <div className="text-xs text-gray-600 mb-1">Plagiarism</div>
                                            <div
                                                className={`text-2xl font-bold ${
                                                    (currentVersion.plagiarismScore ?? 0) < 20
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                }`}
                                            >
                                                {currentVersion.plagiarismScore != null
                                                    ? `${currentVersion.plagiarismScore}%`
                                                    : '—'}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <div className="text-xs text-gray-600 mb-1">AI Grade</div>
                                            <div className="text-lg font-bold text-blue-600">
                                                {currentVersion.aiGrade != null ? currentVersion.aiGrade : '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Overall AI Score Summary */}
                                    {currentVersion.aiScore != null && (
                                        <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                                            <div className="flex items-start gap-3">
                                                <Star className="text-purple-600 mt-0.5" size={24} />
                                                <div>
                                                    <p className="font-medium text-purple-900 mb-1">
                                                        AI Assessment Summary
                                                    </p>
                                                    <p className="text-sm text-purple-800">
                                                        Overall AI score: {currentVersion.aiScore}/100
                                                        {currentVersion.aiGrade != null &&
                                                            ` · AI Grade: ${currentVersion.aiGrade}`}
                                                        {currentVersion.finalGrade != null &&
                                                            ` · Final Grade: ${currentVersion.finalGrade}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Question-by-Question Analysis */}
                                {currentVersion.answers && currentVersion.answers.length > 0 && (
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-xl font-bold text-gray-900">
                                                Question-by-Question Analysis
                                            </h2>
                                            <button
                                                onClick={() => setShowAnswers(!showAnswers)}
                                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                            >
                                                <Eye size={16} />
                                                {showAnswers ? 'Hide' : 'Show'} Answers
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            {currentVersion.answers.map((answer, index) => {
                                                const answerAiScore = computeAnswerAiScore(answer);
                                                const feedback = formatAiFeedback(answer);

                                                return (
                                                    <div
                                                        key={answer.id}
                                                        className="pb-6 border-b border-gray-200 last:border-0"
                                                    >
                                                        <h3 className="font-bold text-gray-900 mb-1">
                                                            Question {index + 1}
                                                        </h3>
                                                        {answer.questionText && (
                                                            <p className="text-sm text-gray-500 mb-4">
                                                                {answer.questionText}
                                                            </p>
                                                        )}

                                                        {/* Answer Stats */}
                                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                                            <div className="p-3 bg-gray-50 rounded border border-gray-200">
                                                                <div className="text-xs text-gray-600">Words</div>
                                                                <div className="text-lg font-bold text-gray-900">
                                                                    {answer.wordCount ?? 0}
                                                                </div>
                                                            </div>
                                                            <div className="p-3 bg-purple-50 rounded border border-purple-200">
                                                                <div className="text-xs text-gray-600">AI Score</div>
                                                                <div className="text-lg font-bold text-purple-600">
                                                                    {answerAiScore != null
                                                                        ? `${answerAiScore}/100`
                                                                        : '—'}
                                                                </div>
                                                            </div>
                                                            <div
                                                                className={`p-3 rounded border ${
                                                                    (answer.similarityScore ?? 0) < 20
                                                                        ? 'bg-green-50 border-green-200'
                                                                        : 'bg-red-50 border-red-200'
                                                                }`}
                                                            >
                                                                <div className="text-xs text-gray-600">
                                                                    Plagiarism
                                                                </div>
                                                                <div
                                                                    className={`text-lg font-bold ${
                                                                        (answer.similarityScore ?? 0) < 20
                                                                            ? 'text-green-600'
                                                                            : 'text-red-600'
                                                                    }`}
                                                                >
                                                                    {answer.similarityScore != null
                                                                        ? `${answer.similarityScore}%`
                                                                        : '—'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Answer Text */}
                                                        {showAnswers && answer.answerText && (
                                                            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                                    {answer.answerText}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* AI Feedback */}
                                                        {feedback && (
                                                            <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                                                                <div className="flex items-start gap-3">
                                                                    <Star
                                                                        className="text-blue-600 mt-0.5"
                                                                        size={20}
                                                                    />
                                                                    <div>
                                                                        <p className="font-medium text-blue-900 mb-1">
                                                                            AI Feedback:
                                                                        </p>
                                                                        <p className="text-sm text-blue-800">
                                                                            {feedback}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Plagiarism Report */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Shield className="text-green-600" size={24} />
                                        Plagiarism Report
                                    </h2>

                                    <div className="space-y-4">
                                        {(() => {
                                            const score = currentVersion.plagiarismScore ?? 0;
                                            const pc = getPlagiarismConfig(score);
                                            return (
                                                <div className={`p-4 ${pc.bg} ${pc.border} border rounded-lg`}>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div
                                                            className={`w-16 h-16 rounded-full ${pc.circleBg} flex items-center justify-center`}
                                                        >
                                                            <span
                                                                className={`text-2xl font-bold ${pc.circleText}`}
                                                            >
                                                                {score}%
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className={`font-bold ${pc.titleText}`}>
                                                                {pc.label}
                                                            </p>
                                                            <p className={`text-sm ${pc.descText}`}>{pc.desc}</p>
                                                        </div>
                                                    </div>

                                                    <div className={`w-full ${pc.barBg} rounded-full h-3`}>
                                                        <div
                                                            className={`${pc.barFill} h-3 rounded-full`}
                                                            style={{ width: `${score}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <div className="text-xs text-gray-600 mb-1">Matches Found</div>
                                            <div className="text-xl font-bold text-gray-900">
                                                {allPlagiarismSources.length}
                                            </div>
                                        </div>

                                        {allPlagiarismSources.length > 0 && (
                                            <div>
                                                <p className="font-medium text-gray-900 mb-3">Detected Matches:</p>
                                                <div className="space-y-2">
                                                    {allPlagiarismSources.map((source) => (
                                                        <div
                                                            key={source.id}
                                                            className="p-3 bg-amber-50 border border-amber-200 rounded"
                                                        >
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-sm font-medium text-amber-900">
                                                                    {source.sourceTitle || source.sourceUrl}
                                                                </span>
                                                                <span className="text-sm font-bold text-amber-700">
                                                                    {source.similarityPercentage}%
                                                                </span>
                                                            </div>
                                                            {source.sourceSnippet && (
                                                                <p className="text-xs text-amber-700">
                                                                    {source.sourceSnippet}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() =>
                                            router.push(`/submissions/student/versions/${submissionId}`)
                                        }
                                        className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                                    >
                                        <GitBranch size={18} />
                                        Compare Versions
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                                Select a version to view details.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
