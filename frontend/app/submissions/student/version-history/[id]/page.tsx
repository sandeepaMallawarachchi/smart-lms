'use client';

import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    GitBranch,
    Clock,
    FileText,
    Download,
    Eye,
    CheckCircle2,
    Shield,
    Star,
    TrendingUp,
    Calendar,
} from 'lucide-react';

export default function VersionHistoryPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [selectedVersions, setSelectedVersions] = useState<number[]>([]);

    // Hardcoded version history data
    const assignment = {
        id: resolvedParams.id,
        title: 'Python Programming Task',
        course: 'Programming Fundamentals',
        totalVersions: 5,
        currentVersion: 5,
        finalGrade: 95,
    };

    const versions = [
        {
            version: 5,
            submittedAt: '2025-01-02 09:15',
            status: 'graded',
            grade: 95,
            plagiarismScore: 3,
            aiScore: 92,
            files: [
                { name: 'main.py', size: '4.2 KB', changes: '+45 -12' },
                { name: 'utils.py', size: '2.1 KB', changes: '+18 -5' },
                { name: 'README.md', size: '1.5 KB', changes: '+8 -2' },
            ],
            comment: 'Final version with optimizations and better error handling',
            isCurrent: true,
        },
        {
            version: 4,
            submittedAt: '2025-01-01 18:30',
            status: 'submitted',
            plagiarismScore: 4,
            aiScore: 88,
            files: [
                { name: 'main.py', size: '3.8 KB', changes: '+32 -8' },
                { name: 'utils.py', size: '1.9 KB', changes: '+12 -3' },
                { name: 'README.md', size: '1.3 KB', changes: '+5 -1' },
            ],
            comment: 'Added comprehensive documentation',
            isCurrent: false,
        },
        {
            version: 3,
            submittedAt: '2025-01-01 14:20',
            status: 'submitted',
            plagiarismScore: 5,
            aiScore: 85,
            files: [
                { name: 'main.py', size: '3.5 KB', changes: '+28 -15' },
                { name: 'utils.py', size: '1.7 KB', changes: '+10 -4' },
            ],
            comment: 'Refactored code for better readability',
            isCurrent: false,
        },
        {
            version: 2,
            submittedAt: '2024-12-31 20:45',
            status: 'submitted',
            plagiarismScore: 6,
            aiScore: 82,
            files: [
                { name: 'main.py', size: '3.2 KB', changes: '+25 -10' },
                { name: 'utils.py', size: '1.5 KB', changes: 'new file' },
            ],
            comment: 'Split code into modules',
            isCurrent: false,
        },
        {
            version: 1,
            submittedAt: '2024-12-31 15:00',
            status: 'submitted',
            plagiarismScore: 8,
            aiScore: 78,
            files: [
                { name: 'main.py', size: '2.8 KB', changes: 'initial commit' },
            ],
            comment: 'Initial submission',
            isCurrent: false,
        },
    ];

    const toggleVersionSelection = (version: number) => {
        if (selectedVersions.includes(version)) {
            setSelectedVersions(selectedVersions.filter(v => v !== version));
        } else if (selectedVersions.length < 2) {
            setSelectedVersions([...selectedVersions, version]);
        }
    };

    const getVersionBadge = (status: string, isCurrent: boolean) => {
        if (isCurrent) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle2 size={14} />
          Current
        </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        <GitBranch size={14} />
        Version
      </span>
        );
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 80) return 'text-blue-600';
        if (score >= 70) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Submissions
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Version History</h1>
                        <p className="text-gray-600">{assignment.title} • {assignment.course}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Current Version</p>
                        <p className="text-3xl font-bold text-gray-900">v{assignment.currentVersion}</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Total Versions</h3>
                        <GitBranch className="text-blue-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{assignment.totalVersions}</p>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Final Grade</h3>
                        <Star className="text-green-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-green-600">{assignment.finalGrade}%</p>
                </div>

                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">AI Score Trend</h3>
                        <TrendingUp className="text-purple-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-purple-600">+14</p>
                    <p className="text-xs text-purple-700 mt-1">From v1 to v5</p>
                </div>

                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Avg. Plagiarism</h3>
                        <Shield className="text-amber-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-amber-600">5.2%</p>
                    <p className="text-xs text-amber-700 mt-1">Across all versions</p>
                </div>
            </div>

            {/* Compare Actions */}
            {selectedVersions.length === 2 && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <GitBranch className="text-purple-600" size={24} />
                            <div>
                                <p className="font-semibold text-gray-900">
                                    Ready to compare versions {selectedVersions[0]} and {selectedVersions[1]}
                                </p>
                                <p className="text-sm text-gray-600">View differences between selected versions</p>
                            </div>
                        </div>
                        <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                            Compare Versions
                        </button>
                    </div>
                </div>
            )}

            {/* Version Timeline */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Submission Timeline</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {selectedVersions.length === 0 && 'Select up to 2 versions to compare'}
                        {selectedVersions.length === 1 && 'Select one more version to compare'}
                        {selectedVersions.length === 2 && 'Two versions selected - ready to compare'}
                    </p>
                </div>

                <div className="p-6">
                    <div className="space-y-6">
                        {versions.map((version, index) => (
                            <div
                                key={version.version}
                                className={`relative ${index !== versions.length - 1 ? 'pb-6' : ''}`}
                            >
                                {/* Timeline Line */}
                                {index !== versions.length - 1 && (
                                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                                )}

                                <div className="flex gap-6">
                                    {/* Version Badge */}
                                    <div className="flex flex-col items-center">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                                            version.isCurrent ? 'bg-green-600' : 'bg-gray-400'
                                        }`}>
                                            v{version.version}
                                        </div>
                                        {version.isCurrent && (
                                            <span className="text-xs text-green-600 font-medium mt-1">Current</span>
                                        )}
                                    </div>

                                    {/* Version Details */}
                                    <div className="flex-1">
                                        <div className={`rounded-lg border-2 p-6 transition-all ${
                                            selectedVersions.includes(version.version)
                                                ? 'border-purple-400 bg-purple-50'
                                                : version.isCurrent
                                                    ? 'border-green-200 bg-green-50'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-lg font-bold text-gray-900">Version {version.version}</h3>
                                                        {getVersionBadge(version.status, version.isCurrent)}
                                                        {version.grade !== undefined && (
                                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(version.grade)}`}>
                                Grade: {version.grade}%
                              </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar size={16} />
                                                            {version.submittedAt}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Shield size={16} />
                                                            Plagiarism: {version.plagiarismScore}%
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Star size={16} />
                                                            AI Score: {version.aiScore}
                                                        </div>
                                                    </div>
                                                    {version.comment && (
                                                        <p className="text-sm text-gray-700 italic">"{version.comment}"</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 ml-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedVersions.includes(version.version)}
                                                        onChange={() => toggleVersionSelection(version.version)}
                                                        disabled={!selectedVersions.includes(version.version) && selectedVersions.length >= 2}
                                                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
                                                    />
                                                </div>
                                            </div>

                                            {/* Files */}
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Files ({version.files.length})</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {version.files.map((file, fileIndex) => (
                                                        <div key={fileIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <FileText className="text-purple-600" size={20} />
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                                                    <p className="text-xs text-gray-500">{file.size} • {file.changes}</p>
                                                                </div>
                                                            </div>
                                                            <button className="text-purple-600 hover:text-purple-700">
                                                                <Download size={18} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="mt-4 flex gap-3">
                                                <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                                    <Eye size={16} />
                                                    View Files
                                                </button>
                                                <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                                    <Download size={16} />
                                                    Download
                                                </button>
                                                {version.grade !== undefined && (
                                                    <button
                                                        onClick={() => router.push(`/submissions/student/feedback/${assignment.id}`)}
                                                        className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                                    >
                                                        <Star size={16} />
                                                        View Feedback
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Version Comparison Chart */}
            <div className="mt-8 bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Score Progression</h2>
                <div className="space-y-4">
                    {/* AI Score Progress */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">AI Score Progression</span>
                            <span className="text-sm text-gray-600">
                From {versions[versions.length - 1].aiScore} to {versions[0].aiScore}
              </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {versions.reverse().map((v, i) => (
                                <div key={i} className="flex-1">
                                    <div className="text-center mb-1">
                                        <span className="text-xs text-gray-500">v{v.version}</span>
                                    </div>
                                    <div className="h-24 bg-gray-100 rounded-lg relative overflow-hidden">
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-purple-600 transition-all"
                                            style={{ height: `${v.aiScore}%` }}
                                        ></div>
                                        <div className="absolute inset-0 flex items-end justify-center pb-2">
                                            <span className="text-xs font-bold text-white">{v.aiScore}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Plagiarism Score Progress */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Plagiarism Score Trend</span>
                            <span className="text-sm text-gray-600">
                Lower is better
              </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {versions.map((v, i) => (
                                <div key={i} className="flex-1">
                                    <div className="h-16 bg-gray-100 rounded-lg relative overflow-hidden">
                                        <div
                                            className={`absolute bottom-0 left-0 right-0 transition-all ${
                                                v.plagiarismScore < 10 ? 'bg-green-600' : 'bg-red-600'
                                            }`}
                                            style={{ height: `${v.plagiarismScore * 5}%` }}
                                        ></div>
                                        <div className="absolute inset-0 flex items-end justify-center pb-2">
                                            <span className="text-xs font-bold text-white">{v.plagiarismScore}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}