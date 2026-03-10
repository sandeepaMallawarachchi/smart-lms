'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    Award,
    BookOpen,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    RefreshCw,
    Search,
} from 'lucide-react';
import { useAssignments } from '@/hooks/useSubmissions';
import { useSelectedCourse } from '@/hooks/useSelectedCourse';
import type { Assignment } from '@/types/submission.types';

// ─── Helpers ─────────────────────────────────────────────────

function getDaysRemaining(dueDate: string): { label: string; overdue: boolean } {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: `${Math.abs(days)} days overdue`, overdue: true };
    if (days === 0) return { label: 'Due today', overdue: false };
    if (days === 1) return { label: 'Due tomorrow', overdue: false };
    return { label: `${days} days remaining`, overdue: false };
}

// ─── Sub-components ───────────────────────────────────────────

function StatusBadge({ status }: { status: Assignment['status'] }) {
    if (status === 'OPEN') {
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle2 size={14} />
                Open
            </span>
        );
    }
    if (status === 'CLOSED') {
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                <Clock size={14} />
                Closed
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <FileText size={14} />
            Draft
        </span>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function StudentAssignmentsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'OPEN' | 'CLOSED'>('all');
    const [filterType, setFilterType] = useState<'all' | 'project' | 'task'>('all');

    const { data: assignments, loading, error, refetch } = useAssignments();
    const selectedCourse = useSelectedCourse('student');

    const filtered = (assignments ?? []).filter((a) => {
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

    const stats = {
        total: (assignments ?? []).length,
        open: (assignments ?? []).filter((a) => a.status === 'OPEN').length,
        closed: (assignments ?? []).filter((a) => a.status === 'CLOSED').length,
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">My Assignments</h1>
                    <p className="text-gray-600">All projects and tasks assigned to you</p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-xs text-gray-600 mt-1">Total</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{stats.open}</div>
                    <div className="text-xs text-green-600 mt-1">Open</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
                    <div className="text-xs text-gray-500 mt-1">Closed</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search projects, tasks or modules…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as 'all' | 'project' | 'task')}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="all">All Types</option>
                        <option value="project">Projects</option>
                        <option value="task">Tasks</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'OPEN' | 'CLOSED')}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="all">All Status</option>
                        <option value="OPEN">Open</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{error}</p>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
            ) : filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map((assignment) => {
                        const { label: daysLabel, overdue } = getDaysRemaining(assignment.dueDate);
                        return (
                            <div
                                key={assignment.id}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                    {/* Left */}
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            assignment.status === 'OPEN' ? 'bg-green-100' : 'bg-gray-100'
                                        }`}>
                                            <FileText size={24} className={
                                                assignment.status === 'OPEN' ? 'text-green-600' : 'text-gray-500'
                                            } />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                                                <StatusBadge status={assignment.status} />
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
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                                <BookOpen size={16} />
                                                <span className="font-medium">{assignment.moduleName ?? assignment.moduleCode}</span>
                                                {assignment.moduleName && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{assignment.moduleName}</span>
                                                    </>
                                                )}
                                            </div>
                                            {assignment.description && (
                                                <p className="text-sm text-gray-600 mb-3">{assignment.description}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <Award size={16} />
                                                    <span>{assignment.totalMarks} marks</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <Calendar size={16} />
                                                    <span>Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric',
                                                    })}</span>
                                                </div>
                                                <span className={`font-medium ${overdue ? 'text-red-600' : 'text-gray-600'}`}>
                                                    {daysLabel}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right — Action */}
                                    <div className="flex-shrink-0">
                                        {assignment.status === 'OPEN' && (
                                            <button
                                                onClick={() => router.push(`/submissions/student/answer/${assignment.id}${assignment.assignmentType ? `?type=${assignment.assignmentType}` : ''}`)}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                                            >
                                                Start Answering
                                            </button>
                                        )}
                                        {assignment.status === 'CLOSED' && (
                                            <span className="px-4 py-2 border border-gray-200 text-gray-400 rounded-lg text-sm font-medium">
                                                Closed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 text-lg">No assignments found</p>
                    {(searchQuery || filterStatus !== 'all') && (
                        <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filter</p>
                    )}
                </div>
            )}
        </div>
    );
}
