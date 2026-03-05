'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle,
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    Eye,
    FileText,
    Filter,
    GitBranch,
    RefreshCw,
    Search,
    Shield,
    Star,
    TrendingUp,
} from 'lucide-react';
import { useAllSubmissions } from '@/hooks/useSubmissions';
import { useLecturerCourses } from '@/hooks/useLecturerCourses';
import type { Submission } from '@/types/submission.types';

// ─── Helpers ──────────────────────────────────────────────────

type Priority = 'high' | 'medium' | 'low';

function getPriority(s: Submission): Priority {
    if ((s.plagiarismScore ?? 0) >= 25 || s.isLate) return 'high';
    if ((s.plagiarismScore ?? 0) >= 10 || s.currentVersionNumber > 3) return 'medium';
    return 'low';
}

function timeAgo(iso?: string | null): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (mins > 0) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    return 'Just now';
}

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────

export default function LecturerGradingQueuePage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState<'all' | Priority>('all');
    const [filterModule, setFilterModule] = useState('all');
    const [sortBy, setSortBy] = useState<'date' | 'priority' | 'plagiarism' | 'ai'>('priority');

    const { data: allSubmissions, loading, error, refetch } = useAllSubmissions();
    const { courses } = useLecturerCourses();

    // Only queue submissions that need grading
    const queue = useMemo((): (Submission & { priority: Priority })[] => {
        return (allSubmissions ?? [])
            .filter((s) => ['SUBMITTED', 'PENDING_REVIEW', 'FLAGGED'].includes(s.status))
            .map((s) => ({ ...s, priority: getPriority(s) }));
    }, [allSubmissions]);

    // Filter + sort
    const filteredQueue = useMemo(() => {
        const filtered = queue.filter((item) => {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                (item.studentName ?? '').toLowerCase().includes(q) ||
                (item.studentRegistrationId ?? '').toLowerCase().includes(q) ||
                (item.assignmentTitle ?? '').toLowerCase().includes(q);
            const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
            const matchesModule = filterModule === 'all' ||
                item.moduleName === filterModule || item.moduleCode === filterModule;
            return matchesSearch && matchesPriority && matchesModule;
        });

        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'priority': {
                    const ord: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
                    return ord[a.priority] - ord[b.priority];
                }
                case 'date':
                    return new Date(a.submittedAt ?? a.createdAt).getTime() -
                        new Date(b.submittedAt ?? b.createdAt).getTime();
                case 'plagiarism':
                    return (b.plagiarismScore ?? 0) - (a.plagiarismScore ?? 0);
                case 'ai':
                    return (a.aiScore ?? 0) - (b.aiScore ?? 0);
                default:
                    return 0;
            }
        });
    }, [queue, searchQuery, filterPriority, filterModule, sortBy]);

    const stats = useMemo(() => ({
        total: queue.length,
        high: queue.filter((i) => i.priority === 'high').length,
        medium: queue.filter((i) => i.priority === 'medium').length,
        low: queue.filter((i) => i.priority === 'low').length,
        late: queue.filter((i) => i.isLate).length,
        flagged: queue.filter((i) => (i.plagiarismScore ?? 0) >= 20).length,
    }), [queue]);

    const priorityBadge = (priority: Priority) => {
        switch (priority) {
            case 'high':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertTriangle size={12} /> High Priority
                    </span>
                );
            case 'medium':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <Clock size={12} /> Medium Priority
                    </span>
                );
            case 'low':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 size={12} /> Low Priority
                    </span>
                );
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <Edit className="text-blue-600" size={40} />
                        Grading Queue
                    </h1>
                    <p className="text-gray-600">Review and grade student submissions with AI assistance</p>
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
                    Could not load submissions: {error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                {loading ? (
                    [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20" />)
                ) : (
                    <>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg text-white shadow-lg">
                            <div className="text-3xl font-bold">{stats.total}</div>
                            <div className="text-xs text-blue-100 mt-1">Total Pending</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <div className="text-2xl font-bold text-red-700">{stats.high}</div>
                            <div className="text-xs text-red-600 mt-1">High Priority</div>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                            <div className="text-2xl font-bold text-amber-700">{stats.medium}</div>
                            <div className="text-xs text-amber-600 mt-1">Medium Priority</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="text-2xl font-bold text-green-700">{stats.low}</div>
                            <div className="text-xs text-green-600 mt-1">Low Priority</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <div className="text-2xl font-bold text-purple-700">{stats.late}</div>
                            <div className="text-xs text-purple-600 mt-1">Late Submissions</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <div className="text-2xl font-bold text-orange-700">{stats.flagged}</div>
                            <div className="text-xs text-orange-600 mt-1">Plagiarism Flagged</div>
                        </div>
                    </>
                )}
            </div>

            {/* Banner */}
            {!loading && stats.total > 0 && (
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold mb-1">Grading Queue</h3>
                            <p className="text-blue-100 text-sm">
                                {stats.total} submission{stats.total !== 1 ? 's' : ''} waiting for review. AI has pre-analyzed all submissions.
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold">{stats.total}</div>
                            <div className="text-blue-100 text-sm">Pending</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by student name, ID, or assignment…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 whitespace-nowrap">Sort by:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as never)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="priority">Priority</option>
                                <option value="date">Date (Oldest First)</option>
                                <option value="plagiarism">Plagiarism (High to Low)</option>
                                <option value="ai">AI Score (Low to High)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-gray-400" />
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value as never)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Priorities</option>
                                <option value="high">High Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="low">Low Priority</option>
                            </select>
                        </div>
                        <select
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Modules</option>
                            {courses.map((c) => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Queue List */}
            <div className="space-y-4">
                {loading ? (
                    [1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)
                ) : filteredQueue.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up! 🎉</h3>
                        <p className="text-gray-500">
                            {queue.length === 0
                                ? 'No submissions pending grading.'
                                : 'No submissions match your current filters.'}
                        </p>
                        {queue.length > 0 && (
                            <button
                                onClick={() => { setSearchQuery(''); setFilterPriority('all'); setFilterModule('all'); }}
                                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    filteredQueue.map((item) => (
                        <div
                            key={item.id}
                            className={`bg-white rounded-lg shadow-sm border-2 p-6 hover:shadow-lg transition-all cursor-pointer ${
                                item.priority === 'high'
                                    ? 'border-red-200 bg-red-50/30'
                                    : item.priority === 'medium'
                                    ? 'border-amber-200 bg-amber-50/30'
                                    : 'border-gray-200'
                            }`}
                            onClick={() => router.push(`/submissions/lecturer/grading/${item.id}`)}
                        >
                            <div className="flex items-start justify-between">
                                {/* Left */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                            {(item.studentName ?? item.studentId).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {item.studentName ?? item.studentId}
                                                </h3>
                                                {item.studentRegistrationId && (
                                                    <span className="text-xs text-gray-500">{item.studentRegistrationId}</span>
                                                )}
                                                {priorityBadge(item.priority)}
                                                {item.isLate && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                        <Clock size={11} /> Late
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">{item.assignmentTitle ?? 'Assignment'}</p>
                                            {item.moduleCode && <p className="text-xs text-gray-400">{item.moduleCode}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="text-gray-400" size={14} />
                                            <div>
                                                <div className="text-xs text-gray-400">Submitted</div>
                                                <div className="font-medium text-gray-700">{timeAgo(item.submittedAt ?? item.createdAt)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <GitBranch className="text-purple-600" size={14} />
                                            <div>
                                                <div className="text-xs text-gray-400">Version</div>
                                                <div className="font-medium text-gray-700">{item.currentVersionNumber}</div>
                                            </div>
                                        </div>
                                        {item.wordCount != null && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <FileText className="text-blue-600" size={14} />
                                                <div>
                                                    <div className="text-xs text-gray-400">Words</div>
                                                    <div className="font-medium text-gray-700">{item.wordCount}</div>
                                                </div>
                                            </div>
                                        )}
                                        {item.totalMarks != null && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Award className="text-amber-600" size={14} />
                                                <div>
                                                    <div className="text-xs text-gray-400">Max Marks</div>
                                                    <div className="font-medium text-gray-700">{item.totalMarks}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Score chips */}
                                    <div className="flex flex-wrap gap-3">
                                        {item.aiScore != null && (
                                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                <div className="flex items-center gap-1 mb-1">
                                                    <Star className="text-purple-600" size={13} />
                                                    <span className="text-xs text-gray-500">AI Score</span>
                                                </div>
                                                <span className="text-lg font-bold text-purple-600">{item.aiScore}</span>
                                                <span className="text-xs text-gray-400">/100</span>
                                            </div>
                                        )}
                                        {item.plagiarismScore != null && (
                                            <div className={`p-3 rounded-lg border ${item.plagiarismScore < 20 ? 'bg-green-50 border-green-200' : item.plagiarismScore < 30 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                                                <div className="flex items-center gap-1 mb-1">
                                                    <Shield className={item.plagiarismScore < 20 ? 'text-green-600' : item.plagiarismScore < 30 ? 'text-amber-600' : 'text-red-600'} size={13} />
                                                    <span className="text-xs text-gray-500">Plagiarism</span>
                                                </div>
                                                <span className={`text-lg font-bold ${item.plagiarismScore < 20 ? 'text-green-600' : item.plagiarismScore < 30 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {item.plagiarismScore}%
                                                </span>
                                                {item.plagiarismScore >= 20 && <AlertTriangle className="inline ml-1 text-red-500" size={13} />}
                                            </div>
                                        )}
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <div className="flex items-center gap-1 mb-1">
                                                <TrendingUp className="text-blue-600" size={13} />
                                                <span className="text-xs text-gray-500">Versions</span>
                                            </div>
                                            <span className="text-lg font-bold text-blue-600">{item.totalVersions}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: actions */}
                                <div className="ml-4 flex flex-col items-end gap-3">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); router.push(`/submissions/lecturer/grading/${item.id}`); }}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-lg"
                                    >
                                        <Edit size={18} /> Start Grading
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); router.push(`/submissions/lecturer/submissions`); }}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                                    >
                                        <Eye size={14} /> Preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tips */}
            <div className="mt-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <Star className="text-yellow-300" size={22} />
                    Grading Tips
                </h3>
                <ul className="space-y-1.5 text-sm text-blue-100">
                    <li>• <strong>AI-Assisted:</strong> Review and modify AI-generated feedback to save time</li>
                    <li>• <strong>Priority System:</strong> High priority = late submissions or high plagiarism (&ge;25%)</li>
                    <li>• <strong>Version History:</strong> Access all student versions to see their improvement</li>
                    <li>• <strong>Batch Grading:</strong> Grade similar assignments together for consistency</li>
                </ul>
            </div>
        </div>
    );
}
