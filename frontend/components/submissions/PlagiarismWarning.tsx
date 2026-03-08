'use client';

/**
 * PlagiarismWarning.tsx
 * ─────────────────────────────────────────────────────────────
 * Inline plagiarism result shown below each question's editor.
 *
 * Render states:
 *  null + !loading  → nothing rendered
 *  loading          → nothing rendered (silent; check fires after 3 s idle)
 *  LOW, no matches  → green chip "No internet plagiarism detected"
 *  MEDIUM           → amber banner + matched source list
 *  HIGH             → red alert + matched source list
 *
 * Each matched source shows:
 *  • Similarity % badge
 *  • Webpage title (clickable link opening in new tab)
 *  • Domain label
 *  • Short snippet from the page
 */

import type { LivePlagiarismResult, InternetMatch } from '@/types/submission.types';

// ─── Props ────────────────────────────────────────────────────

export interface PlagiarismWarningProps {
    result: LivePlagiarismResult | null;
    loading: boolean;
}

// ─── Source list ──────────────────────────────────────────────

function SourceList({ matches }: { matches: InternetMatch[] }) {
    if (!matches || matches.length === 0) return null;
    return (
        <ul className="mt-2 space-y-2">
            {matches.map((m, i) => (
                <li key={i} className="rounded border border-current/20 bg-white/60 px-3 py-2 text-xs">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                        {/* Title + link */}
                        <div className="flex-1 min-w-0">
                            {m.url ? (
                                <a
                                    href={m.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold underline underline-offset-2 hover:opacity-75 break-words"
                                >
                                    {m.title || m.url}
                                </a>
                            ) : (
                                <span className="font-semibold">{m.title || 'Unknown source'}</span>
                            )}
                            {m.sourceDomain && (
                                <span className="ml-2 text-[10px] opacity-60">{m.sourceDomain}</span>
                            )}
                        </div>
                        {/* Similarity badge */}
                        <span className="flex-shrink-0 font-bold tabular-nums">
                            {m.similarityScore.toFixed(0)}% match
                        </span>
                    </div>
                    {/* Snippet */}
                    {m.snippet && (
                        <p className="mt-1 italic opacity-75 leading-snug line-clamp-3">
                            &ldquo;{m.snippet}&rdquo;
                        </p>
                    )}
                </li>
            ))}
        </ul>
    );
}

// ─── Component ────────────────────────────────────────────────

export function PlagiarismWarning({ result, loading }: PlagiarismWarningProps) {

    console.debug('[PlagiarismWarning] render — loading:', loading,
        '| severity:', result?.severity ?? 'n/a',
        '| score:', result?.similarityScore ?? 'n/a', '%',
        '| flagged:', result?.flagged ?? false,
        '| matches:', result?.internetMatches?.length ?? 0);

    if (loading || !result) return null;

    const matches = result.internetMatches ?? [];

    // ── LOW severity ─────────────────────────────────────────
    if (result.severity === 'LOW') {
        return (
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 w-fit">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>No internet plagiarism detected</span>
            </div>
        );
    }

    // ── MEDIUM severity ───────────────────────────────────────
    if (result.severity === 'MEDIUM') {
        return (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <div className="flex items-start gap-2">
                    <svg className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <div className="flex-1">
                        <span className="font-semibold">
                            Similarity detected ({result.similarityScore.toFixed(0)}%)
                        </span>
                        {' — '}try rephrasing your answer in your own words.
                        {matches.length > 0 && (
                            <>
                                <p className="mt-1.5 font-medium">Similar content found on:</p>
                                <SourceList matches={matches} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── HIGH severity ─────────────────────────────────────────
    return (
        <div className="rounded-md bg-red-50 border border-red-300 px-3 py-2 text-xs text-red-800">
            <div className="flex items-start gap-2">
                <svg className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                    <span className="font-semibold">
                        High similarity ({result.similarityScore.toFixed(0)}%) detected — review required.
                    </span>
                    {matches.length > 0 ? (
                        <>
                            <p className="mt-1.5 font-medium">Matching sources found:</p>
                            <SourceList matches={matches} />
                        </>
                    ) : result.matchedText ? (
                        <p className="mt-1 italic opacity-80">
                            &ldquo;{result.matchedText.slice(0, 120)}{result.matchedText.length > 120 ? '…' : ''}&rdquo;
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
