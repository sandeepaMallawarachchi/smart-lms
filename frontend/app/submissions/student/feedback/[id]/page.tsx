'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Star,
    Shield,
    GitBranch,
    FileText,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Download,
    Clock,
    User,
} from 'lucide-react';

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();

    // Hardcoded feedback data
    const submission = {
        id: resolvedParams.id,
        assignmentTitle: 'Python Programming Task',
        course: 'Programming Fundamentals',
        studentName: 'John Doe',
        studentId: 'IT22001',
        submittedAt: '2025-01-02 09:15',
        gradedAt: '2025-01-03 14:30',
        version: 5,

        // Scores
        finalGrade: 95,
        maxScore: 100,
        plagiarismScore: 3,
        aiScore: 92,

        // AI Feedback
        aiFeedback: {
            overall: 'Excellent work! Your code demonstrates a strong understanding of Python fundamentals and follows best practices.',
            strengths: [
                'Clean and well-structured code with proper indentation',
                'Comprehensive error handling implemented',
                'Good use of list comprehensions and built-in functions',
                'Clear and descriptive variable names',
                'Excellent code documentation with docstrings',
            ],
            improvements: [
                'Consider adding type hints for better code clarity',
                'Some functions could be broken down into smaller, more focused units',
                'Add more edge case handling in the input validation',
            ],
            recommendations: [
                'Explore Python decorators for more advanced functionality',
                'Look into unit testing frameworks like pytest',
                'Consider implementing logging for better debugging',
            ],
        },

        // Lecturer Feedback
        lecturerFeedback: {
            name: 'Dr. Sarah Johnson',
            comments: 'Outstanding submission! Your implementation is efficient and well-thought-out. The algorithm complexity is optimal, and your code is production-ready. Keep up the excellent work!',
            rubricScores: [
                { criterion: 'Code Quality', score: 25, maxScore: 25 },
                { criterion: 'Functionality', score: 23, maxScore: 25 },
                { criterion: 'Documentation', score: 24, maxScore: 25 },
                { criterion: 'Testing', score: 23, maxScore: 25 },
            ],
        },

        // Plagiarism Report
        plagiarismReport: {
            overallScore: 3,
            status: 'clean',
            internetMatches: [],
            peerMatches: [],
            details: 'No significant plagiarism detected. Your work appears to be original.',
        },

        // Files
        files: [
            { name: 'main.py', size: '4.2 KB', type: 'Python' },
            { name: 'utils.py', size: '2.1 KB', type: 'Python' },
            { name: 'README.md', size: '1.5 KB', type: 'Markdown' },
        ],
    };

    const getGradeColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 80) return 'text-blue-600';
        if (score >= 70) return 'text-amber-600';
        return 'text-red-600';
    };

    const getGradeBgColor = (score: number) => {
        if (score >= 90) return 'bg-green-50 border-green-200';
        if (score >= 80) return 'bg-blue-50 border-blue-200';
        if (score >= 70) return 'bg-amber-50 border-amber-200';
        return 'bg-red-50 border-red-200';
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
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Submission Feedback</h1>
                <p className="text-gray-600">{submission.assignmentTitle} • {submission.course}</p>
            </div>

            {/* Grade Card */}
            <div className={`rounded-lg shadow-lg p-8 mb-8 border-2 ${getGradeBgColor(submission.finalGrade)}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg">
                            <div className="text-center">
                                <div className={`text-4xl font-bold ${getGradeColor(submission.finalGrade)}`}>
                                    {submission.finalGrade}
                                </div>
                                <div className="text-sm text-gray-600">/ {submission.maxScore}</div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Final Grade</h2>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Clock size={16} />
                                    Submitted: {submission.submittedAt}
                                </div>
                                <div className="flex items-center gap-1">
                                    <CheckCircle2 size={16} />
                                    Graded: {submission.gradedAt}
                                </div>
                                <div className="flex items-center gap-1">
                                    <GitBranch size={16} />
                                    Version {submission.version}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors">
                            <Download size={18} />
                            Download Files
                        </button>
                        <button
                            onClick={() => router.push(`/submissions/student/version-history/${submission.id}`)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                        >
                            <GitBranch size={18} />
                            View Versions
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">AI Quality Score</h3>
                        <Star className="text-purple-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-purple-600">{submission.aiScore}/100</p>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Plagiarism Score</h3>
                        <Shield className="text-green-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-green-600">{submission.plagiarismScore}%</p>
                    <p className="text-xs text-green-700 mt-1">Clean submission</p>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Files Submitted</h3>
                        <FileText className="text-blue-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{submission.files.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* AI Feedback */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <Star className="text-purple-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">AI-Generated Feedback</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Overall Assessment */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Overall Assessment</h3>
                                <p className="text-gray-700 leading-relaxed">{submission.aiFeedback.overall}</p>
                            </div>

                            {/* Strengths */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <CheckCircle2 className="text-green-600" size={20} />
                                    Strengths
                                </h3>
                                <ul className="space-y-2">
                                    {submission.aiFeedback.strengths.map((strength, index) => (
                                        <li key={index} className="flex items-start gap-2 text-gray-700">
                                            <span className="text-green-600 mt-1">✓</span>
                                            <span>{strength}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Areas for Improvement */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <TrendingUp className="text-amber-600" size={20} />
                                    Areas for Improvement
                                </h3>
                                <ul className="space-y-2">
                                    {submission.aiFeedback.improvements.map((improvement, index) => (
                                        <li key={index} className="flex items-start gap-2 text-gray-700">
                                            <span className="text-amber-600 mt-1">→</span>
                                            <span>{improvement}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Recommendations */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Star className="text-purple-600" size={20} />
                                    Recommendations for Next Time
                                </h3>
                                <ul className="space-y-2">
                                    {submission.aiFeedback.recommendations.map((recommendation, index) => (
                                        <li key={index} className="flex items-start gap-2 text-gray-700">
                                            <span className="text-purple-600 mt-1">•</span>
                                            <span>{recommendation}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Lecturer Feedback */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <User className="text-blue-600" size={24} />
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Lecturer Feedback</h2>
                                <p className="text-sm text-gray-600">{submission.lecturerFeedback.name}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Comments */}
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-gray-700 leading-relaxed italic">"{submission.lecturerFeedback.comments}"</p>
                            </div>

                            {/* Rubric Scores */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-4">Grading Rubric</h3>
                                <div className="space-y-3">
                                    {submission.lecturerFeedback.rubricScores.map((item, index) => (
                                        <div key={index}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-700">{item.criterion}</span>
                                                <span className="text-sm font-bold text-gray-900">
                          {item.score}/{item.maxScore}
                        </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Plagiarism Report */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="text-green-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Plagiarism Report</h2>
                        </div>

                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <CheckCircle2 className="text-green-600" size={24} />
                                <div>
                                    <p className="font-semibold text-green-900">Clean Submission</p>
                                    <p className="text-sm text-green-700">Plagiarism Score: {submission.plagiarismReport.overallScore}%</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-700">{submission.plagiarismReport.details}</p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Internet Matches</p>
                                <p className="text-2xl font-bold text-gray-900">{submission.plagiarismReport.internetMatches.length}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Peer Matches</p>
                                <p className="text-2xl font-bold text-gray-900">{submission.plagiarismReport.peerMatches.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Submitted Files */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4">Submitted Files</h3>
                        <div className="space-y-3">
                            {submission.files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText className="text-purple-600" size={20} />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                            <p className="text-xs text-gray-500">{file.size} • {file.type}</p>
                                        </div>
                                    </div>
                                    <button className="text-purple-600 hover:text-purple-700">
                                        <Download size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200">
                        <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                                Download Feedback PDF
                            </button>
                            <button
                                onClick={() => router.push(`/submissions/student/version-history/${submission.id}`)}
                                className="w-full px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
                            >
                                View All Versions
                            </button>
                            <button
                                onClick={() => router.push('/submissions/student/submit')}
                                className="w-full px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
                            >
                                Submit New Version
                            </button>
                        </div>
                    </div>

                    {/* Grade Distribution */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4">Your Performance</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Your Score</span>
                                    <span className="text-sm font-bold text-gray-900">{submission.finalGrade}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full ${
                                            submission.finalGrade >= 90 ? 'bg-green-600' :
                                                submission.finalGrade >= 80 ? 'bg-blue-600' :
                                                    submission.finalGrade >= 70 ? 'bg-amber-600' :
                                                        'bg-red-600'
                                        }`}
                                        style={{ width: `${submission.finalGrade}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-2">Class Average: 78%</p>
                                <p className="text-xs text-gray-500">Your Rank: Top 15%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}