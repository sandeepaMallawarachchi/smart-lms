'use client';

/**
 * VersionTimeline.tsx
 * ─────────────────────────────────────────────────────────────
 * A vertical timeline that lists every version of a submission in
 * reverse-chronological order (newest at top). Used in the student
 * "Version History" page.
 *
 * Responsibilities:
 *  • Render each version as a VersionNode card with metrics and actions.
 *  • Track which two versions the user wants to compare (compareA / compareB)
 *    via checkboxes inside each node.
 *  • When both compare slots are filled, call onCompareVersions(vA, vB) so
 *    the parent page can load and display a DiffViewer.
 *  • Show a score-delta badge (Delta) between consecutive versions.
 *  • Support selecting a single version (onSelectVersion) for expanded detail.
 *
 * Compare-slot cycling logic (handleCompareSelect):
 *   Toggle A off  → A = B, B = null        (shift B to A, clear B)
 *   Toggle B off  → B = null               (just clear B)
 *   A empty       → A = v                  (fill first slot)
 *   B empty       → B = v                  (fill second slot → triggers diff)
 *   Both full     → A = B, B = v           (replace older selection)
 *
 * Debug:
 *  All console.debug calls are prefixed with "[VersionTimeline]" or
 *  "[VersionNode]" so they can be filtered in the browser DevTools console.
 */

import React from 'react';
import {
    GitBranch,
    CheckCircle2,
    Clock,
    Shield,
    Star,
    FileText,
    Download,
    TrendingUp,
    TrendingDown,
    Eye,
} from 'lucide-react';
import type { SubmissionVersion } from '@/types/submission.types';

// ─── Delta ────────────────────────────────────────────────────
//
// Inline trending arrow + numeric change shown next to a metric.
// Returns null when value is 0 (no change — don't clutter the UI).
//
// positiveGood:
//   true  → an upward trend is "good"  (wordCount, aiScore)
//   false → a downward trend is "good" (plagiarismScore — lower is better)
//
// Colour: good change → green, bad change → red.

function Delta({ value, positiveGood }: { value: number; positiveGood: boolean }) {
    if (value === 0) return null;
    const good = positiveGood ? value > 0 : value < 0;
    return (
        <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                good ? 'text-green-600' : 'text-red-600'
            }`}
        >
            {value > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {/* Prepend "+" for positive deltas so the sign is always explicit */}
            {value > 0 ? '+' : ''}
            {value}
        </span>
    );
}

// ─── VersionNode (private) ────────────────────────────────────
//
// Renders a single version entry in the timeline.
//
// Layout:
//   [circle vN] — [card with metrics, actions, optional expanded feedback]
//                     └ vertical line down to next node
//
// The card border changes colour based on selection state:
//   Primary selected   → purple border + shadow
//   Compare selected   → blue border + shadow
//   Submitted version  → green border (final, locked)
//   Default            → gray border, hover to purple

interface VersionNodeProps {
    version: SubmissionVersion;
    /** The version immediately before this one (for computing deltas). */
    previousVersion?: SubmissionVersion;
    isSelected: boolean;
    isCompareSelected: boolean;
    onSelect: (v: SubmissionVersion) => void;
    onCompareSelect: (v: SubmissionVersion) => void;
    onDownload?: (versionId: string) => void;
    onViewFiles?: (versionId: string) => void;
    /** When true, omits the vertical connecting line below the node. */
    isLast: boolean;
    /** When false, the compare checkbox is hidden entirely. */
    allowCompare: boolean;
}

// Helper: extract display metrics from a version's metadata JSONB
function extractMetrics(v: SubmissionVersion) {
    type Meta = {
        totalWordCount?: number;
        overallGrade?: number;
        maxGrade?: number;
        answers?: Array<{ similarityScore?: number | null; projectedGrade?: number; maxPoints?: number }>;
    };
    const m = (v.metadata ?? {}) as Meta;
    const wordCount = m.totalWordCount ?? (v.wordCount ?? 0);
    // Average similarity across all answers, or fall back to the flat field
    const answers = m.answers ?? [];
    const avgPlag = answers.length
        ? answers.reduce((s, a) => s + (a.similarityScore ?? 0), 0) / answers.length
        : (v.plagiarismScore ?? 0);
    const plagiarismScore = Math.round(avgPlag * 10) / 10;
    // AI score as percentage of projected grade vs max grade
    const totalGot = answers.reduce((s, a) => s + (a.projectedGrade ?? 0), 0);
    const totalMax = answers.reduce((s, a) => s + (a.maxPoints ?? 0), 0);
    const aiScore = totalMax > 0
        ? Math.round((totalGot / totalMax) * 100)
        : (m.maxGrade && m.maxGrade > 0 ? Math.round(((m.overallGrade ?? 0) / m.maxGrade) * 100) : (v.aiScore ?? 0));
    const isSubmitted = (v as unknown as { isSnapshot?: boolean }).isSnapshot ?? v.isSubmitted ?? false;
    const changes = v.commitMessage ?? v.changes;
    return { wordCount, plagiarismScore, aiScore, isSubmitted, changes };
}

function VersionNode({
    version,
    previousVersion,
    isSelected,
    isCompareSelected,
    onSelect,
    onCompareSelect,
    onDownload,
    onViewFiles,
    isLast,
    allowCompare,
}: VersionNodeProps) {
    // ── Derive display metrics from metadata ───────────────────
    const metrics = extractMetrics(version);
    const prevMetrics = previousVersion ? extractMetrics(previousVersion) : null;

    // ── Compute deltas relative to the previous version ────────
    const wordDelta = prevMetrics ? metrics.wordCount - prevMetrics.wordCount : 0;
    const aiDelta   = prevMetrics ? metrics.aiScore - prevMetrics.aiScore : 0;
    const plagDelta = prevMetrics ? Math.round((metrics.plagiarismScore - prevMetrics.plagiarismScore) * 10) / 10 : 0;

    // ── Plagiarism colour for the metric tile ──────────────────
    const plagColor =
        metrics.plagiarismScore < 10
            ? 'text-green-600'
            : metrics.plagiarismScore < 20
            ? 'text-amber-600'
            : 'text-red-600';
    const plagBg =
        metrics.plagiarismScore < 10
            ? 'bg-green-50 border-green-200'
            : metrics.plagiarismScore < 20
            ? 'bg-amber-50 border-amber-200'
            : 'bg-red-50 border-red-200';

    // ── Card border: selection state takes priority ─────────────
    const cardBorder = isSelected
        ? 'border-purple-400 shadow-lg shadow-purple-100'
        : isCompareSelected
        ? 'border-blue-400 shadow-lg shadow-blue-100'
        : metrics.isSubmitted
        ? 'border-green-200'
        : 'border-gray-200 hover:border-purple-300';

    return (
        <div className={`relative ${!isLast ? 'pb-6' : ''}`}>
            {/* ── Vertical connecting line ───────────────────── */}
            {/* Positioned absolutely behind the circle so it looks continuous */}
            {!isLast && (
                <div className="absolute left-[23px] top-12 bottom-0 w-0.5 bg-gray-200" />
            )}

            <div className="flex gap-4">
                {/* ── Version circle ────────────────────────── */}
                {/*
                 * Circle colour:
                 *   Submitted version → green (this is the officially submitted copy)
                 *   Selected / compare-selected → purple
                 *   Otherwise → gray
                 */}
                <div className="flex flex-col items-center shrink-0">
                    <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${
                            metrics.isSubmitted
                                ? 'bg-green-600'
                                : isSelected || isCompareSelected
                                ? 'bg-purple-600'
                                : 'bg-gray-400'
                        }`}
                    >
                        v{version.versionNumber}
                    </div>
                    {/* "Submitted" label below the circle for the final version */}
                    {metrics.isSubmitted && (
                        <span className="text-xs text-green-600 font-medium mt-1 whitespace-nowrap">
                            Submitted
                        </span>
                    )}
                </div>

                {/* ── Version card ───────────────────────────── */}
                <div
                    className={`flex-1 rounded-xl border-2 p-5 cursor-pointer transition-all ${cardBorder}`}
                    onClick={() => {
                        console.debug('[VersionNode] card clicked — v', version.versionNumber, '| id:', version.id);
                        onSelect(version);
                    }}
                >
                    {/* Top row: title + timestamp + compare checkbox */}
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900">
                                    Version {version.versionNumber}
                                </h3>
                                {metrics.isSubmitted && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                        <CheckCircle2 size={12} />
                                        Submitted
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock size={14} />
                                {new Date(version.createdAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                            {/* Short "changes" note the student typed when uploading */}
                            {metrics.changes && (
                                <p className="text-sm text-gray-600 mt-1 italic">
                                    &quot;{metrics.changes}&quot;
                                </p>
                            )}
                        </div>

                        {/* ── Compare checkbox ──────────────────── */}
                        {/*
                         * stopPropagation prevents the card's onClick from also firing
                         * (which would try to "select" the version while the user only
                         * wanted to add it to the compare pair).
                         */}
                        {allowCompare && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.debug('[VersionNode] compare checkbox toggled — v', version.versionNumber);
                                    onCompareSelect(version);
                                }}
                                className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer hover:text-purple-700 select-none"
                            >
                                <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                        isCompareSelected
                                            ? 'bg-purple-600 border-purple-600 text-white'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    {isCompareSelected && (
                                        <CheckCircle2 size={12} />
                                    )}
                                </div>
                                Compare
                            </div>
                        )}
                    </div>

                    {/* ── Metrics grid ──────────────────────────── */}
                    {/*
                     * Three metric tiles: word count, plagiarism %, AI score.
                     * Each shows the raw value + a Delta badge relative to the
                     * previous version in the timeline.
                     */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        {/* Word count */}
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <FileText size={13} />
                                Words
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-gray-900">
                                    {metrics.wordCount.toLocaleString()}
                                </span>
                                {/* positiveGood=true: more words is progress */}
                                <Delta value={wordDelta} positiveGood />
                            </div>
                        </div>

                        {/* Plagiarism — colour-coded tile (threshold-aware background) */}
                        <div className={`p-3 border rounded-lg ${plagBg}`}>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <Shield size={13} />
                                Plagiarism
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-lg font-bold ${plagColor}`}>
                                    {metrics.plagiarismScore}%
                                </span>
                                {/* positiveGood=false: lower plagiarism is better */}
                                <Delta value={plagDelta} positiveGood={false} />
                            </div>
                        </div>

                        {/* AI score */}
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <Star size={13} />
                                AI Score
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-purple-600">
                                    {metrics.aiScore}%
                                </span>
                                {/* positiveGood=true: higher AI score is better */}
                                <Delta value={aiDelta} positiveGood />
                            </div>
                        </div>
                    </div>

                    {/* ── Action buttons ────────────────────────── */}
                    {/*
                     * stopPropagation on each button prevents the card onClick
                     * from firing alongside the button's own handler.
                     */}
                    <div className="flex gap-2">
                        {onViewFiles && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.debug('[VersionNode] "View Files" clicked — versionId:', version.id);
                                    onViewFiles(version.id);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                            >
                                <Eye size={13} />
                                {/* Files ({version.files.length}) */}
                            </button>
                        )}
                        {/* {onDownload && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.debug('[VersionNode] "Download" clicked — versionId:', version.id);
                                    onDownload(version.id);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                            >
                                <Download size={13} />
                                Download
                            </button>
                        )} */}
                        {/* Badge shown in place of actions for the officially submitted version */}
                        {/* {metrics.isSubmitted && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg font-medium">
                                <GitBranch size={13} />
                                Final submission
                            </span>
                        )} */}
                    </div>

                    {/* ── Expanded AI feedback panel ─────────────── */}
                    {/*
                     * Only shown when this version is the primary selected one AND
                     * the version object has pre-loaded aiFeedback text (a short
                     * summary stored on the version document, not the full Feedback
                     * service response).
                     */}
                    {isSelected && version.aiFeedback && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="p-3 bg-purple-50 border-l-4 border-purple-500 rounded">
                                <p className="text-xs font-medium text-purple-900 mb-1 flex items-center gap-1">
                                    <Star size={12} /> AI Feedback
                                </p>
                                <p className="text-sm text-purple-800">{version.aiFeedback}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── VersionTimeline (main export) ────────────────────────────

export interface VersionTimelineProps {
    /** Versions array — newest first (descending by versionNumber). */
    versions: SubmissionVersion[];
    loading?: boolean;
    error?: string | null;
    /** ID of the currently "selected" version (expanded view). */
    selectedVersionId?: string | null;
    /** IDs of the pair currently staged for diff comparison. */
    compareVersionIds?: [string, string] | null;
    /** Called when the user clicks a version card. */
    onSelectVersion?: (v: SubmissionVersion) => void;
    /**
     * Called when both compare slots are filled.
     * Receives the full SubmissionVersion objects (not just IDs) so the
     * parent can pass version numbers to DiffViewer.
     */
    onCompareVersions?: (vA: SubmissionVersion, vB: SubmissionVersion) => void;
    /** Called when the user clicks Download on a version node. */
    onDownload?: (versionId: string) => void;
    /** Called when the user clicks "Files (n)" on a version node. */
    onViewFiles?: (versionId: string) => void;
    /**
     * When false, the compare checkboxes are hidden and
     * the compare banner is not rendered.
     */
    allowCompare?: boolean;
}

export default function VersionTimeline({
    versions,
    loading = false,
    error = null,
    selectedVersionId = null,
    compareVersionIds = null,
    onSelectVersion,
    onCompareVersions,
    onDownload,
    onViewFiles,
    allowCompare = true,
}: VersionTimelineProps) {
    // ── Compare-slot state ────────────────────────────────────
    // We track the full SubmissionVersion objects (not just IDs) so we can
    // pass them directly to onCompareVersions without an extra lookup.
    const [compareA, setCompareA] = React.useState<SubmissionVersion | null>(null);
    const [compareB, setCompareB] = React.useState<SubmissionVersion | null>(null);

    console.debug(
        '[VersionTimeline] render — versions:', versions.length,
        '| loading:', loading,
        '| compareA:', compareA?.versionNumber ?? 'none',
        '| compareB:', compareB?.versionNumber ?? 'none'
    );

    /**
     * handleCompareSelect
     * ───────────────────
     * Manages the two-slot compare selection with these cycling rules:
     *
     *   Case: user deselects A  → A = B, B = null  (shift B into A slot)
     *   Case: user deselects B  → B = null
     *   Case: A is empty        → A = v             (fill first slot)
     *   Case: B is empty        → B = v             (fill second slot — diff fires)
     *   Case: both full (replace oldest) → A = B, B = v
     *
     * This prevents the user from ever having an invalid state (e.g. B filled
     * but A empty) which would break the diff label display.
     */
    const handleCompareSelect = (v: SubmissionVersion) => {
        console.debug('[VersionTimeline] handleCompareSelect — v', v.versionNumber, '| current A:', compareA?.versionNumber ?? 'none', ', B:', compareB?.versionNumber ?? 'none');

        if (compareA?.id === v.id) {
            // Deselect A → shift B into A slot so A is always filled first
            console.debug('[VersionTimeline] Deselecting A — shifting B to A.');
            setCompareA(compareB);
            setCompareB(null);
        } else if (compareB?.id === v.id) {
            // Deselect B → just clear B
            console.debug('[VersionTimeline] Deselecting B.');
            setCompareB(null);
        } else if (!compareA) {
            // Fill first slot
            console.debug('[VersionTimeline] Filling compareA with v', v.versionNumber);
            setCompareA(v);
        } else if (!compareB) {
            // Fill second slot — the useEffect below will fire onCompareVersions
            console.debug('[VersionTimeline] Filling compareB with v', v.versionNumber, '— will trigger diff.');
            setCompareB(v);
        } else {
            // Both slots full → replace the "older" selection (slot A) with slot B's
            // value, then put the new selection into slot B.
            console.debug('[VersionTimeline] Both slots full — rotating: A=B, B=v', v.versionNumber);
            setCompareA(compareB);
            setCompareB(v);
        }
    };

    /**
     * Fire onCompareVersions whenever both compare slots are filled.
     * Declared as a useEffect (not inside handleCompareSelect) because
     * React state updates are asynchronous — the new values of compareA/B
     * are only guaranteed by the next render cycle.
     */
    React.useEffect(() => {
        if (compareA && compareB && onCompareVersions) {
            console.debug(
                '[VersionTimeline] Both compare slots filled — calling onCompareVersions:',
                'v' + compareA.versionNumber, '↔', 'v' + compareB.versionNumber
            );
            onCompareVersions(compareA, compareB);
        }
    }, [compareA, compareB, onCompareVersions]);

    // ── Loading skeleton ──────────────────────────────────────
    if (loading) {
        console.debug('[VersionTimeline] Rendering loading skeleton.');
        return (
            <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />
                        <div className="flex-1 h-32 bg-gray-100 rounded-xl" />
                    </div>
                ))}
            </div>
        );
    }

    // ── Error state ───────────────────────────────────────────
    if (error) {
        console.debug('[VersionTimeline] Rendering error state:', error);
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
            </div>
        );
    }

    // ── Empty state ───────────────────────────────────────────
    if (!versions.length) {
        console.debug('[VersionTimeline] Rendering empty state — no versions.');
        return (
            <div className="flex flex-col items-center py-12 text-gray-500">
                <GitBranch size={40} className="text-gray-300 mb-3" />
                <p className="font-medium">No versions yet</p>
            </div>
        );
    }

    // ── Compare banner state ──────────────────────────────────
    // showCompareBanner is truthy when both slots are filled.
    const showCompareBanner = compareA && compareB;

    return (
        <div>
            {/* ── Instruction / compare banner ───────────────── */}
            {allowCompare && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                    {!compareA && 'Check the boxes next to versions to compare them.'}
                    {compareA && !compareB && (
                        <>
                            <span className="font-medium">v{compareA.versionNumber}</span>{' '}
                            selected — select one more to compare.
                        </>
                    )}
                    {showCompareBanner && (
                        <div className="flex items-center justify-between">
                            <span>
                                Comparing{' '}
                                <span className="font-medium">v{compareA.versionNumber}</span>{' '}
                                vs{' '}
                                <span className="font-medium">v{compareB.versionNumber}</span>
                            </span>
                            {/* Clear button resets both compare slots */}
                            <button
                                onClick={() => {
                                    console.debug('[VersionTimeline] Compare pair cleared.');
                                    setCompareA(null);
                                    setCompareB(null);
                                }}
                                className="text-xs text-gray-400 hover:text-gray-600 underline cursor-pointer"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Version nodes ──────────────────────────────── */}
            {/*
             * `versions[i + 1]` is the "previous" version when the array is
             * sorted newest-first. We pass it to VersionNode so it can compute
             * per-metric deltas relative to the preceding upload.
             */}
            <div className="space-y-0">
                {versions.map((version, i) => (
                    <VersionNode
                        key={version.id}
                        version={version}
                        previousVersion={versions[i + 1]}
                        isSelected={selectedVersionId === version.id}
                        isCompareSelected={
                            compareA?.id === version.id || compareB?.id === version.id
                        }
                        onSelect={(v) => onSelectVersion?.(v)}
                        onCompareSelect={handleCompareSelect}
                        onDownload={onDownload}
                        onViewFiles={onViewFiles}
                        isLast={i === versions.length - 1}
                        allowCompare={allowCompare}
                    />
                ))}
            </div>
        </div>
    );
}
