'use client';

/**
 * PlagiarismWarning.tsx
 * ─────────────────────────────────────────────────────────────
 * Rich inline plagiarism review panel shown below each question editor.
 *
 * Render states:
 *  null + !loading  → nothing rendered
 *  loading          → nothing rendered (silent; check fires after 3 s idle)
 *  CLEAN / LOW, no matches  → green chip "No internet plagiarism detected"
 *  MEDIUM           → amber banner + source list + guidance
 *  HIGH             → red alert + source list + guidance
 *
 * Each matched source shows:
 *  • Category badge (ACADEMIC, NEWS, BLOG, …)
 *  • Confidence level (HIGH / MEDIUM / LOW)
 *  • Similarity % badge
 *  • Webpage title (clickable link opening in new tab)
 *  • Domain label
 *  • Short snippet from the page
 *  • Matched excerpt from the student's own answer
 *
 * Two separate signal bars are shown: Internet similarity vs Peer similarity.
 * A rewriting guidance section appears when matches are found.
 */

import type {
    LivePlagiarismResult,
    InternetMatch,
    InternetMatchCategory,
    ConfidenceLevel,
} from '@/types/submission.types';

// ─── Props ────────────────────────────────────────────────────

export interface PlagiarismWarningProps {
    result: LivePlagiarismResult | null;
    loading: boolean;
}

// ─── Category metadata ────────────────────────────────────────

const CATEGORY_META: Record<InternetMatchCategory, { label: string; bg: string; text: string }> = {
    ACADEMIC:       { label: 'Academic',      bg: 'bg-blue-100',   text: 'text-blue-800' },
    ENCYCLOPEDIA:   { label: 'Encyclopedia',  bg: 'bg-purple-100', text: 'text-purple-800' },
    NEWS:           { label: 'News',          bg: 'bg-orange-100', text: 'text-orange-800' },
    GOVERNMENT:     { label: 'Government',    bg: 'bg-teal-100',   text: 'text-teal-800' },
    EDUCATIONAL:    { label: 'Educational',   bg: 'bg-cyan-100',   text: 'text-cyan-800' },
    BLOG:           { label: 'Blog',          bg: 'bg-gray-100',   text: 'text-gray-700' },
    TECH_COMMUNITY: { label: 'Tech / Dev',    bg: 'bg-indigo-100', text: 'text-indigo-800' },
    OTHER:          { label: 'Web',           bg: 'bg-slate-100',  text: 'text-slate-700' },
};

const CONFIDENCE_META: Record<ConfidenceLevel, { label: string; dot: string }> = {
    HIGH:   { label: 'High confidence',   dot: 'bg-red-500' },
    MEDIUM: { label: 'Medium confidence', dot: 'bg-amber-500' },
    LOW:    { label: 'Low confidence',    dot: 'bg-green-500' },
};

// ─── Risk meter bar ───────────────────────────────────────────

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
    const pct = Math.min(100, Math.max(0, value));
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 text-gray-500">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-right font-mono font-semibold">{pct.toFixed(0)}%</span>
        </div>
    );
}

// ─── Source card ──────────────────────────────────────────────

function SourceCard({ m, index }: { m: InternetMatch; index: number }) {
    const catMeta = CATEGORY_META[m.sourceCategory ?? 'OTHER'] ?? CATEGORY_META.OTHER;
    const confMeta = m.confidenceLevel ? CONFIDENCE_META[m.confidenceLevel] : null;

    return (
        <li className="rounded-lg border border-current/20 bg-white/70 overflow-hidden">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-1.5 flex-wrap">
                {/* Left: badges + title */}
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Category badge */}
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${catMeta.bg} ${catMeta.text}`}>
                            {catMeta.label}
                        </span>
                        {/* Confidence badge */}
                        {confMeta && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <span className={`w-2 h-2 rounded-full ${confMeta.dot}`} />
                                {confMeta.label}
                            </span>
                        )}
                    </div>

                    {/* Title / link */}
                    {m.url ? (
                        <a
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs font-semibold underline underline-offset-2 hover:opacity-70 break-words leading-snug"
                        >
                            {m.title || m.url}
                        </a>
                    ) : (
                        <span className="block text-xs font-semibold break-words leading-snug">
                            {m.title || 'Unknown source'}
                        </span>
                    )}

                    {m.sourceDomain && (
                        <span className="text-xs text-gray-400">{m.sourceDomain}</span>
                    )}
                </div>

                {/* Right: similarity badge */}
                <div className="flex-shrink-0 text-right">
                    <span className="text-sm font-bold tabular-nums">
                        {m.similarityScore.toFixed(0)}%
                    </span>
                    <p className="text-[10px] text-gray-400 -mt-0.5">match</p>
                </div>
            </div>

            {/* Snippet from source */}
            {m.snippet && (
                <div className="px-3 pb-2">
                    <p className="text-xs italic text-gray-600 leading-relaxed line-clamp-3 border-l-2 border-current/30 pl-2">
                        &ldquo;{m.snippet}&rdquo;
                    </p>
                </div>
            )}

            {/* Matched text from student answer */}
            {m.matchedStudentText && (
                <div className="px-3 pb-2.5">
                    <div className="rounded bg-amber-50 border border-amber-200 px-2.5 py-2">
                        <p className="text-xs font-semibold text-amber-700 mb-1">
                            Matching text in your answer:
                        </p>
                        <p className="text-xs text-amber-900 leading-relaxed line-clamp-2">
                            &ldquo;{m.matchedStudentText}&rdquo;
                        </p>
                    </div>
                </div>
            )}
        </li>
    );
}

// ─── Student guidance panel ───────────────────────────────────

function GuidancePanel({ severity }: { severity: 'MEDIUM' | 'HIGH' }) {
    const tips =
        severity === 'HIGH'
            ? [
                  'Rewrite matched sections completely in your own words.',
                  'Cite sources properly instead of copying — use APA or IEEE format.',
                  'Explain concepts using examples from your own understanding.',
                  'Contact your lecturer before submitting if you are unsure.',
              ]
            : [
                  'Try rephrasing the highlighted sentences in your own words.',
                  'Add your own analysis or interpretation alongside any facts.',
                  'If quoting, use quotation marks and cite the source.',
              ];

    return (
        <div className="mt-3 rounded-md bg-blue-50 border border-blue-200 px-3 py-3 text-sm">
            <div className="flex items-start gap-2">
                <svg className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                    <p className="font-semibold text-blue-800 mb-1.5">How to improve your answer:</p>
                    <ul className="space-y-1">
                        {tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-blue-700">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

// ─── Similarity signal bars ───────────────────────────────────

function SignalBars({ result }: { result: LivePlagiarismResult }) {
    const internet = result.internetSimilarityScore ?? result.similarityScore;
    const peer     = result.peerSimilarityScore ?? 0;

    const internetColor =
        internet >= 70 ? 'bg-red-500' :
        internet >= 40 ? 'bg-amber-500' : 'bg-green-500';
    const peerColor =
        peer >= 70 ? 'bg-red-500' :
        peer >= 40 ? 'bg-amber-500' : 'bg-green-500';

    return (
        <div className="mt-2 space-y-1.5">
            <ScoreBar label="Internet similarity" value={internet}  color={internetColor} />
            <ScoreBar label="Peer similarity"     value={peer}      color={peerColor} />
        </div>
    );
}

// ─── Source list ──────────────────────────────────────────────

function SourceList({ matches }: { matches: InternetMatch[] }) {
    if (!matches || matches.length === 0) return null;

    // Sort by similarity descending
    const sorted = [...matches].sort((a, b) => b.similarityScore - a.similarityScore);

    return (
        <div className="mt-3">
            <p className="text-xs font-semibold mb-2 opacity-80">
                Matching sources found ({sorted.length}):
            </p>
            <ul className="space-y-2">
                {sorted.map((m, i) => (
                    <SourceCard key={i} m={m} index={i} />
                ))}
            </ul>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────

export function PlagiarismWarning({ result, loading }: PlagiarismWarningProps) {

    console.debug('[PlagiarismWarning] render — loading:', loading,
        '| severity:', result?.severity ?? 'n/a',
        '| score:', result?.similarityScore ?? 'n/a', '%',
        '| riskLevel:', result?.riskLevel ?? 'n/a',
        '| flagged:', result?.flagged ?? false,
        '| matches:', result?.internetMatches?.length ?? 0);

    if (loading || !result) return null;

    const matches = result.internetMatches ?? [];

    // ── LOW with matches → show sources in an info panel ─────
    if (result.severity === 'LOW' && matches.length > 0) {
        return (
            <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                <div className="flex items-start gap-2.5">
                    <svg className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                        <span className="font-semibold">
                            Low similarity detected ({result.similarityScore.toFixed(0)}%)
                        </span>
                        {' — '}similar content found online but below the flagging threshold.

                        <SignalBars result={result} />

                        <SourceList matches={matches} />
                    </div>
                </div>
            </div>
        );
    }

    // ── CLEAN / LOW with no matches → green chip ──────────────
    if (result.severity === 'LOW') {
        return (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 w-fit">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>No internet plagiarism detected</span>
                {(result.peerSimilarityScore ?? 0) > 0 && (
                    <span className="ml-1 opacity-60">
                        · peer {(result.peerSimilarityScore ?? 0).toFixed(0)}%
                    </span>
                )}
            </div>
        );
    }

    // ── MEDIUM severity ───────────────────────────────────────
    if (result.severity === 'MEDIUM') {
        return (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <div className="flex items-start gap-2.5">
                    <svg className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                        <span className="font-semibold">
                            Similarity detected ({result.similarityScore.toFixed(0)}%)
                        </span>
                        {' — '}try rephrasing your answer in your own words.

                        <SignalBars result={result} />

                        {matches.length > 0 && <SourceList matches={matches} />}

                        <GuidancePanel severity="MEDIUM" />
                    </div>
                </div>
            </div>
        );
    }

    // ── HIGH severity ─────────────────────────────────────────
    return (
        <div className="rounded-md bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-800">
            <div className="flex items-start gap-2.5">
                <svg className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                    <span className="font-semibold">
                        High similarity ({result.similarityScore.toFixed(0)}%) — review required.
                    </span>
                    {result.riskScore != null && (
                        <span className="ml-2 text-xs font-normal opacity-70">
                            Risk score: {result.riskScore.toFixed(0)}/100
                        </span>
                    )}

                    <SignalBars result={result} />

                    {matches.length > 0 ? (
                        <SourceList matches={matches} />
                    ) : result.matchedText ? (
                        <p className="mt-1.5 italic opacity-80">
                            &ldquo;{result.matchedText.slice(0, 150)}{result.matchedText.length > 150 ? '…' : ''}&rdquo;
                        </p>
                    ) : null}

                    <GuidancePanel severity="HIGH" />
                </div>
            </div>
        </div>
    );
}
