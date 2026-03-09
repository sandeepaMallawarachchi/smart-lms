'use client';

import React, { use, useCallback, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Star, Shield, GitBranch, AlertCircle, Download,
    Clock, ChevronDown, CheckCircle2, TrendingUp, Lightbulb,
    ExternalLink, User,
} from 'lucide-react';
import { useSubmission } from '@/hooks/useSubmissions';
import { useVersions } from '@/hooks/useVersions';

// ─── Types ────────────────────────────────────────────────────

interface AnswerSnapshotData {
    questionId: string;
    questionText?: string;
    answerText?: string;
    wordCount?: number;
    grammarScore?: number;
    clarityScore?: number;
    completenessScore?: number;
    relevanceScore?: number;
    strengths?: string[];
    improvements?: string[];
    suggestions?: string[];
    similarityScore?: number;
    plagiarismSeverity?: string;
    internetSimilarityScore?: number;
    peerSimilarityScore?: number;
    riskScore?: number;
    riskLevel?: string;
    internetMatches?: Array<{
        title: string;
        url: string;
        snippet: string;
        similarityScore: number;
        sourceDomain?: string;
        sourceCategory?: string;
        confidenceLevel?: string;
        matchedStudentText?: string;
    }>;
    projectedGrade?: number;
    maxPoints?: number;
}

interface VersionMetadata {
    type?: string;
    overallGrade?: number;
    maxGrade?: number;
    totalWordCount?: number;
    answers?: AnswerSnapshotData[];
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return dateStr; }
}

function gradeColor(pct: number) {
    if (pct >= 90) return 'text-green-600';
    if (pct >= 80) return 'text-blue-600';
    if (pct >= 70) return 'text-amber-600';
    return 'text-red-600';
}

function gradeBg(pct: number) {
    if (pct >= 90) return 'bg-green-50 border-green-200';
    if (pct >= 80) return 'bg-blue-50 border-blue-200';
    if (pct >= 70) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
}

function scoreColor(score: number, max = 10) {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'text-green-600';
    if (pct >= 60) return 'text-amber-600';
    return 'text-red-600';
}

function plagSeverityBadge(severity?: string | null) {
    switch (severity?.toUpperCase()) {
        case 'HIGH':   return 'bg-red-100 text-red-800';
        case 'MEDIUM': return 'bg-amber-100 text-amber-800';
        case 'LOW':    return 'bg-yellow-100 text-yellow-800';
        default:       return 'bg-green-100 text-green-800';
    }
}

// ─── Report HTML builder ───────────────────────────────────────

function buildReportHtml(
    assignmentTitle: string,
    versionNumber: number,
    metadata: VersionMetadata,
): string {
    const now = new Date().toLocaleString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const answers = metadata.answers ?? [];
    const reportTotalGrade    = answers.reduce((s, a) => s + (a.projectedGrade ?? 0), 0);
    const reportTotalMaxGrade = answers.reduce((s, a) => s + (a.maxPoints ?? 0), 0);
    const displayTotal    = reportTotalMaxGrade > 0 ? reportTotalGrade    : (metadata.overallGrade  ?? 0);
    const displayTotalMax = reportTotalMaxGrade > 0 ? reportTotalMaxGrade : (metadata.maxGrade ?? 0);
    const totalPct = displayTotalMax > 0 ? Math.round((displayTotal / displayTotalMax) * 100) : 0;

    const scoreBar = (label: string, score: number, max = 10) => {
        const pct = Math.min(Math.max((score / max) * 100, 0), 100);
        const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';
        return `<div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                <span style="font-size:12px;color:#6b7280;">${label}</span>
                <span style="font-size:12px;font-weight:700;color:${color};">${score}/${max}</span>
            </div>
            <div style="background:#e5e7eb;border-radius:3px;height:6px;">
                <div style="background:${color};width:${pct}%;height:6px;border-radius:3px;"></div>
            </div></div>`;
    };

    const qSections = answers.map((a, i) => {
        const hasInternet = (a.internetMatches?.length ?? 0) > 0;
        return `
        <div style="margin-bottom:28px;page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="background:#f3f4f6;padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
                <div style="font-weight:700;font-size:14px;color:#111827;">Question ${i + 1}</div>
                ${a.projectedGrade != null ? `<div style="font-weight:700;color:#7c3aed;">${a.projectedGrade} / ${a.maxPoints ?? 10} pts</div>` : ''}
            </div>
            <div style="padding:16px;">
                ${a.questionText ? `<p style="font-size:13px;color:#374151;margin-bottom:10px;font-style:italic;">${a.questionText}</p>` : ''}

                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:12px;">
                    <div style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:6px;">STUDENT ANSWER (${a.wordCount ?? 0} words)</div>
                    <p style="font-size:13px;color:#111827;line-height:1.6;white-space:pre-wrap;">${a.answerText ?? '(no answer)'}</p>
                </div>

                ${(a.grammarScore != null) ? `
                <div style="margin-bottom:12px;">
                    <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:6px;">AI SCORES</div>
                    ${scoreBar('Grammar', a.grammarScore)}
                    ${scoreBar('Clarity', a.clarityScore ?? 0)}
                    ${scoreBar('Completeness', a.completenessScore ?? 0)}
                    ${scoreBar('Relevance', a.relevanceScore ?? 0)}
                </div>` : ''}

                ${(a.strengths?.length ?? 0) > 0 ? `
                <div style="margin-bottom:10px;">
                    <div style="font-size:12px;font-weight:600;color:#16a34a;margin-bottom:4px;">✓ STRENGTHS</div>
                    <ul style="list-style:none;padding:0;">${(a.strengths ?? []).map(s => `<li style="font-size:12px;color:#374151;margin-bottom:3px;">✓ ${s}</li>`).join('')}</ul>
                </div>` : ''}

                ${(a.improvements?.length ?? 0) > 0 ? `
                <div style="margin-bottom:10px;">
                    <div style="font-size:12px;font-weight:600;color:#d97706;margin-bottom:4px;">→ AREAS FOR IMPROVEMENT</div>
                    <ul style="list-style:none;padding:0;">${(a.improvements ?? []).map(s => `<li style="font-size:12px;color:#374151;margin-bottom:3px;">→ ${s}</li>`).join('')}</ul>
                </div>` : ''}

                ${(a.suggestions?.length ?? 0) > 0 ? `
                <div style="margin-bottom:10px;">
                    <div style="font-size:12px;font-weight:600;color:#7c3aed;margin-bottom:4px;">• RECOMMENDATIONS</div>
                    <ul style="list-style:none;padding:0;">${(a.suggestions ?? []).map(s => `<li style="font-size:12px;color:#374151;margin-bottom:3px;">• ${s}</li>`).join('')}</ul>
                </div>` : ''}

                <div style="border-top:1px solid #f3f4f6;padding-top:10px;margin-top:10px;">
                    <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:6px;">PLAGIARISM</div>
                    <div style="display:flex;gap:16px;flex-wrap:wrap;">
                        ${a.similarityScore != null ? `<div><span style="font-size:11px;color:#6b7280;">Overall: </span><span style="font-size:12px;font-weight:700;color:${a.similarityScore > 50 ? '#dc2626' : a.similarityScore > 20 ? '#d97706' : '#16a34a'};">${a.similarityScore.toFixed(1)}%</span></div>` : ''}
                        ${a.internetSimilarityScore != null ? `<div><span style="font-size:11px;color:#6b7280;">Internet: </span><span style="font-size:12px;font-weight:700;">${a.internetSimilarityScore.toFixed(1)}%</span></div>` : ''}
                        ${a.peerSimilarityScore != null ? `<div><span style="font-size:11px;color:#6b7280;">Peer: </span><span style="font-size:12px;font-weight:700;">${a.peerSimilarityScore.toFixed(1)}%</span></div>` : ''}
                        ${a.riskLevel ? `<div style="padding:1px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${a.riskLevel === 'HIGH' ? '#fee2e2' : a.riskLevel === 'MEDIUM' ? '#fed7aa' : a.riskLevel === 'LOW' ? '#fef9c3' : '#dcfce7'};color:${a.riskLevel === 'HIGH' ? '#991b1b' : a.riskLevel === 'MEDIUM' ? '#9a3412' : a.riskLevel === 'LOW' ? '#854d0e' : '#166534'};">${a.riskLevel}</div>` : ''}
                    </div>

                    ${hasInternet ? `
                    <div style="margin-top:8px;">
                        <div style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:4px;">MATCHED INTERNET SOURCES</div>
                        ${(a.internetMatches ?? []).slice(0, 5).map(m => `
                        <div style="border:1px solid #f3f4f6;border-radius:4px;padding:8px;margin-bottom:6px;">
                            <div style="font-size:12px;font-weight:600;color:#1d4ed8;">${m.title}</div>
                            <div style="font-size:11px;color:#6b7280;">${m.url}</div>
                            ${m.snippet ? `<div style="font-size:11px;color:#374151;margin-top:3px;font-style:italic;">"${m.snippet.substring(0, 150)}${m.snippet.length > 150 ? '…' : ''}"</div>` : ''}
                            ${m.matchedStudentText ? `<div style="font-size:11px;color:#991b1b;margin-top:3px;">Matched: "${m.matchedStudentText}"</div>` : ''}
                            <div style="font-size:11px;color:#6b7280;margin-top:2px;">Similarity: ${m.similarityScore.toFixed(1)}% | ${m.sourceCategory ?? 'OTHER'} | Confidence: ${m.confidenceLevel ?? '—'}</div>
                        </div>`).join('')}
                    </div>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/>
<title>Submission Report — ${assignmentTitle} v${versionNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; background: #fff; padding: 32px; font-size: 14px; }
  h1 { font-size: 22px; font-weight: 800; color: #111827; margin-bottom: 4px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .summary { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; gap: 32px; flex-wrap: wrap; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<h1>Submission Report — Version ${versionNumber}</h1>
<p class="meta">${assignmentTitle} &bull; Generated ${now}</p>
<div class="summary">
    <div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">FINAL GRADE</div>
        <div style="font-size:28px;font-weight:800;color:${totalPct >= 80 ? '#16a34a' : totalPct >= 60 ? '#d97706' : '#dc2626'};">${displayTotal % 1 === 0 ? displayTotal.toFixed(0) : displayTotal.toFixed(1)} / ${displayTotalMax % 1 === 0 ? displayTotalMax.toFixed(0) : displayTotalMax.toFixed(1)}</div>
        <div style="font-size:14px;font-weight:700;color:${totalPct >= 80 ? '#16a34a' : totalPct >= 60 ? '#d97706' : '#dc2626'};">${totalPct.toFixed(1)}%</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:4px;">${answers.map((a, i) => `Q${i+1}: ${(a.projectedGrade ?? 0) % 1 === 0 ? (a.projectedGrade ?? 0).toFixed(0) : (a.projectedGrade ?? 0).toFixed(1)}/${(a.maxPoints ?? 0) % 1 === 0 ? (a.maxPoints ?? 0).toFixed(0) : (a.maxPoints ?? 0).toFixed(1)}`).join(' + ')} = ${displayTotal % 1 === 0 ? displayTotal.toFixed(0) : displayTotal.toFixed(1)}/${displayTotalMax % 1 === 0 ? displayTotalMax.toFixed(0) : displayTotalMax.toFixed(1)}</div>
    </div>
    <div><div style="font-size:11px;color:#6b7280;">TOTAL WORDS</div><div style="font-size:20px;font-weight:800;">${metadata.totalWordCount ?? 0}</div></div>
    <div><div style="font-size:11px;color:#6b7280;">QUESTIONS</div><div style="font-size:20px;font-weight:800;">${answers.length}</div></div>
</div>
${qSections}
<div class="footer">Smart LMS &bull; Per-Question Report &bull; ${now}</div>
</body></html>`;
}

// ─── Sub-components ───────────────────────────────────────────

function ScoreBar({ label, score, max = 10 }: { label: string; score: number; max?: number }) {
    const pct = Math.min(Math.max((score / max) * 100, 0), 100);
    const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
    const text = pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';
    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-500">{label}</span>
                <span className={`text-xs font-bold ${text}`}>{score}/{max}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function QuestionReport({ answer, index }: { answer: AnswerSnapshotData; index: number }) {
    const [expanded, setExpanded] = useState(true);
    const hasFeedback = answer.grammarScore != null;
    const hasInternet = (answer.internetMatches?.length ?? 0) > 0;
    const severityClass = plagSeverityBadge(answer.plagiarismSeverity);

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer text-left"
            >
                <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white flex-shrink-0">
                        {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 line-clamp-2">
                        {answer.questionText ?? `Question ${index + 1}`}
                    </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    {answer.projectedGrade != null && (
                        <span className={`text-sm font-bold ${scoreColor(answer.projectedGrade, answer.maxPoints ?? 10)}`}>
                            {answer.projectedGrade} / {answer.maxPoints ?? 10}
                        </span>
                    )}
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {expanded && (
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: answer + plagiarism */}
                    <div className="space-y-4">
                        {/* Answer text */}
                        <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Student Answer <span className="font-normal">({answer.wordCount ?? 0} words)</span>
                            </h4>
                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-48 overflow-y-auto">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {answer.answerText || <span className="italic text-gray-400">No answer provided</span>}
                                </p>
                            </div>
                        </div>

                        {/* Plagiarism summary */}
                        <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                <Shield size={12} /> Plagiarism
                            </h4>
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    {answer.similarityScore != null && (
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${severityClass}`}>
                                            {answer.plagiarismSeverity ?? 'CLEAN'} — {answer.similarityScore.toFixed(1)}%
                                        </span>
                                    )}
                                    {answer.riskLevel && (
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${plagSeverityBadge(answer.riskLevel)}`}>
                                            Risk: {answer.riskLevel}
                                        </span>
                                    )}
                                </div>
                                {(answer.internetSimilarityScore != null || answer.peerSimilarityScore != null) && (
                                    <div className="text-xs text-gray-500 space-y-1">
                                        {answer.internetSimilarityScore != null && (
                                            <div>Internet similarity: <span className="font-medium text-gray-700">{answer.internetSimilarityScore.toFixed(1)}%</span></div>
                                        )}
                                        {answer.peerSimilarityScore != null && (
                                            <div>Peer similarity: <span className="font-medium text-gray-700">{answer.peerSimilarityScore.toFixed(1)}%</span></div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Internet matches */}
                            {hasInternet && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-xs font-semibold text-gray-500">Matched Sources:</p>
                                    {(answer.internetMatches ?? []).slice(0, 3).map((m, mi) => (
                                        <div key={mi} className="bg-red-50 border border-red-100 rounded p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-gray-900 truncate">{m.title}</p>
                                                    <a href={m.url} target="_blank" rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate">
                                                        {m.sourceDomain ?? m.url} <ExternalLink size={10} />
                                                    </a>
                                                </div>
                                                <span className="text-xs font-bold text-red-700 flex-shrink-0">
                                                    {m.similarityScore.toFixed(0)}%
                                                </span>
                                            </div>
                                            {m.matchedStudentText && (
                                                <p className="text-xs text-red-700 mt-1 italic">
                                                    Matched: &quot;{m.matchedStudentText}&quot;
                                                </p>
                                            )}
                                            {m.snippet && (
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                    {m.snippet}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: AI feedback */}
                    <div className="space-y-4">
                        {hasFeedback ? (
                            <>
                                {/* Scores */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                                        <Star size={12} /> AI Scores
                                    </h4>
                                    <div className="space-y-2">
                                        <ScoreBar label="Grammar" score={answer.grammarScore ?? 0} />
                                        <ScoreBar label="Clarity" score={answer.clarityScore ?? 0} />
                                        <ScoreBar label="Completeness" score={answer.completenessScore ?? 0} />
                                        <ScoreBar label="Relevance" score={answer.relevanceScore ?? 0} />
                                    </div>
                                </div>

                                {/* Strengths */}
                                {(answer.strengths?.length ?? 0) > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Strengths
                                        </h4>
                                        <ul className="space-y-1">
                                            {(answer.strengths ?? []).map((s, i) => (
                                                <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                                    <span className="text-green-600 mt-0.5 flex-shrink-0">✓</span>{s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Improvements */}
                                {(answer.improvements?.length ?? 0) > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                            <TrendingUp size={12} /> Improvements
                                        </h4>
                                        <ul className="space-y-1">
                                            {(answer.improvements ?? []).map((s, i) => (
                                                <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                                    <span className="text-amber-600 mt-0.5 flex-shrink-0">→</span>{s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Suggestions */}
                                {(answer.suggestions?.length ?? 0) > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                            <Lightbulb size={12} /> Recommendations
                                        </h4>
                                        <ul className="space-y-1">
                                            {(answer.suggestions ?? []).map((s, i) => (
                                                <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                                    <span className="text-purple-600 mt-0.5 flex-shrink-0">•</span>{s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                                <Star size={32} className="mb-2 opacity-30" />
                                <p className="text-sm">No AI feedback saved for this question</p>
                                <p className="text-xs mt-1">Feedback is generated as you type answers</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="max-w-5xl mx-auto animate-pulse space-y-4">
            <div className="h-5 bg-gray-200 rounded w-36" />
            <div className="h-9 bg-gray-200 rounded w-64" />
            <div className="grid grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg" />)}
            </div>
            {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-lg" />)}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedVersion = searchParams.get('version') ? Number(searchParams.get('version')) : null;

    const { data: submission, loading: subLoading } = useSubmission(id);
    const { data: versions, loading: vLoading, error: vError } = useVersions(id);

    // Pick which version to display
    const sortedVersions = useMemo(
        () => versions ? [...versions].sort((a, b) => b.versionNumber - a.versionNumber) : [],
        [versions]
    );

    const selectedVersion = useMemo(() => {
        if (!sortedVersions.length) return null;
        if (requestedVersion != null) {
            return sortedVersions.find(v => v.versionNumber === requestedVersion) ?? sortedVersions[0];
        }
        return sortedVersions[0]; // latest
    }, [sortedVersions, requestedVersion]);

    const metadata = useMemo<VersionMetadata>(() => {
        if (!selectedVersion?.metadata) return {};
        return selectedVersion.metadata as unknown as VersionMetadata;
    }, [selectedVersion]);

    const answers = metadata.answers ?? [];

    // Derive totals by summing per-question data (source of truth)
    const totalProjectedGrade = answers.reduce((s, a) => s + (a.projectedGrade ?? 0), 0);
    const totalMaxPoints      = answers.reduce((s, a) => s + (a.maxPoints      ?? 0), 0);
    // Fall back to metadata fields for older snapshots that may not have per-question maxPoints.
    // Default to 0 (not null) when answers exist so the banner always renders.
    const displayGrade    = totalMaxPoints > 0
        ? totalProjectedGrade
        : (metadata.overallGrade ?? (answers.length > 0 ? 0 : null));
    const displayMaxGrade = totalMaxPoints > 0
        ? totalMaxPoints
        : (metadata.maxGrade ?? null);
    // One decimal place; null only when max is unknown
    const scorePct: number | null = (displayGrade != null && displayMaxGrade != null && displayMaxGrade > 0)
        ? Math.round((displayGrade / displayMaxGrade) * 1000) / 10
        : null;

    const grade = submission?.grade ?? null;
    const totalMarks = submission?.totalMarks ?? 100;
    const gradePct = grade != null ? Math.round((grade / totalMarks) * 100) : null;

    const downloadReport = useCallback(() => {
        if (!selectedVersion) return;
        const html = buildReportHtml(
            submission?.assignmentTitle ?? 'Assignment',
            selectedVersion.versionNumber,
            metadata,
        );
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 400);
    }, [selectedVersion, submission, metadata]);

    if ((subLoading || vLoading) && !submission) return <PageSkeleton />;

    const hasReport = answers.length > 0;

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
                >
                    <ArrowLeft size={20} /> Back to Submissions
                </button>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Submission Report</h1>
                        {submission && (
                            <p className="text-gray-600">
                                {submission.assignmentTitle ?? 'Assignment'}
                                {submission.moduleName ? ` • ${submission.moduleName}` : ''}
                            </p>
                        )}
                    </div>
                    {hasReport && (
                        <button
                            onClick={downloadReport}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shrink-0 cursor-pointer"
                        >
                            <Download size={16} /> Download Report
                        </button>
                    )}
                </div>
            </div>

            {vError && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{vError}</p>
                </div>
            )}

            {/* Grade card */}
            {grade != null && gradePct != null && (
                <div className={`rounded-lg border-2 p-6 mb-6 flex items-center justify-between gap-4 ${gradeBg(gradePct)}`}>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-md">
                            <div className="text-center">
                                <div className={`text-3xl font-bold ${gradeColor(gradePct)}`}>{grade}</div>
                                <div className="text-xs text-gray-500">/ {totalMarks}</div>
                            </div>
                        </div>
                        <div>
                            <div className="text-xl font-bold text-gray-900">Final Grade: {gradePct}%</div>
                            <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                <Clock size={14} />
                                {submission?.submittedAt ? formatDate(submission.submittedAt) : '—'}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push(`/submissions/student/version-history/${id}`)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors text-sm cursor-pointer"
                    >
                        <GitBranch size={16} /> Version History
                    </button>
                </div>
            )}

            {/* Version selector */}
            {sortedVersions.length > 1 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <GitBranch size={16} /> Viewing version:
                        </span>
                        {sortedVersions.map(v => (
                            <button
                                key={v.id}
                                onClick={() => router.push(`/submissions/student/feedback/${id}?version=${v.versionNumber}`)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                    selectedVersion?.id === v.id
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                v{v.versionNumber}
                                {v.id === sortedVersions[0].id && (
                                    <span className="ml-1 text-xs opacity-75">(latest)</span>
                                )}
                            </button>
                        ))}
                    </div>
                    {selectedVersion && (
                        <p className="text-xs text-gray-500 mt-2">
                            {selectedVersion.commitMessage ?? `Version ${selectedVersion.versionNumber}`}
                            {' • '}{formatDate(selectedVersion.createdAt)}
                        </p>
                    )}
                </div>
            )}

            {/* Final Grade banner */}
            {hasReport && displayGrade != null && displayMaxGrade != null && (
                <div className={`rounded-xl border-2 p-6 mb-4 ${scorePct != null ? gradeBg(scorePct) : 'bg-purple-50 border-purple-200'}`}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Final Grade</p>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">

                        {/* Left: big fraction + percentage */}
                        <div className="flex items-center gap-5">
                            <div className="flex-shrink-0 w-24 h-24 rounded-full bg-white shadow-md flex flex-col items-center justify-center">
                                <span className={`text-3xl font-extrabold leading-none ${scorePct != null ? gradeColor(scorePct) : 'text-purple-700'}`}>
                                    {displayGrade % 1 === 0 ? displayGrade.toFixed(0) : displayGrade.toFixed(1)}
                                </span>
                                <span className="text-xs text-gray-400 mt-0.5">
                                    / {displayMaxGrade % 1 === 0 ? displayMaxGrade.toFixed(0) : displayMaxGrade.toFixed(1)}
                                </span>
                            </div>
                            <div>
                                <p className={`text-3xl font-extrabold ${scorePct != null ? gradeColor(scorePct) : 'text-purple-700'}`}>
                                    {scorePct != null ? `${scorePct.toFixed(1)}%` : '—'}
                                </p>
                                {/* Formula breakdown */}
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    {answers.map((a, i) => {
                                        const got = a.projectedGrade ?? 0;
                                        const max = a.maxPoints ?? 0;
                                        const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
                                        return (
                                            <span key={a.questionId ?? i}>
                                                {i > 0 && <span className="mx-1 text-gray-400">+</span>}
                                                <span className="font-semibold text-gray-700">{fmt(got)}</span>
                                                <span className="text-gray-400">/{fmt(max)}</span>
                                            </span>
                                        );
                                    })}
                                    <span className="ml-2 text-gray-400">=</span>
                                    <span className="ml-1 font-bold text-gray-700">
                                        {displayGrade % 1 === 0 ? displayGrade.toFixed(0) : displayGrade.toFixed(1)}
                                        &nbsp;/&nbsp;
                                        {displayMaxGrade % 1 === 0 ? displayMaxGrade.toFixed(0) : displayMaxGrade.toFixed(1)}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Right: per-question bars */}
                        <div className="flex-1 max-w-xs hidden sm:block">
                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Per-question marks</p>
                            <div className="space-y-2">
                                {answers.map((a, i) => {
                                    const qMax = a.maxPoints ?? 0;
                                    const qGot = a.projectedGrade ?? 0;
                                    const qPct = qMax > 0 ? Math.round((qGot / qMax) * 100) : 0;
                                    const barColor = qPct >= 80 ? 'bg-green-500' : qPct >= 60 ? 'bg-amber-500' : 'bg-red-400';
                                    const textColor = qPct >= 80 ? 'text-green-700' : qPct >= 60 ? 'text-amber-700' : 'text-red-600';
                                    const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
                                    return (
                                        <div key={a.questionId ?? i} className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 w-4 text-right flex-shrink-0">Q{i + 1}</span>
                                            <div className="flex-1 bg-white/60 rounded-full h-2.5">
                                                <div className={`h-2.5 rounded-full ${barColor}`} style={{ width: `${qPct}%` }} />
                                            </div>
                                            <span className={`text-xs font-bold flex-shrink-0 w-16 text-right ${textColor}`}>
                                                {fmt(qGot)} / {fmt(qMax)}
                                            </span>
                                        </div>
                                    );
                                })}
                                {/* Total row */}
                                <div className="flex items-center gap-2 pt-1 border-t border-white/50">
                                    <span className="text-[10px] font-bold text-gray-500 w-4 text-right flex-shrink-0">Σ</span>
                                    <div className="flex-1 bg-white/60 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full ${scorePct != null && scorePct >= 80 ? 'bg-green-600' : scorePct != null && scorePct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${scorePct ?? 0}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-bold flex-shrink-0 w-16 text-right ${scorePct != null ? gradeColor(scorePct) : 'text-gray-700'}`}>
                                        {displayGrade % 1 === 0 ? displayGrade.toFixed(0) : displayGrade.toFixed(1)} / {displayMaxGrade % 1 === 0 ? displayMaxGrade.toFixed(0) : displayMaxGrade.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary stats */}
            {hasReport && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Total Words</p>
                        <p className="text-2xl font-bold text-blue-700">{(metadata.totalWordCount ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Questions</p>
                        <p className="text-2xl font-bold text-green-700">{answers.length}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Flagged</p>
                        <p className="text-2xl font-bold text-amber-700">
                            {answers.filter(a => (a.riskLevel === 'HIGH' || a.riskLevel === 'MEDIUM')).length}
                        </p>
                    </div>
                </div>
            )}

            {/* Per-question report */}
            {hasReport ? (
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Per-Question Report</h2>
                    {answers.map((a, i) => (
                        <QuestionReport key={a.questionId ?? i} answer={a} index={i} />
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                    <Clock size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-gray-600">No report available yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                        The report is generated when you submit your assignment.
                        {sortedVersions.length === 0 ? ' Submit your answers to generate a report.' : ''}
                    </p>
                </div>
            )}

            {/* Lecturer feedback */}
            {submission?.lecturerFeedback && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <User className="text-blue-600" size={20} />
                        <h2 className="text-lg font-bold text-gray-900">Lecturer Feedback</h2>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-gray-700 leading-relaxed italic">&quot;{submission.lecturerFeedback}&quot;</p>
                    </div>
                </div>
            )}

            {/* Quick actions */}
            <div className="mt-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200">
                <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                    {hasReport && (
                        <button onClick={downloadReport}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium cursor-pointer">
                            <Download size={15} /> Download PDF Report
                        </button>
                    )}
                    <button onClick={() => router.push(`/submissions/student/version-history/${id}`)}
                        className="flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-white transition-colors text-sm font-medium cursor-pointer">
                        <GitBranch size={15} /> View All Versions
                    </button>
                    <button onClick={() => router.push('/submissions/student/my-submissions')}
                        className="flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-white transition-colors text-sm font-medium cursor-pointer">
                        All My Submissions
                    </button>
                </div>
            </div>
        </div>
    );
}
