'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    GitBranch,
    FileText,
    Calendar,
    RefreshCw,
    ArrowRight,
} from 'lucide-react';
import { useSubmissions } from '@/hooks/useSubmissions';

// ─── Skeleton ─────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse flex gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
            <div className="flex-1 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
            </div>
            <div className="h-8 w-28 bg-gray-200 rounded-lg shrink-0" />
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function VersionsIndexPage() {
    const router = useRouter();
    const [studentId, setStudentId] = useState<string | null>(null);

    // Decode student ID from JWT
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setStudentId(payload.userId ?? payload.sub ?? null);
            }
        } catch {
            setStudentId(null);
        }
    }, []);

    const { data: submissions, loading, error, refetch } = useSubmissions(studentId);

    const versioned = (submissions ?? []).filter((s) => s.totalVersions > 0);

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Version History</h1>
                    <p className="text-gray-600">Review and compare versions across your submissions</p>
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

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{error}</p>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
            ) : versioned.length > 0 ? (
                <div className="space-y-3">
                    {versioned.map((submission) => (
                        <div
                            key={submission.id}
                            className="bg-white rounded-lg border border-gray-200 p-5 flex flex-wrap items-center gap-4 hover:shadow-sm transition-shadow"
                        >
                            {/* Icon */}
                            <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-purple-100 flex items-center justify-center">
                                <GitBranch size={22} className="text-purple-600" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {submission.assignmentTitle ?? submission.title ?? 'Untitled Submission'}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                                    {submission.moduleCode && <span>{submission.moduleCode}</span>}
                                    {submission.moduleCode && <span>•</span>}
                                    <span className="flex items-center gap-1">
                                        <GitBranch size={11} />
                                        {submission.totalVersions} version{submission.totalVersions !== 1 ? 's' : ''}
                                    </span>
                                    {submission.submittedAt && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={11} />
                                                {new Date(submission.submittedAt).toLocaleDateString()}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Action */}
                            <button
                                onClick={() => router.push(`/submissions/student/versions/${submission.id}`)}
                                className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
                            >
                                View Versions
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <FileText size={52} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg font-medium">No submissions yet</p>
                    <p className="text-gray-400 text-sm mt-1">Submit an assignment to start tracking versions</p>
                </div>
            )}
        </div>
    );
}
