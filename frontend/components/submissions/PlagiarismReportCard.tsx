'use client';

/**
 * PlagiarismReportCard.tsx
 * ─────────────────────────────────────────────────────────────
 * Renders a plagiarism analysis report for a single submission.
 * Used in both the student feedback page (compact view) and the
 * lecturer plagiarism management page (detailed view).
 *
 * Responsibilities:
 *  • Handle four distinct render states:
 *      1. Loading / PENDING / PROCESSING — animated skeleton + spinner.
 *      2. Error — error banner with optional "Run Check" retry button.
 *      3. No report — empty state with optional "Run Plagiarism Check" CTA.
 *      4. Full display — similarity score, traffic light, stats, top matches,
 *         and threshold legend.
 *  • Show top matches only in detailed mode (lecturer) or when score ≥ 20%
 *    (always flag high-risk to students too).
 *
 * Colour / risk thresholds (TrafficLight + score display):
 *   < 20%  → green  / Low Risk
 *   20–39% → amber  / Medium Risk — review required
 *   ≥ 40%  → red    / High Risk   — academic integrity concern
 *
 * Debug:
 *  All console.debug calls are prefixed with "[PlagiarismReportCard]" so
 *  they can be filtered in the browser DevTools console.
 */

import React from 'react';
import {
    Shield,
    AlertTriangle,
    CheckCircle2,
    Globe,
    Flag,
    Loader,
    ExternalLink,
    AlertCircle,
} from 'lucide-react';
import type { PlagiarismReport } from '@/types/submission.types';

// ─── TrafficLight ─────────────────────────────────────────────
//
// A coloured dot + label giving an immediate visual risk signal.
//
// Thresholds mirror the Guidelines section at the bottom of the card
// and the backend's FLAGGED logic:
//   < 20%  → green / Low Risk
//   20–39% → amber / Medium Risk
//   ≥ 40%  → red   / High Risk

function TrafficLight({ score }: { score: number }) {
    if (score < 20) {
        return (
            <div className="flex items-center gap-2 text-green-700">
                {/* Glowing green dot via shadow-green-300 */}
                <div className="w-4 h-4 rounded-full bg-green-500 shadow-md shadow-green-300" />
                <span className="text-sm font-medium">Low Risk</span>
            </div>
        );
    }
    if (score < 40) {
        return (
            <div className="flex items-center gap-2 text-amber-700">
                <div className="w-4 h-4 rounded-full bg-amber-500 shadow-md shadow-amber-300" />
                <span className="text-sm font-medium">Medium Risk</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2 text-red-700">
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-md shadow-red-300" />
            <span className="text-sm font-medium">High Risk</span>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────

export interface PlagiarismReportCardProps {
    /** Resolved report from the API, or null while pending / not yet run. */
    report: PlagiarismReport | null;
    /** True while the initial fetch is in-flight. */
    loading?: boolean;
    /** Error message when the fetch fails. */
    error?: string | null;
    /** Called when the user clicks "Run Check" or "Re-check". */
    onCheck?: () => void;
    /** True while a plagiarism check request is in-flight — disables the button. */
    checking?: boolean;
    /**
     * When true (lecturer view), shows all top matches and the full match list.
     * When false (student view), top matches are only shown if score ≥ 20%.
     */
    detailed?: boolean;
}

// ─── Component ────────────────────────────────────────────────

export default function PlagiarismReportCard({
    report,
    loading = false,
    error = null,
    onCheck,
    checking = false,
    detailed = false,
}: PlagiarismReportCardProps) {
    console.debug(
        '[PlagiarismReportCard] render — loading:', loading,
        '| status:', report?.status ?? 'null',
        '| score:', report?.overallScore ?? 'n/a',
        '| detailed:', detailed,
        '| error:', error ?? 'none'
    );

    // ── State 1: Loading / PENDING / PROCESSING ────────────────
    //
    // Two sub-cases:
    //  a) `loading` is true → initial HTTP fetch in-flight → show skeleton.
    //  b) report exists but status is PENDING/PROCESSING → check is running
    //     on the backend → show spinner + skeleton (parent polls via interval).
    if (
        loading ||
        report?.status === 'PROCESSING' ||
        report?.status === 'PENDING'
    ) {
        console.debug('[PlagiarismReportCard] Rendering pending/loading state — report.status:', report?.status);
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                    <Loader size={24} className="text-green-600 animate-spin" />
                    <h2 className="text-xl font-bold text-gray-900">Plagiarism Report</h2>
                </div>
                {/* Skeleton tiles mimicking score + stats layout */}
                <div className="animate-pulse space-y-3">
                    <div className="h-16 bg-gray-100 rounded-lg" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
            </div>
        );
    }

    // ── State 2: Error ─────────────────────────────────────────
    //
    // The API call failed. Shows the message and an optional "Run Check"
    // retry button (used when the check itself errored on the backend).
    if (error) {
        console.debug('[PlagiarismReportCard] Rendering error state:', error);
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                    <Shield size={24} className="text-green-600" />
                    <h2 className="text-xl font-bold text-gray-900">Plagiarism Report</h2>
                </div>
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
                {onCheck && (
                    <button
                        onClick={() => {
                            console.debug('[PlagiarismReportCard] "Run Check" clicked after error.');
                            onCheck();
                        }}
                        disabled={checking}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium cursor-pointer"
                    >
                        {checking ? 'Checking…' : 'Run Check'}
                    </button>
                )}
            </div>
        );
    }

    // ── State 3: No report yet ─────────────────────────────────
    //
    // The fetch succeeded but no plagiarism document exists for this
    // submission (check hasn't been triggered). Shows an empty state
    // with an optional "Run Plagiarism Check" CTA.
    if (!report) {
        console.debug('[PlagiarismReportCard] Rendering empty state — no report document.');
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                    <Shield size={24} className="text-green-600" />
                    <h2 className="text-xl font-bold text-gray-900">Plagiarism Report</h2>
                </div>
                <div className="flex flex-col items-center py-6 text-center text-gray-500">
                    <Shield size={40} className="text-gray-300 mb-3" />
                    <p className="font-medium">No plagiarism check yet</p>
                    {onCheck && (
                        <button
                            onClick={() => {
                                console.debug('[PlagiarismReportCard] "Run Plagiarism Check" clicked.');
                                onCheck();
                            }}
                            disabled={checking}
                            className="mt-4 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer"
                        >
                            {checking ? (
                                <Loader size={16} className="animate-spin" />
                            ) : (
                                <Shield size={16} />
                            )}
                            {checking ? 'Checking…' : 'Run Plagiarism Check'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── State 4: Full display ──────────────────────────────────
    //
    // Report is resolved and COMPLETED. Destructure the fields we need.
    const { overallScore, sourcesChecked, matchesFound, topMatches, details } = report;

    console.debug(
        '[PlagiarismReportCard] Rendering full report — score:', overallScore, '%',
        '| sources:', sourcesChecked,
        '| matches:', matchesFound,
        '| topMatches:', topMatches.length
    );

    // Score-based colour classes applied to the large percentage number
    // and the outer score panel background/border.
    const scoreColor =
        overallScore < 20
            ? 'text-green-600'
            : overallScore < 40
            ? 'text-amber-600'
            : 'text-red-600';
    const scoreBg =
        overallScore < 20
            ? 'bg-green-50 border-green-200'
            : overallScore < 40
            ? 'bg-amber-50 border-amber-200'
            : 'bg-red-50 border-red-200';

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            {/* ── Header ──────────────────────────────────────── */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    {/* Shield icon colour reflects risk level for instant visual cue */}
                    <Shield
                        size={24}
                        className={overallScore < 20 ? 'text-green-600' : overallScore < 40 ? 'text-amber-600' : 'text-red-600'}
                    />
                    <h2 className="text-xl font-bold text-gray-900">Plagiarism Report</h2>
                </div>
                {/* Re-check button — allows lecturers to re-run the check */}
                {onCheck && (
                    <button
                        onClick={() => {
                            console.debug('[PlagiarismReportCard] "Re-check" clicked — current score:', overallScore, '%');
                            onCheck();
                        }}
                        disabled={checking}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium cursor-pointer"
                    >
                        {checking ? 'Checking…' : 'Re-check'}
                    </button>
                )}
            </div>

            <div className="p-6 space-y-5">
                {/* ── Similarity score panel ───────────────────── */}
                {/*
                 * Large score number + TrafficLight + contextual message.
                 * The 2-border-width panel colour matches the risk threshold.
                 */}
                <div className={`p-5 rounded-lg border-2 ${scoreBg}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">
                                Similarity Score
                            </p>
                            <p className={`text-5xl font-bold ${scoreColor}`}>
                                {overallScore}%
                            </p>
                        </div>
                        <div className="text-right space-y-2">
                            <TrafficLight score={overallScore} />
                            {/* Show warning or approval below the traffic light */}
                            {overallScore >= 20 && (
                                <div className="flex items-center gap-1 text-xs text-red-600">
                                    <AlertTriangle size={14} />
                                    Review required
                                </div>
                            )}
                            {overallScore < 20 && (
                                <div className="flex items-center gap-1 text-xs text-green-600">
                                    <CheckCircle2 size={14} />
                                    Original work
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Stats: sources checked + matches found ────── */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                            <Globe size={14} />
                            Sources Checked
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                            {sourcesChecked.toLocaleString()}
                        </p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                            <Flag size={14} />
                            Matches Found
                        </div>
                        <p className="text-xl font-bold text-gray-900">{matchesFound}</p>
                    </div>
                </div>

                {/* ── Details paragraph (optional) ─────────────── */}
                {/* Free-text summary from the plagiarism engine */}
                {details && (
                    <p className="text-sm text-gray-600">{details}</p>
                )}

                {/* ── Top matches ───────────────────────────────── */}
                {/*
                 * Visibility logic:
                 *  - `detailed` (lecturer view) → always show all matches.
                 *  - student view (detailed=false) → only show when score ≥ 20%
                 *    so students can see what was flagged without revealing the
                 *    full database to everyone.
                 *
                 * In non-detailed mode we cap the list at 3 entries to keep the
                 * card compact; detailed mode shows all.
                 */}
                {(detailed || overallScore >= 20) && topMatches.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3 text-sm">
                            Top Matches
                        </h3>
                        <div className="space-y-2">
                            {topMatches.slice(0, detailed ? topMatches.length : 3).map((match, i) => (
                                <div
                                    key={i}
                                    className="p-3 bg-red-50 border border-red-100 rounded-lg"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {match.source}
                                            </p>
                                            <p className="text-xs text-gray-500">{match.type}</p>
                                            {/* External link to the source (only when URL is available) */}
                                            {match.url && (
                                                <a
                                                    href={match.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                                                >
                                                    <ExternalLink size={11} />
                                                    View Source
                                                </a>
                                            )}
                                        </div>
                                        {/* Match percentage — right-aligned for easy scanning */}
                                        <span className="text-lg font-bold text-red-600 shrink-0">
                                            {match.percentage}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Threshold legend ──────────────────────────── */}
                {/*
                 * Always visible. Provides context for interpreting the score
                 * and aligns with the institution's academic integrity policy.
                 * Thresholds mirror the TrafficLight component above.
                 */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-1">
                    <p className="font-medium text-gray-700">Plagiarism Thresholds:</p>
                    <p>
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                        0–19%: Low — Generally acceptable
                    </p>
                    <p>
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
                        20–39%: Medium — Review required
                    </p>
                    <p>
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />
                        40%+: High — Academic integrity concern
                    </p>
                </div>
            </div>
        </div>
    );
}
