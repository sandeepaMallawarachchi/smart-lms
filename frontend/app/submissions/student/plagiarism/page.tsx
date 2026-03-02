'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield,
    AlertTriangle,
    CheckCircle2,
    FileText,
    Info,
    Award,
    AlertCircle,
    Eye,
    RefreshCw,
} from 'lucide-react';
import { useSubmissions } from '@/hooks/useSubmissions';

// ─── Helpers ─────────────────────────────────────────────────

type SeverityStatus = 'safe' | 'moderate' | 'high';

function getSeverity(score: number): SeverityStatus {
    if (score < 10) return 'safe';
    if (score < 20) return 'moderate';
    return 'high';
}

// ─── Sub-components ───────────────────────────────────────────

function StatusBadge({ score }: { score: number }) {
    const status = getSeverity(score);
    if (status === 'safe') {
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle2 size={14} />
                Safe ({score}%)
            </span>
        );
    }
    if (status === 'moderate') {
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                <AlertTriangle size={14} />
                Moderate ({score}%)
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle size={14} />
            High Risk ({score}%)
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
                    <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function PlagiarismReportsPage() {
    const router = useRouter();
    const [filterStatus, setFilterStatus] = useState<'all' | SeverityStatus>('all');
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

    // Only show submissions that have a plagiarism score
    const reports = (submissions ?? []).filter((s) => s.plagiarismScore != null);

    const filtered = reports.filter((s) => {
        if (filterStatus === 'all') return true;
        return getSeverity(s.plagiarismScore!) === filterStatus;
    });

    const stats = {
        total: reports.length,
        safe: reports.filter((s) => getSeverity(s.plagiarismScore!) === 'safe').length,
        moderate: reports.filter((s) => getSeverity(s.plagiarismScore!) === 'moderate').length,
        high: reports.filter((s) => getSeverity(s.plagiarismScore!) === 'high').length,
        averageScore:
            reports.length > 0
                ? Math.round(reports.reduce((sum, s) => sum + (s.plagiarismScore ?? 0), 0) / reports.length)
                : 0,
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Plagiarism Reports</h1>
                    <p className="text-gray-600">Academic integrity analysis for all your submissions</p>
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

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-xs text-gray-600 mt-1">Total Reports</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{stats.safe}</div>
                    <div className="text-xs text-green-600 mt-1">Safe (&lt;10%)</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">{stats.moderate}</div>
                    <div className="text-xs text-amber-600 mt-1">Moderate (10-20%)</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-700">{stats.high}</div>
                    <div className="text-xs text-red-600 mt-1">High (&gt;20%)</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{stats.averageScore}%</div>
                    <div className="text-xs text-blue-600 mt-1">Average Score</div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                    <Info className="text-blue-600 flex-shrink-0 mt-1" size={24} />
                    <div>
                        <h3 className="font-bold text-blue-900 mb-2">Understanding Plagiarism Scores</h3>
                        <div className="space-y-1 text-sm text-blue-800">
                            <p><strong>0-10% (Safe):</strong> Excellent originality. Minor matches with common references are acceptable.</p>
                            <p><strong>10-20% (Moderate):</strong> Review flagged sections. Ensure proper citations and paraphrasing.</p>
                            <p><strong>&gt;20% (High):</strong> Significant similarity detected. Revise your work to ensure originality.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">Filter by status:</span>
                    <div className="flex flex-wrap gap-2">
                        {(['all', 'safe', 'moderate', 'high'] as const).map((key) => (
                            <button
                                key={key}
                                onClick={() => setFilterStatus(key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    filterStatus === key
                                        ? key === 'all' ? 'bg-purple-600 text-white'
                                            : key === 'safe' ? 'bg-green-600 text-white'
                                            : key === 'moderate' ? 'bg-amber-600 text-white'
                                            : 'bg-red-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {key === 'all' ? `All (${reports.length})`
                                    : key === 'safe' ? `Safe (${stats.safe})`
                                    : key === 'moderate' ? `Moderate (${stats.moderate})`
                                    : `High Risk (${stats.high})`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{error}</p>
                </div>
            )}

            {/* Reports List */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
            ) : filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map((submission) => {
                        const score = submission.plagiarismScore!;
                        const status = getSeverity(score);
                        return (
                            <div
                                key={submission.id}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                                    {/* Left */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                status === 'safe' ? 'bg-green-100'
                                                    : status === 'moderate' ? 'bg-amber-100'
                                                    : 'bg-red-100'
                                            }`}>
                                                <Shield size={24} className={
                                                    status === 'safe' ? 'text-green-600'
                                                        : status === 'moderate' ? 'text-amber-600'
                                                        : 'text-red-600'
                                                } />
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {submission.assignmentTitle ?? submission.title ?? 'Untitled Submission'}
                                                    </h3>
                                                    <StatusBadge score={score} />
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                                    {submission.moduleCode && (
                                                        <span className="font-medium">{submission.moduleCode}</span>
                                                    )}
                                                    {submission.moduleCode && <span>•</span>}
                                                    <span>Version {submission.currentVersionNumber}</span>
                                                    {submission.submittedAt && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score bar */}
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-gray-600">Plagiarism Score</span>
                                                <span className={`text-sm font-bold ${
                                                    status === 'safe' ? 'text-green-600'
                                                        : status === 'moderate' ? 'text-amber-600'
                                                        : 'text-red-600'
                                                }`}>{score}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${
                                                        status === 'safe' ? 'bg-green-500'
                                                            : status === 'moderate' ? 'bg-amber-500'
                                                            : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${Math.min(score, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Recommendations for moderate/high */}
                                        {status !== 'safe' && (
                                            <div className={`p-4 border-l-4 rounded ${
                                                status === 'moderate'
                                                    ? 'bg-amber-50 border-amber-500'
                                                    : 'bg-red-50 border-red-500'
                                            }`}>
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className={
                                                        status === 'moderate' ? 'text-amber-600' : 'text-red-600'
                                                    } size={20} />
                                                    <div>
                                                        <p className={`font-medium mb-1 ${
                                                            status === 'moderate' ? 'text-amber-900' : 'text-red-900'
                                                        }`}>Recommendations:</p>
                                                        <ul className={`text-sm list-disc list-inside space-y-1 ${
                                                            status === 'moderate' ? 'text-amber-800' : 'text-red-800'
                                                        }`}>
                                                            <li>Review and paraphrase similar sections in your own words</li>
                                                            <li>Add proper citations for referenced material</li>
                                                            <li>Ensure technical terms are necessary and properly used</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right — Actions */}
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => router.push(`/submissions/student/my-submissions/${submission.id}`)}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2 justify-center whitespace-nowrap"
                                        >
                                            <Eye size={18} />
                                            View Report
                                        </button>
                                        <button
                                            onClick={() => router.push('/submissions/student/guidelines')}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2 justify-center whitespace-nowrap"
                                        >
                                            <Info size={18} />
                                            Guidelines
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <Shield size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 text-lg">
                        {reports.length === 0 ? 'No plagiarism reports yet' : 'No reports match the filter'}
                    </p>
                    {filterStatus !== 'all' && reports.length > 0 && (
                        <button
                            onClick={() => setFilterStatus('all')}
                            className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                            Show all reports
                        </button>
                    )}
                </div>
            )}

            {/* Tips Section */}
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Award className="text-green-600" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-green-900 mb-2">Tips for Maintaining Academic Integrity</h3>
                        <ul className="space-y-2 text-sm text-green-800">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="flex-shrink-0 mt-0.5" size={16} />
                                <span>Always write in your own words — even when summarizing sources</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="flex-shrink-0 mt-0.5" size={16} />
                                <span>Use the plagiarism checker before submitting each version</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="flex-shrink-0 mt-0.5" size={16} />
                                <span>Cite all sources properly, even for common knowledge in your field</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="flex-shrink-0 mt-0.5" size={16} />
                                <span>When in doubt, paraphrase and cite — it is better to over-cite than under-cite</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
