'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield,
    AlertTriangle,
    Search,
    Filter,
    FileText,
    Calendar,
    Eye,
    Download,
    TrendingUp,
    TrendingDown,
    Globe,
    CheckCircle2,
    XCircle,
    Flag,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import { useAllPlagiarismReports, useUpdatePlagiarismReview } from '@/hooks/usePlagiarism';
import type { PlagiarismReport, PlagiarismStatus } from '@/types/submission.types';

// ─── Helpers ──────────────────────────────────────────────────

type ReviewStatus = NonNullable<PlagiarismReport['reviewStatus']>;

function getSeverityConfig(score: number) {
    if (score >= 40) return { label: 'Critical', colorClass: 'bg-red-100 border-red-300 text-red-700' };
    if (score >= 30) return { label: 'High',     colorClass: 'bg-orange-100 border-orange-300 text-orange-700' };
    return                { label: 'Medium',    colorClass: 'bg-amber-100 border-amber-300 text-amber-700' };
}

function ReviewBadge({ status }: { status: ReviewStatus | undefined }) {
    if (!status) return null;
    const cfg: Record<ReviewStatus, { label: string; cls: string; icon: React.ReactNode }> = {
        PENDING_REVIEW: { label: 'Pending Review', cls: 'bg-amber-100 text-amber-700', icon: <AlertTriangle size={14} /> },
        CONFIRMED:      { label: 'Confirmed',      cls: 'bg-red-100 text-red-700',     icon: <XCircle size={14} /> },
        FALSE_POSITIVE: { label: 'False Positive', cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={14} /> },
        REVIEWED:       { label: 'Reviewed',       cls: 'bg-blue-100 text-blue-700',   icon: <Eye size={14} /> },
    };
    const { label, cls, icon } = cfg[status] ?? cfg.PENDING_REVIEW;
    return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${cls}`}>
            {icon}
            {label}
        </span>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 animate-pulse">
            <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-2/5" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                    <div className="grid grid-cols-3 gap-3">
                        {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Report Card ──────────────────────────────────────────────

function ReportCard({
    report,
    onUpdate,
    updating,
}: {
    report: PlagiarismReport;
    onUpdate: (reportId: string, status: ReviewStatus, notes: string) => Promise<void>;
    updating: boolean;
}) {
    const [noteText, setNoteText] = useState('');
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<ReviewStatus | null>(null);
    const router = useRouter();

    const sev = getSeverityConfig(report.overallScore);
    const isPending = report.reviewStatus === 'PENDING_REVIEW' || !report.reviewStatus;

    const handleAction = async (status: ReviewStatus) => {
        setPendingStatus(status);
        await onUpdate(report.id, status, noteText);
        setShowNoteInput(false);
        setNoteText('');
        setPendingStatus(null);
    };

    return (
        <div className={`bg-white rounded-lg shadow-sm border-2 p-6 ${sev.colorClass.split(' ')[0]} ${sev.colorClass.split(' ')[1]}`}>
            <div className="flex items-start justify-between mb-4">
                {/* Left */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow shrink-0">
                            {report.submissionId.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Submission {report.submissionId}
                                </h3>
                                <ReviewBadge status={report.reviewStatus} />
                            </div>
                            <p className="text-sm text-gray-500">ID: {report.id}</p>
                        </div>
                    </div>

                    {/* Score display */}
                    <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-lg border-2 ${sev.colorClass} mb-4`}>
                        <Shield size={28} />
                        <div>
                            <div className="text-xs font-medium mb-0.5">Plagiarism Score</div>
                            <div className="text-4xl font-bold">{report.overallScore}%</div>
                        </div>
                        <div className="text-xs font-medium px-2 py-1 rounded bg-white/50">
                            {sev.label}
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                                <Globe size={16} className="text-gray-400" />
                                <span className="text-xs text-gray-600">Sources Checked</span>
                            </div>
                            <div className="text-xl font-bold text-gray-900">
                                {report.sourcesChecked?.toLocaleString() ?? '—'}
                            </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                                <Flag size={16} className="text-gray-400" />
                                <span className="text-xs text-gray-600">Matches Found</span>
                            </div>
                            <div className="text-xl font-bold text-gray-900">
                                {report.matchesFound ?? '—'}
                            </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar size={16} className="text-gray-400" />
                                <span className="text-xs text-gray-600">Status</span>
                            </div>
                            <div className="text-sm font-bold text-gray-900 capitalize">
                                {report.status?.toLowerCase() ?? '—'}
                            </div>
                        </div>
                    </div>

                    {/* Top matches */}
                    {report.topMatches && report.topMatches.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Top Matches:</p>
                            <div className="space-y-2">
                                {report.topMatches.slice(0, 3).map((m, i) => (
                                    <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {m.source}
                                                </p>
                                                <p className="text-xs text-gray-600">{m.matchType}</p>
                                            </div>
                                            <span className="text-xl font-bold text-red-600 ml-4 shrink-0">
                                                {m.percentage}%
                                            </span>
                                        </div>
                                        {m.url && (
                                            <a
                                                href={m.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <Globe size={12} />
                                                View Source
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Review notes */}
                    {report.reviewNotes && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <FileText className="text-blue-600 mt-0.5 shrink-0" size={18} />
                                <div>
                                    <p className="text-sm font-medium text-blue-900 mb-1">Review Notes:</p>
                                    <p className="text-sm text-blue-800">{report.reviewNotes}</p>
                                    {report.reviewedBy && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            Reviewed by {report.reviewedBy}
                                            {report.reviewedAt
                                                ? ` on ${new Date(report.reviewedAt).toLocaleDateString()}`
                                                : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Note input (shows when user is about to submit an action) */}
                    {showNoteInput && (
                        <div className="mt-4">
                            <textarea
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                rows={3}
                                placeholder="Add a review note (optional)…"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                </div>

                {/* Right — actions */}
                <div className="ml-4 flex flex-col items-end gap-3 shrink-0">
                    <button
                        onClick={() => router.push(`/submissions/lecturer/submissions/${report.submissionId}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm"
                    >
                        <Eye size={18} />
                        View Details
                    </button>

                    <button
                        onClick={() => alert(`Export report for ${report.id}`)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                    >
                        <Download size={16} />
                        Export
                    </button>

                    {isPending && (
                        <>
                            {!showNoteInput ? (
                                <button
                                    onClick={() => setShowNoteInput(true)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                >
                                    Add Note &amp; Review
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleAction('CONFIRMED')}
                                        disabled={updating && pendingStatus === 'CONFIRMED'}
                                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                    >
                                        {updating && pendingStatus === 'CONFIRMED'
                                            ? <RefreshCw size={16} className="animate-spin" />
                                            : <XCircle size={16} />
                                        }
                                        Confirm Plagiarism
                                    </button>
                                    <button
                                        onClick={() => handleAction('FALSE_POSITIVE')}
                                        disabled={updating && pendingStatus === 'FALSE_POSITIVE'}
                                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                    >
                                        {updating && pendingStatus === 'FALSE_POSITIVE'
                                            ? <RefreshCw size={16} className="animate-spin" />
                                            : <CheckCircle2 size={16} />
                                        }
                                        False Positive
                                    </button>
                                    <button
                                        onClick={() => { setShowNoteInput(false); setNoteText(''); }}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function LecturerPlagiarismDetectionPage() {
    const [searchQuery, setSearchQuery]     = useState('');
    const [filterStatus, setFilterStatus]   = useState<'all' | ReviewStatus>('all');
    const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
    const [sortBy, setSortBy]               = useState<'score' | 'date' | 'matches'>('score');

    const { data: reports, loading, error, refetch } = useAllPlagiarismReports();
    const { loading: updating, updateReview }         = useUpdatePlagiarismReview();

    const handleUpdate = useCallback(
        async (reportId: string, status: ReviewStatus, notes: string) => {
            await updateReview(reportId, { reviewStatus: status, reviewNotes: notes || undefined });
            refetch();
        },
        [updateReview, refetch]
    );

    const processed = useMemo(() => {
        const list = reports ?? [];

        const filtered = list.filter(r => {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                !q ||
                r.submissionId.toLowerCase().includes(q) ||
                r.id.toLowerCase().includes(q);

            const matchesStatus =
                filterStatus === 'all' || r.reviewStatus === filterStatus;

            let matchesSeverity = true;
            if (filterSeverity === 'critical' && r.overallScore < 40) matchesSeverity = false;
            if (filterSeverity === 'high' && (r.overallScore < 30 || r.overallScore >= 40)) matchesSeverity = false;
            if (filterSeverity === 'medium' && (r.overallScore < 20 || r.overallScore >= 30)) matchesSeverity = false;

            return matchesSearch && matchesStatus && matchesSeverity;
        });

        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'score':   return b.overallScore - a.overallScore;
                case 'matches': return (b.matchesFound ?? 0) - (a.matchesFound ?? 0);
                default:        return 0;
            }
        });
    }, [reports, searchQuery, filterStatus, filterSeverity, sortBy]);

    const stats = useMemo(() => {
        const list = reports ?? [];
        return {
            total:        list.length,
            pending:      list.filter(r => r.reviewStatus === 'PENDING_REVIEW' || !r.reviewStatus).length,
            confirmed:    list.filter(r => r.reviewStatus === 'CONFIRMED').length,
            falsePos:     list.filter(r => r.reviewStatus === 'FALSE_POSITIVE').length,
            reviewed:     list.filter(r => r.reviewStatus === 'REVIEWED').length,
            critical:     list.filter(r => r.overallScore >= 40).length,
            high:         list.filter(r => r.overallScore >= 30 && r.overallScore < 40).length,
            medium:       list.filter(r => r.overallScore >= 20 && r.overallScore < 30).length,
        };
    }, [reports]);

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <Shield className="text-red-600" size={40} />
                        Plagiarism Detection
                    </h1>
                    <p className="text-gray-600">Review and manage flagged submissions for academic integrity</p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-lg text-white shadow-lg">
                    <div className="text-3xl font-bold">{stats.total}</div>
                    <div className="text-xs text-red-100 mt-1">Total Flagged</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
                    <div className="text-xs text-amber-600 mt-1">Pending</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-700">{stats.confirmed}</div>
                    <div className="text-xs text-red-600 mt-1">Confirmed</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{stats.falsePos}</div>
                    <div className="text-xs text-green-600 mt-1">False Positive</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{stats.reviewed}</div>
                    <div className="text-xs text-blue-600 mt-1">Reviewed</div>
                </div>
                <div className="bg-red-100 p-4 rounded-lg border border-red-300">
                    <div className="text-2xl font-bold text-red-800">{stats.critical}</div>
                    <div className="text-xs text-red-700 mt-1">Critical (40%+)</div>
                </div>
                <div className="bg-orange-100 p-4 rounded-lg border border-orange-300">
                    <div className="text-2xl font-bold text-orange-800">{stats.high}</div>
                    <div className="text-xs text-orange-700 mt-1">High (30-39%)</div>
                </div>
                <div className="bg-amber-100 p-4 rounded-lg border border-amber-300">
                    <div className="text-2xl font-bold text-amber-800">{stats.medium}</div>
                    <div className="text-xs text-amber-700 mt-1">Medium (20-29%)</div>
                </div>
            </div>

            {/* Alert */}
            {stats.pending > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-6 rounded-r-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 mt-0.5" size={24} />
                        <div>
                            <h3 className="font-bold text-amber-900 mb-1">Action Required</h3>
                            <p className="text-sm text-amber-800">
                                {stats.pending} submission{stats.pending > 1 ? 's are' : ' is'} waiting for your review.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error banner */}
            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-800">Could not load plagiarism reports</p>
                        <p className="text-sm text-amber-700 mt-0.5">{error}</p>
                        <p className="text-sm text-amber-600 mt-1">
                            Check that your Plagiarism Detection service is running on port 8084.
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by submission ID…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 whitespace-nowrap">Sort by:</label>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <option value="score">Plagiarism % (High → Low)</option>
                                <option value="matches">Matches Found</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Filter size={20} className="text-gray-400" />
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <option value="all">All Status</option>
                                <option value="PENDING_REVIEW">Pending Review</option>
                                <option value="REVIEWED">Reviewed</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="FALSE_POSITIVE">False Positive</option>
                            </select>
                        </div>
                        <select
                            value={filterSeverity}
                            onChange={e => setFilterSeverity(e.target.value as typeof filterSeverity)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="all">All Severity</option>
                            <option value="critical">Critical (40%+)</option>
                            <option value="high">High (30-39%)</option>
                            <option value="medium">Medium (20-29%)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Report list */}
            <div className="space-y-4">
                {loading && !reports ? (
                    [1, 2, 3].map(i => <SkeletonCard key={i} />)
                ) : processed.length > 0 ? (
                    processed.map(report => (
                        <ReportCard
                            key={report.id}
                            report={report}
                            onUpdate={handleUpdate}
                            updating={updating}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Flagged Submissions</h3>
                        <p className="text-gray-500">
                            {!reports || reports.length === 0
                                ? 'All submissions have excellent academic integrity!'
                                : 'No reports match your current filters.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Guidelines */}
            <div className="mt-8 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <Shield size={24} />
                    Plagiarism Review Guidelines
                </h3>
                <ul className="space-y-2 text-sm text-red-100">
                    <li>• <strong>20-29%:</strong> Medium concern — review matches, may be acceptable with citations</li>
                    <li>• <strong>30-39%:</strong> High concern — detailed review required, likely needs student explanation</li>
                    <li>• <strong>40%+:</strong> Critical — strong evidence of plagiarism, formal action recommended</li>
                    <li>• <strong>False Positives:</strong> Common for course materials, textbook definitions, standard terminology</li>
                    <li>• <strong>Action Required:</strong> Document your decision and notify students promptly</li>
                </ul>
            </div>
        </div>
    );
}
