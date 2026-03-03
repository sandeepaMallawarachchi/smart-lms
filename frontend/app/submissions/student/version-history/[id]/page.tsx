'use client';

import React, { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    GitBranch,
    Star,
    TrendingUp,
    Shield,
    AlertCircle,
} from 'lucide-react';
import VersionTimeline from '@/components/submissions/VersionTimeline';
import DiffViewer from '@/components/submissions/DiffViewer';
import { useVersions, useVersionComparison, useDownloadVersion } from '@/hooks/useVersions';
import { useSubmission } from '@/hooks/useSubmissions';

// ─── Skeleton ─────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="max-w-6xl mx-auto animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-36 mb-4" />
            <div className="h-9 bg-gray-200 rounded w-56 mb-8" />
            <div className="grid grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-lg" />)}
            </div>
            <div className="h-96 bg-gray-100 rounded-lg" />
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function VersionHistoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    // Compare state — holds version object IDs (not numbers)
    const [compareAId, setCompareAId] = useState<string | null>(null);
    const [compareBId, setCompareBId] = useState<string | null>(null);

    const { data: submission } = useSubmission(id);
    const { data: versions, loading, error } = useVersions(id);
    const {
        data: comparison,
        loading: compLoading,
        error: compError,
    } = useVersionComparison(compareAId, compareBId);
    const { downloadVersion } = useDownloadVersion();

    // Compute summary stats from versions
    const stats = useMemo(() => {
        if (!versions || versions.length === 0) return null;
        const asc = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
        const first = asc[0];
        const last = asc[asc.length - 1];
        const withPlag = asc.filter(v => v.plagiarismScore != null);
        const avgPlag =
            withPlag.length > 0
                ? Math.round(
                      (withPlag.reduce((acc, v) => acc + (v.plagiarismScore ?? 0), 0) /
                          withPlag.length) *
                          10
                  ) / 10
                : null;
        const aiTrend =
            last.aiScore != null && first.aiScore != null
                ? last.aiScore - first.aiScore
                : null;
        return { total: versions.length, aiTrend, avgPlag };
    }, [versions]);

    // Ascending order for the score progression chart
    const sortedAsc = useMemo(
        () => (versions ? [...versions].sort((a, b) => a.versionNumber - b.versionNumber) : []),
        [versions]
    );

    if (loading && !versions) return <PageSkeleton />;

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
                >
                    <ArrowLeft size={20} />
                    Back to Submissions
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Version History</h1>
                        {submission && (
                            <p className="text-gray-600">
                                {submission.assignmentTitle ?? 'Assignment'}
                                {submission.moduleName ? ` • ${submission.moduleName}` : ''}
                            </p>
                        )}
                    </div>
                    {versions && versions.length > 0 && (
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Latest Version</p>
                            <p className="text-3xl font-bold text-gray-900">
                                v{versions[0].versionNumber}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-800">Could not load version history</p>
                        <p className="text-sm text-amber-700 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Stats grid */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Total Versions</h3>
                            <GitBranch className="text-blue-600" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                    </div>

                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Final Grade</h3>
                            <Star className="text-green-600" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-green-600">
                            {submission?.grade != null ? `${submission.grade}%` : '—'}
                        </p>
                    </div>

                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">AI Score Trend</h3>
                            <TrendingUp className="text-purple-600" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-purple-600">
                            {stats.aiTrend != null
                                ? stats.aiTrend >= 0
                                    ? `+${stats.aiTrend}`
                                    : `${stats.aiTrend}`
                                : '—'}
                        </p>
                        {stats.total > 1 && (
                            <p className="text-xs text-purple-700 mt-1">
                                From v1 to v{stats.total}
                            </p>
                        )}
                    </div>

                    <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Avg. Plagiarism</h3>
                            <Shield className="text-amber-600" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-amber-600">
                            {stats.avgPlag != null ? `${stats.avgPlag}%` : '—'}
                        </p>
                        <p className="text-xs text-amber-700 mt-1">Across all versions</p>
                    </div>
                </div>
            )}

            {/* Version Timeline */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-8">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Submission Timeline</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Select up to 2 versions to compare changes
                    </p>
                </div>
                <div className="p-6">
                    <VersionTimeline
                        versions={versions ?? []}
                        loading={loading}
                        error={error ?? undefined}
                        allowCompare
                        onCompareVersions={(vA, vB) => {
                            // vA and vB are full SubmissionVersion objects — extract .id
                            // for the useVersionComparison hook which expects string IDs.
                            setCompareAId(vA.id);
                            setCompareBId(vB.id);
                        }}
                        onDownload={(versionId) => downloadVersion(versionId)}
                        onViewFiles={() => router.push(`/submissions/student/feedback/${id}`)}
                    />
                </div>
            </div>

            {/* Diff Viewer — shown after user triggers comparison */}
            {compareAId && compareBId && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-8">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Version Comparison</h2>
                    </div>
                    <div className="p-6">
                        {/* Change summary chips */}
                        {comparison && (
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                                    <div className="text-xs text-gray-500 mb-1">Word Count Change</div>
                                    <div className={`text-xl font-bold ${comparison.wordCountChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {comparison.wordCountChange >= 0 ? '+' : ''}{comparison.wordCountChange}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                                    <div className="text-xs text-gray-500 mb-1">AI Score Change</div>
                                    <div className={`text-xl font-bold ${comparison.aiScoreChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {comparison.aiScoreChange >= 0 ? '+' : ''}{comparison.aiScoreChange}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                                    <div className="text-xs text-gray-500 mb-1">Plagiarism Change</div>
                                    <div className={`text-xl font-bold ${comparison.plagiarismChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {comparison.plagiarismChange >= 0 ? '+' : ''}{comparison.plagiarismChange}%
                                    </div>
                                </div>
                            </div>
                        )}

                        <DiffViewer
                            diffs={comparison?.diffs ?? []}
                            versionA={comparison?.versionA}
                            versionB={comparison?.versionB}
                            loading={compLoading}
                            error={compError ?? undefined}
                        />
                    </div>
                </div>
            )}

            {/* Score Progression Chart */}
            {sortedAsc.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Score Progression</h2>
                    <div className="space-y-6">
                        {/* AI Score bars */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">AI Score Progression</span>
                                {sortedAsc.length > 1 && (
                                    <span className="text-sm text-gray-600">
                                        v{sortedAsc[0].versionNumber} → v{sortedAsc[sortedAsc.length - 1].versionNumber}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-end gap-2">
                                {sortedAsc.map((v) => (
                                    <div key={v.id} className="flex-1">
                                        <div className="text-center mb-1">
                                            <span className="text-xs text-gray-500">v{v.versionNumber}</span>
                                        </div>
                                        <div className="h-24 bg-gray-100 rounded-lg relative overflow-hidden">
                                            {v.aiScore != null && (
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 bg-purple-600 transition-all"
                                                    style={{ height: `${v.aiScore}%` }}
                                                />
                                            )}
                                            <div className="absolute inset-0 flex items-end justify-center pb-2">
                                                <span className="text-xs font-bold text-white drop-shadow">
                                                    {v.aiScore ?? '?'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Plagiarism bars */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Plagiarism Score Trend</span>
                                <span className="text-sm text-gray-600">Lower is better</span>
                            </div>
                            <div className="flex items-end gap-2">
                                {sortedAsc.map((v) => (
                                    <div key={v.id} className="flex-1">
                                        <div className="h-16 bg-gray-100 rounded-lg relative overflow-hidden">
                                            {v.plagiarismScore != null && (
                                                <div
                                                    className={`absolute bottom-0 left-0 right-0 transition-all ${
                                                        v.plagiarismScore < 10 ? 'bg-green-600' : 'bg-red-600'
                                                    }`}
                                                    style={{ height: `${Math.min(100, v.plagiarismScore * 5)}%` }}
                                                />
                                            )}
                                            <div className="absolute inset-0 flex items-end justify-center pb-2">
                                                <span className="text-xs font-bold text-white drop-shadow">
                                                    {v.plagiarismScore != null ? `${v.plagiarismScore}%` : '?'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
