'use client';

/**
 * PlagiarismWarning.tsx
 * ─────────────────────────────────────────────────────────────
 * Compact inline warning rendered below each question's text editor.
 * Shows the live plagiarism-check result in a severity-appropriate style.
 *
 * Render states:
 *  null + !loading → renders nothing (no DOM node, no extra whitespace)
 *  loading         → renders nothing (silent — avoid distracting spinner
 *                    mid-typing; the check fires after a 3 s idle period)
 *  LOW severity    → small green chip   "✓ No significant similarity detected"
 *  MEDIUM severity → amber banner       "⚠ Similarity detected (X %) — try rephrasing"
 *  HIGH severity   → red alert banner   "High similarity (X %) detected — review required"
 *
 * Debug:
 *  All console.debug calls are prefixed with "[PlagiarismWarning]".
 */

import type { LivePlagiarismResult } from '@/types/submission.types';

// ─── Props ────────────────────────────────────────────────────

export interface PlagiarismWarningProps {
    /** The most recent plagiarism result, or null before first check. */
    result: LivePlagiarismResult | null;
    /** True while the plagiarism check is in-flight. */
    loading: boolean;
}

// ─── Component ────────────────────────────────────────────────

export function PlagiarismWarning({ result, loading }: PlagiarismWarningProps) {

    console.debug('[PlagiarismWarning] render — loading:', loading,
        '| severity:', result?.severity ?? 'n/a',
        '| score:', result?.similarityScore ?? 'n/a', '%',
        '| flagged:', result?.flagged ?? false);

    // Render nothing while loading or before any result arrives.
    if (loading || !result) return null;

    // ── LOW severity ─────────────────────────────────────────
    // Small green pill — reassuring, takes minimal space.
    if (result.severity === 'LOW') {
        return (
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 w-fit">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>No significant similarity detected</span>
            </div>
        );
    }

    // ── MEDIUM severity ───────────────────────────────────────
    // Amber banner — visible but not alarming.
    if (result.severity === 'MEDIUM') {
        return (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <svg className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>
                    <span className="font-semibold">Similarity detected ({result.similarityScore.toFixed(0)} %)</span>
                    {' — '}try rephrasing your answer in your own words.
                </span>
            </div>
        );
    }

    // ── HIGH severity ─────────────────────────────────────────
    // Red alert — flags the issue clearly without blocking submission.
    return (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-300 px-3 py-2 text-xs text-red-800">
            <svg className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
                <span className="font-semibold">
                    High similarity ({result.similarityScore.toFixed(0)} %) detected — review required.
                </span>
                {result.matchedText && (
                    <p className="mt-1 text-red-700 italic">
                        Matched: "{result.matchedText.slice(0, 120)}{result.matchedText.length > 120 ? '…' : ''}"
                    </p>
                )}
            </div>
        </div>
    );
}
