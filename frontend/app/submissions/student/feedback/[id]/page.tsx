'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Star,
    Shield,
    GitBranch,
    FileText,
    AlertCircle,
    CheckCircle2,
    Download,
    Clock,
    User,
} from 'lucide-react';
import { useSubmission } from '@/hooks/useSubmissions';
import { useFeedback } from '@/hooks/useFeedback';
import { usePlagiarismReport } from '@/hooks/usePlagiarism';
import AIFeedbackCard from '@/components/submissions/AIFeedbackCard';
import PlagiarismReportCard from '@/components/submissions/PlagiarismReportCard';

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExt(name: string) {
    return name.split('.').pop()?.toUpperCase() ?? 'FILE';
}

function gradeColor(pct: number) {
    if (pct >= 90) return 'text-green-600';
    if (pct >= 80) return 'text-blue-600';
    if (pct >= 70) return 'text-amber-600';
    return 'text-red-600';
}

function gradeBg(pct: number) {
    if (pct >= 90) return 'bg-green-50 border-green-200';
    if (pct >= 80) return 'bg-blue-50 border-blue-200';
    if (pct >= 70) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
}

// ─── Skeleton ─────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="max-w-6xl mx-auto animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-36 mb-4" />
            <div className="h-9 bg-gray-200 rounded w-56 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-80 mb-8" />
            <div className="h-40 bg-gray-100 rounded-lg mb-8" />
            <div className="grid grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-lg" />)}
            </div>
            <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 space-y-6">
                    <div className="h-72 bg-gray-100 rounded-lg" />
                    <div className="h-40 bg-gray-100 rounded-lg" />
                </div>
                <div className="space-y-6">
                    <div className="h-52 bg-gray-100 rounded-lg" />
                    <div className="h-36 bg-gray-100 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const { data: submission, loading: subLoading, error: subError } = useSubmission(id);
    const { data: feedback, loading: fbLoading, error: fbError } = useFeedback(id);
    const { data: report, loading: plLoading, error: plError } = usePlagiarismReport(id);

    if (subLoading && !submission) return <PageSkeleton />;

    const grade = submission?.grade ?? null;
    const totalMarks = submission?.totalMarks ?? 100;
    const gradePct = grade != null ? Math.round((grade / totalMarks) * 100) : null;

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Submissions
                </button>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Submission Feedback</h1>
                {submission && (
                    <p className="text-gray-600">
                        {submission.assignmentTitle ?? 'Assignment'}
                        {submission.moduleName ? ` • ${submission.moduleName}` : ''}
                    </p>
                )}
            </div>

            {/* Error banner */}
            {subError && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-800">Could not load submission data</p>
                        <p className="text-sm text-amber-700 mt-0.5">{subError}</p>
                    </div>
                </div>
            )}

            {/* Grade Card */}
            {grade != null && gradePct != null ? (
                <div className={`rounded-lg shadow-lg p-8 mb-8 border-2 ${gradeBg(gradePct)}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg">
                                <div className="text-center">
                                    <div className={`text-4xl font-bold ${gradeColor(gradePct)}`}>{grade}</div>
                                    <div className="text-sm text-gray-600">/ {totalMarks}</div>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Final Grade</h2>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                    {submission?.submittedAt && (
                                        <span className="flex items-center gap-1">
                                            <Clock size={16} />
                                            Submitted: {formatDate(submission.submittedAt)}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <CheckCircle2 size={16} />
                                        Status: {submission?.status ?? '—'}
                                    </span>
                                    {submission?.currentVersionNumber != null && (
                                        <span className="flex items-center gap-1">
                                            <GitBranch size={16} />
                                            Version {submission.currentVersionNumber}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push(`/submissions/student/version-history/${id}`)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                        >
                            <GitBranch size={18} />
                            View Versions
                        </button>
                    </div>
                </div>
            ) : submission ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 text-center">
                    <Clock size={32} className="mx-auto text-gray-400 mb-3" />
                    <p className="font-semibold text-gray-700">Awaiting Grade</p>
                    <p className="text-sm text-gray-500 mt-1">This submission hasn&#39;t been graded yet.</p>
                </div>
            ) : null}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">AI Quality Score</h3>
                        <Star className="text-purple-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-purple-600">
                        {submission?.aiScore != null ? `${submission.aiScore}/100` : '—'}
                    </p>
                </div>

                <div className={`border-2 rounded-lg p-6 ${
                    (submission?.plagiarismScore ?? 0) < 20
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Plagiarism Score</h3>
                        <Shield
                            className={(submission?.plagiarismScore ?? 0) < 20 ? 'text-green-600' : 'text-red-600'}
                            size={24}
                        />
                    </div>
                    <p className={`text-3xl font-bold ${
                        (submission?.plagiarismScore ?? 0) < 20 ? 'text-green-600' : 'text-red-600'
                    }`}>
                        {submission?.plagiarismScore != null ? `${submission.plagiarismScore}%` : '—'}
                    </p>
                    {submission?.plagiarismScore != null && submission.plagiarismScore < 20 && (
                        <p className="text-xs text-green-700 mt-1">Clean submission</p>
                    )}
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Files Submitted</h3>
                        <FileText className="text-blue-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                        {submission?.files?.length ?? '—'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* AI Feedback */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
                            <Star className="text-purple-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">AI-Generated Feedback</h2>
                        </div>
                        <div className="px-6 pb-6">
                            <AIFeedbackCard
                                feedback={feedback}
                                loading={fbLoading}
                                error={fbError ?? undefined}
                            />
                        </div>
                    </div>

                    {/* Lecturer Feedback */}
                    {submission?.lecturerFeedback && (
                        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                            <div className="flex items-center gap-3 mb-4">
                                <User className="text-blue-600" size={24} />
                                <h2 className="text-xl font-bold text-gray-900">Lecturer Feedback</h2>
                            </div>
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-gray-700 leading-relaxed italic">
                                    &#34;{submission.lecturerFeedback}&#34;
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Plagiarism Report */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
                            <Shield className="text-green-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Plagiarism Report</h2>
                        </div>
                        <div className="px-6 pb-6">
                            <PlagiarismReportCard
                                report={report}
                                loading={plLoading}
                                error={plError ?? undefined}
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Submitted Files */}
                    {submission?.files && submission.files.length > 0 && (
                        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4">Submitted Files</h3>
                            <div className="space-y-3">
                                {submission.files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileText className="text-purple-600 shrink-0" size={20} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {file.originalFileName ?? file.fileName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatBytes(file.fileSize)} • {getFileExt(file.fileName)}
                                                </p>
                                            </div>
                                        </div>
                                        {file.fileUrl && (
                                            <a
                                                href={file.fileUrl}
                                                download
                                                className="text-purple-600 hover:text-purple-700 shrink-0 ml-2"
                                            >
                                                <Download size={18} />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200">
                        <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => router.push(`/submissions/student/version-history/${id}`)}
                                className="w-full px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
                            >
                                View All Versions
                            </button>
                            <button
                                onClick={() => router.push('/submissions/student/submit')}
                                className="w-full px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
                            >
                                Submit New Version
                            </button>
                            <button
                                onClick={() => router.push('/submissions/student/my-submissions')}
                                className="w-full px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
                            >
                                All My Submissions
                            </button>
                        </div>
                    </div>

                    {/* Grade Performance */}
                    {grade != null && gradePct != null && (
                        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4">Your Performance</h3>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Your Score</span>
                                    <span className="text-sm font-bold text-gray-900">{gradePct}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full ${gradeColor(gradePct).replace('text-', 'bg-')}`}
                                        style={{ width: `${Math.min(100, gradePct)}%` }}
                                    />
                                </div>
                                <div className="pt-3 mt-3 border-t border-gray-200">
                                    <p className="text-sm font-medium text-gray-700">
                                        {grade} / {totalMarks} marks
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
