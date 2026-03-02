'use client';

/**
 * LiveFeedbackPanel.tsx
 * ─────────────────────────────────────────────────────────────
 * Right-column panel that displays real-time AI analysis of the
 * student's typed answer. Rendered inside each QuestionCard.
 *
 * Render states:
 *  1. null + !loading → "Start typing…" ghost / empty state
 *  2. loading         → spinner with "Analysing your answer…"
 *  3. feedback        → 4 score bars (0-10) + strengths + improvements + suggestions
 *
 * Score bar colours (matching ScoreGauge semantics, scaled to 0-10):
 *  ≥ 8 → green   (bg-green-500)
 *  ≥ 6 → amber   (bg-amber-400)
 *  < 6 → red     (bg-red-400)
 *
 * Debug:
 *  All console.debug calls are prefixed with "[LiveFeedbackPanel]".
 */

import type { LiveFeedback } from '@/types/submission.types';

// ─── Props ────────────────────────────────────────────────────

export interface LiveFeedbackPanelProps {
    /** The most recent AI feedback object, or null before first response. */
    feedback: LiveFeedback | null;
    /** True while the feedback request is in-flight. */
    loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Tailwind fill colour for a 0–10 score bar.
 *  ≥ 8 → green, ≥ 6 → amber, < 6 → red
 */
function scoreBarColour(score: number): string {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-amber-400';
    return 'bg-red-400';
}

/**
 * Tailwind text colour for the numeric score label.
 */
function scoreLabelColour(score: number): string {
    if (score >= 8) return 'text-green-700';
    if (score >= 6) return 'text-amber-600';
    return 'text-red-600';
}

// ─── Sub-components ───────────────────────────────────────────

/** A single labelled score row with a filled progress bar. */
function ScoreRow({ label, score }: { label: string; score: number }) {
    const pct = (score / 10) * 100;
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">{label}</span>
                <span className={`text-xs font-semibold tabular-nums ${scoreLabelColour(score)}`}>
                    {score.toFixed(1)} / 10
                </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${scoreBarColour(score)}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

/** A bullet-point list with a coloured heading. */
function BulletList({
    title,
    items,
    dotColour,
}: {
    title: string;
    items: string[];
    dotColour: string;
}) {
    if (!items || items.length === 0) return null;
    return (
        <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1.5">{title}</h4>
            <ul className="space-y-1">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotColour}`} />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────

export function LiveFeedbackPanel({ feedback, loading }: LiveFeedbackPanelProps) {

    console.debug('[LiveFeedbackPanel] render — loading:', loading, '| grammarScore:', feedback?.grammarScore);

    // ── State 1: Empty / ghost ────────────────────────────────
    if (!feedback && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                <div className="mb-3 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    {/* Pencil-spark icon (inline SVG — no extra import needed) */}
                    <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">AI Feedback</p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    Start typing your answer — AI feedback will appear here automatically.
                </p>
            </div>
        );
    }

    // ── State 2: Loading ──────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] rounded-lg border border-gray-100 bg-gray-50 p-6 text-center">
                <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-purple-200 border-t-purple-500" />
                <p className="text-xs text-gray-500">Analysing your answer…</p>
            </div>
        );
    }

    // ── State 3: Feedback ready ───────────────────────────────
    return (
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg className="h-3.5 w-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <span className="text-sm font-semibold text-gray-800">AI Feedback</span>
                <span className="ml-auto text-xs text-gray-400">Live</span>
            </div>

            {/* Score bars */}
            <div className="flex flex-col gap-3">
                <ScoreRow label="Grammar"      score={feedback!.grammarScore} />
                <ScoreRow label="Clarity"      score={feedback!.clarityScore} />
                <ScoreRow label="Completeness" score={feedback!.completenessScore} />
                <ScoreRow label="Relevance"    score={feedback!.relevanceScore} />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Bullets */}
            <BulletList
                title="Strengths"
                items={feedback!.strengths}
                dotColour="bg-green-500"
            />
            <BulletList
                title="Areas to improve"
                items={feedback!.improvements}
                dotColour="bg-amber-400"
            />
            <BulletList
                title="Suggestions"
                items={feedback!.suggestions}
                dotColour="bg-purple-400"
            />

            {/* Timestamp */}
            {feedback!.generatedAt && (
                <p className="text-xs text-gray-400 text-right">
                    Updated {new Date(feedback!.generatedAt).toLocaleTimeString()}
                </p>
            )}
        </div>
    );
}
