'use client';

/**
 * TextDiffViewer
 * ─────────────────────────────────────────────────────────────
 * Shows a side-by-side comparison of two text-based submission versions.
 * Both versions must have metadata.type === 'TEXT_SUBMISSION' (i.e. snapshots
 * created by versionService.createTextSnapshot after the student submits).
 *
 * For each question (aligned by questionId):
 *   • AI score deltas  (grammar / clarity / completeness / relevance)
 *   • Word-level diff of the answer text (green = added, red = removed)
 *   • Per-question grade change
 *
 * Footer shows overall grade change summary.
 */

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { diffWords, mergeDiffTokens } from '@/lib/textDiff';
import type { SubmissionVersion } from '@/types/submission.types';

// ─── Types from metadata ───────────────────────────────────────

interface AnswerSnapshot {
    questionId: string;
    questionText?: string;
    answerText?: string;
    wordCount?: number;
    grammarScore?: number;
    clarityScore?: number;
    completenessScore?: number;
    relevanceScore?: number;
    similarityScore?: number;
    plagiarismSeverity?: string;
    projectedGrade?: number;
    maxPoints?: number;
}

interface TextVersionMeta {
    type: string;
    answers?: AnswerSnapshot[];
    overallGrade?: number;
    maxGrade?: number;
    totalWordCount?: number;
}

function getMeta(v: SubmissionVersion): TextVersionMeta | null {
    const meta = (v as unknown as { metadata?: Record<string, unknown> }).metadata;
    if (!meta || meta['type'] !== 'TEXT_SUBMISSION') return null;
    return meta as unknown as TextVersionMeta;
}

// ─── Helpers ──────────────────────────────────────────────────

function ScoreDelta({ label, oldVal, newVal }: { label: string; oldVal?: number; newVal?: number }) {
    if (oldVal == null && newVal == null) return null;
    const old = oldVal ?? 0;
    const next = newVal ?? 0;
    const delta = next - old;
    const color = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-400';
    const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
    return (
        <div className="flex items-center justify-between text-xs gap-2">
            <span className="text-gray-500 w-28 shrink-0">{label}</span>
            <span className="text-gray-700">{old.toFixed(1)}</span>
            <Icon className={`h-3 w-3 ${color}`} />
            <span className={`font-semibold ${color}`}>{next.toFixed(1)}</span>
            <span className={`text-xs font-medium ${color}`}>
                ({delta >= 0 ? '+' : ''}{delta.toFixed(1)})
            </span>
        </div>
    );
}

function WordDiff({ oldText, newText }: { oldText: string; newText: string }) {
    const tokens = useMemo(
        () => mergeDiffTokens(diffWords(oldText, newText)),
        [oldText, newText]
    );

    if (tokens.length === 0) return <p className="text-xs text-gray-400 italic">No text</p>;

    return (
        <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
            {tokens.map((t, i) => {
                if (t.type === 'equal') return <span key={i}>{t.value}</span>;
                if (t.type === 'added')
                    return <mark key={i} className="bg-green-100 text-green-900 rounded px-0.5">{t.value}</mark>;
                return <del key={i} className="bg-red-100 text-red-700 rounded px-0.5 no-underline line-through">{t.value}</del>;
            })}
        </p>
    );
}

// ─── Props ────────────────────────────────────────────────────

export interface TextDiffViewerProps {
    versionA: SubmissionVersion;   // older version
    versionB: SubmissionVersion;   // newer version
}

// ─── Component ────────────────────────────────────────────────

export function TextDiffViewer({ versionA, versionB }: TextDiffViewerProps) {
    const metaA = getMeta(versionA);
    const metaB = getMeta(versionB);

    if (!metaA || !metaB) {
        return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-700 text-center">
                One or both selected versions do not contain text-answer snapshots and cannot be compared.
            </div>
        );
    }

    const answersA = metaA.answers ?? [];
    const answersB = metaB.answers ?? [];

    // Merge by questionId
    const allIds = Array.from(new Set([
        ...answersA.map((a) => a.questionId),
        ...answersB.map((a) => a.questionId),
    ]));

    const mapA = Object.fromEntries(answersA.map((a) => [a.questionId, a]));
    const mapB = Object.fromEntries(answersB.map((a) => [a.questionId, a]));

    const gradeA = metaA.overallGrade ?? 0;
    const gradeB = metaB.overallGrade ?? 0;
    const gradeDelta = gradeB - gradeA;
    const maxGrade = metaB.maxGrade ?? metaA.maxGrade;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-base font-semibold text-gray-800">
                    Version {versionA.versionNumber}
                    <span className="mx-2 text-gray-400">→</span>
                    Version {versionB.versionNumber}
                </h3>
                <div className={`rounded-full px-4 py-1 text-sm font-bold ${
                    gradeDelta > 0 ? 'bg-green-100 text-green-700' :
                    gradeDelta < 0 ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-500'
                }`}>
                    {maxGrade != null
                        ? `${gradeA.toFixed(1)} → ${gradeB.toFixed(1)} / ${maxGrade}`
                        : `${gradeA.toFixed(1)} → ${gradeB.toFixed(1)}`}
                    <span className="ml-2">
                        ({gradeDelta >= 0 ? '+' : ''}{gradeDelta.toFixed(1)})
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                    <mark className="bg-green-100 text-green-900 rounded px-1.5 py-0.5">Added</mark>
                </span>
                <span className="flex items-center gap-1">
                    <del className="bg-red-100 text-red-700 rounded px-1.5 py-0.5 line-through no-underline">Removed</del>
                </span>
                <span className="text-gray-400">Unchanged text shown normally</span>
            </div>

            {/* Per-question diffs */}
            {allIds.map((qid, idx) => {
                const a = mapA[qid];
                const b = mapB[qid];
                const questionText = b?.questionText ?? a?.questionText ?? `Question ${idx + 1}`;
                const textA = a?.answerText ?? '';
                const textB = b?.answerText ?? '';
                const maxPts = b?.maxPoints ?? a?.maxPoints ?? 10;
                const pgA = a?.projectedGrade;
                const pgB = b?.projectedGrade;
                const pgDelta = pgA != null && pgB != null ? pgB - pgA : null;

                return (
                    <div key={qid} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                        {/* Question header */}
                        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-start gap-3">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                                {idx + 1}
                            </span>
                            <p className="text-sm font-medium text-gray-800 leading-snug">{questionText}</p>
                            {pgDelta != null && (
                                <span className={`ml-auto shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    pgDelta > 0 ? 'bg-green-100 text-green-700' :
                                    pgDelta < 0 ? 'bg-red-100 text-red-600' :
                                    'bg-gray-100 text-gray-500'
                                }`}>
                                    {pgA?.toFixed(1)} → {pgB?.toFixed(1)} / {maxPts}
                                    {' '}({pgDelta >= 0 ? '+' : ''}{pgDelta.toFixed(1)})
                                </span>
                            )}
                        </div>

                        <div className="p-5 space-y-4">
                            {/* AI score deltas */}
                            {(a?.grammarScore != null || b?.grammarScore != null) && (
                                <div className="rounded-md bg-gray-50 border border-gray-100 px-4 py-3 space-y-1.5">
                                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">AI Scores</p>
                                    <ScoreDelta label="Grammar"      oldVal={a?.grammarScore}      newVal={b?.grammarScore} />
                                    <ScoreDelta label="Clarity"      oldVal={a?.clarityScore}      newVal={b?.clarityScore} />
                                    <ScoreDelta label="Completeness" oldVal={a?.completenessScore} newVal={b?.completenessScore} />
                                    <ScoreDelta label="Relevance"    oldVal={a?.relevanceScore}    newVal={b?.relevanceScore} />
                                </div>
                            )}

                            {/* Word-level text diff */}
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                    Answer changes
                                    {a?.wordCount != null && b?.wordCount != null && (
                                        <span className="ml-2 font-normal normal-case">
                                            ({a.wordCount} → {b.wordCount} words)
                                        </span>
                                    )}
                                </p>
                                {textA === textB ? (
                                    <p className="text-xs text-gray-400 italic">No changes to this answer.</p>
                                ) : (
                                    <WordDiff oldText={textA} newText={textB} />
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Footer summary */}
            <div className={`rounded-lg border px-5 py-4 text-sm ${
                gradeDelta > 0 ? 'bg-green-50 border-green-200' :
                gradeDelta < 0 ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
            }`}>
                <p className={`font-semibold ${gradeDelta > 0 ? 'text-green-700' : gradeDelta < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {gradeDelta > 0
                        ? `Overall grade improved by ${gradeDelta.toFixed(1)} points (${gradeA.toFixed(1)} → ${gradeB.toFixed(1)}).`
                        : gradeDelta < 0
                        ? `Overall grade decreased by ${Math.abs(gradeDelta).toFixed(1)} points (${gradeA.toFixed(1)} → ${gradeB.toFixed(1)}).`
                        : 'No overall grade change between these two versions.'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Version {versionA.versionNumber} submitted {new Date(versionA.createdAt).toLocaleString()}{' '}
                    · Version {versionB.versionNumber} submitted {new Date(versionB.createdAt).toLocaleString()}
                </p>
            </div>
        </div>
    );
}
