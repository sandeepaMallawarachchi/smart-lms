'use client';

import React from 'react';
import {
    TrendingUp,
    Award,
    Target,
    Shield,
    Clock,
    CheckCircle2,
    BarChart3,
    Calendar,
    Star,
} from 'lucide-react';

export default function StudentAnalyticsPage() {
    // Hardcoded analytics data
    const performanceData = {
        overallGrade: 87,
        gradeChange: +5,
        submissionRate: 92,
        avgPlagiarismScore: 6,
        avgAIScore: 85,
        totalSubmissions: 12,
        onTimeSubmissions: 11,
        lateSubmissions: 1,
    };

    const gradesByModule = [
        { module: 'CS1001', name: 'Programming Fundamentals', grade: 95, submissions: 3 },
        { module: 'CS2002', name: 'Data Structures', grade: 88, submissions: 2 },
        { module: 'SE2001', name: 'Software Engineering', grade: 85, submissions: 2 },
        { module: 'WT2001', name: 'Web Technologies', grade: 88, submissions: 2 },
        { module: 'CS3003', name: 'Advanced Programming', grade: 82, submissions: 2 },
        { module: 'CS3001', name: 'Database Systems', grade: 78, submissions: 1 },
    ];

    const recentGrades = [
        { assignment: 'Python Programming Basics', grade: 95, date: '2025-01-04', module: 'CS1001' },
        { assignment: 'Web Development Project', grade: 88, date: '2024-12-20', module: 'WT2001' },
        { assignment: 'Object-Oriented Design', grade: 82, date: '2024-12-15', module: 'CS3003' },
        { assignment: 'Database Normalization', grade: 78, date: '2024-12-10', module: 'CS3001' },
        { assignment: 'Software Testing', grade: 90, date: '2024-12-05', module: 'SE2001' },
    ];

    const submissionTimeline = [
        { month: 'Aug', submissions: 2, avgGrade: 85 },
        { month: 'Sep', submissions: 3, avgGrade: 82 },
        { month: 'Oct', submissions: 2, avgGrade: 88 },
        { month: 'Nov', submissions: 3, avgGrade: 87 },
        { month: 'Dec', submissions: 2, avgGrade: 90 },
    ];

    const strengths = [
        { area: 'Code Quality', score: 92, icon: Star },
        { area: 'Timeliness', score: 91, icon: Clock },
        { area: 'Academic Integrity', score: 94, icon: Shield },
        { area: 'Comprehensiveness', score: 85, icon: CheckCircle2 },
    ];

    const improvements = [
        { area: 'Database Design', currentScore: 78, targetScore: 85 },
        { area: 'Documentation', currentScore: 80, targetScore: 90 },
        { area: 'Testing Coverage', currentScore: 82, targetScore: 90 },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">My Performance</h1>
                <p className="text-gray-600">Track your academic progress and identify areas for improvement</p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Overall Grade</p>
                            <p className="text-4xl font-bold mt-1">{performanceData.overallGrade}%</p>
                        </div>
                        <div className="w-14 h-14 bg-green-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Award size={28} />
                        </div>
                    </div>
                    <div className="flex items-center text-green-100 text-sm">
                        <TrendingUp size={16} className="mr-1" />
                        {performanceData.gradeChange > 0 ? '+' : ''}{performanceData.gradeChange}% from last month
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Submission Rate</p>
                            <p className="text-4xl font-bold mt-1">{performanceData.submissionRate}%</p>
                        </div>
                        <div className="w-14 h-14 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Target size={28} />
                        </div>
                    </div>
                    <div className="flex items-center text-blue-100 text-sm">
                        <CheckCircle2 size={16} className="mr-1" />
                        {performanceData.onTimeSubmissions}/{performanceData.totalSubmissions} on time
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">Avg AI Score</p>
                            <p className="text-4xl font-bold mt-1">{performanceData.avgAIScore}/100</p>
                        </div>
                        <div className="w-14 h-14 bg-purple-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Star size={28} />
                        </div>
                    </div>
                    <div className="flex items-center text-purple-100 text-sm">
                        <TrendingUp size={16} className="mr-1" />
                        Excellent quality
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium">Academic Integrity</p>
                            <p className="text-4xl font-bold mt-1">{performanceData.avgPlagiarismScore}%</p>
                        </div>
                        <div className="w-14 h-14 bg-emerald-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Shield size={28} />
                        </div>
                    </div>
                    <div className="flex items-center text-emerald-100 text-sm">
                        <CheckCircle2 size={16} className="mr-1" />
                        Excellent originality
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Grades by Module */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <BarChart3 className="text-purple-600" size={24} />
                                Performance by Module
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {gradesByModule.map((module) => (
                                    <div key={module.module}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="font-semibold text-gray-900">{module.module}</p>
                                                <p className="text-sm text-gray-600">{module.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-purple-600">{module.grade}%</p>
                                                <p className="text-xs text-gray-500">{module.submissions} submissions</p>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className={`h-3 rounded-full ${
                                                    module.grade >= 90 ? 'bg-green-500' :
                                                        module.grade >= 80 ? 'bg-blue-500' :
                                                            module.grade >= 70 ? 'bg-amber-500' :
                                                                'bg-red-500'
                                                }`}
                                                style={{ width: `${module.grade}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Submission Timeline */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="text-purple-600" size={24} />
                                Submission Timeline
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {submissionTimeline.map((month) => (
                                    <div key={month.month} className="flex items-center gap-4">
                                        <div className="w-16 text-sm font-medium text-gray-700">{month.month}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="text-sm text-gray-600">{month.submissions} submissions</div>
                                                <div className="text-sm font-semibold text-purple-600">Avg: {month.avgGrade}%</div>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-purple-500 h-2 rounded-full"
                                                    style={{ width: `${(month.submissions / 5) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent Grades */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Award className="text-purple-600" size={24} />
                                Recent Grades
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {recentGrades.map((item, index) => (
                                <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-900 mb-1">{item.assignment}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <span>{item.module}</span>
                                                <span>•</span>
                                                <span>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                        <div className={`text-3xl font-bold ${
                                            item.grade >= 90 ? 'text-green-600' :
                                                item.grade >= 80 ? 'text-blue-600' :
                                                    item.grade >= 70 ? 'text-amber-600' :
                                                        'text-red-600'
                                        }`}>
                                            {item.grade}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Strengths */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Star className="text-green-600" size={20} />
                            Your Strengths
                        </h3>
                        <div className="space-y-4">
                            {strengths.map((strength) => {
                                const IconComponent = strength.icon;
                                return (
                                    <div key={strength.area}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <IconComponent size={16} className="text-gray-600" />
                                                <span className="text-sm font-medium text-gray-700">{strength.area}</span>
                                            </div>
                                            <span className="text-sm font-bold text-green-600">{strength.score}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full"
                                                style={{ width: `${strength.score}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Areas for Improvement */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="text-amber-600" size={20} />
                            Growth Opportunities
                        </h3>
                        <div className="space-y-4">
                            {improvements.map((item) => (
                                <div key={item.area}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">{item.area}</span>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-semibold">{item.currentScore}%</span>
                                            <span className="mx-1">→</span>
                                            <span className="text-green-600 font-semibold">{item.targetScore}%</span>
                                        </div>
                                    </div>
                                    <div className="relative w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-amber-500 h-2 rounded-full"
                                            style={{ width: `${item.currentScore}%` }}
                                        />
                                        <div
                                            className="absolute top-0 h-2 border-r-2 border-green-500"
                                            style={{ left: `${item.targetScore}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Performance Summary */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-6">
                        <h3 className="font-bold text-purple-900 mb-4">Performance Summary</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                                <p className="text-gray-700">
                                    You're performing <strong>above average</strong> with an {performanceData.overallGrade}% overall grade
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                                <p className="text-gray-700">
                                    Excellent submission rate of {performanceData.submissionRate}% - keep it up!
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                                <p className="text-gray-700">
                                    Your academic integrity is outstanding with only {performanceData.avgPlagiarismScore}% similarity
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Target className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                                <p className="text-gray-700">
                                    Focus on improving Database Design to reach your target of 85%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Goals */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Target className="text-purple-600" size={20} />
                            Academic Goals
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle2 className="text-green-600" size={16} />
                                    <span className="text-sm font-medium text-green-900">Maintain 85%+ average</span>
                                </div>
                                <div className="w-full bg-green-200 rounded-full h-1.5">
                                    <div className="bg-green-600 h-1.5 rounded-full" style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className="text-blue-600" size={16} />
                                    <span className="text-sm font-medium text-blue-900">100% on-time submissions</span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-1.5">
                                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '92%' }} />
                                </div>
                            </div>
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <Star className="text-purple-600" size={16} />
                                    <span className="text-sm font-medium text-purple-900">90+ AI quality score</span>
                                </div>
                                <div className="w-full bg-purple-200 rounded-full h-1.5">
                                    <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '85%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
