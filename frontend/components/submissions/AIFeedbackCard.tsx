'use client';

/**
 * AIFeedbackCard.tsx
 * ─────────────────────────────────────────────────────────────
 * Displays the AI-generated feedback for a single submission.
 * The parent page polls the Feedback service until the status
 * transitions from PENDING/PROCESSING → COMPLETED, then passes
 * the resolved Feedback object here.
 *
 * Responsibilities:
 *  • Handle four distinct render states:
 *      1. Loading / PENDING / PROCESSING — show spinner + skeleton or
 *         a "Generating…" message.
 *      2. Error — show an error banner with an optional "Try Again" button.
 *      3. No feedback (null, status COMPLETED but nothing returned) — show
 *         an empty state with an optional "Generate AI Feedback" button.
 *      4. Full display — render score gauges, overall assessment, strengths,
 *         improvements, and recommendations.
 *  • Allow the parent to trigger regeneration via the `onRegenerate` callback.
 *
 * Colour thresholds for ScoreGauge:
 *   score ≥ 80 → green  (excellent)
 *   score ≥ 60 → amber  (satisfactory, room to improve)
 *   score  < 60 → red   (needs significant work)
 *
 * Debug:
 *  All console.debug calls are prefixed with "[AIFeedbackCard]" so they
 *  can be filtered in the browser DevTools console.
 */

import React from 'react';
import {
    Star,
    CheckCircle2,
    TrendingUp,
    Lightbulb,
    Loader,
    AlertCircle,
    Clock,
} from 'lucide-react';
import type { Feedback } from '@/types/submission.types';

// ─── ScoreGauge ───────────────────────────────────────────────
//
// Horizontal progress bar + numeric label for a single score dimension.
// Clamps the incoming score to [0, 100] before display so malformed
// API values don't break the layout.
//
// Colour thresholds (also applied to the bar colour):
//   ≥ 80 → green  | ≥ 60 → amber  | < 60 → red

function ScoreGauge({ label, score }: { label: string; score: number }) {
    // Clamp to valid percentage range — defensive against unusual API values.
    const pct = Math.min(Math.max(score, 0), 100);

    const color =
        pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';
    const bar =
        pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{pct}/100</span>
            </div>
            {/* Animated fill via transition-all duration-700 for a smooth reveal */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                    className={`h-2 rounded-full transition-all duration-700 ${bar}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ─── FeedbackSkeleton ─────────────────────────────────────────
//
// Animated placeholder rendered while the API request is in-flight.
// Mimics the general shape of the content area (two header lines +
// three body lines) so the card doesn't shift in size when data arrives.

function FeedbackSkeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
                <div className="h-3 bg-gray-200 rounded w-4/6" />
            </div>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────

export interface AIFeedbackCardProps {
    /** The resolved Feedback object from the API, or null while pending. */
    feedback: Feedback | null;
    /** True while the initial fetch request is in-flight. */
    loading?: boolean;
    /** Error message string from the hook when the fetch fails. */
    error?: string | null;
    /** Called when the user clicks "Regenerate" or "Try Again". */
    onRegenerate?: () => void;
    /** True while the regeneration request is in-flight — disables the button. */
    regenerating?: boolean;
}

// ─── Component ────────────────────────────────────────────────

export default function AIFeedbackCard({
    feedback,
    loading = false,
    error = null,
    onRegenerate,
    regenerating = false,
}: AIFeedbackCardProps) {
    console.debug(
        '[AIFeedbackCard] render — loading:', loading,
        '| status:', feedback?.status ?? 'null',
        '| error:', error ?? 'none'
    );

    // ── State 1: Pending / Processing ─────────────────────────
    //
    // Two sub-cases are handled here:
    //  a) `loading` is true   → initial fetch in-flight → show skeleton
    //  b) feedback exists but status is PENDING/PROCESSING → the AI job is
    //     queued/running → show a "Generating…" message with a clock icon.
    //     The parent page polls the API every ~3s and will update feedback
    //     once the job completes.
    if (loading || feedback?.status === 'PROCESSING' || feedback?.status === 'PENDING') {
        console.debug('[AIFeedbackCard] Rendering pending/loading state — loading:', loading, '| feedback.status:', feedback?.status);
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                    <Loader size={24} className="text-purple-600 animate-spin" />
                    <h2 className="text-xl font-bold text-gray-900">AI Feedback</h2>
                </div>
                {loading ? (
                    // Initial HTTP fetch — show skeleton lines
                    <FeedbackSkeleton />
                ) : (
                    // AI job is queued/running on the backend
                    <div className="flex flex-col items-center py-6 text-center">
                        <Clock size={40} className="text-purple-400 mb-3" />
                        <p className="text-gray-600 font-medium">Generating AI feedback…</p>
                        <p className="text-sm text-gray-500 mt-1">
                            This usually takes 20–60 seconds
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // ── State 2: Error ────────────────────────────────────────
    //
    // The fetch failed (network error, 5xx, etc.).
    // Shows the error message and an optional "Try Again" button that
    // calls onRegenerate so the parent can retry.
    if (error) {
        console.debug('[AIFeedbackCard] Rendering error state:', error);
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                    <Star size={24} className="text-purple-600" />
                    <h2 className="text-xl font-bold text-gray-900">AI Feedback</h2>
                </div>
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Failed to load feedback</p>
                        <p className="text-sm text-red-600 mt-0.5">{error}</p>
                    </div>
                </div>
                {onRegenerate && (
                    <button
                        onClick={() => {
                            console.debug('[AIFeedbackCard] "Try Again" clicked after error.');
                            onRegenerate();
                        }}
                        disabled={regenerating}
                        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium cursor-pointer"
                    >
                        {regenerating ? 'Generating…' : 'Try Again'}
                    </button>
                )}
            </div>
        );
    }

    // ── State 3: No feedback yet ──────────────────────────────
    //
    // The fetch succeeded but returned null — either because the AI job
    // has not been triggered or the feedback document doesn't exist yet.
    // Shows an empty state with an optional "Generate AI Feedback" button.
    if (!feedback) {
        console.debug('[AIFeedbackCard] Rendering empty state — no feedback document.');
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                    <Star size={24} className="text-purple-600" />
                    <h2 className="text-xl font-bold text-gray-900">AI Feedback</h2>
                </div>
                <div className="flex flex-col items-center py-6 text-center text-gray-500">
                    <Star size={40} className="text-gray-300 mb-3" />
                    <p className="font-medium">No AI feedback yet</p>
                    {onRegenerate && (
                        <button
                            onClick={() => {
                                console.debug('[AIFeedbackCard] "Generate AI Feedback" clicked.');
                                onRegenerate();
                            }}
                            disabled={regenerating}
                            className="mt-4 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer"
                        >
                            {regenerating ? (
                                <Loader size={16} className="animate-spin" />
                            ) : (
                                <Star size={16} />
                            )}
                            {regenerating ? 'Generating…' : 'Generate AI Feedback'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── State 4: Full display ─────────────────────────────────
    //
    // Feedback is available and COMPLETED. Destructure only the fields
    // we actually render; other fields (e.g. submissionId, generatedAt)
    // are metadata used by the parent page.
    const { scores, overallAssessment, strengths, improvements, recommendations } = feedback;
    console.debug(
        '[AIFeedbackCard] Rendering full feedback — overall score:', scores?.overall ?? 'n/a',
        '| strengths:', strengths?.length ?? 0,
        '| improvements:', improvements?.length ?? 0,
        '| recommendations:', recommendations?.length ?? 0
    );

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            {/* ── Header with optional Regenerate button ───────── */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white">
                <div className="flex items-center gap-3">
                    <Star size={24} className="text-purple-600" />
                    <h2 className="text-xl font-bold text-gray-900">AI-Generated Feedback</h2>
                </div>
                {/* Regenerate button only visible when the parent provides the callback */}
                {onRegenerate && (
                    <button
                        onClick={() => {
                            console.debug('[AIFeedbackCard] "Regenerate" clicked.');
                            onRegenerate();
                        }}
                        disabled={regenerating}
                        className="px-3 py-1.5 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50 transition-colors font-medium cursor-pointer"
                    >
                        {regenerating ? 'Regenerating…' : 'Regenerate'}
                    </button>
                )}
            </div>

            <div className="p-6 space-y-6">
                {/* ── Score gauges ───────────────────────────────── */}
                {/*
                 * `scores` contains at least an `overall` field; the per-dimension
                 * fields (codeQuality, correctness, style, documentation) are optional
                 * and depend on the assignment type configured in the Feedback service.
                 */}
                {scores && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Star size={18} className="text-purple-600" />
                            Scores
                        </h3>
                        <ScoreGauge label="Overall" score={scores.overall} />
                        {scores.codeQuality != null && (
                            <ScoreGauge label="Code Quality" score={scores.codeQuality} />
                        )}
                        {scores.correctness != null && (
                            <ScoreGauge label="Correctness" score={scores.correctness} />
                        )}
                        {scores.style != null && (
                            <ScoreGauge label="Style" score={scores.style} />
                        )}
                        {scores.documentation != null && (
                            <ScoreGauge label="Documentation" score={scores.documentation} />
                        )}
                    </div>
                )}

                {/* ── Overall assessment ────────────────────────── */}
                {/* Free-text paragraph summarising the submission quality */}
                {overallAssessment && (
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Overall Assessment</h3>
                        <p className="text-gray-700 leading-relaxed">{overallAssessment}</p>
                    </div>
                )}

                {/* ── Strengths ─────────────────────────────────── */}
                {/* Positive points; each rendered as a green-tick bullet */}
                {strengths && strengths.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-green-600" />
                            Strengths
                        </h3>
                        <ul className="space-y-2">
                            {strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                                    <span className="text-green-600 mt-0.5 shrink-0">✓</span>
                                    <span>{s}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Areas for improvement ─────────────────────── */}
                {/* Constructive criticism; each rendered as an amber arrow bullet */}
                {improvements && improvements.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <TrendingUp size={18} className="text-amber-600" />
                            Areas for Improvement
                        </h3>
                        <ul className="space-y-2">
                            {improvements.map((imp, i) => (
                                <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                                    <span className="text-amber-600 mt-0.5 shrink-0">→</span>
                                    <span>{imp}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Recommendations ───────────────────────────── */}
                {/* Actionable next steps; purple bullet aligns with the AI brand colour */}
                {recommendations && recommendations.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Lightbulb size={18} className="text-purple-600" />
                            Recommendations
                        </h3>
                        <ul className="space-y-2">
                            {recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                                    <span className="text-purple-600 mt-0.5 shrink-0">•</span>
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
