'use client';

import React, { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, GitBranch, Star, TrendingUp, Shield, AlertCircle,
    Clock, CheckCircle2, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useVersions } from '@/hooks/useVersions';
import { useSubmission } from '@/hooks/useSubmissions';
import type { SubmissionVersion, VersionAnswer } from '@/types/submission.types';

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
}

function severityColor(s?: string | null) {
    if (s === 'HIGH')   return 'text-red-600 bg-red-50 border-red-200';
    if (s === 'MEDIUM') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-green-600 bg-green-50 border-green-200';
}

function scoreBar(value?: number | null, max = 10) {
    const pct = value != null ? Math.round((value / max) * 100) : 0;
    const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-gray-600 w-8 text-right">
                {value != null ? value.toFixed(1) : '—'}
            </span>
        </div>
    );
}

// ─── VersionCard ──────────────────────────────────────────────

function VersionCard({
    version,
    isLatest,
    onViewReport,
}: {
    version: SubmissionVersion;
    isLatest: boolean;
    onViewReport: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const answers: VersionAnswer[] = version.answers ?? [];

    const plagColor = (score?: number | null) => {
        if (!score || score < 20) return 'text-green-600';
        if (score < 50) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div className={`bg-white border rounded-lg overflow-hidden ${isLatest ? 'border-purple-300 shadow-md' : 'border-gray-200'}`}>
            {/* Header row */}
            <div className="p-5 flex flex-wrap items-center gap-4">
                {/* Version badge */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${isLatest ? 'bg-purple-600' : 'bg-gray-400'}`}>
                    <span className="text-white font-bold text-sm">v{version.versionNumber}</span>
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{version.commitMessage ?? `Version ${version.versionNumber}`}</span>
                        {isLatest && (
                            <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Latest</span>
                        )}
                        {version.isLate && (
                            <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Late</span>
                        )}
                        {version.hasLecturerOverride && (
                            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Lecturer Graded</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>Submitted {formatDate(version.submittedAt)}</span>
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex gap-6 text-center shrink-0">
                    <div>
                        <div className="text-xs text-gray-500 mb-0.5">AI Score</div>
                        <div className="text-lg font-bold text-purple-600">
                            {version.aiScore != null ? `${version.aiScore.toFixed(0)}%` : '—'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 mb-0.5">Plagiarism</div>
                        <div className={`text-lg font-bold ${plagColor(version.plagiarismScore)}`}>
                            {version.plagiarismScore != null ? `${version.plagiarismScore.toFixed(0)}%` : '—'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 mb-0.5">Final Grade</div>
                        <div className="text-lg font-bold text-blue-600">
                            {version.finalGrade != null
                                ? `${version.finalGrade}${version.maxGrade ? ` / ${version.maxGrade}` : ''}`
                                : '—'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 mb-0.5">Words</div>
                        <div className="text-lg font-bold text-gray-700">
                            {version.totalWordCount ?? '—'}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={onViewReport}
                        className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
                    >
                        View Report
                    </button>
                    {answers.length > 0 && (
                        <button
                            onClick={() => setExpanded(e => !e)}
                            className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            Answers
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded answer summary */}
            {expanded && answers.length > 0 && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {answers.map((a, i) => (
                        <div key={a.questionId} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-700 mb-1">
                                        Q{i + 1}. {a.questionText ?? `Question ${i + 1}`}
                                    </p>
                                    <p className="text-xs text-gray-500 line-clamp-2">{a.answerText ?? '(no answer)'}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
                                    <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${severityColor(a.plagiarismSeverity)}`}>
                                        {a.plagiarismSeverity ?? 'N/A'}
                                    </span>
                                    <span className="text-gray-500">{a.wordCount ?? 0} words</span>
                                </div>
                            </div>

                            {/* AI scores */}
                            {(a.grammarScore != null || a.clarityScore != null) && (
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                                    <div>Grammar {scoreBar(a.grammarScore)}</div>
                                    <div>Clarity {scoreBar(a.clarityScore)}</div>
                                    <div>Completeness {scoreBar(a.completenessScore)}</div>
                                    <div>Relevance {scoreBar(a.relevanceScore)}</div>
                                </div>
                            )}

                            {/* Marks row */}
                            <div className="flex items-center gap-4 mt-2 text-xs">
                                {a.aiGeneratedMark != null && (
                                    <span className="text-purple-600 font-semibold">
                                        AI Mark: {a.aiGeneratedMark.toFixed(1)} / 10
                                    </span>
                                )}
                                {a.lecturerMark != null && (
                                    <span className="text-blue-600 font-semibold">
                                        Lecturer Mark: {a.lecturerMark.toFixed(1)} / 10
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="max-w-5xl mx-auto animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-36 mb-4" />
            <div className="h-9 bg-gray-200 rounded w-56 mb-8" />
            <div className="grid grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-lg" />)}
            </div>
            <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-lg" />)}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function VersionHistoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const { data: submission } = useSubmission(id);
    const { data: versions, loading, error } = useVersions(id);

    // Ascending order for progression chart
    const sortedAsc = useMemo(
        () => (versions ? [...versions].sort((a, b) => a.versionNumber - b.versionNumber) : []),
        [versions]
    );

    const stats = useMemo(() => {
        if (!sortedAsc.length) return null;
        const first = sortedAsc[0];
        const last  = sortedAsc[sortedAsc.length - 1];
        const aiTrend = ((last.aiScore ?? 0) - (first.aiScore ?? 0));
        const avgPlag = Math.round(
            (sortedAsc.reduce((s, v) => s + (v.plagiarismScore ?? 0), 0) / sortedAsc.length) * 10
        ) / 10;
        return { total: sortedAsc.length, aiTrend, avgPlag };
    }, [sortedAsc]);

    if (loading && !versions) return <PageSkeleton />;

    return (
        <div className="max-w-5xl mx-auto">
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
                            <p className="text-sm text-gray-500">Latest Version</p>
                            <p className="text-3xl font-bold text-purple-600">v{versions[0].versionNumber}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-800">Could not load version history</p>
                        <p className="text-sm text-red-700 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Stats grid */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">Total Versions</span>
                            <GitBranch size={20} className="text-blue-600" />
                        </div>
                        <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                    </div>

                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">Final Grade</span>
                            <Star size={20} className="text-green-600" />
                        </div>
                        {(() => {
                            const latest = versions?.[0];
                            if (!latest) return <p className="text-2xl font-bold text-green-600">—</p>;
                            const g = latest.finalGrade;
                            const max = latest.maxGrade;
                            return (
                                <>
                                    <p className="text-2xl font-bold text-green-600">
                                        {g != null ? g : '—'}
                                        {max != null ? ` / ${max}` : ''}
                                    </p>
                                    {g != null && max != null && max > 0 && (
                                        <p className="text-xs font-semibold text-green-700 mt-1">
                                            {Math.round((g / max) * 100)}%
                                        </p>
                                    )}
                                </>
                            );
                        })()}
                    </div>

                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">AI Score Trend</span>
                            <TrendingUp size={20} className="text-purple-600" />
                        </div>
                        <p className="text-3xl font-bold text-purple-600">
                            {stats.aiTrend >= 0 ? `+${stats.aiTrend.toFixed(0)}` : stats.aiTrend.toFixed(0)}
                        </p>
                        {stats.total > 1 && (
                            <p className="text-xs text-purple-700 mt-1">v1 → v{stats.total}</p>
                        )}
                    </div>

                    <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">Avg. Plagiarism</span>
                            <Shield size={20} className="text-amber-600" />
                        </div>
                        <p className="text-3xl font-bold text-amber-600">{stats.avgPlag}%</p>
                        <p className="text-xs text-amber-700 mt-1">Across all versions</p>
                    </div>
                </div>
            )}

            {/* No versions yet */}
            {!loading && (!versions || versions.length === 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-semibold text-gray-600">No versions yet</p>
                    <p className="text-sm text-gray-500 mt-1">Submit your assignment to create the first version.</p>
                </div>
            )}

            {/* Version list */}
            {versions && versions.length > 0 && (
                <div className="space-y-4 mb-10">
                    <h2 className="text-xl font-bold text-gray-900">All Versions</h2>
                    {versions.map((v, i) => (
                        <VersionCard
                            key={v.id}
                            version={v}
                            isLatest={i === 0}
                            onViewReport={() =>
                                router.push(`/submissions/student/feedback/${id}?versionId=${v.id}`)
                            }
                        />
                    ))}
                </div>
            )}

            {/* Score Progression */}
            {sortedAsc.length > 1 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Score Progression</h2>
                    <div className="space-y-6">
                        {/* AI Score bars */}
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-3">AI Quality Score</p>
                            <div className="flex items-end gap-2">
                                {sortedAsc.map(v => (
                                    <div key={v.id} className="flex-1 text-center">
                                        <span className="text-xs text-gray-500">v{v.versionNumber}</span>
                                        <div className="mt-1 h-24 bg-gray-100 rounded-lg relative overflow-hidden">
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-purple-500 transition-all"
                                                style={{ height: `${v.aiScore ?? 0}%` }}
                                            />
                                            <div className="absolute inset-0 flex items-end justify-center pb-1">
                                                <span className="text-xs font-bold text-white drop-shadow">
                                                    {v.aiScore != null ? `${v.aiScore.toFixed(0)}%` : '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Plagiarism bars */}
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-3">Plagiarism Score (lower is better)</p>
                            <div className="flex items-end gap-2">
                                {sortedAsc.map(v => {
                                    const plag = v.plagiarismScore ?? 0;
                                    return (
                                        <div key={v.id} className="flex-1">
                                            <div className="h-16 bg-gray-100 rounded-lg relative overflow-hidden">
                                                <div
                                                    className={`absolute bottom-0 left-0 right-0 transition-all ${plag < 20 ? 'bg-green-500' : plag < 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ height: `${Math.min(100, plag)}%` }}
                                                />
                                                <div className="absolute inset-0 flex items-end justify-center pb-1">
                                                    <span className="text-xs font-bold text-white drop-shadow">
                                                        {plag.toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Final grade bars */}
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-3">Final Grade</p>
                            <div className="flex items-end gap-2">
                                {sortedAsc.map(v => {
                                    const pct = v.finalGrade != null && v.maxGrade
                                        ? Math.round((v.finalGrade / v.maxGrade) * 100)
                                        : 0;
                                    return (
                                        <div key={v.id} className="flex-1">
                                            <div className="h-20 bg-gray-100 rounded-lg relative overflow-hidden">
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all"
                                                    style={{ height: `${pct}%` }}
                                                />
                                                <div className="absolute inset-0 flex items-end justify-center pb-1">
                                                    <span className="text-xs font-bold text-white drop-shadow">
                                                        {v.finalGrade != null ? v.finalGrade : '—'}
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
