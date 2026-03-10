'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Archive,
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    Eye,
    FileText,
    Filter,
    Users,
} from 'lucide-react';
import { useAssignments } from '@/hooks/useSubmissions';
import { useSelectedCourse } from '@/hooks/useSelectedCourse';
import {
    PageHeader,
    StatCard,
    Skeleton,
    FilterToolbar,
    SearchInput,
    EmptyState,
    ErrorBanner,
} from '@/components/submissions/lecturer/PageShell';
import type { Assignment } from '@/types/submission.types';

/* ─── Helpers ──────────────────────────────────────────────── */

type StatusFilter = 'all' | 'OPEN' | 'CLOSED' | 'DRAFT';
type TypeFilter = 'all' | 'project' | 'task';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    OPEN:   { label: 'Open',   cls: 'bg-green-100 text-green-700' },
    CLOSED: { label: 'Closed', cls: 'bg-gray-100 text-gray-600' },
    DRAFT:  { label: 'Draft',  cls: 'bg-amber-100 text-amber-700' },
};

const PAGE_LOAD_TIME = Date.now();

/* ─── Page ─────────────────────────────────────────────────── */

export default function LecturerManageAssignmentsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
    const [filterType, setFilterType] = useState<TypeFilter>('all');

    const { data: assignments, loading, error, refetch } = useAssignments();
    const selectedCourse = useSelectedCourse('lecture');

    const filtered = useMemo(() => {
        return (assignments ?? []).filter((a) => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = a.title.toLowerCase().includes(q) || a.moduleCode.toLowerCase().includes(q) || (a.moduleName ?? '').toLowerCase().includes(q);
            const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
            const matchesType = filterType === 'all' || a.assignmentType === filterType;
            const matchesCourse = !selectedCourse || a.moduleName === selectedCourse.name || a.moduleCode === selectedCourse.id || a.moduleCode === selectedCourse.courseCode;
            return matchesSearch && matchesStatus && matchesType && matchesCourse;
        });
    }, [assignments, searchQuery, filterStatus, filterType, selectedCourse]);

    const stats = useMemo(() => {
        const all = assignments ?? [];
        return {
            total: all.length,
            open: all.filter((a) => a.status === 'OPEN').length,
            closed: all.filter((a) => a.status === 'CLOSED').length,
            draft: all.filter((a) => a.status === 'DRAFT').length,
        };
    }, [assignments]);

    return (
        <div>
            <PageHeader title="Manage Assignments" subtitle="All projects and tasks across your courses" loading={loading} onRefresh={refetch} />

            {error && <ErrorBanner message={`Could not load assignments: ${error}`} />}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {loading ? (
                    [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)
                ) : (
                    <>
                        <StatCard label="Total" value={stats.total} gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
                        <StatCard label="Open" value={stats.open} bgClass="bg-green-50 border-green-200" textClass="text-green-700" />
                        <StatCard label="Drafts" value={stats.draft} bgClass="bg-amber-50 border-amber-200" textClass="text-amber-700" />
                        <StatCard label="Closed" value={stats.closed} bgClass="bg-gray-100 border-gray-200" textClass="text-gray-600" />
                    </>
                )}
            </div>

            {/* Filters */}
            <FilterToolbar>
                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by title, module code or name…" />
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter size={14} className="text-gray-400" />
                    {/* Type pills */}
                    <div className="flex gap-1">
                        {(['all', 'project', 'task'] as TypeFilter[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                                    filterType === t
                                        ? t === 'project' ? 'bg-blue-600 text-white border-transparent'
                                        : t === 'task' ? 'bg-teal-600 text-white border-transparent'
                                        : 'bg-gray-800 text-white border-transparent'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                }`}
                            >
                                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
                            </button>
                        ))}
                    </div>
                    {/* Status pills */}
                    <div className="flex gap-1">
                        {(['all', 'OPEN', 'DRAFT', 'CLOSED'] as StatusFilter[]).map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                                    filterStatus === s
                                        ? s === 'OPEN' ? 'bg-green-600 text-white border-transparent'
                                        : s === 'DRAFT' ? 'bg-amber-500 text-white border-transparent'
                                        : s === 'CLOSED' ? 'bg-gray-500 text-white border-transparent'
                                        : 'bg-gray-800 text-white border-transparent'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                }`}
                            >
                                {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
                {selectedCourse && (
                    <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">
                        {selectedCourse.name}
                    </span>
                )}
            </FilterToolbar>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    [1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)
                ) : filtered.length === 0 ? (
                    <EmptyState icon={FileText} message={assignments?.length === 0 ? 'No assignments yet' : 'No assignments match your filters'} />
                ) : (
                    filtered.map((assignment) => (
                        <AssignmentCard key={assignment.id} assignment={assignment} onNavigate={(path) => router.push(path)} />
                    ))
                )}
            </div>
        </div>
    );
}

/* ─── Assignment Card ──────────────────────────────────────── */

function AssignmentCard({
    assignment: a,
    onNavigate,
}: {
    assignment: Assignment;
    onNavigate: (path: string) => void;
}) {
    const submitted = a.submissionsCount ?? 0;
    const graded = a.gradedCount ?? 0;
    const dueDate = new Date(a.dueDate);
    const isOverdue = a.status === 'OPEN' && dueDate.getTime() < PAGE_LOAD_TIME;
    const badge = STATUS_BADGE[a.status];

    return (
        <div className={`bg-white rounded-lg border p-4 hover:shadow-sm transition-all ${isOverdue ? 'border-l-4 border-l-red-400 border-gray-200' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <FileText className="text-blue-600 shrink-0" size={16} />
                        <h3 className="font-semibold text-gray-900 text-sm">{a.title}</h3>
                        {badge && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>}
                        {a.assignmentType && (
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${a.assignmentType === 'project' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>
                                {a.assignmentType === 'project' ? 'Project' : 'Task'}
                            </span>
                        )}
                        {isOverdue && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Overdue</span>}
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                        <span>{a.moduleName ?? a.moduleCode}</span>
                        <span className="flex items-center gap-1">
                            <Award size={12} className="text-purple-500" /> {a.totalMarks} marks
                        </span>
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                            <Calendar size={12} /> Due: {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {submitted > 0 && (
                            <span className="flex items-center gap-1"><Users size={12} className="text-green-500" /> {submitted} submitted</span>
                        )}
                    </div>

                    {/* Progress */}
                    {submitted > 0 && graded > 0 && (
                        <div className="max-w-xs">
                            <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                                <span>Graded</span>
                                <span>{graded}/{submitted} ({Math.round((graded / submitted) * 100)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(graded / submitted) * 100}%` }} />
                            </div>
                        </div>
                    )}

                    {a.description && <p className="text-xs text-gray-400 mt-1.5 line-clamp-1">{a.description}</p>}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                        onClick={() => onNavigate(`/submissions/lecturer/assignments/${a.id}`)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                        <Eye size={12} /> View
                    </button>
                    {submitted > graded && a.status !== 'DRAFT' && (
                        <button
                            onClick={() => onNavigate('/submissions/lecturer/submissions')}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                            <Edit size={12} /> Grade ({submitted - graded})
                        </button>
                    )}
                    {a.status === 'CLOSED' && (
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Archive size={11} /> Closed</span>
                    )}
                </div>
            </div>
        </div>
    );
}
