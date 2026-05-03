'use client';

import React, { use, useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, GitBranch, Star, TrendingUp, Shield, AlertCircle,
    Clock, CheckCircle2, FileText, ChevronDown, ChevronUp, X, ArrowRightLeft, Columns, AlignJustify,
    Lightbulb, Timer, BarChart3, Undo2,
} from 'lucide-react';
import { useVersions } from '@/hooks/useVersions';
import { useSubmission } from '@/hooks/useSubmissions';
import { versionService, submissionService, scoreToLetterGrade } from '@/lib/api/submission-services';
import { diffWords, mergeDiffTokens } from '@/lib/textDiff';
import type { SubmissionVersion, VersionAnswer } from '@/types/submission.types';
import AnnotatedText from '@/components/submissions/AnnotatedText';

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

// ─── Version Diff Summary ─────────────────────────────────────

interface VersionDiffSummary {
    wordsAdded: number;
    wordsRemoved: number;
    questionsChanged: number;
    questionsAdded: number;
}

/**
 * Count word-level additions and removals between two sets of answers.
 * Uses the same diffWords function used by ComparisonView so the numbers
 * are consistent with what the student sees in the full diff modal.
 */
function computeVersionDiff(
    prevAnswers: VersionAnswer[],
    nextAnswers: VersionAnswer[],
): VersionDiffSummary {
    const prevMap = new Map(prevAnswers.map(a => [a.questionId, a.answerText ?? '']));
    let wordsAdded = 0, wordsRemoved = 0, questionsChanged = 0, questionsAdded = 0;

    for (const next of nextAnswers) {
        const oldText = prevMap.get(next.questionId) ?? '';
        const newText = next.answerText ?? '';
        if (oldText === '' && newText !== '') {
            questionsAdded++;
            wordsAdded += newText.trim().split(/\s+/).filter(Boolean).length;
            questionsChanged++;
            continue;
        }
        if (oldText === newText) continue;
        questionsChanged++;
        const tokens = diffWords(oldText, newText);
        for (const t of tokens) {
            const wordCount = t.value.trim().split(/\s+/).filter(Boolean).length;
            if (t.type === 'added')   wordsAdded   += wordCount;
            if (t.type === 'removed') wordsRemoved += wordCount;
        }
    }

    return { wordsAdded, wordsRemoved, questionsChanged, questionsAdded };
}

// ─── VersionCard ──────────────────────────────────────────────

function VersionCard({
    version,
    isLatest,
    onViewReport,
    onRevert,
    compareSelected,
    onCompareToggle,
    compareDisabled,
    diffSummary,
}: {
    version: SubmissionVersion;
    isLatest: boolean;
    onViewReport: () => void;
    onRevert: () => void;
    compareSelected: boolean;
    onCompareToggle: () => void;
    compareDisabled: boolean;
    /** Change summary vs the immediately preceding version. Undefined for v1. */
    diffSummary?: VersionDiffSummary;
}) {
    const [expanded, setExpanded] = useState(false);
    const [downloadingReport, setDownloadingReport] = useState<'plagiarism' | 'feedback' | null>(null);
    const answers: VersionAnswer[] = version.answers ?? [];

    const handleDownload = async (type: 'plagiarism' | 'feedback') => {
        const submissionId = version.submissionId?.toString() ?? '';
        if (!submissionId) return;
        setDownloadingReport(type);
        try {
            const { plagiarismService } = await import('@/lib/api/submission-services');
            const blob = type === 'plagiarism'
                ? await plagiarismService.downloadPlagiarismReport(submissionId)
                : await plagiarismService.downloadFeedbackReport(submissionId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = type === 'plagiarism'
                ? `Plagiarism_Report_V${version.versionNumber ?? 1}.pdf`
                : `Complete_Report_V${version.versionNumber ?? 1}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setDownloadingReport(null);
        }
    };

    const plagColor = (score?: number | null) => {
        if (!score || score < 20) return 'text-green-600';
        if (score < 50) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div className={`bg-white border rounded-xl overflow-hidden ${compareSelected ? 'border-purple-400 ring-2 ring-purple-200' : isLatest ? 'border-purple-300 shadow-md' : 'border-gray-200'}`}>
            <div className="p-6 flex items-start gap-4">

                {/* ── Compare checkbox ────────────────────────── */}
                <label
                    className={`flex items-center justify-center w-6 h-6 shrink-0 mt-1 cursor-pointer ${compareDisabled && !compareSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title={compareSelected ? 'Deselect for comparison' : compareDisabled ? '2 versions already selected' : 'Select for comparison'}
                >
                    <input
                        type="checkbox"
                        checked={compareSelected}
                        onChange={onCompareToggle}
                        disabled={compareDisabled && !compareSelected}
                        className="w-4 h-4 accent-purple-600 cursor-pointer disabled:cursor-not-allowed"
                    />
                </label>

                {/* ── Version circle ───────────────────────────── */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${isLatest ? 'bg-purple-600' : 'bg-gray-400'}`}>
                    <span className="text-white font-bold text-base">v{version.versionNumber}</span>
                </div>

                {/* ── Left: title + meta + metrics ─────────────── */}
                <div className="flex-1 min-w-0">

                    {/* Title row + status badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-gray-900 leading-tight">
                            {version.commitMessage ?? `Version ${version.versionNumber}`}
                        </h3>
                        {isLatest && (
                            <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">Latest</span>
                        )}
                        {version.isLate && (
                            <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">Late</span>
                        )}
                        {version.hasLecturerOverride && (
                            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">Lecturer Graded</span>
                        )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                        <Clock size={14} />
                        <span>Submitted {formatDate(version.submittedAt)}</span>
                    </div>

                    {/* Change summary vs previous version */}
                    {diffSummary && (
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            {diffSummary.wordsAdded === 0 && diffSummary.wordsRemoved === 0 && diffSummary.questionsAdded === 0 ? (
                                <span className="text-sm text-gray-400 italic">No text changes from previous version</span>
                            ) : (
                                <>
                                    {diffSummary.wordsAdded > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-green-100 text-green-700 text-sm font-medium">
                                            +{diffSummary.wordsAdded} word{diffSummary.wordsAdded !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {diffSummary.wordsRemoved > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-red-100 text-red-700 text-sm font-medium">
                                            −{diffSummary.wordsRemoved} word{diffSummary.wordsRemoved !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {diffSummary.questionsAdded > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-purple-100 text-purple-700 text-sm font-medium">
                                            {diffSummary.questionsAdded} new answer{diffSummary.questionsAdded !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {diffSummary.questionsChanged > 0 && (
                                        <span className="text-sm text-gray-400">
                                            across {diffSummary.questionsChanged} question{diffSummary.questionsChanged !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ── Metrics row (below title, not competing with buttons) ── */}
                    <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">AI Score</span>
                            <span className="text-xl font-bold text-purple-600">
                                {version.aiScore != null ? `${version.aiScore.toFixed(0)}%` : '—'}
                            </span>
                        </div>
                        <div className="w-px bg-gray-200 self-stretch" />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Plagiarism</span>
                            <span className={`text-xl font-bold ${plagColor(version.plagiarismScore)}`}>
                                {version.plagiarismScore != null ? `${version.plagiarismScore.toFixed(0)}%` : '—'}
                            </span>
                        </div>
                        <div className="w-px bg-gray-200 self-stretch" />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">AI Grade</span>
                            <span className="text-xl font-bold text-blue-600">
                                {version.aiScore != null ? scoreToLetterGrade(version.aiScore) : '—'}
                            </span>
                        </div>
                        <div className="w-px bg-gray-200 self-stretch" />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Words</span>
                            <span className="text-xl font-bold text-gray-700">
                                {version.totalWordCount ?? '—'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Right: action buttons column ─────────────── */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* Primary action */}
                    <button
                        onClick={onViewReport}
                        className="px-5 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                        View Report
                    </button>

                    {/* Secondary actions */}
                    <div className="flex flex-wrap gap-2 justify-end">
                        {!isLatest && (
                            <button
                                onClick={onRevert}
                                className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                                title="Revert to this version as a new draft"
                            >
                                <Undo2 size={14} />
                                Revert
                            </button>
                        )}
                        <button
                            onClick={() => handleDownload('plagiarism')}
                            disabled={downloadingReport !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                            {downloadingReport === 'plagiarism' ? (
                                <span className="animate-spin text-sm">⟳</span>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            Plagiarism Report
                        </button>
                        <button
                            onClick={() => handleDownload('feedback')}
                            disabled={downloadingReport !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                            {downloadingReport === 'feedback' ? (
                                <span className="animate-spin text-sm">⟳</span>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            Full Report
                        </button>
                        {answers.length > 0 && (
                            <button
                                onClick={() => setExpanded(e => !e)}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                            >
                                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                Answers
                            </button>
                        )}
                    </div>
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
                                    {a.answerText ? (
                                        <AnnotatedText
                                            text={a.answerText}
                                            versionId={version.id}
                                            questionId={a.questionId}
                                        />
                                    ) : (
                                        <p className="text-xs text-gray-500 italic">(no answer)</p>
                                    )}
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
                                {a.aiGeneratedMark != null && (() => {
                                    const mp = a.maxPoints ?? 10;
                                    const earned = Math.round((a.aiGeneratedMark / 10) * mp * 10) / 10;
                                    return (
                                        <span className="text-purple-600 font-semibold">
                                            AI Mark: {earned.toFixed(1)} / {mp}
                                        </span>
                                    );
                                })()}
                                {a.lecturerMark != null && (
                                    <span className="text-blue-600 font-semibold">
                                        Lecturer Mark: {a.lecturerMark.toFixed(1)} / {a.maxPoints ?? 10}
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

// ─── ComparisonView ───────────────────────────────────────────

function ComparisonView({
    left,
    right,
    onClose,
}: {
    left: SubmissionVersion;
    right: SubmissionVersion;
    onClose: () => void;
}) {
    const leftAnswers: VersionAnswer[] = left.answers ?? [];
    const rightAnswers: VersionAnswer[] = right.answers ?? [];

    // Build a merged question list to align answers
    const questionIds = Array.from(
        new Set([...leftAnswers.map(a => a.questionId), ...rightAnswers.map(a => a.questionId)])
    );

    const leftMap = new Map(leftAnswers.map(a => [a.questionId, a]));
    const rightMap = new Map(rightAnswers.map(a => [a.questionId, a]));

    const [diffMode, setDiffMode] = useState<'unified' | 'side-by-side'>('unified');

    const metricDelta = (a?: number | null, b?: number | null) => {
        if (a == null && b == null) return null;
        const av = a ?? 0;
        const bv = b ?? 0;
        const d = bv - av;
        const sign = d > 0 ? '+' : '';
        const color = d > 0 ? 'text-green-600' : d < 0 ? 'text-red-600' : 'text-gray-500';
        return <span className={`text-xs font-semibold ${color}`}>{sign}{d.toFixed(1)}</span>;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 overflow-y-auto">
            <div className="max-w-6xl mx-auto my-8 bg-white rounded-xl shadow-2xl">
                {/* Sticky header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 rounded-t-xl px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ArrowRightLeft size={20} className="text-purple-600" />
                        <h2 className="text-lg font-bold text-gray-900">
                            Version {left.versionNumber} → Version {right.versionNumber}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-gray-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setDiffMode('unified')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${diffMode === 'unified' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <AlignJustify size={14} />
                                Unified
                            </button>
                            <button
                                onClick={() => setDiffMode('side-by-side')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${diffMode === 'side-by-side' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Columns size={14} />
                                Side by Side
                            </button>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Summary metrics */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500 block mb-0.5">AI Score</span>
                        <span className="font-semibold">{left.aiScore?.toFixed(0) ?? '—'}% → {right.aiScore?.toFixed(0) ?? '—'}%</span>
                        {' '}{metricDelta(left.aiScore, right.aiScore)}
                    </div>
                    <div>
                        <span className="text-gray-500 block mb-0.5">Plagiarism</span>
                        <span className="font-semibold">{left.plagiarismScore?.toFixed(0) ?? '—'}% → {right.plagiarismScore?.toFixed(0) ?? '—'}%</span>
                        {' '}{metricDelta(left.plagiarismScore, right.plagiarismScore)}
                    </div>
                    <div>
                        <span className="text-gray-500 block mb-0.5">AI Grade</span>
                        <span className="font-semibold">
                            {left.aiScore != null ? scoreToLetterGrade(left.aiScore) : '—'}
                            {' → '}
                            {right.aiScore != null ? scoreToLetterGrade(right.aiScore) : '—'}
                        </span>
                        {' '}{metricDelta(left.aiScore, right.aiScore)}
                    </div>
                    <div>
                        <span className="text-gray-500 block mb-0.5">Word Count</span>
                        <span className="font-semibold">{left.totalWordCount ?? '—'} → {right.totalWordCount ?? '—'}</span>
                        {' '}{metricDelta(left.totalWordCount, right.totalWordCount)}
                    </div>
                </div>

                {/* Per-question diffs */}
                <div className="divide-y divide-gray-200">
                    {questionIds.map((qId, idx) => {
                        const la = leftMap.get(qId);
                        const ra = rightMap.get(qId);
                        const oldText = la?.answerText ?? '';
                        const newText = ra?.answerText ?? '';
                        const tokens = mergeDiffTokens(diffWords(oldText, newText));

                        return (
                            <div key={qId} className="px-6 py-5">
                                <p className="text-sm font-semibold text-gray-800 mb-3">
                                    Q{idx + 1}. {ra?.questionText ?? la?.questionText ?? `Question ${idx + 1}`}
                                </p>

                                {/* Metric deltas for this question */}
                                <div className="flex flex-wrap gap-4 mb-3 text-xs text-gray-600">
                                    <span>Words: {la?.wordCount ?? 0} → {ra?.wordCount ?? 0} {metricDelta(la?.wordCount, ra?.wordCount)}</span>
                                    <span>AI Mark: {la?.aiGeneratedMark != null ? `${Math.round((la.aiGeneratedMark / 10) * (la.maxPoints ?? 10) * 10) / 10}/${la.maxPoints ?? 10}` : '—'} → {ra?.aiGeneratedMark != null ? `${Math.round((ra.aiGeneratedMark / 10) * (ra.maxPoints ?? 10) * 10) / 10}/${ra.maxPoints ?? 10}` : '—'} {metricDelta(la?.aiGeneratedMark, ra?.aiGeneratedMark)}</span>
                                    <span>Plagiarism: {la?.plagiarismSeverity ?? 'N/A'} → {ra?.plagiarismSeverity ?? 'N/A'}</span>
                                </div>

                                {/* Diff output */}
                                {oldText === newText ? (
                                    <p className="text-sm text-gray-400 italic">No changes</p>
                                ) : diffMode === 'unified' ? (
                                    <div className="text-sm leading-relaxed p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-80 overflow-y-auto whitespace-pre-wrap">
                                        {tokens.map((t, ti) => {
                                            if (t.type === 'added')
                                                return <span key={ti} className="bg-green-100 text-green-800">{t.value}</span>;
                                            if (t.type === 'removed')
                                                return <span key={ti} className="bg-red-100 text-red-800 line-through">{t.value}</span>;
                                            return <span key={ti}>{t.value}</span>;
                                        })}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Left (old) */}
                                        <div className="text-sm leading-relaxed p-4 bg-red-50/40 rounded-lg border border-red-200 max-h-80 overflow-y-auto whitespace-pre-wrap">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400 block mb-2">v{left.versionNumber}</span>
                                            {tokens.map((t, ti) => {
                                                if (t.type === 'removed')
                                                    return <span key={ti} className="bg-red-100 text-red-800">{t.value}</span>;
                                                if (t.type === 'added') return null;
                                                return <span key={ti}>{t.value}</span>;
                                            })}
                                        </div>
                                        {/* Right (new) */}
                                        <div className="text-sm leading-relaxed p-4 bg-green-50/40 rounded-lg border border-green-200 max-h-80 overflow-y-auto whitespace-pre-wrap">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400 block mb-2">v{right.versionNumber}</span>
                                            {tokens.map((t, ti) => {
                                                if (t.type === 'added')
                                                    return <span key={ti} className="bg-green-100 text-green-800">{t.value}</span>;
                                                if (t.type === 'removed') return null;
                                                return <span key={ti}>{t.value}</span>;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Per-Question Score Trends ────────────────────────────────

const QUESTION_COLORS = [
    'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500',
    'bg-red-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500',
];
const QUESTION_TEXT_COLORS = [
    'text-purple-600', 'text-blue-600', 'text-green-600', 'text-amber-600',
    'text-red-600', 'text-teal-600', 'text-pink-600', 'text-indigo-600',
];
const QUESTION_DOT_COLORS = [
    'bg-purple-600', 'bg-blue-600', 'bg-green-600', 'bg-amber-600',
    'bg-red-600', 'bg-teal-600', 'bg-pink-600', 'bg-indigo-600',
];

function PerQuestionTrends({ versions }: { versions: SubmissionVersion[] }) {
    // Gather all unique question IDs across all versions
    const questionIds = useMemo(() => {
        const ids = new Set<string>();
        for (const v of versions) for (const a of v.answers ?? []) ids.add(a.questionId);
        return Array.from(ids);
    }, [versions]);

    // Build series: questionId → array of { versionNumber, mark, questionText }
    const series = useMemo(() => {
        const map = new Map<string, { versionNumber: number; mark: number | null; questionText: string }[]>();
        for (const qId of questionIds) map.set(qId, []);
        for (const v of versions) {
            const answersMap = new Map((v.answers ?? []).map(a => [a.questionId, a]));
            for (const qId of questionIds) {
                const a = answersMap.get(qId);
                map.get(qId)!.push({
                    versionNumber: v.versionNumber,
                    mark: a?.aiGeneratedMark ?? null,
                    questionText: a?.questionText ?? `Question`,
                });
            }
        }
        return map;
    }, [versions, questionIds]);

    if (questionIds.length === 0) return null;

    const maxMark = 10;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={20} className="text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Per-Question Score Trends</h2>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-5">
                {questionIds.map((qId, idx) => {
                    const label = series.get(qId)?.[0]?.questionText ?? `Q${idx + 1}`;
                    return (
                        <div key={qId} className="flex items-center gap-1.5 text-xs">
                            <span className={`w-2.5 h-2.5 rounded-full ${QUESTION_DOT_COLORS[idx % QUESTION_DOT_COLORS.length]}`} />
                            <span className="text-gray-600 max-w-[180px] truncate">Q{idx + 1}. {label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Chart */}
            <div className="relative h-52 flex items-end gap-1">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-gray-400 w-6 pr-1">
                    <span>{maxMark}</span>
                    <span>{maxMark / 2}</span>
                    <span>0</span>
                </div>

                {/* Bars grouped by version */}
                <div className="ml-7 flex-1 flex items-end gap-3">
                    {versions.map(v => (
                        <div key={v.id} className="flex-1 flex flex-col items-center gap-1">
                            <div className="flex items-end gap-0.5 w-full h-44">
                                {questionIds.map((qId, qi) => {
                                    const entry = series.get(qId)!.find(e => e.versionNumber === v.versionNumber);
                                    const mark = entry?.mark ?? 0;
                                    const pct = (mark / maxMark) * 100;
                                    return (
                                        <div
                                            key={qId}
                                            className={`flex-1 ${QUESTION_COLORS[qi % QUESTION_COLORS.length]} rounded-t transition-all relative group`}
                                            style={{ height: `${pct}%`, minHeight: mark > 0 ? 4 : 0 }}
                                            title={`Q${qi + 1}: ${mark.toFixed(1)} / ${maxMark}`}
                                        >
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                                {mark.toFixed(1)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <span className="text-xs text-gray-500 font-medium">v{v.versionNumber}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Per-question delta summary */}
            {versions.length >= 2 && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {questionIds.map((qId, idx) => {
                        const pts = series.get(qId)!;
                        const first = pts[0]?.mark ?? 0;
                        const last = pts[pts.length - 1]?.mark ?? 0;
                        const delta = last - first;
                        const color = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-500';
                        const sign = delta > 0 ? '+' : '';
                        return (
                            <div key={qId} className="flex items-center gap-2 text-xs">
                                <span className={`w-2 h-2 rounded-full ${QUESTION_DOT_COLORS[idx % QUESTION_DOT_COLORS.length]}`} />
                                <span className="text-gray-600">Q{idx + 1}</span>
                                <span className={`font-semibold ${color}`}>{sign}{delta.toFixed(1)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Writing Improvement Suggestions ──────────────────────────

interface WritingInsight {
    questionIndex: number;
    questionText: string;
    message: string;
    type: 'positive' | 'neutral' | 'warning';
}

function WritingInsights({ versions }: { versions: SubmissionVersion[] }) {
    const insights = useMemo<WritingInsight[]>(() => {
        if (versions.length < 2) return [];
        const result: WritingInsight[] = [];

        // Gather question IDs from the latest version
        const latest = versions[versions.length - 1];
        const first = versions[0];
        const latestAnswers = latest.answers ?? [];
        const firstAnswersMap = new Map((first.answers ?? []).map(a => [a.questionId, a]));

        // Also build a map for the previous version (second to last)
        const prev = versions[versions.length - 2];
        const prevAnswersMap = new Map((prev.answers ?? []).map(a => [a.questionId, a]));

        latestAnswers.forEach((la, idx) => {
            const fa = firstAnswersMap.get(la.questionId);
            const pa = prevAnswersMap.get(la.questionId);
            const qLabel = la.questionText ?? `Question ${idx + 1}`;

            // Word count change from v1 → latest
            const firstWc = fa?.wordCount ?? (fa?.answerText?.split(/\s+/).filter(Boolean).length ?? 0);
            const latestWc = la.wordCount ?? (la.answerText?.split(/\s+/).filter(Boolean).length ?? 0);
            if (firstWc > 0 && latestWc > 0) {
                const pctChange = Math.round(((latestWc - firstWc) / firstWc) * 100);
                if (pctChange > 20) {
                    result.push({
                        questionIndex: idx, questionText: qLabel,
                        message: `You added ${pctChange}% more content (${firstWc} → ${latestWc} words)`,
                        type: 'positive',
                    });
                } else if (pctChange < -20) {
                    result.push({
                        questionIndex: idx, questionText: qLabel,
                        message: `Content reduced by ${Math.abs(pctChange)}% (${firstWc} → ${latestWc} words)`,
                        type: 'warning',
                    });
                }
            }

            // AI mark improvement from previous version → latest
            if (pa?.aiGeneratedMark != null && la.aiGeneratedMark != null) {
                const delta = la.aiGeneratedMark - pa.aiGeneratedMark;
                if (delta > 1) {
                    result.push({
                        questionIndex: idx, questionText: qLabel,
                        message: `AI mark improved by +${delta.toFixed(1)} from the previous version`,
                        type: 'positive',
                    });
                } else if (delta < -1) {
                    result.push({
                        questionIndex: idx, questionText: qLabel,
                        message: `AI mark dropped by ${delta.toFixed(1)} from the previous version`,
                        type: 'warning',
                    });
                }
            }

            // Plagiarism improvement
            if (fa && la) {
                const firstSev = fa.plagiarismSeverity;
                const latestSev = la.plagiarismSeverity;
                if (firstSev === 'HIGH' && (latestSev === 'LOW' || latestSev === 'MEDIUM')) {
                    result.push({
                        questionIndex: idx, questionText: qLabel,
                        message: `Plagiarism severity reduced from HIGH to ${latestSev}`,
                        type: 'positive',
                    });
                } else if (firstSev === 'LOW' && latestSev === 'HIGH') {
                    result.push({
                        questionIndex: idx, questionText: qLabel,
                        message: `Plagiarism severity increased to HIGH — consider rephrasing`,
                        type: 'warning',
                    });
                }
            }

            // New answer added (wasn't there in v1)
            if (!fa?.answerText && la.answerText && la.answerText.length > 0) {
                result.push({
                    questionIndex: idx, questionText: qLabel,
                    message: `New answer added (${latestWc} words)`,
                    type: 'positive',
                });
            }
        });

        return result;
    }, [versions]);

    if (insights.length === 0) return null;

    const icons = {
        positive: <CheckCircle2 size={16} className="text-green-600 shrink-0" />,
        warning: <AlertCircle size={16} className="text-amber-600 shrink-0" />,
        neutral: <Lightbulb size={16} className="text-blue-600 shrink-0" />,
    };
    const bgColors = {
        positive: 'bg-green-50 border-green-200',
        warning: 'bg-amber-50 border-amber-200',
        neutral: 'bg-blue-50 border-blue-200',
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
                <Lightbulb size={20} className="text-amber-500" />
                <h2 className="text-xl font-bold text-gray-900">Writing Improvement Insights</h2>
            </div>
            <div className="space-y-2">
                {insights.map((ins, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${bgColors[ins.type]}`}>
                        {icons[ins.type]}
                        <div>
                            <span className="text-xs font-semibold text-gray-500">Q{ins.questionIndex + 1}</span>
                            <p className="text-sm text-gray-700">{ins.message}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Time Between Submissions ─────────────────────────────────

function formatDuration(ms: number): string {
    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function TimeBetweenSubmissions({ versions }: { versions: SubmissionVersion[] }) {
    const gaps = useMemo(() => {
        const result: { from: number; to: number; durationMs: number; fromDate: string; toDate: string }[] = [];
        for (let i = 1; i < versions.length; i++) {
            const prev = new Date(versions[i - 1].submittedAt).getTime();
            const curr = new Date(versions[i].submittedAt).getTime();
            result.push({
                from: versions[i - 1].versionNumber,
                to: versions[i].versionNumber,
                durationMs: curr - prev,
                fromDate: versions[i - 1].submittedAt,
                toDate: versions[i].submittedAt,
            });
        }
        return result;
    }, [versions]);

    if (gaps.length === 0) return null;

    const maxMs = Math.max(...gaps.map(g => g.durationMs));
    const avgMs = Math.round(gaps.reduce((s, g) => s + g.durationMs, 0) / gaps.length);
    const fastest = Math.min(...gaps.map(g => g.durationMs));

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
                <Timer size={20} className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Submission Pace</h2>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Average Gap</p>
                    <p className="text-lg font-bold text-blue-600">{formatDuration(avgMs)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Fastest</p>
                    <p className="text-lg font-bold text-green-600">{formatDuration(fastest)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Longest</p>
                    <p className="text-lg font-bold text-gray-600">{formatDuration(maxMs)}</p>
                </div>
            </div>

            {/* Timeline bars */}
            <div className="space-y-3">
                {gaps.map((g, i) => {
                    const pct = maxMs > 0 ? (g.durationMs / maxMs) * 100 : 0;
                    const color = g.durationMs <= avgMs ? 'bg-green-500' : g.durationMs > avgMs * 1.5 ? 'bg-amber-500' : 'bg-blue-500';
                    return (
                        <div key={i}>
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>v{g.from} → v{g.to}</span>
                                <span className="font-semibold text-gray-700">{formatDuration(g.durationMs)}</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${color} rounded-full transition-all`}
                                    style={{ width: `${Math.max(pct, 3)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
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

    /* ── Detailed versions (with answers) for analytics ── */
    const [detailedVersions, setDetailedVersions] = useState<SubmissionVersion[]>([]);

    useEffect(() => {
        if (!versions || versions.length < 2) return;
        let cancelled = false;
        Promise.all(versions.map(v => versionService.getVersion(id, v.id))).then(results => {
            if (!cancelled) setDetailedVersions(results.sort((a, b) => a.versionNumber - b.versionNumber));
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [versions, id]);

    /* ── Per-version diff summaries (versionId → summary vs prev) ── */
    const diffSummaries = useMemo<Map<string, VersionDiffSummary>>(() => {
        const map = new Map<string, VersionDiffSummary>();
        // detailedVersions is sorted ascending (v1, v2, v3…)
        for (let i = 1; i < detailedVersions.length; i++) {
            const prev = detailedVersions[i - 1];
            const curr = detailedVersions[i];
            map.set(curr.id, computeVersionDiff(prev.answers ?? [], curr.answers ?? []));
        }
        return map;
    }, [detailedVersions]);

    /* ── Comparison state ── */
    const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
    const [comparing, setComparing] = useState(false);
    const [compareData, setCompareData] = useState<{ left: SubmissionVersion; right: SubmissionVersion } | null>(null);
    const [compareLoading, setCompareLoading] = useState(false);

    const toggleCompare = useCallback((vId: string) => {
        setCompareIds(prev => {
            const next = new Set(prev);
            if (next.has(vId)) next.delete(vId);
            else if (next.size < 2) next.add(vId);
            return next;
        });
    }, []);

    const startComparison = useCallback(async () => {
        if (compareIds.size !== 2 || !versions) return;
        const [idA, idB] = Array.from(compareIds);
        const vA = versions.find(v => v.id === idA)!;
        const vB = versions.find(v => v.id === idB)!;
        // left = older version, right = newer version
        const [leftId, rightId] = vA.versionNumber < vB.versionNumber ? [idA, idB] : [idB, idA];

        setCompareLoading(true);
        try {
            const [left, right] = await Promise.all([
                versionService.getVersion(id, leftId),
                versionService.getVersion(id, rightId),
            ]);
            setCompareData({ left, right });
            setComparing(true);
        } catch {
            // silently ignore – user can retry
        } finally {
            setCompareLoading(false);
        }
    }, [compareIds, versions, id]);

    /* ── Revert to a previous version ── */
    const [reverting, setReverting] = useState(false);

    const handleRevert = useCallback(async (versionId: string) => {
        if (!submission || reverting) return;
        if (!confirm('Revert to this version? Your current draft answers will be overwritten with the answers from this version.')) return;

        setReverting(true);
        try {
            // 1. Fetch the full version (with answers)
            const fullVersion = await versionService.getVersion(id, versionId);
            const answers = fullVersion.answers ?? [];
            if (answers.length === 0) { alert('This version has no answers to revert.'); return; }

            // 2. Get or create draft
            const studentId = typeof window !== 'undefined'
                ? (() => { try { const t = localStorage.getItem('authToken'); if (t) { const p = JSON.parse(atob(t.split('.')[1])); return p.userId ?? p.sub ?? ''; } } catch {} return ''; })()
                : '';
            const draft = await submissionService.getOrCreateDraftSubmission(
                submission.assignmentId,
                studentId,
                undefined,
                submission.assignmentTitle,
            );

            // 3. Overwrite each answer in the draft
            await Promise.all(answers.map(a =>
                submissionService.saveAnswer(draft.id, a.questionId, {
                    questionText: a.questionText,
                    answerText: a.answerText ?? '',
                    wordCount: a.wordCount ?? (a.answerText?.split(/\s+/).filter(Boolean).length ?? 0),
                    characterCount: a.characterCount ?? (a.answerText?.length ?? 0),
                    studentId,
                })
            ));

            // 4. Navigate to answer page
            router.push(`/submissions/student/answer/${submission.assignmentId}`);
        } catch (err) {
            console.error('[VersionHistory] Revert failed:', err);
            alert('Failed to revert. Please try again.');
        } finally {
            setReverting(false);
        }
    }, [submission, reverting, id, router]);

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
                            <span className="text-xs font-medium text-gray-600">AI Grade</span>
                            <Star size={20} className="text-green-600" />
                        </div>
                        {(() => {
                            const latest = versions?.[0];
                            const score = latest?.aiScore;
                            return (
                                <>
                                    <p className="text-3xl font-bold text-green-600">
                                        {score != null ? scoreToLetterGrade(score) : '—'}
                                    </p>
                                    {score != null && (
                                        <p className="text-xs text-gray-400 mt-1">{score.toFixed(1)}%</p>
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
                            onRevert={() => handleRevert(v.id)}
                            compareSelected={compareIds.has(v.id)}
                            onCompareToggle={() => toggleCompare(v.id)}
                            compareDisabled={compareIds.size >= 2}
                            diffSummary={diffSummaries.get(v.id)}
                        />
                    ))}
                </div>
            )}

            {/* Floating compare bar */}
            {compareIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-purple-300 shadow-xl rounded-full px-6 py-3 flex items-center gap-4">
                    <span className="text-sm text-gray-700 font-medium">
                        {compareIds.size === 1 ? '1 version selected — pick one more' : '2 versions selected'}
                    </span>
                    <button
                        onClick={startComparison}
                        disabled={compareIds.size !== 2 || compareLoading}
                        className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2"
                    >
                        <ArrowRightLeft size={16} />
                        {compareLoading ? 'Loading…' : 'Compare'}
                    </button>
                    <button
                        onClick={() => setCompareIds(new Set())}
                        className="p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                        title="Clear selection"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Comparison overlay */}
            {comparing && compareData && (
                <ComparisonView
                    left={compareData.left}
                    right={compareData.right}
                    onClose={() => { setComparing(false); setCompareData(null); }}
                />
            )}

            {/* ── Per-Question Score Trends ── */}
            {detailedVersions.length > 1 && (
                <PerQuestionTrends versions={detailedVersions} />
            )}

            {/* ── Writing Improvement Suggestions ── */}
            {detailedVersions.length > 1 && (
                <WritingInsights versions={detailedVersions} />
            )}

            {/* ── Time Between Submissions ── */}
            {sortedAsc.length > 1 && (
                <TimeBetweenSubmissions versions={sortedAsc} />
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

                        {/* AI grade bars */}
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-3">AI Grade</p>
                            <div className="flex items-end gap-2">
                                {sortedAsc.map(v => {
                                    const pct = v.aiScore ?? 0;
                                    return (
                                        <div key={v.id} className="flex-1">
                                            <div className="h-20 bg-gray-100 rounded-lg relative overflow-hidden">
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all"
                                                    style={{ height: `${pct}%` }}
                                                />
                                                <div className="absolute inset-0 flex items-end justify-center pb-1">
                                                    <span className="text-xs font-bold text-white drop-shadow">
                                                        {v.aiScore != null ? scoreToLetterGrade(v.aiScore) : '—'}
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
