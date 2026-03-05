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
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [assignments, searchQuery, filterStatus, filterType]);

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
                    [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)
                ) : (
                    <>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                            <div className="text-xs text-gray-500 mt-1">Total</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="text-2xl font-bold text-green-700">{stats.open}</div>
                            <div className="text-xs text-green-600 mt-1">Open</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="text-2xl font-bold text-gray-700">{stats.draft}</div>
                            <div className="text-xs text-gray-500 mt-1">Drafts</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="text-2xl font-bold text-blue-700">{stats.closed}</div>
                            <div className="text-xs text-blue-600 mt-1">Closed</div>
                        </div>
                    </>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search projects, tasks, modules…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter size={18} className="text-gray-400" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as TypeFilter)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Types</option>
                            <option value="project">Projects</option>
                            <option value="task">Tasks</option>
                        </select>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="OPEN">Open</option>
                            <option value="DRAFT">Draft</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                    </div>
                </div>
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
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
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
