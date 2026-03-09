'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle,
    Clock,
    Eye,
    Filter,
    Shield,
    TrendingDown,
    Users,
} from 'lucide-react';
import { useAllSubmissions } from '@/hooks/useSubmissions';
import { useSelectedCourse } from '@/hooks/useSelectedCourse';
import {
    PageHeader,
    StatCard,
    Skeleton,
    FilterToolbar,
    SearchInput,
    EmptyState,
    ErrorBanner,
    avg,
} from '@/components/submissions/lecturer/PageShell';
import type { Submission } from '@/types/submission.types';

/* ─── Risk classification ──────────────────────────────────── */

type PerformanceStatus = 'excellent' | 'good' | 'average' | 'at-risk' | 'critical';

function hasDownwardTrend(subs: Submission[]): boolean {
    const graded = subs
        .filter((s) => s.grade != null && s.submittedAt)
        .sort((a, b) => new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime());
    if (graded.length < 3) return false;
    const r = graded.slice(-3);
    return r[0].grade! > r[1].grade! && r[1].grade! > r[2].grade!;
}

function classifyStatus(avgGrade: number, avgPlag: number, failed: number, missed: number, trend: boolean): PerformanceStatus {
    if (avgGrade < 50 || failed >= 2 || missed >= 2 || avgPlag > 50) return avgGrade < 40 ? 'critical' : 'at-risk';
    if (avgGrade < 65 || failed >= 1 || missed >= 1 || trend || avgPlag > 25) return 'at-risk';
    if (avgGrade >= 85) return 'excellent';
    if (avgGrade >= 75) return 'good';
    return 'average';
}

const STATUS_STYLE: Record<PerformanceStatus, string> = {
    excellent: 'bg-green-100 text-green-700 border-green-200',
    good: 'bg-blue-100 text-blue-700 border-blue-200',
    average: 'bg-amber-100 text-amber-700 border-amber-200',
    'at-risk': 'bg-orange-100 text-orange-700 border-orange-200',
    critical: 'bg-red-100 text-red-700 border-red-200',
};

const AVATAR_BG: Record<PerformanceStatus, string> = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    average: 'bg-amber-500',
    'at-risk': 'bg-orange-500',
    critical: 'bg-red-500',
};

interface StudentSummary {
    studentId: string;
    name: string;
    registrationId?: string;
    email?: string;
    modules: string[];
    totalSubmissions: number;
    averageGrade: number;
    averagePlagiarism: number;
    averageAiScore: number;
    lateCount: number;
    failedCount: number;
    missedCount: number;
    downwardTrend: boolean;
    status: PerformanceStatus;
    flagged: boolean;
    lastActive: string | null;
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function LecturerStudentInsightsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | PerformanceStatus>('all');
    const [sortBy, setSortBy] = useState<'name' | 'grade' | 'plagiarism' | 'submissions'>('grade');

    const { data: submissions, loading, error, refetch } = useAllSubmissions();
    const selectedCourse = useSelectedCourse('lecture');

    // Build student summaries
    const students = useMemo((): StudentSummary[] => {
        const map = new Map<string, { name: string; registrationId?: string; email?: string; modules: Set<string>; subs: Submission[] }>();
        (submissions ?? []).forEach((s) => {
            if (!map.has(s.studentId)) map.set(s.studentId, { name: s.studentName ?? 'Unknown Student', registrationId: s.studentRegistrationId, email: s.studentEmail, modules: new Set(), subs: [] });
            const m = map.get(s.studentId)!;
            if (s.studentName) m.name = s.studentName;
            if (s.studentRegistrationId) m.registrationId = s.studentRegistrationId;
            if (s.studentEmail) m.email = s.studentEmail;
            if (s.moduleCode) m.modules.add(s.moduleName ?? s.moduleCode);
            m.subs.push(s);
        });
        return Array.from(map.entries()).map(([id, { name, registrationId, email, modules, subs }]) => {
            const grades = subs.filter((s) => s.grade != null).map((s) => s.grade!);
            const avgGrade = avg(grades);
            const avgPlag = avg(subs.filter((s) => s.plagiarismScore != null).map((s) => s.plagiarismScore!));
            const avgAi = avg(subs.filter((s) => s.aiScore != null).map((s) => s.aiScore!));
            const lateCount = subs.filter((s) => s.isLate).length;
            const failedCount = subs.filter((s) => { if (s.grade == null) return false; return (s.grade / (s.totalMarks ?? 100)) * 100 < 60; }).length;
            const now = Date.now();
            const missedCount = subs.filter((s) => s.dueDate && new Date(s.dueDate).getTime() < now && s.status === 'DRAFT').length;
            const downwardTrend = hasDownwardTrend(subs);
            const lastActive = subs.map((s) => s.submittedAt ?? s.createdAt).filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
            return {
                studentId: id, name, registrationId, email,
                modules: Array.from(modules),
                totalSubmissions: subs.length,
                averageGrade: avgGrade, averagePlagiarism: avgPlag, averageAiScore: avgAi,
                lateCount, failedCount, missedCount, downwardTrend,
                status: classifyStatus(avgGrade, avgPlag, failedCount, missedCount, downwardTrend),
                flagged: avgPlag > 25 || subs.some((s) => (s.plagiarismScore ?? 0) > 30),
                lastActive,
            };
        });
    }, [submissions]);

    const filtered = useMemo(() => {
        const list = students.filter((s) => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = s.name.toLowerCase().includes(q) || (s.registrationId ?? '').toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q);
            const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
            const matchesCourse = !selectedCourse || s.modules.some((m) => m === selectedCourse.name || m === selectedCourse.id || m === selectedCourse.courseCode);
            return matchesSearch && matchesStatus && matchesCourse;
        });
        return [...list].sort((a, b) => {
            switch (sortBy) {
                case 'name': return a.name.localeCompare(b.name);
                case 'grade': return b.averageGrade - a.averageGrade;
                case 'plagiarism': return b.averagePlagiarism - a.averagePlagiarism;
                case 'submissions': return b.totalSubmissions - a.totalSubmissions;
                default: return 0;
            }
        });
    }, [students, searchQuery, filterStatus, selectedCourse, sortBy]);

    const overview = useMemo(() => ({
        total: students.length,
        excellent: students.filter((s) => s.status === 'excellent').length,
        atRisk: students.filter((s) => s.status === 'at-risk' || s.status === 'critical').length,
        flagged: students.filter((s) => s.flagged).length,
    }), [students]);

    return (
        <div>
            <PageHeader title="Student Insights" subtitle="Monitor performance and identify students who need support" icon={Users} iconColor="text-blue-600" loading={loading} onRefresh={refetch} />

            {error && <ErrorBanner message={`Could not load student data: ${error}`} />}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {loading ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />) : (
                    <>
                        <StatCard label="Total Students" value={overview.total} />
                        <StatCard label="Excellent" value={overview.excellent} bgClass="bg-green-50 border-green-200" textClass="text-green-700" />
                        <StatCard label="At Risk" value={overview.atRisk} bgClass="bg-orange-50 border-orange-200" textClass="text-orange-700" />
                        <StatCard label="Plagiarism Flagged" value={overview.flagged} bgClass="bg-red-50 border-red-200" textClass="text-red-700" />
                    </>
                )}
            </div>

            {/* Filters */}
            <FilterToolbar>
                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, ID, or email…" />
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as never)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Status</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="at-risk">At Risk</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as never)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="grade">Sort: Grade</option>
                    <option value="name">Sort: Name</option>
                    <option value="plagiarism">Sort: Plagiarism</option>
                    <option value="submissions">Sort: Submissions</option>
                </select>
                {selectedCourse && (
                    <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">{selectedCourse.name}</span>
                )}
            </FilterToolbar>

            {/* Student List */}
            <div className="space-y-2">
                {loading ? (
                    [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)
                ) : filtered.length === 0 ? (
                    <EmptyState icon={Users} message={students.length === 0 ? 'No student data yet' : 'No students match your filters'} />
                ) : (
                    filtered.map((student) => <StudentCard key={student.studentId} student={student} onNavigate={(p) => router.push(p)} />)
                )}
            </div>

            {!loading && filtered.length > 0 && (
                <p className="text-xs text-gray-400 text-right mt-2">Showing {filtered.length} of {students.length}</p>
            )}
        </div>
    );
}

/* ─── Student Card ─────────────────────────────────────────── */

function StudentCard({ student: s, onNavigate }: { student: StudentSummary; onNavigate: (p: string) => void }) {
    return (
        <div className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all duration-200 ${s.flagged ? 'border-red-200' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {/* Header: avatar + name + badges */}
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${AVATAR_BG[s.status]}`}>
                            {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">{s.name}</span>
                                {s.registrationId && <span className="text-xs text-gray-400">{s.registrationId}</span>}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_STYLE[s.status]}`}>
                                    {s.status.replace('-', ' ')}
                                </span>
                                {s.flagged && (
                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                        <Shield size={10} /> Flagged
                                    </span>
                                )}
                            </div>
                            {s.email && <p className="text-xs text-gray-400 truncate">{s.email}</p>}
                        </div>
                    </div>

                    {/* Metrics row */}
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-center">
                        <MiniStat label="Submissions" value={s.totalSubmissions} />
                        <MiniStat label="Avg Grade" value={s.averageGrade > 0 ? `${s.averageGrade}%` : '–'} color={s.averageGrade >= 80 ? 'text-green-600' : s.averageGrade >= 65 ? 'text-blue-600' : s.averageGrade > 0 ? 'text-red-600' : 'text-gray-400'} />
                        <MiniStat label="Plagiarism" value={s.averagePlagiarism > 0 ? `${s.averagePlagiarism}%` : '–'} color={s.averagePlagiarism < 10 ? 'text-green-600' : s.averagePlagiarism < 20 ? 'text-amber-600' : s.averagePlagiarism > 0 ? 'text-red-600' : 'text-gray-400'} />
                        <MiniStat label="AI Score" value={s.averageAiScore > 0 ? String(s.averageAiScore) : '–'} color="text-purple-600" />
                        <MiniStat label="Late" value={s.lateCount} color={s.lateCount === 0 ? 'text-green-600' : 'text-amber-600'} />
                    </div>

                    {/* Risk indicators */}
                    {(s.failedCount > 0 || s.missedCount > 0 || s.downwardTrend) && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {s.failedCount > 0 && <RiskTag icon={AlertTriangle} label={`${s.failedCount} Failed`} cls="bg-red-100 text-red-700" />}
                            {s.missedCount > 0 && <RiskTag icon={Clock} label={`${s.missedCount} Missed`} cls="bg-amber-100 text-amber-700" />}
                            {s.downwardTrend && <RiskTag icon={TrendingDown} label="Declining" cls="bg-orange-100 text-orange-700" />}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => onNavigate('/submissions/lecturer/submissions')} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer">
                        <Eye size={12} /> Submissions
                    </button>
                    {s.flagged && (
                        <button onClick={() => onNavigate('/submissions/lecturer/plagiarism')} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer">
                            <AlertTriangle size={12} /> Review
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
    return (
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">{label}</div>
            <div className={`text-sm font-bold ${color ?? 'text-gray-900'}`}>{value}</div>
        </div>
    );
}

function RiskTag({ icon: Icon, label, cls }: { icon: typeof AlertTriangle; label: string; cls: string }) {
    return (
        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            <Icon size={10} /> {label}
        </span>
    );
}
