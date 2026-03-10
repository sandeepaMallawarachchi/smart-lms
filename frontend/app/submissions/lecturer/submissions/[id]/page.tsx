'use client';

import React, { use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Award,
    Calendar,
    Clock,
    Edit,
    Eye,
    FileText,
    GitBranch,
    Shield,
    Star,
    User,
} from 'lucide-react';
import { useSubmission } from '@/hooks/useSubmissions';
import { useVersions } from '@/hooks/useVersions';
import {
    PageHeader,
    Skeleton,
    ErrorBanner,
    SectionCard,
    StatCard,
} from '@/components/submissions/lecturer/PageShell';

/* ─── Helpers ──────────────────────────────────────────────── */

function formatDate(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    SUBMITTED:      { label: 'Submitted',      cls: 'bg-blue-100 text-blue-700' },
    PENDING_REVIEW: { label: 'Pending Review',  cls: 'bg-amber-100 text-amber-700' },
    GRADED:         { label: 'Graded',          cls: 'bg-green-100 text-green-700' },
    FLAGGED:        { label: 'Flagged',         cls: 'bg-red-100 text-red-700' },
    LATE:           { label: 'Late',            cls: 'bg-purple-100 text-purple-700' },
    DRAFT:          { label: 'Draft',           cls: 'bg-gray-100 text-gray-600' },
};

/* ─── Page ─────────────────────────────────────────────────── */

export default function LecturerSubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: submission, loading, error, refetch } = useSubmission(id);
    const { data: versions, loading: versionsLoading } = useVersions(id);

    const sortedVersions = useMemo(() => {
        if (!versions) return [];
        return [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
    }, [versions]);

    const badge = STATUS_CFG[submission?.status ?? ''] ?? STATUS_CFG.DRAFT;

    return (
        <div>
            <button
                onClick={() => router.push('/submissions/lecturer/submissions')}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm mb-4 transition-colors cursor-pointer"
            >
                <ArrowLeft size={16} /> Back to Submissions
            </button>

            <PageHeader
                title={submission?.assignmentTitle ?? submission?.title ?? 'Submission Detail'}
                subtitle={submission ? `by ${submission.studentName ?? 'Unknown Student'}` : 'Loading…'}
                icon={FileText}
                iconColor="text-blue-600"
                loading={loading}
                onRefresh={refetch}
                actions={
                    submission && submission.status !== 'GRADED' ? (
                        <button
                            onClick={() => router.push(`/submissions/lecturer/grading/${id}`)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
                        >
                            <Edit size={14} /> Grade
                        </button>
                    ) : undefined
                }
            />

            {error && <ErrorBanner message={error} onRetry={refetch} />}

            {loading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}
                    </div>
                    <Skeleton className="h-40" />
                </div>
            ) : submission ? (
                <div className="space-y-6">
                    {/* Status + Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="p-4 rounded-xl border border-gray-200 bg-white">
                            <div className="text-xs text-gray-500 mb-1">Status</div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                        </div>
                        <StatCard label="Version" value={`v${submission.currentVersionNumber}`} bgClass="bg-blue-50 border-blue-200" textClass="text-blue-700" />
                        <StatCard
                            label="Plagiarism"
                            value={submission.plagiarismScore != null ? `${submission.plagiarismScore}%` : '—'}
                            bgClass={(submission.plagiarismScore ?? 0) >= 20 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}
                            textClass={(submission.plagiarismScore ?? 0) >= 20 ? 'text-red-700' : 'text-green-700'}
                        />
                        <StatCard
                            label="AI Score"
                            value={submission.aiScore != null ? `${submission.aiScore}` : '—'}
                            bgClass="bg-purple-50 border-purple-200"
                            textClass="text-purple-700"
                        />
                        <StatCard
                            label="Grade"
                            value={submission.grade != null ? `${submission.grade}%` : '—'}
                            bgClass={submission.grade != null ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}
                            textClass={submission.grade != null ? 'text-green-700' : 'text-gray-500'}
                        />
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Submission Info */}
                            <SectionCard title="Submission Details" icon={FileText} iconColor="text-blue-600">
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <div>
                                        <dt className="text-gray-500">Student</dt>
                                        <dd className="font-medium text-gray-900 flex items-center gap-1.5 mt-0.5">
                                            <User size={14} className="text-gray-400" />
                                            {submission.studentName ?? 'Unknown Student'}
                                        </dd>
                                    </div>
                                    {submission.studentEmail && (
                                        <div>
                                            <dt className="text-gray-500">Email</dt>
                                            <dd className="font-medium text-gray-900 mt-0.5">{submission.studentEmail}</dd>
                                        </div>
                                    )}
                                    {submission.studentRegistrationId && (
                                        <div>
                                            <dt className="text-gray-500">Registration ID</dt>
                                            <dd className="font-medium text-gray-900 mt-0.5">{submission.studentRegistrationId}</dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-gray-500">Assignment</dt>
                                        <dd className="font-medium text-gray-900 mt-0.5">{submission.assignmentTitle ?? 'Untitled Assignment'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Module</dt>
                                        <dd className="font-medium text-gray-900 mt-0.5">{submission.moduleName ?? submission.moduleCode ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Submitted</dt>
                                        <dd className="font-medium text-gray-900 flex items-center gap-1.5 mt-0.5">
                                            <Calendar size={14} className="text-gray-400" />
                                            {formatDate(submission.submittedAt)}
                                        </dd>
                                    </div>
                                    {submission.dueDate && (
                                        <div>
                                            <dt className="text-gray-500">Due Date</dt>
                                            <dd className={`font-medium mt-0.5 flex items-center gap-1.5 ${submission.isLate ? 'text-red-600' : 'text-gray-900'}`}>
                                                <Clock size={14} className={submission.isLate ? 'text-red-400' : 'text-gray-400'} />
                                                {formatDate(submission.dueDate)}
                                                {submission.isLate && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Late</span>}
                                            </dd>
                                        </div>
                                    )}
                                    {submission.wordCount != null && (
                                        <div>
                                            <dt className="text-gray-500">Word Count</dt>
                                            <dd className="font-medium text-gray-900 mt-0.5">{submission.wordCount.toLocaleString()}</dd>
                                        </div>
                                    )}
                                    {submission.totalMarks != null && (
                                        <div>
                                            <dt className="text-gray-500">Total Marks</dt>
                                            <dd className="font-medium text-gray-900 mt-0.5">{submission.totalMarks}</dd>
                                        </div>
                                    )}
                                </dl>
                                {submission.comments && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Student Comments</p>
                                        <p className="text-sm text-gray-700">{submission.comments}</p>
                                    </div>
                                )}
                                {submission.lecturerFeedback && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Lecturer Feedback</p>
                                        <p className="text-sm text-gray-700">{submission.lecturerFeedback}</p>
                                        {submission.lecturerName && (
                                            <p className="text-xs text-gray-400 mt-1">— {submission.lecturerName}</p>
                                        )}
                                    </div>
                                )}
                            </SectionCard>

                            {/* Files */}
                            {submission.files && submission.files.length > 0 && (
                                <SectionCard title={`Attached Files (${submission.files.length})`} icon={FileText} iconColor="text-purple-600">
                                    <div className="space-y-2">
                                        {submission.files.map((f) => (
                                            <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <FileText size={16} className="text-gray-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{f.originalFileName}</p>
                                                        <p className="text-xs text-gray-500">{(f.fileSize / 1024).toFixed(1)} KB · {f.fileType}</p>
                                                    </div>
                                                </div>
                                                <a
                                                    href={f.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    <Eye size={12} className="inline mr-1" />View
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </SectionCard>
                            )}
                        </div>

                        {/* Right Sidebar: Version History */}
                        <div className="space-y-6">
                            <SectionCard title="Version History" icon={GitBranch} iconColor="text-blue-600">
                                {versionsLoading ? (
                                    <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
                                ) : sortedVersions.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">No version history available</p>
                                ) : (
                                    <div className="space-y-2">
                                        {sortedVersions.map((v) => (
                                            <div key={v.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                                                        <GitBranch size={12} className="text-blue-500" />
                                                        Version {v.versionNumber}
                                                    </span>
                                                    {v.isLate && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Late</span>}
                                                </div>
                                                <p className="text-xs text-gray-500 mb-1.5">{formatDate(v.submittedAt)}</p>
                                                <div className="flex gap-3 text-xs text-gray-500">
                                                    {v.aiScore != null && (
                                                        <span className="flex items-center gap-0.5">
                                                            <Star size={10} className="text-purple-500" /> AI: {v.aiScore}
                                                        </span>
                                                    )}
                                                    {v.plagiarismScore != null && (
                                                        <span className="flex items-center gap-0.5">
                                                            <Shield size={10} className={(v.plagiarismScore ?? 0) >= 20 ? 'text-red-500' : 'text-green-500'} />
                                                            Plag: {v.plagiarismScore}%
                                                        </span>
                                                    )}
                                                    {v.finalGrade != null && (
                                                        <span className="flex items-center gap-0.5">
                                                            <Award size={10} className="text-green-500" /> Grade: {v.finalGrade}%
                                                        </span>
                                                    )}
                                                </div>
                                                {v.commitMessage && (
                                                    <p className="text-xs text-gray-400 mt-1 italic truncate">{v.commitMessage}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>

                            {/* Quick Actions */}
                            <SectionCard title="Actions" icon={Edit} iconColor="text-gray-600">
                                <div className="space-y-2">
                                    {submission.status !== 'GRADED' && (
                                        <button
                                            onClick={() => router.push(`/submissions/lecturer/grading/${id}`)}
                                            className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <Edit size={14} /> Grade Submission
                                        </button>
                                    )}
                                    <button
                                        onClick={() => router.push('/submissions/lecturer/submissions')}
                                        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <ArrowLeft size={14} /> Back to All
                                    </button>
                                </div>
                            </SectionCard>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
