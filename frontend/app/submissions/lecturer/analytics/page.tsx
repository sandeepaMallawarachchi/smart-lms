'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Users,
    FileText,
    Shield,
    Award,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Star,
    Calendar,
    Download,
    Filter,
    Minus,
} from 'lucide-react';

export default function LecturerAnalyticsPage() {
    const router = useRouter();
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'semester' | 'year'>('semester');
    const [selectedModule, setSelectedModule] = useState('all');

    // Hardcoded analytics data
    const overallStats = {
        totalSubmissions: 342,
        totalStudents: 120,
        averageGrade: 78.5,
        submissionRate: 95.2,
        averagePlagiarismScore: 8.3,
        aiAccuracy: 87.4,
        onTimeSubmissions: 89.5,
        averageVersions: 3.2,
    };

    const gradeDistribution = [
        { grade: 'A+ (90-100)', count: 28, percentage: 23.3, color: 'bg-green-600' },
        { grade: 'A (80-89)', count: 35, percentage: 29.2, color: 'bg-green-500' },
        { grade: 'B (70-79)', count: 30, percentage: 25.0, color: 'bg-blue-500' },
        { grade: 'C (60-69)', count: 18, percentage: 15.0, color: 'bg-amber-500' },
        { grade: 'D (50-59)', count: 6, percentage: 5.0, color: 'bg-orange-500' },
        { grade: 'F (<50)', count: 3, percentage: 2.5, color: 'bg-red-500' },
    ];

    const submissionTrends = [
        { date: 'Week 1', submissions: 45, onTime: 42, late: 3 },
        { date: 'Week 2', submissions: 52, onTime: 48, late: 4 },
        { date: 'Week 3', submissions: 38, onTime: 35, late: 3 },
        { date: 'Week 4', submissions: 61, onTime: 55, late: 6 },
        { date: 'Week 5', submissions: 49, onTime: 46, late: 3 },
        { date: 'Week 6', submissions: 55, onTime: 52, late: 3 },
        { date: 'Week 7', submissions: 42, onTime: 38, late: 4 },
    ];

    const plagiarismStats = {
        excellent: { range: '0-10%', count: 95, percentage: 79.2 },
        good: { range: '10-20%', count: 17, percentage: 14.2 },
        warning: { range: '20-30%', count: 5, percentage: 4.2 },
        critical: { range: '30%+', count: 3, percentage: 2.5 },
    };

    const modulePerformance = [
        {
            code: 'CS3001',
            name: 'Database Management Systems',
            students: 35,
            submissions: 105,
            averageGrade: 81.2,
            plagiarismRate: 6.5,
            completionRate: 97.1,
        },
        {
            code: 'SE2001',
            name: 'Software Engineering',
            students: 30,
            submissions: 90,
            averageGrade: 76.8,
            plagiarismRate: 9.2,
            completionRate: 93.3,
        },
        {
            code: 'CS2002',
            name: 'Data Structures & Algorithms',
            students: 40,
            submissions: 120,
            averageGrade: 74.5,
            plagiarismRate: 11.8,
            completionRate: 92.5,
        },
        {
            code: 'CS1001',
            name: 'Programming Fundamentals',
            students: 15,
            submissions: 27,
            averageGrade: 85.3,
            plagiarismRate: 4.2,
            completionRate: 100,
        },
    ];

    const topPerformers = [
        {
            id: '1',
            name: 'Carol Williams',
            studentId: 'STU003',
            averageGrade: 95.3,
            submissions: 8,
            plagiarismScore: 3.1,
        },
        {
            id: '2',
            name: 'Alice Johnson',
            studentId: 'STU001',
            averageGrade: 92.8,
            submissions: 7,
            plagiarismScore: 5.2,
        },
        {
            id: '3',
            name: 'Grace Lee',
            studentId: 'STU007',
            averageGrade: 91.5,
            submissions: 9,
            plagiarismScore: 4.8,
        },
        {
            id: '4',
            name: 'Henry Wilson',
            studentId: 'STU008',
            averageGrade: 89.7,
            submissions: 6,
            plagiarismScore: 7.3,
        },
        {
            id: '5',
            name: 'Emma Davis',
            studentId: 'STU005',
            averageGrade: 88.4,
            submissions: 8,
            plagiarismScore: 6.1,
        },
    ];

    const atRiskStudents = [
        {
            id: '1',
            name: 'Michael Rodriguez',
            studentId: 'STU024',
            averageGrade: 52.3,
            submissions: 4,
            plagiarismScore: 38.5,
            missedDeadlines: 3,
        },
        {
            id: '2',
            name: 'Isaac Thompson',
            studentId: 'STU012',
            averageGrade: 58.7,
            submissions: 5,
            plagiarismScore: 42.1,
            missedDeadlines: 2,
        },
        {
            id: '3',
            name: 'Frank Martinez',
            studentId: 'STU006',
            averageGrade: 61.2,
            submissions: 3,
            plagiarismScore: 35.0,
            missedDeadlines: 2,
        },
    ];

    const aiAccuracyMetrics = {
        totalEvaluations: 342,
        agreementWithLecturer: 87.4,
        overestimated: 8.2,
        underestimated: 4.4,
        averageDeviation: 5.3,
        improvements: [
            { category: 'Technical Accuracy', score: 92.1 },
            { category: 'Feedback Quality', score: 88.7 },
            { category: 'Rubric Adherence', score: 85.3 },
            { category: 'Constructiveness', score: 83.9 },
        ],
    };

    const versioningStats = {
        averageVersionsPerSubmission: 3.2,
        distribution: [
            { versions: '1', count: 15, percentage: 12.5 },
            { versions: '2-3', count: 48, percentage: 40.0 },
            { versions: '4-5', count: 42, percentage: 35.0 },
            { versions: '6+', count: 15, percentage: 12.5 },
        ],
        improvementRate: 78.5, // % of students who improved from v1 to final
    };

    const getTrendIcon = (trend: 'up' | 'down' | 'stable', value: number) => {
        if (trend === 'up') return <TrendingUp className="text-green-600" size={20} />;
        if (trend === 'down') return <TrendingDown className="text-red-600" size={20} />;
        return <Minus className="text-gray-600" size={20} />;
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <BarChart3 className="text-blue-600" size={40} />
                    Analytics Dashboard
                </h1>
                <p className="text-gray-600">Comprehensive insights into class performance and submission trends</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-400" />
                        <label className="text-sm text-gray-600">Time Range:</label>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as any)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="week">Last Week</option>
                            <option value="month">Last Month</option>
                            <option value="semester">This Semester</option>
                            <option value="year">This Year</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Module:</label>
                        <select
                            value={selectedModule}
                            onChange={(e) => setSelectedModule(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Modules</option>
                            <option value="CS3001">CS3001 - DBMS</option>
                            <option value="SE2001">SE2001 - Software Engineering</option>
                            <option value="CS2002">CS2002 - Data Structures</option>
                            <option value="CS1001">CS1001 - Programming</option>
                        </select>
                    </div>

                    <button className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
                        <Download size={18} />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Overall Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <FileText size={32} />
                        {getTrendIcon('up', 12.5)}
                    </div>
                    <div className="text-3xl font-bold mb-1">{overallStats.totalSubmissions}</div>
                    <div className="text-blue-100 text-sm">Total Submissions</div>
                    <div className="text-xs text-blue-200 mt-2">+12.5% from last period</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <Award size={32} />
                        {getTrendIcon('up', 3.2)}
                    </div>
                    <div className="text-3xl font-bold mb-1">{overallStats.averageGrade}%</div>
                    <div className="text-green-100 text-sm">Average Grade</div>
                    <div className="text-xs text-green-200 mt-2">+3.2% from last period</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <Users size={32} />
                        {getTrendIcon('up', 5.8)}
                    </div>
                    <div className="text-3xl font-bold mb-1">{overallStats.submissionRate}%</div>
                    <div className="text-purple-100 text-sm">Submission Rate</div>
                    <div className="text-xs text-purple-200 mt-2">+5.8% from last period</div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <Shield size={32} />
                        {getTrendIcon('down', 2.1)}
                    </div>
                    <div className="text-3xl font-bold mb-1">{overallStats.averagePlagiarismScore}%</div>
                    <div className="text-emerald-100 text-sm">Avg. Plagiarism</div>
                    <div className="text-xs text-emerald-200 mt-2">-2.1% from last period (Better!)</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Grade Distribution */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Award className="text-blue-600" size={24} />
                        Grade Distribution
                    </h2>

                    <div className="space-y-4">
                        {gradeDistribution.map((item, index) => (
                            <div key={index}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">{item.grade}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-600">{item.count} students</span>
                                        <span className="text-sm font-bold text-gray-900">{item.percentage}%</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`${item.color} h-3 rounded-full transition-all duration-500`}
                                        style={{ width: `${item.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">
                            <strong>Class Average: {overallStats.averageGrade}%</strong> (B grade)
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                            52.5% of students achieved A grades • 15% need additional support
                        </p>
                    </div>
                </div>

                {/* Plagiarism Statistics */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Shield className="text-green-600" size={24} />
                        Plagiarism Statistics
                    </h2>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-3xl font-bold text-green-600">{plagiarismStats.excellent.count}</div>
                            <div className="text-xs text-gray-600 mt-1">Excellent ({plagiarismStats.excellent.range})</div>
                            <div className="text-sm font-medium text-green-700 mt-2">{plagiarismStats.excellent.percentage}%</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-3xl font-bold text-blue-600">{plagiarismStats.good.count}</div>
                            <div className="text-xs text-gray-600 mt-1">Good ({plagiarismStats.good.range})</div>
                            <div className="text-sm font-medium text-blue-700 mt-2">{plagiarismStats.good.percentage}%</div>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="text-3xl font-bold text-amber-600">{plagiarismStats.warning.count}</div>
                            <div className="text-xs text-gray-600 mt-1">Warning ({plagiarismStats.warning.range})</div>
                            <div className="text-sm font-medium text-amber-700 mt-2">{plagiarismStats.warning.percentage}%</div>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="text-3xl font-bold text-red-600">{plagiarismStats.critical.count}</div>
                            <div className="text-xs text-gray-600 mt-1">Critical ({plagiarismStats.critical.range})</div>
                            <div className="text-sm font-medium text-red-700 mt-2">{plagiarismStats.critical.percentage}%</div>
                        </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3 mb-2">
                            <CheckCircle2 className="text-green-600" size={24} />
                            <p className="text-sm font-bold text-green-900">Excellent Academic Integrity!</p>
                        </div>
                        <p className="text-xs text-green-700">
                            93.4% of submissions show excellent or good originality. Only 6.7% require review.
                        </p>
                    </div>
                </div>
            </div>

            {/* Submission Trends */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="text-purple-600" size={24} />
                    Submission Trends
                </h2>

                <div className="space-y-4">
                    {submissionTrends.map((week, index) => (
                        <div key={index}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">{week.date}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-green-600">On-time: {week.onTime}</span>
                                    <span className="text-xs text-red-600">Late: {week.late}</span>
                                    <span className="text-sm font-bold text-gray-900">{week.submissions} total</span>
                                </div>
                            </div>
                            <div className="flex gap-1 w-full h-8">
                                <div
                                    className="bg-green-500 rounded-l transition-all"
                                    style={{ width: `${(week.onTime / week.submissions) * 100}%` }}
                                    title={`On-time: ${week.onTime}`}
                                />
                                <div
                                    className="bg-red-500 rounded-r transition-all"
                                    style={{ width: `${(week.late / week.submissions) * 100}%` }}
                                    title={`Late: ${week.late}`}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-gray-900">{overallStats.onTimeSubmissions}%</div>
                        <div className="text-xs text-gray-600 mt-1">On-Time Rate</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-gray-900">{overallStats.averageVersions}</div>
                        <div className="text-xs text-gray-600 mt-1">Avg. Versions</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-gray-900">{versioningStats.improvementRate}%</div>
                        <div className="text-xs text-gray-600 mt-1">Improved Final</div>
                    </div>
                </div>
            </div>

            {/* Module Performance */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <FileText className="text-blue-600" size={24} />
                    Module Performance
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Module</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Students</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Submissions</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Avg. Grade</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Plagiarism</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Completion</th>
                        </tr>
                        </thead>
                        <tbody>
                        {modulePerformance.map((module, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-4">
                                    <div>
                                        <div className="font-semibold text-gray-900">{module.code}</div>
                                        <div className="text-xs text-gray-600">{module.name}</div>
                                    </div>
                                </td>
                                <td className="text-center py-4 px-4 font-medium text-gray-900">{module.students}</td>
                                <td className="text-center py-4 px-4 font-medium text-gray-900">{module.submissions}</td>
                                <td className="text-center py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        module.averageGrade >= 80 ? 'bg-green-100 text-green-700' :
                            module.averageGrade >= 70 ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                    }`}>
                      {module.averageGrade}%
                    </span>
                                </td>
                                <td className="text-center py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        module.plagiarismRate < 10 ? 'bg-green-100 text-green-700' :
                            module.plagiarismRate < 15 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                    }`}>
                      {module.plagiarismRate}%
                    </span>
                                </td>
                                <td className="text-center py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        module.completionRate >= 95 ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                    }`}>
                      {module.completionRate}%
                    </span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Top Performers */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Award className="text-amber-600" size={24} />
                        Top Performers
                    </h2>

                    <div className="space-y-3">
                        {topPerformers.map((student, index) => (
                            <div
                                key={student.id}
                                className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => router.push(`/submissions/lecturer/students/${student.id}`)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-bold shadow-lg">
                                        #{index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900">{student.name}</div>
                                        <div className="text-xs text-gray-600">{student.studentId}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-amber-600">{student.averageGrade}%</div>
                                        <div className="text-xs text-gray-600">{student.submissions} submissions</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* At-Risk Students */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <AlertTriangle className="text-red-600" size={24} />
                        At-Risk Students
                    </h2>

                    {atRiskStudents.length > 0 ? (
                        <div className="space-y-3">
                            {atRiskStudents.map((student) => (
                                <div
                                    key={student.id}
                                    className="p-4 bg-red-50 border border-red-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => router.push(`/submissions/lecturer/students/${student.id}`)}
                                >
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="text-red-600 mt-0.5" size={24} />
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900">{student.name}</div>
                                            <div className="text-xs text-gray-600 mb-2">{student.studentId}</div>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div className="p-2 bg-white rounded border border-red-200">
                                                    <div className="text-gray-600">Grade</div>
                                                    <div className="font-bold text-red-600">{student.averageGrade}%</div>
                                                </div>
                                                <div className="p-2 bg-white rounded border border-red-200">
                                                    <div className="text-gray-600">Plagiarism</div>
                                                    <div className="font-bold text-red-600">{student.plagiarismScore}%</div>
                                                </div>
                                                <div className="p-2 bg-white rounded border border-red-200">
                                                    <div className="text-gray-600">Missed</div>
                                                    <div className="font-bold text-red-600">{student.missedDeadlines}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                            <p className="text-gray-600">No students at risk!</p>
                        </div>
                    )}

                    <button
                        onClick={() => router.push('/submissions/lecturer/students')}
                        className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                        View All Students
                    </button>
                </div>
            </div>

            {/* AI Accuracy Metrics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Star className="text-purple-600" size={24} />
                    AI Grading Accuracy
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Agreement with Lecturer</span>
                                <span className="text-2xl font-bold text-purple-600">{aiAccuracyMetrics.agreementWithLecturer}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                    className="bg-purple-600 h-4 rounded-full"
                                    style={{ width: `${aiAccuracyMetrics.agreementWithLecturer}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
                                <div className="text-2xl font-bold text-purple-600">{aiAccuracyMetrics.totalEvaluations}</div>
                                <div className="text-xs text-gray-600 mt-1">Total Evals</div>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-center">
                                <div className="text-2xl font-bold text-amber-600">{aiAccuracyMetrics.overestimated}%</div>
                                <div className="text-xs text-gray-600 mt-1">Over</div>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                                <div className="text-2xl font-bold text-blue-600">{aiAccuracyMetrics.underestimated}%</div>
                                <div className="text-xs text-gray-600 mt-1">Under</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Performance by Category</h3>
                        <div className="space-y-3">
                            {aiAccuracyMetrics.improvements.map((item, index) => (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-700">{item.category}</span>
                                        <span className="text-sm font-bold text-gray-900">{item.score}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-purple-600 h-2 rounded-full"
                                            style={{ width: `${item.score}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-900">
                        <strong>AI Performance:</strong> {aiAccuracyMetrics.agreementWithLecturer}% agreement rate with a ±{aiAccuracyMetrics.averageDeviation}% average deviation.
                        The AI is performing well and continues to learn from your feedback.
                    </p>
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Semester Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <div className="text-3xl font-bold mb-1">{overallStats.totalStudents}</div>
                                <div className="text-blue-100 text-sm">Active Students</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold mb-1">{overallStats.totalSubmissions}</div>
                                <div className="text-blue-100 text-sm">Total Submissions</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold mb-1">{overallStats.averageGrade}%</div>
                                <div className="text-blue-100 text-sm">Class Average</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold mb-1">{overallStats.submissionRate}%</div>
                                <div className="text-blue-100 text-sm">Submission Rate</div>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => alert('Generating comprehensive report...')}
                        className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-bold flex items-center gap-2 shadow-lg"
                    >
                        <Download size={20} />
                        Full Report
                    </button>
                </div>
            </div>
        </div>
    );
}