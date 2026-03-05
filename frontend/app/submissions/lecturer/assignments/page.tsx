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
    RefreshCw,
    Search,
    Users,
} from 'lucide-react';
import { useAssignments } from '@/hooks/useSubmissions';
import { useSelectedCourse } from '@/hooks/useSelectedCourse';
import type { Assignment } from '@/types/submission.types';

// ─── Helpers ──────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

type StatusFilter = 'all' | 'OPEN' | 'CLOSED' | 'DRAFT';
type TypeFilter  = 'all' | 'project' | 'task';

function statusBadge(status: Assignment['status']) {
    switch (status) {
        case 'OPEN':
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle2 size={12} /> Open
                </span>
            );
        case 'CLOSED':
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    <Clock size={12} /> Closed
                </span>
            );
        case 'DRAFT':
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    <Edit size={12} /> Draft
                </span>
            );
    }
}

// ─── Page ─────────────────────────────────────────────────────

const PAGE_LOAD_TIME = Date.now();

export default function LecturerManageAssignmentsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
    const [filterType, setFilterType] = useState<TypeFilter>('all');

    const { data: assignments, loading, error, refetch } = useAssignments();
    const selectedCourse = useSelectedCourse('lecture');

    // Filter
    const filtered = useMemo(() => {
        return (assignments ?? []).filter((a) => {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                a.title.toLowerCase().includes(q) ||
                a.moduleCode.toLowerCase().includes(q) ||
                (a.moduleName ?? '').toLowerCase().includes(q);
            const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
            const matchesType   = filterType === 'all' || a.assignmentType === filterType;
            const matchesCourse = !selectedCourse ||
                a.moduleName === selectedCourse.name ||
                a.moduleCode === selectedCourse.id ||
                a.moduleCode === selectedCourse.courseCode;
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
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage Assignments</h1>
                    <p className="text-gray-600">All projects and tasks across your courses</p>
                </div>
                <button
                    onClick={refetch}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Could not load assignments: {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {loading ? (
                    [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)
                ) : (
                    <>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl text-white shadow-md">
                            <div className="text-3xl font-bold">{stats.total}</div>
                            <div className="text-xs text-blue-100 mt-1 font-medium">Total Assignments</div>
                        </div>
                        <div className="bg-green-50 p-5 rounded-xl border border-green-200 shadow-sm">
                            <div className="text-3xl font-bold text-green-700">{stats.open}</div>
                            <div className="text-xs text-green-600 mt-1 font-medium">Open</div>
                        </div>
                        <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm">
                            <div className="text-3xl font-bold text-amber-700">{stats.draft}</div>
                            <div className="text-xs text-amber-600 mt-1 font-medium">Drafts</div>
                        </div>
                        <div className="bg-gray-100 p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="text-3xl font-bold text-gray-600">{stats.closed}</div>
                            <div className="text-xs text-gray-500 mt-1 font-medium">Closed</div>
                        </div>
                    </>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by title, module code or name…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter size={15} className="text-gray-400" />
                        {/* Type pills */}
                        <div className="flex gap-1.5">
                            {(['all', 'project', 'task'] as TypeFilter[]).map((t) => (
                                <button key={t} onClick={() => setFilterType(t)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                                        filterType === t
                                            ? t === 'project' ? 'bg-blue-600 text-white border-transparent' :
                                              t === 'task' ? 'bg-teal-600 text-white border-transparent' :
                                              'bg-gray-800 text-white border-transparent'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                    }`}>
                                    {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
                                </button>
                            ))}
                        </div>
                        {/* Status pills */}
                        <div className="flex gap-1.5">
                            {(['all', 'OPEN', 'DRAFT', 'CLOSED'] as StatusFilter[]).map((s) => (
                                <button key={s} onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                                        filterStatus === s
                                            ? s === 'OPEN' ? 'bg-green-600 text-white border-transparent' :
                                              s === 'DRAFT' ? 'bg-amber-500 text-white border-transparent' :
                                              s === 'CLOSED' ? 'bg-gray-500 text-white border-transparent' :
                                              'bg-gray-800 text-white border-transparent'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                    }`}>
                                    {s === 'all' ? 'All Status' : s.charAt(0) + s.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                {selectedCourse && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-blue-700">
                        <span className="h-2 w-2 bg-blue-500 rounded-full"/>
                        Showing results for: <span className="font-semibold">{selectedCourse.name}</span>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    [1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg">
                            {assignments?.length === 0 ? 'No assignments yet' : 'No assignments match your filters'}
                        </p>
                    </div>
                ) : (
                    filtered.map((assignment) => {
                        const submitted = assignment.submissionsCount ?? 0;
                        const graded = assignment.gradedCount ?? 0;
                        const dueDate = new Date(assignment.dueDate);
                        const isOverdue = assignment.status === 'OPEN' && dueDate.getTime() < PAGE_LOAD_TIME;

                        return (
                            <div
                                key={assignment.id}
                                className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all hover:border-blue-200 ${
                                    isOverdue ? 'border-l-4 border-l-red-400 border-gray-200' : 'border-gray-200'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    {/* Left */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                                            <FileText className="text-blue-600 shrink-0" size={22} />
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                                                    {statusBadge(assignment.status)}
                                                    {assignment.assignmentType === 'project' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                            Project
                                                        </span>
                                                    )}
                                                    {assignment.assignmentType === 'task' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                                                            Task
                                                        </span>
                                                    )}
                                                    {isOverdue && (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Overdue</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {assignment.moduleCode}
                                                    {assignment.moduleName ? ` — ${assignment.moduleName}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Award className="text-purple-600 shrink-0" size={15} />
                                                <span>{assignment.totalMarks} marks</span>
                                            </div>
                                            {submitted > 0 && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Users className="text-green-600 shrink-0" size={15} />
                                                    <span>{submitted} submitted</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Calendar className="text-amber-600 shrink-0" size={15} />
                                                <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                                    Due: {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress bars */}
                                        {submitted > 0 && (
                                            <div className="space-y-2">
                                                <div>
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>Submissions</span>
                                                        <span>{submitted}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full"
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                </div>
                                                {graded > 0 && (
                                                    <div>
                                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                            <span>Graded</span>
                                                            <span>{graded}/{submitted} ({Math.round((graded / submitted) * 100)}%)</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-green-600 h-2 rounded-full"
                                                                style={{ width: `${(graded / submitted) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {assignment.description && (
                                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{assignment.description}</p>
                                        )}
                                    </div>

                                    {/* Right: actions */}
                                    <div className="flex flex-col items-end gap-3 ml-4 shrink-0">
                                        <button
                                            onClick={() => router.push(`/submissions/lecturer/assignments/${assignment.id}`)}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                                        >
                                            <Eye size={15} /> View
                                        </button>
                                        {submitted > graded && assignment.status !== 'DRAFT' && (
                                            <button
                                                onClick={() => router.push(`/submissions/lecturer/grading`)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm"
                                            >
                                                <Edit size={15} /> Grade ({submitted - graded})
                                            </button>
                                        )}
                                        {assignment.status === 'DRAFT' && (
                                            <button
                                                onClick={() => router.push(`/submissions/lecturer/assignments/${assignment.id}/edit`)}
                                                className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium flex items-center gap-2 text-sm"
                                            >
                                                <Edit size={15} /> Edit Draft
                                            </button>
                                        )}
                                        {assignment.status === 'CLOSED' && (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Archive size={13} />
                                                Closed
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
