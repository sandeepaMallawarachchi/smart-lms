'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    GitBranch,
    Clock,
    Shield,
    Star,
    FileText,
    Download,
    Eye,
    GitCompare,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';

interface Version {
    version: number;
    createdAt: string;
    wordCount: number;
    plagiarismScore: number;
    aiScore: number;
    changes: string;
    isSubmitted: boolean;
    feedback?: {
        ai: string;
        plagiarismDetails?: string;
    };
    answers: {
        questionNumber: number;
        text: string;
        wordCount: number;
    }[];
}

export default function VersionHistoryPage({ params }: { params: Promise<{ assignmentId: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
    const [compareVersion, setCompareVersion] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'timeline' | 'compare'>('timeline');

    // Hardcoded data
    const assignmentData = {
        id: resolvedParams.assignmentId,
        title: 'Data Structures Implementation',
        module: 'CS2002 - Data Structures & Algorithms',
        totalMarks: 100,
    };

    const versions: Version[] = [
        {
            version: 1,
            createdAt: '2025-01-07 14:30',
            wordCount: 850,
            plagiarismScore: 12,
            aiScore: 72,
            changes: 'Initial draft - answered questions 1 and 2',
            isSubmitted: false,
            answers: [
                { questionNumber: 1, text: 'Binary Search Tree implementation with basic insert and search...', wordCount: 450 },
                { questionNumber: 2, text: 'AVL tree balancing algorithm overview...', wordCount: 400 },
            ],
            feedback: {
                ai: 'Good start! Your BST implementation is correct but needs more explanation. Consider adding complexity analysis.',
                plagiarismDetails: '12% similarity found in technical documentation. Review and rephrase.',
            },
        },
        {
            version: 2,
            createdAt: '2025-01-07 16:45',
            wordCount: 1200,
            plagiarismScore: 10,
            aiScore: 78,
            changes: 'Added question 3, improved explanations in Q1 and Q2',
            isSubmitted: false,
            answers: [
                { questionNumber: 1, text: 'Binary Search Tree implementation with detailed complexity analysis...', wordCount: 550 },
                { questionNumber: 2, text: 'AVL tree balancing with rotation examples and diagrams...', wordCount: 450 },
                { questionNumber: 3, text: 'Hash table implementation using chaining...', wordCount: 200 },
            ],
            feedback: {
                ai: 'Improved explanations! The complexity analysis adds value. Hash table section needs more detail.',
                plagiarismDetails: '10% similarity - acceptable level. Most content is original.',
            },
        },
        {
            version: 3,
            createdAt: '2025-01-07 19:20',
            wordCount: 1800,
            plagiarismScore: 8,
            aiScore: 85,
            changes: 'Completed all questions, added code examples',
            isSubmitted: false,
            answers: [
                { questionNumber: 1, text: 'Complete BST implementation with insert, delete, search, and traversal methods...', wordCount: 600 },
                { questionNumber: 2, text: 'AVL tree with full rotation implementation and balance factor calculation...', wordCount: 600 },
                { questionNumber: 3, text: 'Hash table with collision handling, rehashing, and performance analysis...', wordCount: 600 },
            ],
            feedback: {
                ai: 'Excellent progress! All questions addressed comprehensively. Code examples are clear and well-commented.',
                plagiarismDetails: '8% similarity - excellent! Content is highly original.',
            },
        },
        {
            version: 4,
            createdAt: '2025-01-07 22:45',
            wordCount: 2100,
            plagiarismScore: 8,
            aiScore: 88,
            changes: 'Final version: Added test cases, improved documentation, reviewed all answers',
            isSubmitted: true,
            answers: [
                { questionNumber: 1, text: 'Complete BST implementation with comprehensive test cases and edge case handling...', wordCount: 700 },
                { questionNumber: 2, text: 'AVL tree implementation with detailed rotation examples and performance benchmarks...', wordCount: 700 },
                { questionNumber: 3, text: 'Hash table with multiple collision resolution strategies and comparative analysis...', wordCount: 700 },
            ],
            feedback: {
                ai: 'Outstanding work! Your implementation is thorough, well-tested, and clearly documented. Test cases demonstrate deep understanding.',
                plagiarismDetails: '8% similarity - all from standard algorithm descriptions. Excellent originality.',
            },
        },
    ];

    const getVersionMetrics = (version: Version, previousVersion?: Version) => {
        if (!previousVersion) return { wordChange: 0, plagiarismChange: 0, aiChange: 0 };

        return {
            wordChange: version.wordCount - previousVersion.wordCount,
            plagiarismChange: version.plagiarismScore - previousVersion.plagiarismScore,
            aiChange: version.aiScore - previousVersion.aiScore,
        };
    };

    const renderTimeline = () => (
        <div className="space-y-6">
            {versions.map((version, index) => {
                const previousVersion = index > 0 ? versions[index - 1] : undefined;
                const metrics = getVersionMetrics(version, previousVersion);
                const isSelected = selectedVersion === version.version;

                return (
                    <div
                        key={version.version}
                        className={`relative pl-8 pb-6 ${index !== versions.length - 1 ? 'border-l-2 border-purple-200' : ''}`}
                    >
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-0 w-4 h-4 rounded-full transform -translate-x-[9px] ${
                            version.isSubmitted
                                ? 'bg-green-500 ring-4 ring-green-100'
                                : isSelected
                                    ? 'bg-purple-500 ring-4 ring-purple-100'
                                    : 'bg-gray-300 ring-4 ring-gray-100'
                        }`} />

                        {/* Version Card */}
                        <div
                            onClick={() => setSelectedVersion(isSelected ? null : version.version)}
                            className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all ${
                                isSelected
                                    ? 'border-purple-500 shadow-lg'
                                    : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                            }`}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-gray-900">Version {version.version}</h3>
                                        {version.isSubmitted && (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        Submitted
                      </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Clock size={16} />
                                        <span>{new Date(version.createdAt).toLocaleString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCompareVersion(version.version);
                                            setViewMode('compare');
                                        }}
                                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
                                    >
                                        <GitCompare size={16} />
                                        Compare
                                    </button>
                                </div>
                            </div>

                            {/* Changes Description */}
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-900 font-medium mb-1">Changes:</p>
                                <p className="text-sm text-blue-800">{version.changes}</p>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1 text-xs text-gray-600">
                                            <FileText size={14} />
                                            Words
                                        </div>
                                        {metrics.wordChange !== 0 && (
                                            <span className={`text-xs font-medium ${metrics.wordChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metrics.wordChange > 0 ? '+' : ''}{metrics.wordChange}
                      </span>
                                        )}
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">{version.wordCount}</div>
                                </div>

                                <div className={`p-4 border rounded-lg ${
                                    version.plagiarismScore < 10
                                        ? 'bg-green-50 border-green-200'
                                        : version.plagiarismScore < 20
                                            ? 'bg-amber-50 border-amber-200'
                                            : 'bg-red-50 border-red-200'
                                }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1 text-xs text-gray-600">
                                            <Shield size={14} />
                                            Plagiarism
                                        </div>
                                        {metrics.plagiarismChange !== 0 && (
                                            <span className={`text-xs font-medium flex items-center gap-1 ${
                                                metrics.plagiarismChange < 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                        {metrics.plagiarismChange < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                                                {Math.abs(metrics.plagiarismChange)}%
                      </span>
                                        )}
                                    </div>
                                    <div className={`text-2xl font-bold ${
                                        version.plagiarismScore < 10
                                            ? 'text-green-600'
                                            : version.plagiarismScore < 20
                                                ? 'text-amber-600'
                                                : 'text-red-600'
                                    }`}>
                                        {version.plagiarismScore}%
                                    </div>
                                </div>

                                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1 text-xs text-gray-600">
                                            <Star size={14} />
                                            AI Score
                                        </div>
                                        {metrics.aiChange !== 0 && (
                                            <span className={`text-xs font-medium flex items-center gap-1 ${
                                                metrics.aiChange > 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                        {metrics.aiChange > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                {Math.abs(metrics.aiChange)}
                      </span>
                                        )}
                                    </div>
                                    <div className="text-2xl font-bold text-purple-600">{version.aiScore}/100</div>
                                </div>
                            </div>

                            {/* Feedback - Show when selected */}
                            {isSelected && version.feedback && (
                                <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
                                    <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                                        <div className="flex items-start gap-3">
                                            <Star className="text-purple-600 mt-0.5" size={20} />
                                            <div>
                                                <p className="font-medium text-purple-900 mb-1">AI Feedback:</p>
                                                <p className="text-sm text-purple-800">{version.feedback.ai}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {version.feedback.plagiarismDetails && (
                                        <div className={`p-4 border-l-4 rounded ${
                                            version.plagiarismScore < 10
                                                ? 'bg-green-50 border-green-500'
                                                : 'bg-amber-50 border-amber-500'
                                        }`}>
                                            <div className="flex items-start gap-3">
                                                <Shield className={`mt-0.5 ${
                                                    version.plagiarismScore < 10 ? 'text-green-600' : 'text-amber-600'
                                                }`} size={20} />
                                                <div>
                                                    <p className={`font-medium mb-1 ${
                                                        version.plagiarismScore < 10 ? 'text-green-900' : 'text-amber-900'
                                                    }`}>
                                                        Plagiarism Check:
                                                    </p>
                                                    <p className={`text-sm ${
                                                        version.plagiarismScore < 10 ? 'text-green-800' : 'text-amber-800'
                                                    }`}>
                                                        {version.feedback.plagiarismDetails}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Answers Preview */}
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-gray-900 mb-3">Answers Preview:</h4>
                                        <div className="space-y-2">
                                            {version.answers.map((answer) => (
                                                <div key={answer.questionNumber} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-gray-900">Question {answer.questionNumber}</span>
                                                        <span className="text-xs text-gray-600">{answer.wordCount} words</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 line-clamp-2">{answer.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderComparison = () => {
        if (!compareVersion) {
            return (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <GitCompare size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Select a version from the timeline to compare</p>
                </div>
            );
        }

        const selectedV = versions.find(v => v.version === compareVersion);
        const previousV = versions.find(v => v.version === compareVersion - 1);

        if (!selectedV) return null;

        return (
            <div className="space-y-6">
                {/* Comparison Header */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <GitCompare className="text-purple-600" />
                        Version Comparison
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <select
                                value={compareVersion - 1}
                                onChange={(e) => setCompareVersion(parseInt(e.target.value) + 1)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                disabled={compareVersion === 1}
                            >
                                {versions.filter((_, i) => i < versions.length - 1).map((v) => (
                                    <option key={v.version} value={v.version}>Version {v.version}</option>
                                ))}
                            </select>
                            <p className="text-sm text-gray-600 mt-2">Previous Version</p>
                        </div>
                        <div>
                            <select
                                value={compareVersion}
                                onChange={(e) => setCompareVersion(parseInt(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            >
                                {versions.filter((_, i) => i > 0).map((v) => (
                                    <option key={v.version} value={v.version}>Version {v.version}</option>
                                ))}
                            </select>
                            <p className="text-sm text-gray-600 mt-2">Current Version</p>
                        </div>
                    </div>
                </div>

                {/* Metrics Comparison */}
                {previousV && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="font-bold text-gray-900 mb-4">Metrics Comparison</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-sm text-gray-600 mb-2">Word Count</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-gray-900">{selectedV.wordCount}</span>
                                    <span className={`text-sm font-medium ${
                                        selectedV.wordCount > previousV.wordCount ? 'text-green-600' : 'text-red-600'
                                    }`}>
                    ({selectedV.wordCount > previousV.wordCount ? '+' : ''}{selectedV.wordCount - previousV.wordCount})
                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">was {previousV.wordCount}</div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-sm text-gray-600 mb-2">Plagiarism Score</div>
                                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${
                      selectedV.plagiarismScore < 10 ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {selectedV.plagiarismScore}%
                  </span>
                                    <span className={`text-sm font-medium ${
                                        selectedV.plagiarismScore < previousV.plagiarismScore ? 'text-green-600' : 'text-red-600'
                                    }`}>
                    ({selectedV.plagiarismScore < previousV.plagiarismScore ? '' : '+'}{selectedV.plagiarismScore - previousV.plagiarismScore}%)
                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">was {previousV.plagiarismScore}%</div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-sm text-gray-600 mb-2">AI Score</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-purple-600">{selectedV.aiScore}/100</span>
                                    <span className={`text-sm font-medium ${
                                        selectedV.aiScore > previousV.aiScore ? 'text-green-600' : 'text-red-600'
                                    }`}>
                    ({selectedV.aiScore > previousV.aiScore ? '+' : ''}{selectedV.aiScore - previousV.aiScore})
                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">was {previousV.aiScore}/100</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back
                </button>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{assignmentData.title}</h1>
                            <p className="text-gray-600">{assignmentData.module}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-2xl font-bold text-purple-600">{versions.length}</div>
                                <div className="text-sm text-gray-600">Versions</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Mode Toggle */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex gap-4">
                    <button
                        onClick={() => setViewMode('timeline')}
                        className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                            viewMode === 'timeline'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <GitBranch size={20} />
                        Timeline View
                    </button>
                    <button
                        onClick={() => setViewMode('compare')}
                        className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                            viewMode === 'compare'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <GitCompare size={20} />
                        Compare Versions
                    </button>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'timeline' ? renderTimeline() : renderComparison()}
        </div>
    );
}
