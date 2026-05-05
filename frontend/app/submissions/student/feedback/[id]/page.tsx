'use client';

/**
 * Student Feedback / Report Page
 * Route: /submissions/student/feedback/[id]
 *
 * Shows the full report for a version snapshot.
 * - No ?versionId param  → loads the LATEST version
 * - ?versionId={id}      → loads that specific version (read-only)
 *
 * Data comes entirely from saved version snapshot data —
 * never regenerated on-demand.
 */

import React, { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Star, Shield, GitBranch, AlertCircle,
    Clock, CheckCircle2, TrendingUp, Lightbulb, ExternalLink,
    ChevronDown, ChevronUp, Eye, User,
} from 'lucide-react';
import { useSubmission } from '@/hooks/useSubmissions';
import { useLatestVersion, useVersion, useVersions } from '@/hooks/useVersions';
import { plagiarismService, scoreToLetterGrade } from '@/lib/api/submission-services';
import type { SubmissionVersion, VersionAnswer, VersionPlagiarismSource } from '@/types/submission.types';
import LecturerAnnotatedText from '@/components/submissions/LecturerAnnotatedText';

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
}

function severityBadge(s?: string | null) {
    const base = 'px-2 py-0.5 rounded-full text-xs font-bold border';
    if (s === 'HIGH')   return `${base} text-red-700 bg-red-50 border-red-200`;
    if (s === 'MEDIUM') return `${base} text-amber-700 bg-amber-50 border-amber-200`;
    return `${base} text-green-700 bg-green-50 border-green-200`;
}

function ScoreBar({ label, value }: { label: string; value?: number | null }) {
    const pct = value != null ? Math.min(100, Math.round((value / 10) * 100)) : 0;
    const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-28 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-semibold text-gray-800 w-16 text-right">
                {value != null ? value.toFixed(1) : '—'} / 10
            </span>
        </div>
    );
}

// ─── QuestionAnswerBlock ──────────────────────────────────────

function QuestionAnswerBlock({ answer, index, submissionId, versionId }: { answer: VersionAnswer; index: number; submissionId: string; versionId: string; }) {
    // aiGeneratedMark is the actual earned mark in the question's own scale (e.g. 15.5 out of 20)
    const aiEarnedMark = answer.aiGeneratedMark != null
        ? Math.round(answer.aiGeneratedMark * 10) / 10
        : null;
    const [showAnswer, setShowAnswer] = useState(false);
    const [showSources, setShowSources] = useState(false);

    const sources = answer.plagiarismSources ?? [];
    const hasAiScores = answer.grammarScore != null || answer.clarityScore != null;
    const hasPlagiarism = answer.similarityScore != null;

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Question header */}
            <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                            Question {index + 1}
                        </p>
                        <p className="font-semibold text-gray-900">
                            {answer.questionText ?? `Question ${index + 1}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {answer.plagiarismSeverity && (
                            <span className={severityBadge(answer.plagiarismSeverity)}>
                                {answer.plagiarismSeverity}
                            </span>
                        )}
                        <button
                            onClick={() => setShowAnswer(s => !s)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                            <Eye size={14} />
                            {showAnswer ? 'Hide' : 'Answer'}
                        </button>
                    </div>
                </div>

                {showAnswer && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <LecturerAnnotatedText
                            text={answer.answerText ?? '(no answer)'}
                            submissionId={submissionId}
                            versionId={versionId}
                            questionId={answer.questionId}
                            readOnly
                        />
                        <div className="mt-2 text-xs text-gray-400">{answer.wordCount ?? 0} words</div>
                    </div>
                )}
            </div>

            {/* Marks row */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-6">
                <div>
                    <p className="text-xs text-gray-500">AI Mark</p>
                    <p className="text-xl font-bold text-purple-600">
                        {aiEarnedMark != null ? (
                            <>{aiEarnedMark.toFixed(1)}{answer.maxPoints != null && <span className="text-sm font-normal text-gray-400"> / {answer.maxPoints}</span>}</>
                        ) : '—'}
                    </p>
                </div>
                {answer.lecturerMark != null && (
                    <div>
                        <p className="text-xs text-blue-600 font-semibold">Lecturer Mark</p>
                        <p className="text-xl font-bold text-blue-600">
                            {answer.lecturerMark.toFixed(1)}{answer.maxPoints != null && <span className="text-sm font-normal text-blue-300"> / {answer.maxPoints}</span>}
                        </p>
                    </div>
                )}
                {answer.similarityScore != null && (
                    <div>
                        <p className="text-xs text-gray-500">Similarity</p>
                        <p className={`text-xl font-bold ${answer.similarityScore >= 50 ? 'text-red-600' : answer.similarityScore >= 20 ? 'text-amber-600' : 'text-green-600'}`}>
                            {answer.similarityScore.toFixed(0)}%
                        </p>
                    </div>
                )}
                <div>
                    <p className="text-xs text-gray-500">Words</p>
                    <p className="text-xl font-bold text-gray-700">{answer.wordCount ?? 0}</p>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
                {hasAiScores && (
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <TrendingUp size={16} className="text-purple-500" /> AI Quality Scores
                        </p>
                        <div className="space-y-2">
                            <ScoreBar label="Grammar"      value={answer.grammarScore} />
                            <ScoreBar label="Clarity"      value={answer.clarityScore} />
                            <ScoreBar label="Completeness" value={answer.completenessScore} />
                            <ScoreBar label="Relevance"    value={answer.relevanceScore} />
                        </div>
                    </div>
                )}

                {answer.strengths && answer.strengths.length > 0 && (
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" /> Strengths
                        </p>
                        <ul className="space-y-1">
                            {answer.strengths.map((s, i) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5 shrink-0">•</span>{s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {answer.improvements && answer.improvements.length > 0 && (
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Lightbulb size={16} className="text-amber-500" /> Areas to Improve
                        </p>
                        <ul className="space-y-1">
                            {answer.improvements.map((s, i) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="text-amber-500 mt-0.5 shrink-0">•</span>{s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {answer.suggestions && answer.suggestions.length > 0 && (
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Suggestions</p>
                        <ul className="space-y-1">
                            {answer.suggestions.map((s, i) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5 shrink-0">→</span>{s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {answer.lecturerFeedbackText && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                            <User size={12} /> Lecturer Feedback
                        </p>
                        <p className="text-sm text-blue-800">{answer.lecturerFeedbackText}</p>
                        {answer.lecturerUpdatedAt && (
                            <p className="text-xs text-blue-400 mt-1">
                                Updated {formatDate(answer.lecturerUpdatedAt)}
                            </p>
                        )}
                    </div>
                )}

                {hasPlagiarism && (
                    <div>
                        <button
                            onClick={() => setShowSources(s => !s)}
                            className="flex items-center gap-2 text-sm font-semibold text-red-700 cursor-pointer hover:text-red-900"
                        >
                            <Shield size={16} />
                            Plagiarism Sources ({sources.length})
                            {showSources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showSources && (
                            <div className="mt-3 space-y-3">
                                {sources.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">
                                        No detailed sources saved. Score: {answer.similarityScore?.toFixed(0)}%
                                    </p>
                                ) : (
                                    sources.map((src, i) => (
                                        <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="font-semibold text-red-800 truncate">
                                                    {src.sourceTitle ?? 'Unknown source'}
                                                </span>
                                                <span className="text-xs font-bold text-red-700 shrink-0">
                                                    {src.similarityPercentage?.toFixed(0)}% match
                                                </span>
                                            </div>
                                            {src.sourceUrl && (
                                                <a href={src.sourceUrl} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-2">
                                                    <ExternalLink size={10} />
                                                    {src.sourceUrl.length > 60 ? src.sourceUrl.slice(0, 60) + '…' : src.sourceUrl}
                                                </a>
                                            )}
                                            {src.matchedText && (
                                                <div className="text-xs text-red-700 bg-red-100 rounded p-2 mb-1">
                                                    <span className="font-semibold">Matched: </span>
                                                    <span className="italic">&ldquo;{src.matchedText}&rdquo;</span>
                                                </div>
                                            )}
                                            {src.sourceSnippet && (
                                                <p className="text-xs text-gray-600 line-clamp-2">
                                                    &ldquo;{src.sourceSnippet}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── VersionSelector ──────────────────────────────────────────

function VersionSelector({
    versions,
    currentId,
    submissionId,
}: {
    versions: SubmissionVersion[];
    currentId: string;
    submissionId: string;
}) {
    const router = useRouter();
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Viewing:</span>
            <select
                value={currentId}
                onChange={e => {
                    const val = e.target.value;
                    if (val === versions[0]?.id) {
                        router.push(`/submissions/student/feedback/${submissionId}`);
                    } else {
                        router.push(`/submissions/student/feedback/${submissionId}?versionId=${val}`);
                    }
                }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white cursor-pointer"
            >
                {versions.map((v, i) => (
                    <option key={v.id} value={v.id}>
                        Version {v.versionNumber}{i === 0 ? ' (Latest)' : ''}
                        {v.isLate ? ' — Late' : ''}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="max-w-4xl mx-auto animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-36 mb-4" />
            <div className="h-9 bg-gray-200 rounded w-64 mb-8" />
            <div className="grid grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-lg" />)}
            </div>
            <div className="space-y-6">
                {[1, 2].map(i => <div key={i} className="h-64 bg-gray-100 rounded-lg" />)}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const versionIdParam = searchParams.get('versionId');

    const { data: submission } = useSubmission(id);
    const { data: versions } = useVersions(id);

    const {
        data: latestVersion,
        loading: latestLoading,
        error: latestError,
    } = useLatestVersion(versionIdParam ? null : id);

    const {
        data: specificVersion,
        loading: specificLoading,
        error: specificError,
    } = useVersion(versionIdParam ? id : null, versionIdParam);

    const version: SubmissionVersion | null = versionIdParam ? specificVersion : latestVersion;
    const loading = versionIdParam ? specificLoading : latestLoading;
    const error   = versionIdParam ? specificError   : latestError;

    // ── Enrich answers with plagiarism sources ────────────────────────────────
    // The realtime plagiarism check (checkLiveSimilarity) returns internetMatches
    // but they are never persisted — only the score is saved.  When the feedback
    // page loads and finds answers with a score but no saved sources, re-run the
    // check on each answer's stored text so sources can be displayed.
    const [enrichedSources, setEnrichedSources] = useState<Record<string, VersionPlagiarismSource[]>>({});

    useEffect(() => {
        if (!version?.answers || !id) return;
        const needsEnrichment = version.answers.filter(
            a => (a.similarityScore ?? 0) > 0 &&
                 a.answerText &&
                 a.answerText.length >= 10 &&
                 (!a.plagiarismSources || a.plagiarismSources.length === 0)
        );
        if (needsEnrichment.length === 0) return;

        let cancelled = false;
        (async () => {
            const result: Record<string, VersionPlagiarismSource[]> = {};
            for (const a of needsEnrichment) {
                if (cancelled) break;
                try {
                    const plagResult = await plagiarismService.checkLiveSimilarity({
                        sessionId:    `fb-${id}-${a.questionId}`,
                        studentId:    version.studentId ?? '',
                        questionId:   a.questionId,
                        textContent:  a.answerText!,
                        questionText: a.questionText ?? undefined,
                        submissionId: id,
                    });
                    const matches = plagResult.internetMatches ?? [];
                    if (matches.length > 0) {
                        result[a.questionId] = matches.map((m, i) => {
                            const raw = m as unknown as Record<string, unknown>;
                            const rawScore = raw.similarityScore as number | undefined;
                            return {
                                id:                   `live-${i}`,
                                sourceUrl:            (raw.url as string)  ?? '',
                                sourceTitle:          (raw.title as string) ?? (raw.sourceDomain as string) ?? 'Internet source',
                                sourceSnippet:        (raw.snippet as string) ?? undefined,
                                matchedText:          (raw.matchedStudentText as string) ?? undefined,
                                similarityPercentage: rawScore != null
                                    ? Math.round((rawScore <= 1 ? rawScore * 100 : rawScore) * 10) / 10
                                    : 0,
                            };
                        });
                    }
                } catch {
                    // Silent — keep going for other answers
                }
            }
            if (!cancelled && Object.keys(result).length > 0) {
                setEnrichedSources(result);
            }
        })();
        return () => { cancelled = true; };
    }, [version, id]);

    // Merge enriched sources into answers
    const answers: VersionAnswer[] = (version?.answers ?? []).map(a => {
        if (a.plagiarismSources && a.plagiarismSources.length > 0) return a;
        const extra = enrichedSources[a.questionId];
        if (extra && extra.length > 0) return { ...a, plagiarismSources: extra };
        return a;
    });
    const isLatest = !versionIdParam || (versions != null && versions.length > 0 && versions[0].id === versionIdParam);

    if (loading && !version) return <PageSkeleton />;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
                >
                    <ArrowLeft size={20} />
                    Back
                </button>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Feedback Report</h1>
                        {submission && (
                            <p className="text-gray-600 mt-1">
                                {submission.assignmentTitle ?? 'Assignment'}
                                {submission.moduleName ? ` • ${submission.moduleName}` : ''}
                            </p>
                        )}
                    </div>
                    {versions && versions.length > 0 && version && (
                        <VersionSelector
                            versions={versions}
                            currentId={version.id}
                            submissionId={id}
                        />
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-800">Could not load report</p>
                        <p className="text-sm text-red-700 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {!loading && !version && !error && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
                    <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
                    <p className="font-semibold text-amber-800">No submission yet</p>
                    <p className="text-sm text-amber-700 mt-1">Submit your assignment to generate a report.</p>
                </div>
            )}

            {version && (
                <>
                    {/* Version banner */}
                    <div className={`flex flex-wrap items-center gap-3 px-5 py-3 rounded-lg border mb-6 ${isLatest ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                        <GitBranch size={18} className={isLatest ? 'text-purple-600' : 'text-gray-500'} />
                        <span className={`font-semibold text-sm ${isLatest ? 'text-purple-800' : 'text-gray-700'}`}>
                            Version {version.versionNumber}
                            {isLatest ? ' — Latest' : ' — Historical (read-only)'}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={11} />{formatDate(version.submittedAt)}
                        </span>
                        <div className="flex gap-2 ml-auto">
                            {version.isLate && (
                                <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Late</span>
                            )}
                            {version.hasLecturerOverride && (
                                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Lecturer Graded</span>
                            )}
                            {!isLatest && (
                                <span className="text-xs font-semibold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Read-only</span>
                            )}
                        </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp size={16} className="text-purple-600" />
                                <span className="text-xs text-gray-500">AI Score</span>
                            </div>
                            <p className="text-3xl font-bold text-purple-600">
                                {version.aiScore != null ? `${version.aiScore.toFixed(0)}%` : '—'}
                            </p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <Star size={16} className="text-green-600" />
                                <span className="text-xs text-gray-500">
                                    {version.hasLecturerOverride ? 'Final Grade' : 'AI Grade'}
                                </span>
                            </div>
                            <p className="text-3xl font-bold text-green-600">
                                {(() => {
                                    const score = version.aiScore;
                                    if (score == null) return '—';
                                    return scoreToLetterGrade(score);
                                })()}
                            </p>
                            {version.aiScore != null && (
                                <p className="text-xs text-gray-400 mt-0.5">{version.aiScore.toFixed(1)}%</p>
                            )}
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield size={16} className="text-red-600" />
                                <span className="text-xs text-gray-500">Max Plagiarism</span>
                            </div>
                            <p className={`text-3xl font-bold ${(version.plagiarismScore ?? 0) >= 50 ? 'text-red-600' : (version.plagiarismScore ?? 0) >= 20 ? 'text-amber-600' : 'text-green-600'}`}>
                                {version.plagiarismScore != null ? `${version.plagiarismScore.toFixed(0)}%` : '—'}
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 size={16} className="text-blue-600" />
                                <span className="text-xs text-gray-500">Total Words</span>
                            </div>
                            <p className="text-3xl font-bold text-blue-600">{version.totalWordCount ?? '—'}</p>
                        </div>
                    </div>

                    {/* Per-question feedback */}
                    {answers.length > 0 ? (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900">Answer Feedback</h2>
                            {answers.map((a, i) => (
                                <QuestionAnswerBlock key={a.questionId} answer={a} index={i} submissionId={id} versionId={version!.id} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                            <p className="text-gray-500">No answer data stored in this version.</p>
                        </div>
                    )}

                    {/* Link to version history */}
                    <div className="mt-8 text-center">
                        <button
                            onClick={() => router.push(`/submissions/student/version-history/${id}`)}
                            className="text-sm text-purple-600 hover:text-purple-800 underline cursor-pointer"
                        >
                            View all {versions?.length ?? ''} versions →
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
