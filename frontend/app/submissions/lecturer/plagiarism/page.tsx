'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle,
    CheckCircle2,
    Eye,
    FileText,
    Flag,
    Globe,
    Loader2,
    RefreshCw,
    Shield,
    User,
    XCircle,
    Zap,
} from 'lucide-react';
import { useAllPlagiarismReports } from '@/hooks/usePlagiarism';
import type { PlagiarismReport, PlagiarismReviewStatus } from '@/types/submission.types';
import {
    PageHeader,
    StatCard,
    Skeleton,
    ErrorBanner,
    FilterToolbar,
    SearchInput,
    EmptyState,
} from '@/components/submissions/lecturer/PageShell';

/* ─── Types & Helpers ──────────────────────────────────────── */

type ReviewStatus = NonNullable<PlagiarismReport['reviewStatus']>;

const REVIEW_STORAGE_KEY = 'plagiarism-reviews';

/** Read persisted review decisions from localStorage. */
function loadReviews(): Record<string, { status: ReviewStatus; notes?: string; by?: string; at?: string }> {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) ?? '{}');
    } catch { return {}; }
}

/** Persist a review decision to localStorage. */
function saveReview(reportId: string, status: ReviewStatus, notes?: string) {
    const reviews = loadReviews();
    reviews[reportId] = { status, notes, by: 'lecturer', at: new Date().toISOString() };
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews));
}

function severity(score: number) {
    if (score >= 40) return { label: 'Critical', cls: 'bg-red-100 border-red-300 text-red-700' };
    if (score >= 30) return { label: 'High', cls: 'bg-orange-100 border-orange-300 text-orange-700' };
    return { label: 'Medium', cls: 'bg-amber-100 border-amber-300 text-amber-700' };
}

const reviewCfg: Record<ReviewStatus, { label: string; cls: string; Icon: typeof Shield }> = {
    PENDING_REVIEW: { label: 'Pending', cls: 'bg-amber-100 text-amber-700', Icon: AlertTriangle },
    CONFIRMED:      { label: 'Confirmed', cls: 'bg-red-100 text-red-700', Icon: XCircle },
    FALSE_POSITIVE: { label: 'False Positive', cls: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
    REVIEWED:       { label: 'Reviewed', cls: 'bg-blue-100 text-blue-700', Icon: Eye },
};

function ReviewBadge({ status }: { status: ReviewStatus | undefined }) {
    if (!status) return null;
    const { label, cls, Icon } = reviewCfg[status] ?? reviewCfg.PENDING_REVIEW;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}><Icon size={12} />{label}</span>;
}

/* ─── Report Card ──────────────────────────────────────────── */

// ─── Bulk Recheck Panel ────────────────────────────────────────

interface AssignmentOption {
    id: string;
    title: string;
    submissionIds: string[];
}

function BulkRecheckPanel({
    assignments,
    onDone,
}: {
    assignments: AssignmentOption[];
    onDone: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState('');
    const [progress, setProgress] = useState<{ done: number; total: number; errors: number } | null>(null);
    const [finished, setFinished] = useState(false);
    const [triggerError, setTriggerError] = useState<string | null>(null);

    const selected = assignments.find(a => a.id === selectedId) ?? null;

    const handleStart = useCallback(async () => {
        if (!selected) return;
        setTriggerError(null);
        setFinished(false);
        const { plagiarismService } = await import('@/lib/api/submission-services');
        const total = selected.submissionIds.length;
        setProgress({ done: 0, total, errors: 0 });

        let errors = 0;
        for (const submissionId of selected.submissionIds) {
            try {
                await plagiarismService.checkPlagiarism({ submissionId, force: true });
            } catch {
                errors++;
            }
            setProgress(p => p ? { ...p, done: p.done + 1, errors } : null);
        }

        setProgress(null);
        setFinished(true);
    }, [selected]);

    const handleClose = useCallback(() => {
        setOpen(false);
        setSelectedId('');
        setProgress(null);
        setFinished(false);
        setTriggerError(null);
    }, []);

    const isRunning = progress !== null;

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
            >
                <Zap size={15} />
                Bulk Re-check
            </button>
        );
    }

    return (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Zap size={18} className="text-red-600" />
                    <h3 className="text-sm font-bold text-red-800">Bulk Plagiarism Re-check</h3>
                </div>
                {!isRunning && (
                    <button onClick={handleClose} className="text-red-400 hover:text-red-700 cursor-pointer text-xs">
                        Close
                    </button>
                )}
            </div>

            {finished ? (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                        <CheckCircle2 size={16} />
                        All checks triggered for <strong>{selected?.title}</strong>.
                        Results update as the integrity service completes each check — usually within 1–2 minutes.
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { onDone(); handleClose(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                            <RefreshCw size={12} /> Refresh Results
                        </button>
                        <button
                            onClick={handleClose}
                            className="px-3 py-1.5 border border-gray-300 bg-white text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                </div>
            ) : isRunning ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-700 font-medium">
                        <span className="flex items-center gap-1.5">
                            <Loader2 size={13} className="animate-spin text-red-600" />
                            Triggering checks — {progress!.done} / {progress!.total} done
                            {progress!.errors > 0 && (
                                <span className="text-red-500">({progress!.errors} failed)</span>
                            )}
                        </span>
                        <span className="text-gray-400">{Math.round((progress!.done / progress!.total) * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-red-100 overflow-hidden">
                        <div
                            className="h-full bg-red-500 rounded-full transition-all duration-300"
                            style={{ width: `${(progress!.done / progress!.total) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500">
                        Do not close this panel — checks are being triggered sequentially to avoid overloading the service.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs text-red-700">
                        Select an assignment to trigger a fresh plagiarism check on all its submissions simultaneously.
                        Checks run sequentially to protect the integrity service.
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[220px]">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Assignment</label>
                            <select
                                value={selectedId}
                                onChange={e => setSelectedId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            >
                                <option value="">Select an assignment…</option>
                                {assignments.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.title} ({a.submissionIds.length} submission{a.submissionIds.length !== 1 ? 's' : ''})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleStart}
                            disabled={!selected}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                            Start {selected ? `(${selected.submissionIds.length})` : ''}
                        </button>
                    </div>
                    {triggerError && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle size={11} />{triggerError}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

type RecheckStatus = 'idle' | 'checking' | 'done' | 'error';

function ReportCard({ report, onUpdate, updating, onRecheck }: {
    report: PlagiarismReport;
    onUpdate: (id: string, status: ReviewStatus, notes: string) => void;
    updating: boolean;
    onRecheck: () => void;
}) {
    const [noteText, setNoteText] = useState('');
    const [showNote, setShowNote] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [recheckStatus, setRecheckStatus] = useState<RecheckStatus>('idle');
    const [recheckError, setRecheckError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const router = useRouter();

    // Clean up polling interval on unmount
    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    const handleRecheck = useCallback(async () => {
        setRecheckStatus('checking');
        setRecheckError(null);
        try {
            const { plagiarismService } = await import('@/lib/api/submission-services');
            const newReport = await plagiarismService.checkPlagiarism({
                submissionId: report.submissionId?.toString() ?? '',
                force: true,
            });
            const reportId = newReport.id;

            // Poll until COMPLETED / FAILED or 20 attempts (~60s)
            let attempts = 0;
            pollRef.current = setInterval(async () => {
                attempts++;
                try {
                    const status = await plagiarismService.getCheckStatus(reportId);
                    if (status.status === 'COMPLETED') {
                        clearInterval(pollRef.current!);
                        pollRef.current = null;
                        setRecheckStatus('done');
                        onRecheck();
                    } else if (status.status === 'FAILED' || attempts >= 20) {
                        clearInterval(pollRef.current!);
                        pollRef.current = null;
                        setRecheckStatus('error');
                        setRecheckError(status.status === 'FAILED' ? 'Check failed on the server.' : 'Timed out — check may still be running.');
                    }
                } catch {
                    clearInterval(pollRef.current!);
                    pollRef.current = null;
                    setRecheckStatus('error');
                    setRecheckError('Lost contact with the plagiarism service.');
                }
            }, 3_000);
        } catch {
            setRecheckStatus('error');
            setRecheckError('Could not start re-check. Ensure the integrity service is running.');
        }
    }, [report.submissionId, onRecheck]);

    const sev = severity(report.overallScore);
    const isPending = report.reviewStatus === 'PENDING_REVIEW' || !report.reviewStatus;
    const studentLabel = report.studentName ?? report.studentId ?? 'Unknown student';
    const assignmentLabel = report.assignmentTitle ?? report.assignmentId ?? 'Unknown assignment';

    const handleAction = (status: ReviewStatus) => {
        onUpdate(report.id, status, noteText);
        setShowNote(false);
        setNoteText('');
    };

    return (
        <div className={`bg-white rounded-lg border-2 p-4 ${sev.cls.split(' ')[0]} ${sev.cls.split(' ')[1]}`}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        <User size={16} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm truncate">{studentLabel}</span>
                            <ReviewBadge status={report.reviewStatus} />
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${sev.cls}`}>{sev.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{assignmentLabel}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button onClick={() => router.push(`/submissions/lecturer/grading/${report.submissionId}`)} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer" title="View Submission"><Eye size={14} /></button>
                    <button
                        onClick={handleRecheck}
                        disabled={recheckStatus === 'checking'}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        title={recheckStatus === 'checking' ? 'Re-check in progress…' : 'Trigger a fresh plagiarism re-check'}
                    >
                        {recheckStatus === 'checking'
                            ? <Loader2 size={12} className="animate-spin" />
                            : <RefreshCw size={12} className={recheckStatus === 'done' ? 'text-green-600' : ''} />
                        }
                        {recheckStatus === 'checking' ? 'Checking…' : recheckStatus === 'done' ? 'Done' : 'Re-check'}
                    </button>
                    <button
                        onClick={async () => {
                            setDownloadError(null);
                            setDownloading(true);
                            try {
                                const { plagiarismService } = await import('@/lib/api/submission-services');
                                const blob = await plagiarismService.downloadPlagiarismReport(report.submissionId?.toString() ?? '');
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Plagiarism_Report_${report.submissionId}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            } catch (e) {
                                console.error('Download failed:', e);
                                setDownloadError('Download failed. Please try again.');
                            } finally {
                                setDownloading(false);
                            }
                        }}
                        disabled={downloading}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        title={downloading ? 'Generating PDF…' : 'Download Plagiarism Report'}
                    >
                        {downloading
                            ? <Loader2 size={12} className="animate-spin" />
                            : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )
                        }
                        {downloading ? 'Generating…' : 'PDF'}
                    </button>
                </div>
            </div>

            {/* Re-check status */}
            {recheckStatus === 'checking' && (
                <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <Loader2 size={12} className="animate-spin shrink-0" />
                    Running fresh plagiarism check — this may take up to a minute…
                </div>
            )}
            {recheckStatus === 'error' && recheckError && (
                <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertTriangle size={12} className="shrink-0" />{recheckError}
                </div>
            )}
            {recheckStatus === 'done' && (
                <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                    <CheckCircle2 size={12} className="shrink-0" />Re-check complete — scores updated.
                </div>
            )}

            {/* Download error */}
            {downloadError && (
                <p className="mb-2 text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle size={12} />{downloadError}
                </p>
            )}

            {/* Score + stats */}
            <div className="flex items-center gap-4 mb-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${sev.cls}`}>
                    <Shield size={18} />
                    <span className="text-2xl font-bold">{report.overallScore}%</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1"><Globe size={12} className="text-gray-400" />{report.sourcesChecked?.toLocaleString() ?? '—'} sources</span>
                    <span className="flex items-center gap-1"><Flag size={12} className="text-gray-400" />{report.matchesFound ?? '—'} matches</span>
                    <span className="capitalize">{report.status?.toLowerCase() ?? '—'}</span>
                </div>
            </div>

            {/* Top matches */}
            {report.topMatches && report.topMatches.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Top Matches:</p>
                    <div className="space-y-1.5">
                        {report.topMatches.slice(0, 3).map((m, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-lg text-sm">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-900 truncate">{m.source}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{m.type}</span>
                                        {m.url && (
                                            <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                                                <Globe size={10} />View
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-red-600 ml-3 shrink-0">{m.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Review notes */}
            {report.reviewNotes && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3 text-sm">
                    <div className="flex items-start gap-2">
                        <FileText size={14} className="text-blue-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-blue-800">{report.reviewNotes}</p>
                            {report.reviewedBy && (
                                <p className="text-xs text-blue-500 mt-1">
                                    By {report.reviewedBy}{report.reviewedAt ? ` on ${new Date(report.reviewedAt).toLocaleDateString()}` : ''}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Actions for pending reports */}
            {isPending && (
                <div className="flex items-center gap-2 flex-wrap">
                    {!showNote ? (
                        <button onClick={() => setShowNote(true)} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-medium cursor-pointer">
                            Add Note & Review
                        </button>
                    ) : (
                        <>
                            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} placeholder="Review note (optional)…"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
                            <button onClick={() => handleAction('CONFIRMED')}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium flex items-center gap-1 cursor-pointer">
                                <XCircle size={12} />Confirm
                            </button>
                            <button onClick={() => handleAction('FALSE_POSITIVE')}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium flex items-center gap-1 cursor-pointer">
                                <CheckCircle2 size={12} />False Positive
                            </button>
                            <button onClick={() => { setShowNote(false); setNoteText(''); }} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Cancel</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function LecturerPlagiarismDetectionPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | ReviewStatus>('all');
    const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
    const [sortBy, setSortBy] = useState<'score' | 'matches'>('score');
    const [reviewMap, setReviewMap] = useState<Record<string, { status: ReviewStatus; notes?: string; by?: string; at?: string }>>({});

    const { data: reports, loading, error, refetch } = useAllPlagiarismReports();

    // Load persisted review decisions from localStorage on mount
    useEffect(() => { setReviewMap(loadReviews()); }, []);

    // Merge server reports with local review decisions
    const enrichedReports = useMemo(() => {
        return (reports ?? []).map((r) => {
            const review = reviewMap[r.id];
            if (!review) return r;
            return {
                ...r,
                reviewStatus: review.status as PlagiarismReviewStatus,
                reviewNotes: review.notes,
                reviewedBy: review.by,
                reviewedAt: review.at,
            };
        });
    }, [reports, reviewMap]);

    const handleUpdate = useCallback(
        (reportId: string, status: ReviewStatus, notes: string) => {
            saveReview(reportId, status, notes || undefined);
            setReviewMap(loadReviews());
        },
        [],
    );

    const processed = useMemo(() => {
        const list = enrichedReports;
        const filtered = list.filter((r) => {
            const q = searchQuery.toLowerCase();
            if (q) {
                const haystack = [
                    severity(r.overallScore).label,
                    r.reviewStatus ?? '',
                    r.studentName ?? '',
                    r.studentId ?? '',
                    r.assignmentTitle ?? '',
                ].join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            if (filterStatus !== 'all' && r.reviewStatus !== filterStatus) return false;
            if (filterSeverity === 'critical' && r.overallScore < 40) return false;
            if (filterSeverity === 'high' && (r.overallScore < 30 || r.overallScore >= 40)) return false;
            if (filterSeverity === 'medium' && (r.overallScore < 20 || r.overallScore >= 30)) return false;
            return true;
        });
        return [...filtered].sort((a, b) => sortBy === 'matches' ? (b.matchesFound ?? 0) - (a.matchesFound ?? 0) : b.overallScore - a.overallScore);
    }, [enrichedReports, searchQuery, filterStatus, filterSeverity, sortBy]);

    // Build the list of unique assignments present in the current reports for bulk re-check.
    const assignmentOptions = useMemo<AssignmentOption[]>(() => {
        const map = new Map<string, AssignmentOption>();
        for (const r of enrichedReports) {
            const aId = r.assignmentId ?? '';
            if (!aId) continue;
            if (!map.has(aId)) {
                map.set(aId, { id: aId, title: r.assignmentTitle ?? aId, submissionIds: [] });
            }
            const sid = r.submissionId?.toString() ?? '';
            if (sid && !map.get(aId)!.submissionIds.includes(sid)) {
                map.get(aId)!.submissionIds.push(sid);
            }
        }
        return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
    }, [enrichedReports]);

    const stats = useMemo(() => {
        const l = enrichedReports;
        return {
            total: l.length,
            pending: l.filter((r) => r.reviewStatus === 'PENDING_REVIEW' || !r.reviewStatus).length,
            confirmed: l.filter((r) => r.reviewStatus === 'CONFIRMED').length,
            falsePos: l.filter((r) => r.reviewStatus === 'FALSE_POSITIVE').length,
            reviewed: l.filter((r) => r.reviewStatus === 'REVIEWED').length,
            critical: l.filter((r) => r.overallScore >= 40).length,
            high: l.filter((r) => r.overallScore >= 30 && r.overallScore < 40).length,
            medium: l.filter((r) => r.overallScore >= 20 && r.overallScore < 30).length,
        };
    }, [enrichedReports]);

    return (
        <div>
            <PageHeader title="Plagiarism Detection" subtitle="Review and manage flagged submissions for academic integrity" icon={Shield} iconColor="text-red-600" loading={loading} onRefresh={refetch} />

            {error && <ErrorBanner message={`Could not load plagiarism reports: ${error}. Ensure the Submission Management service (port 8081) is running.`} />}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {loading ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />) : (
                    <>
                        <StatCard label="Total Flagged" value={stats.total} gradient="bg-gradient-to-br from-red-500 to-red-600" />
                        <StatCard label="Pending Review" value={stats.pending} bgClass="bg-amber-50 border-amber-200" textClass="text-amber-700" />
                        <StatCard label="Confirmed" value={stats.confirmed} bgClass="bg-red-50 border-red-200" textClass="text-red-700" />
                        <StatCard label="False Positive" value={stats.falsePos} bgClass="bg-green-50 border-green-200" textClass="text-green-700" />
                    </>
                )}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
                <StatCard label="Critical (40%+)" value={stats.critical} bgClass="bg-red-100 border-red-300" textClass="text-red-800" />
                <StatCard label="High (30-39%)" value={stats.high} bgClass="bg-orange-100 border-orange-300" textClass="text-orange-800" />
                <StatCard label="Medium (20-29%)" value={stats.medium} bgClass="bg-amber-100 border-amber-300" textClass="text-amber-800" />
            </div>

            {/* Bulk re-check + action required */}
            <div className="flex flex-wrap items-start gap-4 mb-4">
                {assignmentOptions.length > 0 && (
                    <BulkRecheckPanel assignments={assignmentOptions} onDone={refetch} />
                )}
                {stats.pending > 0 && (
                    <div className="flex-1 flex items-center gap-2 p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-sm text-amber-800">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                        <span><strong>{stats.pending}</strong> submission{stats.pending > 1 ? 's' : ''} waiting for your review.</span>
                    </div>
                )}
            </div>

            {/* Filters */}
            <FilterToolbar>
                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search reports…" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="all">All Status</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="REVIEWED">Reviewed</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="FALSE_POSITIVE">False Positive</option>
                </select>
                <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as typeof filterSeverity)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="all">All Severity</option>
                    <option value="critical">Critical (40%+)</option>
                    <option value="high">High (30-39%)</option>
                    <option value="medium">Medium (20-29%)</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="score">Score (High → Low)</option>
                    <option value="matches">Matches Found</option>
                </select>
            </FilterToolbar>

            {/* Report list */}
            <div className="space-y-3 mt-4">
                {loading && !reports ? (
                    [1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)
                ) : processed.length > 0 ? (
                    processed.map((r) => <ReportCard key={r.id} report={r} onUpdate={handleUpdate} updating={false} onRecheck={refetch} />)
                ) : (
                    <EmptyState icon={CheckCircle2} message={!reports || reports.length === 0 ? 'All submissions have excellent academic integrity!' : 'No reports match your current filters.'} />
                )}
            </div>

            {/* Guidelines footer */}
            <div className="mt-6 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg p-5 text-white">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2"><Shield size={16} />Plagiarism Review Guidelines</h3>
                <ul className="space-y-1 text-xs text-red-100">
                    <li>• <strong>20-29%:</strong> Medium — review matches, may be acceptable with citations</li>
                    <li>• <strong>30-39%:</strong> High — detailed review required, likely needs student explanation</li>
                    <li>• <strong>40%+:</strong> Critical — strong evidence, formal action recommended</li>
                    <li>• <strong>False Positives:</strong> Common for course materials, textbook definitions</li>
                </ul>
            </div>
        </div>
    );
}
