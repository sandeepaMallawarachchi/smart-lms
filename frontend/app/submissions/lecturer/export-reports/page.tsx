'use client';

import React, { useState } from 'react';
import {
    FileSpreadsheet,
    Download,
    Shield,
    BarChart3,
    Award,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';

type ReportType = 'grades' | 'plagiarism' | 'analytics';

interface ExportOption {
    id: ReportType;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    endpoint: string;
}

const exportOptions: ExportOption[] = [
    {
        id: 'grades',
        title: 'Grade Sheet',
        description:
            'Student × assignment matrix with grades. Each column is an assignment, each row is a student with their grade or submission status.',
        icon: <Award size={28} />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        endpoint: '/api/submissions/lecturer/export/grades',
    },
    {
        id: 'plagiarism',
        title: 'Plagiarism Report',
        description:
            'Detailed plagiarism data for every submission — plagiarism score, AI score, word count, and status. Filter by minimum plagiarism threshold.',
        icon: <Shield size={28} />,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        endpoint: '/api/submissions/lecturer/export/plagiarism',
    },
    {
        id: 'analytics',
        title: 'Submission Analytics',
        description:
            'Comprehensive analytics including summary statistics, per-assignment breakdown, and detailed per-submission data with all metrics.',
        icon: <BarChart3 size={28} />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        endpoint: '/api/submissions/lecturer/export/analytics',
    },
];

export default function ExportReportsPage() {
    const [downloading, setDownloading] = useState<ReportType | null>(null);
    const [success, setSuccess] = useState<ReportType | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [plagiarismMinScore, setPlagiarismMinScore] = useState(0);

    const handleExport = async (option: ExportOption) => {
        setDownloading(option.id);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error('Not authenticated');

            let url = option.endpoint;
            if (option.id === 'plagiarism' && plagiarismMinScore > 0) {
                url += `?minScore=${plagiarismMinScore}`;
            }

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(body?.message || `Export failed (HTTP ${res.status})`);
            }

            // Extract filename from Content-Disposition header
            const disposition = res.headers.get('Content-Disposition') || '';
            const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
            const filename = filenameMatch?.[1] || `${option.id}-export.csv`;

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);

            setSuccess(option.id);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Export failed');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <FileSpreadsheet className="text-purple-600" size={32} />
                    <h1 className="text-3xl font-bold text-gray-900">Export Reports</h1>
                </div>
                <p className="text-gray-600">
                    Download submission data as CSV files for external analysis, record-keeping, or reporting.
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle className="text-red-500 shrink-0" size={20} />
                    <p className="text-red-700 text-sm">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Export Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {exportOptions.map((option) => {
                    const isDownloading = downloading === option.id;
                    const isSuccess = success === option.id;

                    return (
                        <div
                            key={option.id}
                            className={`bg-white rounded-xl shadow-sm border-2 ${option.borderColor} p-6 flex flex-col`}
                        >
                            <div className={`w-14 h-14 ${option.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                                <span className={option.color}>{option.icon}</span>
                            </div>

                            <h2 className="text-lg font-bold text-gray-900 mb-2">{option.title}</h2>
                            <p className="text-sm text-gray-600 mb-6 flex-1">{option.description}</p>

                            {/* Plagiarism filter */}
                            {option.id === 'plagiarism' && (
                                <div className="mb-4">
                                    <label className="block text-xs text-gray-600 mb-1">
                                        Minimum plagiarism score (%)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={plagiarismMinScore}
                                        onChange={(e) =>
                                            setPlagiarismMinScore(
                                                Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                        placeholder="0 = include all"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Set to 20 to only include flagged submissions
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => handleExport(option)}
                                disabled={isDownloading}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors text-sm ${
                                    isSuccess
                                        ? 'bg-green-100 text-green-700 border border-green-300'
                                        : isDownloading
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : `${option.bgColor} ${option.color} hover:opacity-80 border ${option.borderColor}`
                                }`}
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : isSuccess ? (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Downloaded!
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        Export CSV
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Info Panel */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">About CSV Exports</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <span>
                            <strong>Grade Sheet</strong> — Opens in Excel/Google Sheets as a student × assignment matrix.
                            Ungraded submissions show their status (Submitted, Draft).
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>
                            <strong>Plagiarism Report</strong> — One row per submission sorted by plagiarism score
                            (highest first). Use the minimum score filter to focus on flagged submissions only.
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>
                            <strong>Submission Analytics</strong> — Includes a summary section, per-assignment breakdown,
                            and then every submission with full metrics. Ideal for institutional reporting.
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">•</span>
                        <span>
                            All exports include a UTF-8 BOM for proper character display in Excel.
                            Files use CSV format compatible with Excel, Google Sheets, and other spreadsheet tools.
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
