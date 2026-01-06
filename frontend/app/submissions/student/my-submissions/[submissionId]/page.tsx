'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    GitBranch,
    Clock,
    Shield,
    Star,
    Eye,
    Download,
    CheckCircle2,
    Award,
    Calendar,
    FileText,
    AlertTriangle,
    TrendingUp,
} from 'lucide-react';

interface Version {
    version: number;
    createdAt: string;
    wordCount: number;
    plagiarismScore: number;
    aiScore: number;
    aiFeedback: string;
    status: 'draft' | 'submitted';
    answers: {
        questionId: string;
        text: string;
        wordCount: number;
        plagiarismScore: number;
        aiScore: number;
        aiFeedback: string;
    }[];
}

export default function SubmissionDetailPage({ params }: { params: Promise<{ submissionId: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [selectedVersion, setSelectedVersion] = useState(4);
    const [showAnswers, setShowAnswers] = useState(false);

    // Hardcoded submission data
    const submission = {
        id: resolvedParams.submissionId,
        title: 'Data Structures Implementation',
        module: { code: 'CS2002', name: 'Data Structures & Algorithms' },
        totalMarks: 100,
        finalGrade: null, // Not graded yet
        dueDate: '2025-01-08 23:59',
        submittedAt: '2025-01-08 20:45',
        status: 'submitted',
        versions: [
            {
                version: 1,
                createdAt: '2025-01-06 14:30',
                wordCount: 450,
                plagiarismScore: 8,
                aiScore: 72,
                aiFeedback: 'Good start, but needs more detail on implementation.',
                status: 'draft',
                answers: [
                    {
                        questionId: 'q1',
                        text: 'A Binary Search Tree is a data structure...',
                        wordCount: 150,
                        plagiarismScore: 10,
                        aiScore: 70,
                        aiFeedback: 'Good explanation but could use more examples.',
                    },
                    {
                        questionId: 'q2',
                        text: 'AVL trees maintain balance through...',
                        wordCount: 180,
                        plagiarismScore: 6,
                        aiScore: 75,
                        aiFeedback: 'Clear explanation of rotation mechanisms.',
                    },
                    {
                        questionId: 'q3',
                        text: 'Hash tables use hash functions to...',
                        wordCount: 120,
                        plagiarismScore: 8,
                        aiScore: 70,
                        aiFeedback: 'Need more detail on collision handling.',
                    },
                ],
            },
            {
                version: 2,
                createdAt: '2025-01-07 10:15',
                wordCount: 620,
                plagiarismScore: 7,
                aiScore: 80,
                aiFeedback: 'Much improved! Good use of examples and explanations.',
                status: 'draft',
                answers: [
                    {
                        questionId: 'q1',
                        text: 'A Binary Search Tree (BST) is a hierarchical data structure where each node has at most two children...',
                        wordCount: 220,
                        plagiarismScore: 8,
                        aiScore: 82,
                        aiFeedback: 'Excellent expansion with practical examples.',
                    },
                    {
                        questionId: 'q2',
                        text: 'AVL trees are self-balancing BSTs that maintain a balance factor...',
                        wordCount: 240,
                        plagiarismScore: 5,
                        aiScore: 80,
                        aiFeedback: 'Good coverage of rotation types.',
                    },
                    {
                        questionId: 'q3',
                        text: 'Hash tables provide O(1) average case lookup through hash functions and collision resolution...',
                        wordCount: 160,
                        plagiarismScore: 8,
                        aiScore: 78,
                        aiFeedback: 'Good explanation of chaining and open addressing.',
                    },
                ],
            },
            {
                version: 3,
                createdAt: '2025-01-08 16:20',
                wordCount: 780,
                plagiarismScore: 6,
                aiScore: 85,
                aiFeedback: 'Excellent work! Very comprehensive coverage.',
                status: 'draft',
                answers: [
                    {
                        questionId: 'q1',
                        text: 'A Binary Search Tree (BST) is a fundamental data structure in computer science...',
                        wordCount: 280,
                        plagiarismScore: 7,
                        aiScore: 87,
                        aiFeedback: 'Outstanding explanation with complexity analysis.',
                    },
                    {
                        questionId: 'q2',
                        text: 'AVL trees, named after inventors Adelson-Velsky and Landis...',
                        wordCount: 290,
                        plagiarismScore: 4,
                        aiScore: 85,
                        aiFeedback: 'Excellent historical context and implementation details.',
                    },
                    {
                        questionId: 'q3',
                        text: 'Hash tables are one of the most efficient data structures...',
                        wordCount: 210,
                        plagiarismScore: 7,
                        aiScore: 83,
                        aiFeedback: 'Great comparison of collision resolution strategies.',
                    },
                ],
            },
            {
                version: 4,
                createdAt: '2025-01-08 20:45',
                wordCount: 850,
                plagiarismScore: 5,
                aiScore: 88,
                aiFeedback: 'Outstanding submission! Comprehensive and well-structured.',
                status: 'submitted',
                answers: [
                    {
                        questionId: 'q1',
                        text: 'A Binary Search Tree (BST) is a fundamental hierarchical data structure...',
                        wordCount: 300,
                        plagiarismScore: 5,
                        aiScore: 90,
                        aiFeedback: 'Exceptional explanation with real-world use cases.',
                    },
                    {
                        questionId: 'q2',
                        text: 'AVL trees represent a crucial advancement in self-balancing binary search trees...',
                        wordCount: 320,
                        plagiarismScore: 3,
                        aiScore: 88,
                        aiFeedback: 'Superb coverage of balancing algorithms.',
                    },
                    {
                        questionId: 'q3',
                        text: 'Hash tables provide one of the most efficient solutions for key-value storage...',
                        wordCount: 230,
                        plagiarismScore: 7,
                        aiScore: 86,
                        aiFeedback: 'Excellent analysis of performance trade-offs.',
                    },
                ],
            },
        ] as Version[],
    };

    const currentVersion = submission.versions.find(v => v.version === selectedVersion) || submission.versions[submission.versions.length - 1];

    const getVersionTimeline = () => {
        return submission.versions.map((v, index) => ({
            ...v,
            improvement: index > 0 ? v.aiScore - submission.versions[index - 1].aiScore : 0,
        }));
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to My Submissions
                </button>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{submission.title}</h1>
                            <p className="text-gray-600">{submission.module.code} • {submission.module.name}</p>
                        </div>
                        <div className="text-right">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full font-medium">
                <CheckCircle2 size={18} />
                Submitted
              </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Award className="text-purple-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Total Marks</div>
                                <div className="font-bold">{submission.totalMarks}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <GitBranch className="text-blue-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Total Versions</div>
                                <div className="font-bold">{submission.versions.length}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="text-green-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Submitted</div>
                                <div className="font-bold text-sm">
                                    {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="text-amber-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Due Date</div>
                                <div className="font-bold text-sm">
                                    {new Date(submission.dueDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Version Timeline */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <GitBranch className="text-purple-600" size={24} />
                            Version Timeline
                        </h2>

                        <div className="space-y-3">
                            {getVersionTimeline().reverse().map((version) => (
                                <div
                                    key={version.version}
                                    onClick={() => setSelectedVersion(version.version)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                        selectedVersion === version.version
                                            ? 'border-purple-500 bg-purple-50 shadow-md'
                                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900">Version {version.version}</span>
                                            {version.status === 'submitted' && (
                                                <CheckCircle2 className="text-green-600" size={16} />
                                            )}
                                        </div>
                                        {version.improvement > 0 && (
                                            <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                <TrendingUp size={14} />
                                                +{version.improvement}
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-xs text-gray-500 mb-3">
                                        {new Date(version.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="text-center p-2 bg-purple-50 rounded">
                                            <div className="text-xs text-gray-600">AI Score</div>
                                            <div className="text-sm font-bold text-purple-600">{version.aiScore}</div>
                                        </div>
                                        <div className={`text-center p-2 rounded ${
                                            version.plagiarismScore < 20 ? 'bg-green-50' : 'bg-red-50'
                                        }`}>
                                            <div className="text-xs text-gray-600">Plagiarism</div>
                                            <div className={`text-sm font-bold ${
                                                version.plagiarismScore < 20 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {version.plagiarismScore}%
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 text-xs text-gray-600">
                                        {version.wordCount} words
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Version Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Version Stats */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                Version {currentVersion.version} Details
                            </h2>
                            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                                <Download size={16} />
                                Export Report
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Word Count</div>
                                <div className="text-2xl font-bold text-gray-900">{currentVersion.wordCount}</div>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="text-xs text-gray-600 mb-1">AI Score</div>
                                <div className="text-2xl font-bold text-purple-600">{currentVersion.aiScore}/100</div>
                            </div>
                            <div className={`p-4 rounded-lg border ${
                                currentVersion.plagiarismScore < 20
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'
                            }`}>
                                <div className="text-xs text-gray-600 mb-1">Plagiarism</div>
                                <div className={`text-2xl font-bold ${
                                    currentVersion.plagiarismScore < 20 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {currentVersion.plagiarismScore}%
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-xs text-gray-600 mb-1">Status</div>
                                <div className="text-lg font-bold text-blue-600 capitalize">{currentVersion.status}</div>
                            </div>
                        </div>

                        {/* Overall AI Feedback */}
                        <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                            <div className="flex items-start gap-3">
                                <Star className="text-purple-600 mt-0.5" size={24} />
                                <div>
                                    <p className="font-medium text-purple-900 mb-1">Overall AI Feedback:</p>
                                    <p className="text-sm text-purple-800">{currentVersion.aiFeedback}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Question-by-Question Analysis */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Question-by-Question Analysis</h2>
                            <button
                                onClick={() => setShowAnswers(!showAnswers)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                            >
                                <Eye size={16} />
                                {showAnswers ? 'Hide' : 'Show'} Answers
                            </button>
                        </div>

                        <div className="space-y-6">
                            {currentVersion.answers.map((answer, index) => (
                                <div key={answer.questionId} className="pb-6 border-b border-gray-200 last:border-0">
                                    <h3 className="font-bold text-gray-900 mb-4">Question {index + 1}</h3>

                                    {/* Answer Stats */}
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className="p-3 bg-gray-50 rounded border border-gray-200">
                                            <div className="text-xs text-gray-600">Words</div>
                                            <div className="text-lg font-bold text-gray-900">{answer.wordCount}</div>
                                        </div>
                                        <div className="p-3 bg-purple-50 rounded border border-purple-200">
                                            <div className="text-xs text-gray-600">AI Score</div>
                                            <div className="text-lg font-bold text-purple-600">{answer.aiScore}/100</div>
                                        </div>
                                        <div className={`p-3 rounded border ${
                                            answer.plagiarismScore < 20
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-red-50 border-red-200'
                                        }`}>
                                            <div className="text-xs text-gray-600">Plagiarism</div>
                                            <div className={`text-lg font-bold ${
                                                answer.plagiarismScore < 20 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {answer.plagiarismScore}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Answer Text */}
                                    {showAnswers && (
                                        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer.text}</p>
                                        </div>
                                    )}

                                    {/* AI Feedback */}
                                    <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                                        <div className="flex items-start gap-3">
                                            <Star className="text-blue-600 mt-0.5" size={20} />
                                            <div>
                                                <p className="font-medium text-blue-900 mb-1">AI Feedback:</p>
                                                <p className="text-sm text-blue-800">{answer.aiFeedback}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Plagiarism Report */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Shield className="text-green-600" size={24} />
                            Plagiarism Report
                        </h2>

                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-green-600">{currentVersion.plagiarismScore}%</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-green-900">Excellent Originality</p>
                                        <p className="text-sm text-green-700">Your work shows high originality</p>
                                    </div>
                                </div>

                                <div className="w-full bg-green-200 rounded-full h-3">
                                    <div
                                        className="bg-green-600 h-3 rounded-full"
                                        style={{ width: `${currentVersion.plagiarismScore}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-xs text-gray-600 mb-1">Sources Checked</div>
                                    <div className="text-xl font-bold text-gray-900">1,245</div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-xs text-gray-600 mb-1">Matches Found</div>
                                    <div className="text-xl font-bold text-gray-900">3</div>
                                </div>
                            </div>

                            {currentVersion.plagiarismScore > 0 && (
                                <div>
                                    <p className="font-medium text-gray-900 mb-3">Detected Matches:</p>
                                    <div className="space-y-2">
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-amber-900">Wikipedia - Binary Search Tree</span>
                                                <span className="text-sm font-bold text-amber-700">3%</span>
                                            </div>
                                            <p className="text-xs text-amber-700">Common terminology match</p>
                                        </div>
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-amber-900">GeeksforGeeks - AVL Trees</span>
                                                <span className="text-sm font-bold text-amber-700">1%</span>
                                            </div>
                                            <p className="text-xs text-amber-700">Technical definition match</p>
                                        </div>
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-amber-900">Course Textbook</span>
                                                <span className="text-sm font-bold text-amber-700">1%</span>
                                            </div>
                                            <p className="text-xs text-amber-700">Standard terminology</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push(`/submissions/student/versions/${submission.id}`)}
                            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            <GitBranch size={18} />
                            Compare Versions
                        </button>
                        <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2">
                            <Download size={18} />
                            Download
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
