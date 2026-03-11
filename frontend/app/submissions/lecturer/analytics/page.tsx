'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle,
    Award,
    BarChart3,
    CheckCircle2,
    FileText,
    Filter,
    Shield,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useAllSubmissions, useAssignments } from '@/hooks/useSubmissions';
import { submissionService } from '@/lib/api/submission-services';
import {
    PageHeader,
    StatCard,
    Skeleton,
    SectionCard,
    ErrorBanner,
    avg,
} from '@/components/submissions/lecturer/PageShell';
import type { Submission, TextAnswer } from '@/types/submission.types';

/* ─── Helpers ──────────────────────────────────────────────── */

function monthKey(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key: string) {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function LecturerAnalyticsPage() {
    const router = useRouter();
    const [selectedModule, setSelectedModule] = useState('all');

    const { data: rawSubmissions, loading, error, refetch: refetchSubs } = useAllSubmissions();
    const { refetch: refetchAssgs } = useAssignments();

    const submissions = useMemo(() => {
        const all = (rawSubmissions ?? []).filter((s) => s.status !== 'DRAFT');
        return selectedModule === 'all' ? all : all.filter((s) => s.moduleCode === selectedModule);
    }, [rawSubmissions, selectedModule]);

    const modules = useMemo(() => {
        const seen = new Set<string>();
        (rawSubmissions ?? []).forEach((s) => { if (s.moduleCode) seen.add(s.moduleCode); });
        return Array.from(seen).sort();
    }, [rawSubmissions]);

    // ── Overall stats
    const overall = useMemo(() => {
        const subs = submissions;
        const graded = subs.filter((s) => s.status === 'GRADED' && s.grade != null);
        const submitted = subs.filter((s) => s.status !== 'DRAFT');
        const studentIds = new Set(subs.map((s) => s.studentId));
        const onTime = subs.filter((s) => !s.isLate).length;
        const totalVersions = subs.reduce((a, s) => a + (s.totalVersions ?? 1), 0);
        return {
            totalSubmissions: subs.length,
            totalStudents: studentIds.size,
            averageGrade: avg(graded.map((s) => s.grade!)),
            submissionRate: subs.length > 0 ? Math.round((submitted.length / subs.length) * 100) : 0,
            averagePlagiarism: avg(subs.filter((s) => s.plagiarismScore != null).map((s) => s.plagiarismScore!)),
            onTimeRate: subs.length > 0 ? Math.round((onTime / subs.length) * 100) : 0,
            averageVersions: subs.length > 0 ? Math.round((totalVersions / subs.length) * 10) / 10 : 0,
        };
    }, [submissions]);

    // ── Grade distribution
    const gradeDist = useMemo(() => {
        const graded = submissions.filter((s) => s.status === 'GRADED' && s.grade != null);
        const buckets = [
            { label: 'A+ (90–100)', min: 90, max: 100, color: 'bg-green-600' },
            { label: 'A (80–89)', min: 80, max: 89, color: 'bg-green-500' },
            { label: 'B (70–79)', min: 70, max: 79, color: 'bg-blue-500' },
            { label: 'C (60–69)', min: 60, max: 69, color: 'bg-amber-500' },
            { label: 'D (50–59)', min: 50, max: 59, color: 'bg-orange-500' },
            { label: 'F (<50)', min: 0, max: 49, color: 'bg-red-500' },
        ];
        return buckets.map((b) => {
            const count = graded.filter((s) => s.grade! >= b.min && s.grade! <= b.max).length;
            const pct = graded.length > 0 ? Math.round((count / graded.length) * 1000) / 10 : 0;
            return { ...b, count, pct };
        });
    }, [submissions]);

    // ── Plagiarism breakdown
    const plagBreakdown = useMemo(() => {
        const ws = submissions.filter((s) => s.plagiarismScore != null);
        const t = ws.length || 1;
        const band = (lo: number, hi: number) => { const c = ws.filter((s) => s.plagiarismScore! >= lo && s.plagiarismScore! <= hi).length; return { count: c, pct: Math.round((c / t) * 1000) / 10 }; };
        return {
            excellent: { ...band(0, 10), range: '0–10%' },
            good: { ...band(11, 20), range: '11–20%' },
            warning: { ...band(21, 30), range: '21–30%' },
            critical: { ...band(31, 100), range: '31%+' },
        };
    }, [submissions]);

    // ── Submission trends (by month, last 6)
    const trends = useMemo(() => {
        const map = new Map<string, { total: number; onTime: number; late: number }>();
        submissions.forEach((s) => {
            const key = monthKey(s.createdAt);
            if (!map.has(key)) map.set(key, { total: 0, onTime: 0, late: 0 });
            const e = map.get(key)!;
            e.total++;
            if (s.isLate) e.late++; else e.onTime++;
        });
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([k, v]) => ({ date: monthLabel(k), ...v }));
    }, [submissions]);

    // ── Module performance
    const modulePerfRows = useMemo(() => {
        const map = new Map<string, { name: string; studentIds: Set<string>; subs: Submission[] }>();
        submissions.forEach((s) => {
            const code = s.moduleCode ?? 'Unknown';
            if (!map.has(code)) map.set(code, { name: s.moduleName ?? code, studentIds: new Set(), subs: [] });
            const m = map.get(code)!;
            m.studentIds.add(s.studentId);
            m.subs.push(s);
        });
        return Array.from(map.entries()).map(([code, { name, studentIds, subs }]) => {
            const graded = subs.filter((s) => s.status === 'GRADED' && s.grade != null);
            const submitted = subs.filter((s) => s.status !== 'DRAFT');
            return {
                code, name,
                students: studentIds.size,
                submissions: subs.length,
                avgGrade: avg(graded.map((s) => s.grade!)),
                plagRate: avg(subs.filter((s) => s.plagiarismScore != null).map((s) => s.plagiarismScore!)),
                compRate: subs.length > 0 ? Math.round((submitted.length / subs.length) * 1000) / 10 : 0,
            };
        }).sort((a, b) => b.avgGrade - a.avgGrade);
    }, [submissions]);

    // ── Top performers
    const topPerformers = useMemo(() => {
        const map = new Map<string, { name: string; grades: number[]; count: number }>();
        submissions.filter((s) => s.status === 'GRADED' && s.grade != null).forEach((s) => {
            if (!map.has(s.studentId)) map.set(s.studentId, { name: s.studentName ?? 'Unknown Student', grades: [], count: 0 });
            const m = map.get(s.studentId)!;
            m.grades.push(s.grade!);
            m.count++;
        });
        return Array.from(map.entries()).map(([id, { name, grades, count }]) => ({ id, name, avg: avg(grades), count })).sort((a, b) => b.avg - a.avg).slice(0, 5);
    }, [submissions]);

    // ── At-risk students
    const atRisk = useMemo(() => {
        const map = new Map<string, { name: string; grades: number[]; plagScores: number[]; missed: number; subs: number }>();
        submissions.forEach((s) => {
            if (!map.has(s.studentId)) map.set(s.studentId, { name: s.studentName ?? 'Unknown Student', grades: [], plagScores: [], missed: 0, subs: 0 });
            const m = map.get(s.studentId)!;
            if (s.grade != null) m.grades.push(s.grade);
            if (s.plagiarismScore != null) m.plagScores.push(s.plagiarismScore);
            if (s.isLate) m.missed++;
            m.subs++;
        });
        return Array.from(map.entries()).map(([id, { name, grades, plagScores, missed, subs }]) => ({
            id, name, avgGrade: avg(grades), plagScore: avg(plagScores), missed, subs,
        })).filter((s) => s.avgGrade < 65 || s.plagScore > 25).sort((a, b) => a.avgGrade - b.avgGrade).slice(0, 5);
    }, [submissions]);

    // ── Per-question analytics
    const [allAnswers, setAllAnswers] = useState<TextAnswer[]>([]);
    const [answersLoading, setAnswersLoading] = useState(false);

    useEffect(() => {
        const graded = (rawSubmissions ?? []).filter((s) => s.status === 'GRADED');
        if (graded.length === 0) return;
        let cancelled = false;
        const t = setTimeout(() => {
            setAnswersLoading(true);
            Promise.all(graded.map((s) => submissionService.getAnswers(s.id).catch(() => [] as TextAnswer[])))
                .then((results) => { if (!cancelled) setAllAnswers(results.flat()); })
                .finally(() => { if (!cancelled) setAnswersLoading(false); });
        }, 0);
        return () => { cancelled = true; clearTimeout(t); };
    }, [rawSubmissions]);

    const questionRows = useMemo(() => {
        const map = new Map<string, { text: string; entries: TextAnswer[] }>();
        allAnswers.forEach((a) => {
            if (!map.has(a.questionId)) map.set(a.questionId, { text: a.questionText ?? a.questionId, entries: [] });
            map.get(a.questionId)!.entries.push(a);
        });
        return Array.from(map.entries()).map(([qId, { text, entries }]) => {
            const nums = (f: keyof TextAnswer) => entries.filter((e) => e[f] != null).map((e) => e[f] as number);
            return {
                questionId: qId, text, responses: entries.length,
                avgWords: avg(entries.map((e) => e.wordCount ?? 0)),
                avgGrammar: avg(nums('grammarScore')), avgClarity: avg(nums('clarityScore')),
                avgCompleteness: avg(nums('completenessScore')), avgRelevance: avg(nums('relevanceScore')),
                avgSimilarity: avg(nums('similarityScore')),
                flagged: entries.filter((e) => e.plagiarismFlagged).length,
            };
        }).sort((a, b) => b.responses - a.responses);
    }, [allAnswers]);

    const handleRefresh = () => { refetchSubs(); refetchAssgs(); };

    return (
        <div>
            <PageHeader
                title="Analytics Dashboard"
                subtitle="Comprehensive insights into class performance and submission trends"
                icon={BarChart3}
                iconColor="text-blue-600"
                loading={loading}
                onRefresh={handleRefresh}
                actions={
                    modules.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                            <Filter size={14} className="text-gray-400" />
                            <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="all">All Modules</option>
                                {modules.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    ) : undefined
                }
            />

            {error && <ErrorBanner message={`Could not load analytics data: ${error}`} />}

            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {loading ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />) : (
                    <>
                        <StatCard label="Total Submissions" value={overall.totalSubmissions} gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
                        <StatCard label="Average Grade" value={overall.averageGrade > 0 ? `${overall.averageGrade}%` : '–'} gradient="bg-gradient-to-br from-green-500 to-green-600" />
                        <StatCard label="Submission Rate" value={`${overall.submissionRate}%`} gradient="bg-gradient-to-br from-purple-500 to-purple-600" />
                        <StatCard label="Avg. Plagiarism" value={overall.averagePlagiarism > 0 ? `${overall.averagePlagiarism}%` : '–'} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
                    </>
                )}
            </div>

            {/* Grade Distribution + Plagiarism */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <SectionCard title="Grade Distribution" icon={Award} iconColor="text-blue-600">
                    {loading ? <Skeleton className="h-40" /> : (
                        <div className="space-y-3">
                            {gradeDist.map((b) => (
                                <div key={b.label}>
                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                        <span className="font-medium text-gray-700">{b.label}</span>
                                        <span className="text-gray-500">{b.count} · {b.pct}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className={`${b.color} h-2 rounded-full transition-all`} style={{ width: `${b.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                            {overall.averageGrade > 0 && (
                                <p className="text-xs text-blue-700 bg-blue-50 rounded-lg p-2 font-medium mt-2">Class Average: {overall.averageGrade}%</p>
                            )}
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="Plagiarism Statistics" icon={Shield} iconColor="text-green-600">
                    {loading ? <Skeleton className="h-40" /> : (
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { ...plagBreakdown.excellent, label: 'Excellent', cls: 'bg-green-50 border-green-200 text-green-700' },
                                { ...plagBreakdown.good, label: 'Good', cls: 'bg-blue-50 border-blue-200 text-blue-700' },
                                { ...plagBreakdown.warning, label: 'Warning', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
                                { ...plagBreakdown.critical, label: 'Critical', cls: 'bg-red-50 border-red-200 text-red-700' },
                            ].map((b) => (
                                <div key={b.label} className={`p-3 rounded-lg border ${b.cls}`}>
                                    <div className="text-xl font-bold">{b.count}</div>
                                    <div className="text-xs mt-0.5">{b.label} ({b.range})</div>
                                    <div className="text-xs font-medium mt-0.5">{b.pct}%</div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* Submission Trends */}
            <SectionCard title="Submission Trends" icon={TrendingUp} iconColor="text-purple-600">
                {loading ? <Skeleton className="h-32" /> : trends.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">No submission trend data yet</p>
                ) : (
                    <>
                        <div className="space-y-3">
                            {trends.map((w, i) => (
                                <div key={i}>
                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                        <span className="font-medium text-gray-700">{w.date}</span>
                                        <div className="flex gap-3">
                                            <span className="text-green-600">On-time: {w.onTime}</span>
                                            <span className="text-red-600">Late: {w.late}</span>
                                            <span className="font-bold text-gray-800">{w.total}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5 w-full h-4 rounded overflow-hidden">
                                        {w.total > 0 && <div className="bg-green-500" style={{ width: `${(w.onTime / w.total) * 100}%` }} />}
                                        {w.total > 0 && <div className="bg-red-500" style={{ width: `${(w.late / w.total) * 100}%` }} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <MiniStat label="On-Time Rate" value={`${overall.onTimeRate}%`} />
                            <MiniStat label="Avg. Versions" value={overall.averageVersions} />
                            <MiniStat label="Total Students" value={overall.totalStudents} />
                        </div>
                    </>
                )}
            </SectionCard>

            {/* Module Performance */}
            {modulePerfRows.length > 0 && (
                <div className="mt-6">
                    <SectionCard title="Module Performance" icon={FileText} iconColor="text-blue-600">
                        <div className="overflow-x-auto -mx-5 -mb-5">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        {['Module', 'Students', 'Subs', 'Avg Grade', 'Plagiarism', 'Rate'].map((h) => (
                                            <th key={h} className="text-left py-2 px-4 text-xs font-semibold text-gray-500">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {modulePerfRows.map((m) => (
                                        <tr key={m.code} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-2 px-4">
                                                <div className="font-medium text-gray-900">{m.code}</div>
                                                <div className="text-xs text-gray-400">{m.name}</div>
                                            </td>
                                            <td className="py-2 px-4 text-gray-700">{m.students}</td>
                                            <td className="py-2 px-4 text-gray-700">{m.submissions}</td>
                                            <td className="py-2 px-4"><ScorePill value={m.avgGrade} type="grade" /></td>
                                            <td className="py-2 px-4"><ScorePill value={m.plagRate} type="plag" /></td>
                                            <td className="py-2 px-4"><ScorePill value={m.compRate} type="rate" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* Top Performers + At-Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <SectionCard title="Top Performers" icon={Award} iconColor="text-amber-600">
                    {loading ? <Skeleton className="h-32" /> : topPerformers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-6">No graded submissions yet</p>
                    ) : (
                        <div className="space-y-2">
                            {topPerformers.map((s, i) => (
                                <div key={s.id} className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg border border-amber-100 cursor-pointer hover:shadow-sm" onClick={() => router.push('/submissions/lecturer/students')}>
                                    <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">#{i + 1}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                                        <p className="text-xs text-gray-500">{s.count} submissions</p>
                                    </div>
                                    <span className="text-sm font-bold text-amber-600">{s.avg}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="At-Risk Students" icon={AlertTriangle} iconColor="text-red-600">
                    {loading ? <Skeleton className="h-32" /> : atRisk.length === 0 ? (
                        <div className="text-center py-6">
                            <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
                            <p className="text-sm text-gray-500">No students at risk!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {atRisk.map((s) => (
                                <div key={s.id} className="p-2 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:shadow-sm" onClick={() => router.push('/submissions/lecturer/students')}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-900">{s.name}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="p-1.5 bg-white rounded border border-red-100">
                                            <div className="text-gray-400">Grade</div>
                                            <div className="font-bold text-red-600">{s.avgGrade > 0 ? `${s.avgGrade}%` : '–'}</div>
                                        </div>
                                        <div className="p-1.5 bg-white rounded border border-red-100">
                                            <div className="text-gray-400">Plag</div>
                                            <div className="font-bold text-red-600">{s.plagScore > 0 ? `${s.plagScore}%` : '–'}</div>
                                        </div>
                                        <div className="p-1.5 bg-white rounded border border-red-100">
                                            <div className="text-gray-400">Late</div>
                                            <div className="font-bold text-red-600">{s.missed}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => router.push('/submissions/lecturer/students')} className="w-full mt-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium cursor-pointer">
                                View All Students
                            </button>
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* Per-Question Analytics */}
            {(answersLoading || questionRows.length > 0) && (
                <div className="mt-6">
                    <SectionCard title="Per-Question Analytics" icon={FileText} iconColor="text-purple-600">
                        {answersLoading ? <Skeleton className="h-32" /> : (
                            <div className="overflow-x-auto -mx-5 -mb-5">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            {['Question', '#', 'Words', 'Grammar', 'Clarity', 'Complete', 'Relevance', 'Similarity', 'Flagged'].map((h) => (
                                                <th key={h} className="text-left py-2 px-3 font-semibold text-gray-500">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {questionRows.map((q) => {
                                            const aiAvg = avg([q.avgGrammar, q.avgClarity, q.avgCompleteness, q.avgRelevance].filter((v) => v > 0));
                                            const sc = (v: number) => v === 0 ? 'text-gray-400' : v >= 75 ? 'text-green-600 font-bold' : v >= 55 ? 'text-amber-600 font-bold' : 'text-red-600 font-bold';
                                            return (
                                                <tr key={q.questionId} className="border-b border-gray-50 hover:bg-gray-50">
                                                    <td className="py-2 px-3 max-w-[180px]">
                                                        <p className="truncate font-medium text-gray-800" title={q.text}>{q.text.length > 50 ? q.text.slice(0, 50) + '…' : q.text}</p>
                                                        {aiAvg > 0 && <span className={`${sc(aiAvg)}`}>AI avg: {aiAvg}%</span>}
                                                    </td>
                                                    <td className="py-2 px-3 font-medium text-gray-900">{q.responses}</td>
                                                    <td className="py-2 px-3 text-gray-600">{q.avgWords > 0 ? q.avgWords : '–'}</td>
                                                    <td className={`py-2 px-3 ${sc(q.avgGrammar)}`}>{q.avgGrammar > 0 ? `${q.avgGrammar}%` : '–'}</td>
                                                    <td className={`py-2 px-3 ${sc(q.avgClarity)}`}>{q.avgClarity > 0 ? `${q.avgClarity}%` : '–'}</td>
                                                    <td className={`py-2 px-3 ${sc(q.avgCompleteness)}`}>{q.avgCompleteness > 0 ? `${q.avgCompleteness}%` : '–'}</td>
                                                    <td className={`py-2 px-3 ${sc(q.avgRelevance)}`}>{q.avgRelevance > 0 ? `${q.avgRelevance}%` : '–'}</td>
                                                    <td className={`py-2 px-3 ${q.avgSimilarity > 25 ? 'text-red-600 font-bold' : q.avgSimilarity > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{q.avgSimilarity > 0 ? `${q.avgSimilarity}%` : '–'}</td>
                                                    <td className="py-2 px-3">
                                                        {q.flagged > 0 ? (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                                                <Shield size={9} /> {q.flagged}
                                                            </span>
                                                        ) : <span className="text-green-500">✓</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                </div>
            )}

            {/* Summary Footer */}
            <div className="mt-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                <h3 className="text-lg font-bold mb-3">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Active Students', value: overall.totalStudents },
                        { label: 'Total Submissions', value: overall.totalSubmissions },
                        { label: 'Class Average', value: overall.averageGrade > 0 ? `${overall.averageGrade}%` : '–' },
                        { label: 'Submission Rate', value: `${overall.submissionRate}%` },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <div className="text-2xl font-bold">{value}</div>
                            <div className="text-blue-100 text-xs">{label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── Tiny helpers ─────────────────────────────────────────── */

function MiniStat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <div className="text-lg font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
        </div>
    );
}

function ScorePill({ value, type }: { value: number; type: 'grade' | 'plag' | 'rate' }) {
    if (value === 0) return <span className="text-xs text-gray-400">–</span>;
    let cls = 'bg-gray-100 text-gray-700';
    if (type === 'grade') cls = value >= 80 ? 'bg-green-100 text-green-700' : value >= 70 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
    else if (type === 'plag') cls = value < 10 ? 'bg-green-100 text-green-700' : value < 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
    else if (type === 'rate') cls = value >= 90 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{value}%</span>;
}
