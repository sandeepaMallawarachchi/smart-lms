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
import { TextDiffViewer } from '@/components/submissions/TextDiffViewer';
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

    // Helper: derive display metrics from a version's metadata
    const getMetrics = (v: typeof versions extends (infer T)[] | null ? T : never) => {
        type Meta = { totalWordCount?: number; overallGrade?: number; maxGrade?: number; answers?: Array<{ similarityScore?: number | null; projectedGrade?: number; maxPoints?: number }> };
        const m = ((v as { metadata?: unknown }).metadata ?? {}) as Meta;
        const answers = m.answers ?? [];
        const avgPlag = answers.length
            ? answers.reduce((s, a) => s + (a.similarityScore ?? 0), 0) / answers.length
            : 0;
        const totalGot = answers.reduce((s, a) => s + (a.projectedGrade ?? 0), 0);
        const totalMax = answers.reduce((s, a) => s + (a.maxPoints ?? 0), 0);
        // Fall back to metadata-level grade when per-question maxPoints not stored
        const effectiveGot = totalMax > 0 ? totalGot : (m.overallGrade ?? (answers.length > 0 ? 0 : null));
        const effectiveMax = totalMax > 0 ? totalMax : (m.maxGrade ?? null);
        const aiScore = effectiveMax != null && effectiveMax > 0
            ? Math.round(((effectiveGot ?? 0) / effectiveMax) * 100)
            : 0;
        return {
            plagiarismScore: Math.round(avgPlag * 10) / 10,
            aiScore,
            gradeGot: effectiveGot,
            gradeMax: effectiveMax,
        };
    };

    // Compute summary stats from versions
    const stats = useMemo(() => {
        if (!versions || versions.length === 0) return null;
        const asc = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
        const firstM = getMetrics(asc[0]);
        const lastM  = getMetrics(asc[asc.length - 1]);
        const avgPlag = Math.round(
            (asc.reduce((s, v) => s + getMetrics(v).plagiarismScore, 0) / asc.length) * 10
        ) / 10;
        const aiTrend = lastM.aiScore - firstM.aiScore;
        return { total: versions.length, aiTrend, avgPlag };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

                    {(() => {
                        // Use lecturer grade if available, otherwise AI projected grade from latest version
                        const lecturerGrade = submission?.grade != null ? submission.grade : null;
                        const latestVersion = versions && versions.length > 0
                            ? [...versions].sort((a, b) => b.versionNumber - a.versionNumber)[0]
                            : null;
                        const latestM = latestVersion ? getMetrics(latestVersion) : null;
                        const displayLabel = lecturerGrade != null ? `${lecturerGrade} / ${submission?.totalMarks ?? 100}` :
                            latestM?.gradeMax != null
                                ? `${(latestM.gradeGot ?? 0) % 1 === 0 ? (latestM.gradeGot ?? 0).toFixed(0) : (latestM.gradeGot ?? 0).toFixed(1)} / ${latestM.gradeMax % 1 === 0 ? latestM.gradeMax.toFixed(0) : latestM.gradeMax.toFixed(1)}`
                                : '—';
                        const displayPct = lecturerGrade != null
                            ? `${Math.round((lecturerGrade / (submission?.totalMarks ?? 100)) * 100)}%`
                            : latestM?.gradeMax != null && latestM.gradeMax > 0
                                ? `${(Math.round(((latestM.gradeGot ?? 0) / latestM.gradeMax) * 1000) / 10).toFixed(1)}%`
                                : null;
                        return (
                            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-gray-600">
                                        {lecturerGrade != null ? 'Final Grade' : 'AI Projected Grade'}
                                    </h3>
                                    <Star className="text-green-600" size={24} />
                                </div>
                                <p className="text-2xl font-bold text-green-600">{displayLabel}</p>
                                {displayPct && (
                                    <p className="text-sm font-semibold text-green-700 mt-1">{displayPct}</p>
                                )}
                            </div>
                        );
                    })()}

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
            {compareAId && compareBId && (() => {
                const verA = versions?.find((v) => v.id === compareAId);
                const verB = versions?.find((v) => v.id === compareBId);
                // Sort so the older version is always A
                const [sortedA, sortedB] = (verA && verB && verA.versionNumber > verB.versionNumber)
                    ? [verB, verA] : [verA, verB];

                const isTextSnapshot = (v: typeof verA) => {
                    const meta = (v as unknown as { metadata?: Record<string, unknown> })?.metadata;
                    return meta?.['type'] === 'TEXT_SUBMISSION';
                };
                const bothText = sortedA && sortedB && isTextSnapshot(sortedA) && isTextSnapshot(sortedB);

                return (
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-8">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Version Comparison</h2>
                        </div>
                        <div className="p-6">
                            {bothText ? (
                                <TextDiffViewer versionA={sortedA!} versionB={sortedB!} />
                            ) : (
                                <>
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
                                        versionA={comparison?.versionA?.versionNumber}
                                        versionB={comparison?.versionB?.versionNumber}
                                        loading={compLoading}
                                        error={compError ?? undefined}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                );
            })()}

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
                                {sortedAsc.map((v) => {
                                    const m = getMetrics(v);
                                    return (
                                        <div key={v.id} className="flex-1">
                                            <div className="text-center mb-1">
                                                <span className="text-xs text-gray-500">v{v.versionNumber}</span>
                                            </div>
                                            <div className="h-24 bg-gray-100 rounded-lg relative overflow-hidden">
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 bg-purple-600 transition-all"
                                                    style={{ height: `${m.aiScore}%` }}
                                                />
                                                <div className="absolute inset-0 flex items-end justify-center pb-2">
                                                    <span className="text-xs font-bold text-white drop-shadow">
                                                        {m.aiScore}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Plagiarism bars */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Plagiarism Score Trend</span>
                                <span className="text-sm text-gray-600">Lower is better</span>
                            </div>
                            <div className="flex items-end gap-2">
                                {sortedAsc.map((v) => {
                                    const m = getMetrics(v);
                                    return (
                                        <div key={v.id} className="flex-1">
                                            <div className="h-16 bg-gray-100 rounded-lg relative overflow-hidden">
                                                <div
                                                    className={`absolute bottom-0 left-0 right-0 transition-all ${
                                                        m.plagiarismScore < 10 ? 'bg-green-600' : 'bg-red-600'
                                                    }`}
                                                    style={{ height: `${Math.min(100, m.plagiarismScore * 5)}%` }}
                                                />
                                                <div className="absolute inset-0 flex items-end justify-center pb-2">
                                                    <span className="text-xs font-bold text-white drop-shadow">
                                                        {m.plagiarismScore}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
