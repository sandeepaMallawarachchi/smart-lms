'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    GitBranch,
    TrendingUp,
    TrendingDown,
    Shield,
    Star,
    FileText,
    Clock,
    Minus,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { useVersions } from '@/hooks/useVersions';
import { useSubmission } from '@/hooks/useSubmissions';
import type { SubmissionVersion } from '@/types/submission.types';

// ─── Helpers ─────────────────────────────────────────────────

function getDiff(val1: number, val2: number) {
    const diff = val2 - val1;
    return { value: Math.abs(diff), isPositive: diff > 0, isNegative: diff < 0, isNeutral: diff === 0 };
}

// ─── Sub-components ───────────────────────────────────────────

function SkeletonTimeline() {
    return (
        <div className="space-y-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="relative pl-8 animate-pulse">
                    <div className="absolute left-0 top-0 w-4 h-4 bg-gray-300 rounded-full" />
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
                        <div className="h-5 bg-gray-200 rounded w-1/4" />
                        <div className="h-4 bg-gray-100 rounded w-1/3" />
                        <div className="grid grid-cols-3 gap-4 mt-2">
                            {[1, 2, 3].map((j) => <div key={j} className="h-16 bg-gray-100 rounded-lg" />)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function VersionCard({ version, index, total, isSelected, onClick }: {
    version: SubmissionVersion;
    index: number;
    total: number;
    isSelected: boolean;
    onClick: () => void;
}) {
    const prevVersion = undefined; // no previous in this context — metrics shown per card
    return (
        <div className={`relative pl-8 pb-6 ${index !== total - 1 ? 'border-l-2 border-purple-200' : ''}`}>
            {/* Timeline dot */}
            <div className={`absolute left-0 top-0 w-4 h-4 rounded-full transform -translate-x-[9px] ${
                version.isSubmitted
                    ? 'bg-green-500 ring-4 ring-green-100'
                    : isSelected
                        ? 'bg-purple-500 ring-4 ring-purple-100'
                        : 'bg-gray-300 ring-4 ring-gray-100'
            }`} />

            <div
                onClick={onClick}
                className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all ${
                    isSelected
                        ? 'border-purple-500 shadow-lg'
                        : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                }`}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">Version {version.versionNumber}</h3>
                            {version.isSubmitted && (
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                                    <CheckCircle2 size={14} />
                                    Submitted
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock size={16} />
                            <span>{new Date(version.createdAt).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                            })}</span>
                        </div>
                    </div>
                </div>

                {/* Changes description */}
                {(version.changes || version.commitMessage) && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-900 font-medium mb-1">Changes:</p>
                        <p className="text-sm text-blue-800">{version.changes ?? version.commitMessage}</p>
                    </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                            <FileText size={14} />
                            Words
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{version.wordCount}</div>
                    </div>

                    <div className={`p-4 border rounded-lg ${
                        version.plagiarismScore < 10 ? 'bg-green-50 border-green-200'
                            : version.plagiarismScore < 20 ? 'bg-amber-50 border-amber-200'
                            : 'bg-red-50 border-red-200'
                    }`}>
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                            <Shield size={14} />
                            Plagiarism
                        </div>
                        <div className={`text-2xl font-bold ${
                            version.plagiarismScore < 10 ? 'text-green-600'
                                : version.plagiarismScore < 20 ? 'text-amber-600'
                                : 'text-red-600'
                        }`}>{version.plagiarismScore}%</div>
                    </div>

                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                            <Star size={14} />
                            AI Score
                        </div>
                        <div className="text-2xl font-bold text-purple-600">{version.aiScore}/100</div>
                    </div>
                </div>

                {/* Expanded feedback on selection */}
                {isSelected && (version.aiFeedback || version.plagiarismDetails) && (
                    <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
                        {version.aiFeedback && (
                            <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                                <div className="flex items-start gap-3">
                                    <Star className="text-purple-600 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-medium text-purple-900 mb-1">AI Feedback:</p>
                                        <p className="text-sm text-purple-800">{version.aiFeedback}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {version.plagiarismDetails && (
                            <div className={`p-4 border-l-4 rounded ${
                                version.plagiarismScore < 10
                                    ? 'bg-green-50 border-green-500'
                                    : 'bg-amber-50 border-amber-500'
                            }`}>
                                <div className="flex items-start gap-3">
                                    <Shield className={`mt-0.5 ${
                                        version.plagiarismScore < 10 ? 'text-green-600' : 'text-amber-600'
                                    }`} size={20} />
                                    <div>
                                        <p className={`font-medium mb-1 ${
                                            version.plagiarismScore < 10 ? 'text-green-900' : 'text-amber-900'
                                        }`}>Plagiarism Check:</p>
                                        <p className={`text-sm ${
                                            version.plagiarismScore < 10 ? 'text-green-800' : 'text-amber-800'
                                        }`}>{version.plagiarismDetails}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function VersionComparisonPage({ params }: { params: Promise<{ submissionId: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();

    const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
    const [compareA, setCompareA] = useState<number>(1);
    const [compareB, setCompareB] = useState<number>(2);
    const [viewMode, setViewMode] = useState<'timeline' | 'compare'>('timeline');

    const { data: submission } = useSubmission(resolvedParams.submissionId);
    const { data: versions, loading, error } = useVersions(resolvedParams.submissionId);

    // Sort ascending for timeline display
    const sorted = [...(versions ?? [])].sort((a, b) => a.versionNumber - b.versionNumber);

    // Set default compare versions once data loads
    React.useEffect(() => {
        if (sorted.length >= 2) {
            setCompareA(sorted[0].versionNumber);
            setCompareB(sorted[sorted.length - 1].versionNumber);
        }
    }, [versions?.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const vA = sorted.find((v) => v.versionNumber === compareA);
    const vB = sorted.find((v) => v.versionNumber === compareB);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back
                </button>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {submission?.assignmentTitle ?? submission?.title ?? 'Version History'}
                            </h1>
                            {submission?.moduleName && (
                                <p className="text-gray-600">{submission.moduleName ?? submission.moduleCode}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-purple-600">{sorted.length}</div>
                            <div className="text-sm text-gray-600">Versions</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{error}</p>
                </div>
            )}

            {/* View Mode Toggle */}
            {!loading && sorted.length >= 2 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                viewMode === 'timeline'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <GitBranch size={20} />
                            Timeline View
                        </button>
                        <button
                            onClick={() => setViewMode('compare')}
                            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                viewMode === 'compare'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <TrendingUp size={20} />
                            Compare Versions
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <SkeletonTimeline />
            ) : sorted.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <GitBranch size={52} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg font-medium">No versions found</p>
                </div>
            ) : viewMode === 'timeline' ? (
                /* ── Timeline ── */
                <div className="space-y-0">
                    {sorted.map((version, index) => (
                        <VersionCard
                            key={version.id}
                            version={version}
                            index={index}
                            total={sorted.length}
                            isSelected={selectedVersion === version.id}
                            onClick={() => setSelectedVersion(selectedVersion === version.id ? null : version.id)}
                        />
                    ))}
                </div>
            ) : (
                /* ── Compare ── */
                <div className="space-y-6">
                    {/* Version selectors */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="text-purple-600" />
                            Version Comparison
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <select
                                    value={compareA}
                                    onChange={(e) => setCompareA(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                    {sorted.map((v) => (
                                        <option key={v.versionNumber} value={v.versionNumber}>
                                            Version {v.versionNumber}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-sm text-gray-600 mt-2">Base Version</p>
                            </div>
                            <div>
                                <select
                                    value={compareB}
                                    onChange={(e) => setCompareB(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                    {sorted.map((v) => (
                                        <option key={v.versionNumber} value={v.versionNumber}>
                                            Version {v.versionNumber}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-sm text-gray-600 mt-2">Compare Version</p>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Comparison */}
                    {vA && vB && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="font-bold text-gray-900 mb-4">Metrics Comparison</h4>
                            <div className="grid grid-cols-3 gap-4">
                                {/* Word Count */}
                                {(() => {
                                    const d = getDiff(vA.wordCount, vB.wordCount);
                                    return (
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="text-sm text-gray-600 mb-2">Word Count</div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-bold text-gray-900">{vB.wordCount}</span>
                                                <span className={`text-sm font-medium flex items-center gap-1 ${
                                                    d.isPositive ? 'text-green-600' : d.isNegative ? 'text-red-600' : 'text-gray-500'
                                                }`}>
                                                    {d.isPositive && <TrendingUp size={14} />}
                                                    {d.isNegative && <TrendingDown size={14} />}
                                                    {d.isNeutral && <Minus size={14} />}
                                                    {d.isPositive ? '+' : d.isNegative ? '-' : ''}{d.value}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">was {vA.wordCount}</div>
                                        </div>
                                    );
                                })()}

                                {/* Plagiarism */}
                                {(() => {
                                    const d = getDiff(vA.plagiarismScore, vB.plagiarismScore);
                                    return (
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="text-sm text-gray-600 mb-2">Plagiarism Score</div>
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-2xl font-bold ${
                                                    vB.plagiarismScore < 10 ? 'text-green-600' : 'text-amber-600'
                                                }`}>{vB.plagiarismScore}%</span>
                                                <span className={`text-sm font-medium flex items-center gap-1 ${
                                                    d.isNegative ? 'text-green-600' : d.isPositive ? 'text-red-600' : 'text-gray-500'
                                                }`}>
                                                    {d.isNegative && <TrendingDown size={14} />}
                                                    {d.isPositive && <TrendingUp size={14} />}
                                                    {d.isNeutral && <Minus size={14} />}
                                                    {d.value}%
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">was {vA.plagiarismScore}%</div>
                                        </div>
                                    );
                                })()}

                                {/* AI Score */}
                                {(() => {
                                    const d = getDiff(vA.aiScore, vB.aiScore);
                                    return (
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="text-sm text-gray-600 mb-2">AI Score</div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-bold text-purple-600">{vB.aiScore}/100</span>
                                                <span className={`text-sm font-medium flex items-center gap-1 ${
                                                    d.isPositive ? 'text-green-600' : d.isNegative ? 'text-red-600' : 'text-gray-500'
                                                }`}>
                                                    {d.isPositive && <TrendingUp size={14} />}
                                                    {d.isNegative && <TrendingDown size={14} />}
                                                    {d.isNeutral && <Minus size={14} />}
                                                    {d.isPositive ? '+' : d.isNegative ? '-' : ''}{d.value}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">was {vA.aiScore}/100</div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
