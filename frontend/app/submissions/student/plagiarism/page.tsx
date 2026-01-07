'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield,
    AlertTriangle,
    CheckCircle2,
    Search,
    FileText,
    ExternalLink,
    Info,
    TrendingDown,
    Award,
    Eye,
} from 'lucide-react';

interface PlagiarismReport {
    id: string;
    assignmentTitle: string;
    module: string;
    submittedAt: string;
    version: number;
    overallScore: number;
    status: 'safe' | 'moderate' | 'high';
    sources: {
        url: string;
        title: string;
        similarity: number;
        matchedPhrases: number;
    }[];
    breakdown: {
        internetSources: number;
        publications: number;
        studentPapers: number;
    };
}

export default function PlagiarismReportsPage() {
    const router = useRouter();
    const [filterStatus, setFilterStatus] = useState<'all' | 'safe' | 'moderate' | 'high'>('all');

    // Hardcoded plagiarism reports
    const reports: PlagiarismReport[] = [
        {
            id: '1',
            assignmentTitle: 'Python Programming Basics',
            module: 'CS1001',
            submittedAt: '2025-01-04 18:30',
            version: 5,
            overallScore: 3,
            status: 'safe',
            sources: [
                {
                    url: 'https://docs.python.org/3/tutorial/',
                    title: 'Python Official Documentation',
                    similarity: 2,
                    matchedPhrases: 3,
                },
                {
                    url: 'https://www.w3schools.com/python/',
                    title: 'W3Schools Python Tutorial',
                    similarity: 1,
                    matchedPhrases: 2,
                },
            ],
            breakdown: {
                internetSources: 3,
                publications: 0,
                studentPapers: 0,
            },
        },
        {
            id: '2',
            assignmentTitle: 'Data Structures Implementation',
            module: 'CS2002',
            submittedAt: '2025-01-07 22:45',
            version: 4,
            overallScore: 8,
            status: 'safe',
            sources: [
                {
                    url: 'https://en.wikipedia.org/wiki/Binary_search_tree',
                    title: 'Binary Search Tree - Wikipedia',
                    similarity: 4,
                    matchedPhrases: 5,
                },
                {
                    url: 'https://www.geeksforgeeks.org/avl-tree-set-1-insertion/',
                    title: 'AVL Tree Implementation - GeeksforGeeks',
                    similarity: 3,
                    matchedPhrases: 4,
                },
                {
                    url: 'https://stackoverflow.com/questions/3955680/',
                    title: 'Hash Table Collision Resolution',
                    similarity: 1,
                    matchedPhrases: 2,
                },
            ],
            breakdown: {
                internetSources: 8,
                publications: 0,
                studentPapers: 0,
            },
        },
        {
            id: '3',
            assignmentTitle: 'Object-Oriented Design Patterns',
            module: 'CS3003',
            submittedAt: '2024-12-15 20:30',
            version: 6,
            overallScore: 12,
            status: 'moderate',
            sources: [
                {
                    url: 'https://refactoring.guru/design-patterns',
                    title: 'Design Patterns - Refactoring Guru',
                    similarity: 7,
                    matchedPhrases: 8,
                },
                {
                    url: 'https://www.oodesign.com/',
                    title: 'Object-Oriented Design',
                    similarity: 3,
                    matchedPhrases: 4,
                },
                {
                    url: 'https://sourcemaking.com/design_patterns',
                    title: 'Design Patterns Tutorial',
                    similarity: 2,
                    matchedPhrases: 3,
                },
            ],
            breakdown: {
                internetSources: 10,
                publications: 2,
                studentPapers: 0,
            },
        },
        {
            id: '4',
            assignmentTitle: 'Database Normalization Essay',
            module: 'CS3001',
            submittedAt: '2024-12-10 23:59',
            version: 3,
            overallScore: 18,
            status: 'moderate',
            sources: [
                {
                    url: 'https://www.tutorialspoint.com/dbms/database_normalization.htm',
                    title: 'Database Normalization - TutorialsPoint',
                    similarity: 9,
                    matchedPhrases: 12,
                },
                {
                    url: 'https://www.studytonight.com/dbms/database-normalization.php',
                    title: 'Database Normalization Guide',
                    similarity: 5,
                    matchedPhrases: 7,
                },
                {
                    url: 'https://www.guru99.com/database-normalization.html',
                    title: 'What is Normalization? - Guru99',
                    similarity: 4,
                    matchedPhrases: 5,
                },
            ],
            breakdown: {
                internetSources: 15,
                publications: 3,
                studentPapers: 0,
            },
        },
        {
            id: '5',
            assignmentTitle: 'Web Development Project',
            module: 'WT2001',
            submittedAt: '2024-12-20 23:59',
            version: 8,
            overallScore: 6,
            status: 'safe',
            sources: [
                {
                    url: 'https://react.dev/learn',
                    title: 'React Documentation',
                    similarity: 3,
                    matchedPhrases: 4,
                },
                {
                    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
                    title: 'MDN Web Docs - JavaScript',
                    similarity: 2,
                    matchedPhrases: 3,
                },
                {
                    url: 'https://tailwindcss.com/docs',
                    title: 'Tailwind CSS Documentation',
                    similarity: 1,
                    matchedPhrases: 2,
                },
            ],
            breakdown: {
                internetSources: 6,
                publications: 0,
                studentPapers: 0,
            },
        },
    ];

    const filteredReports = reports.filter(report => {
        if (filterStatus === 'all') return true;
        return report.status === filterStatus;
    });

    const stats = {
        total: reports.length,
        safe: reports.filter(r => r.status === 'safe').length,
        moderate: reports.filter(r => r.status === 'moderate').length,
        high: reports.filter(r => r.status === 'high').length,
        averageScore: Math.round(reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length),
    };

    const getStatusBadge = (status: string, score: number) => {
        switch (status) {
            case 'safe':
                return (
                    <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <CheckCircle2 size={14} />
              Safe ({score}%)
            </span>
                    </div>
                );
            case 'moderate':
                return (
                    <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              <AlertTriangle size={14} />
              Moderate ({score}%)
            </span>
                    </div>
                );
            case 'high':
                return (
                    <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <AlertTriangle size={14} />
              High Risk ({score}%)
            </span>
                    </div>
                );
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Plagiarism Reports</h1>
                <p className="text-gray-600">Academic integrity analysis for all your submissions</p>
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
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filterStatus === 'all'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            All ({reports.length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('safe')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filterStatus === 'safe'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Safe ({stats.safe})
                        </button>
                        <button
                            onClick={() => setFilterStatus('moderate')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filterStatus === 'moderate'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Moderate ({stats.moderate})
                        </button>
                        <button
                            onClick={() => setFilterStatus('high')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filterStatus === 'high'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            High Risk ({stats.high})
                        </button>
                    </div>
                </div>
            </div>

            {/* Reports List */}
            <div className="space-y-4">
                {filteredReports.map((report) => (
                    <div key={report.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                            {/* Left Section */}
                            <div className="flex-1">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                        report.status === 'safe' ? 'bg-green-100' :
                                            report.status === 'moderate' ? 'bg-amber-100' :
                                                'bg-red-100'
                                    }`}>
                                        <Shield size={24} className={
                                            report.status === 'safe' ? 'text-green-600' :
                                                report.status === 'moderate' ? 'text-amber-600' :
                                                    'text-red-600'
                                        } />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">{report.assignmentTitle}</h3>
                                            {getStatusBadge(report.status, report.overallScore)}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                            <span className="font-medium">{report.module}</span>
                                            <span>•</span>
                                            <span>Version {report.version}</span>
                                            <span>•</span>
                                            <span>{new Date(report.submittedAt).toLocaleDateString()}</span>
                                        </div>

                                        {/* Score Breakdown */}
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="text-xs text-gray-600 mb-1">Internet Sources</div>
                                                <div className="text-lg font-bold text-blue-600">{report.breakdown.internetSources}%</div>
                                            </div>
                                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                                <div className="text-xs text-gray-600 mb-1">Publications</div>
                                                <div className="text-lg font-bold text-purple-600">{report.breakdown.publications}%</div>
                                            </div>
                                            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                                <div className="text-xs text-gray-600 mb-1">Student Papers</div>
                                                <div className="text-lg font-bold text-indigo-600">{report.breakdown.studentPapers}%</div>
                                            </div>
                                        </div>

                                        {/* Matched Sources */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                                Matched Sources ({report.sources.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {report.sources.slice(0, 2).map((source, index) => (
                                                    <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <ExternalLink size={14} className="text-gray-400 flex-shrink-0" />
                                                                    <a
                                                                        href={source.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-sm font-medium text-blue-600 hover:text-blue-700 truncate"
                                                                    >
                                                                        {source.title}
                                                                    </a>
                                                                </div>
                                                                <p className="text-xs text-gray-500 truncate">{source.url}</p>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className={`text-sm font-bold ${
                                    source.similarity < 5 ? 'text-green-600' :
                                        source.similarity < 10 ? 'text-amber-600' :
                                            'text-red-600'
                                }`}>
                                  {source.similarity}%
                                </span>
                                                                <span className="text-xs text-gray-500">{source.matchedPhrases} phrases</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {report.sources.length > 2 && (
                                                    <p className="text-sm text-gray-600 pl-3">
                                                        +{report.sources.length - 2} more source(s)
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendations */}
                                {report.status !== 'safe' && (
                                    <div className={`mt-4 p-4 border-l-4 rounded ${
                                        report.status === 'moderate'
                                            ? 'bg-amber-50 border-amber-500'
                                            : 'bg-red-50 border-red-500'
                                    }`}>
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className={
                                                report.status === 'moderate' ? 'text-amber-600' : 'text-red-600'
                                            } size={20} />
                                            <div>
                                                <p className={`font-medium mb-1 ${
                                                    report.status === 'moderate' ? 'text-amber-900' : 'text-red-900'
                                                }`}>
                                                    Recommendations:
                                                </p>
                                                <ul className={`text-sm list-disc list-inside space-y-1 ${
                                                    report.status === 'moderate' ? 'text-amber-800' : 'text-red-800'
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

                            {/* Right Section - Actions */}
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => router.push(`/submissions/student/my-submissions/${report.id}`)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2 justify-center whitespace-nowrap"
                                >
                                    <Eye size={18} />
                                    View Report
                                </button>
                                <button
                                    onClick={() => router.push(`/submissions/student/guidelines`)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2 justify-center whitespace-nowrap"
                                >
                                    <Info size={18} />
                                    Guidelines
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredReports.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <Shield size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No reports found</p>
                        <p className="text-gray-400 text-sm mt-2">Try adjusting your filter</p>
                    </div>
                )}
            </div>

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
                                <span>Always write in your own words - even when summarizing sources</span>
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
                                <span>When in doubt, paraphrase and cite - it's better to over-cite than under-cite</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
