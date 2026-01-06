'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {
    AlertTriangle,
    Award,
    BarChart3,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    Filter,
    Minus,
    Search,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';

interface Student {
    id: string;
    name: string;
    studentId: string;
    email: string;
    phone?: string;
    enrolledModules: string[];
    status: 'excellent' | 'good' | 'average' | 'at-risk' | 'critical';
    stats: {
        totalSubmissions: number;
        averageGrade: number;
        averagePlagiarism: number;
        submissionRate: number;
        onTimeRate: number;
        averageVersions: number;
        missedDeadlines: number;
        lastSubmission: string;
    };
    gradeTrend: 'up' | 'down' | 'stable';
    recentGrades: number[];
    flagged: boolean;
}

export default function LecturerStudentInsightsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'excellent' | 'good' | 'average' | 'at-risk' | 'critical'>('all');
    const [filterModule, setFilterModule] = useState('all');
    const [sortBy, setSortBy] = useState<'name' | 'grade' | 'submissions' | 'plagiarism' | 'lastActive'>('grade');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Hardcoded students data
    const students: Student[] = [
        {
            id: 's1',
            name: 'Alice Johnson',
            studentId: 'STU001',
            email: 'alice.johnson@university.edu',
            phone: '+1-555-0101',
            enrolledModules: ['CS3001', 'SE2001', 'CS2002'],
            status: 'excellent',
            stats: {
                totalSubmissions: 8,
                averageGrade: 92.8,
                averagePlagiarism: 5.2,
                submissionRate: 100,
                onTimeRate: 100,
                averageVersions: 4.2,
                missedDeadlines: 0,
                lastSubmission: '2025-01-08 20:45',
            },
            gradeTrend: 'up',
            recentGrades: [88, 90, 91, 93, 95],
            flagged: false,
        },
        {
            id: 's2',
            name: 'Bob Smith',
            studentId: 'STU002',
            email: 'bob.smith@university.edu',
            enrolledModules: ['CS3001', 'SE2001'],
            status: 'good',
            stats: {
                totalSubmissions: 6,
                averageGrade: 82.5,
                averagePlagiarism: 9.8,
                submissionRate: 85.7,
                onTimeRate: 83.3,
                averageVersions: 3.5,
                missedDeadlines: 1,
                lastSubmission: '2025-01-08 16:30',
            },
            gradeTrend: 'stable',
            recentGrades: [80, 82, 85, 83, 82],
            flagged: false,
        },
        {
            id: 's3',
            name: 'Carol Williams',
            studentId: 'STU003',
            email: 'carol.williams@university.edu',
            phone: '+1-555-0103',
            enrolledModules: ['CS3001', 'CS2002', 'CS1001'],
            status: 'excellent',
            stats: {
                totalSubmissions: 9,
                averageGrade: 95.3,
                averagePlagiarism: 3.1,
                submissionRate: 100,
                onTimeRate: 100,
                averageVersions: 5.1,
                missedDeadlines: 0,
                lastSubmission: '2025-01-08 22:15',
            },
            gradeTrend: 'up',
            recentGrades: [92, 93, 94, 96, 98],
            flagged: false,
        },
        {
            id: 's4',
            name: 'David Brown',
            studentId: 'STU004',
            email: 'david.brown@university.edu',
            enrolledModules: ['CS3001'],
            status: 'at-risk',
            stats: {
                totalSubmissions: 4,
                averageGrade: 68.2,
                averagePlagiarism: 28.5,
                submissionRate: 66.7,
                onTimeRate: 75.0,
                averageVersions: 2.8,
                missedDeadlines: 2,
                lastSubmission: '2025-01-08 19:20',
            },
            gradeTrend: 'down',
            recentGrades: [75, 72, 68, 65, 62],
            flagged: true,
        },
        {
            id: 's5',
            name: 'Emma Davis',
            studentId: 'STU005',
            email: 'emma.davis@university.edu',
            enrolledModules: ['CS1001', 'CS2002'],
            status: 'good',
            stats: {
                totalSubmissions: 7,
                averageGrade: 88.4,
                averagePlagiarism: 6.1,
                submissionRate: 87.5,
                onTimeRate: 71.4,
                averageVersions: 4.5,
                missedDeadlines: 2,
                lastSubmission: '2025-01-06 02:30',
            },
            gradeTrend: 'up',
            recentGrades: [82, 85, 87, 90, 92],
            flagged: false,
        },
        {
            id: 's6',
            name: 'Frank Martinez',
            studentId: 'STU006',
            email: 'frank.martinez@university.edu',
            enrolledModules: ['SE2001', 'CS2002'],
            status: 'critical',
            stats: {
                totalSubmissions: 3,
                averageGrade: 61.2,
                averagePlagiarism: 35.0,
                submissionRate: 50.0,
                onTimeRate: 66.7,
                averageVersions: 1.7,
                missedDeadlines: 3,
                lastSubmission: '2025-01-08 15:45',
            },
            gradeTrend: 'down',
            recentGrades: [68, 65, 60, 58, 55],
            flagged: true,
        },
        {
            id: 's7',
            name: 'Grace Lee',
            studentId: 'STU007',
            email: 'grace.lee@university.edu',
            phone: '+1-555-0107',
            enrolledModules: ['CS2002', 'CS1001'],
            status: 'excellent',
            stats: {
                totalSubmissions: 8,
                averageGrade: 91.5,
                averagePlagiarism: 4.8,
                submissionRate: 100,
                onTimeRate: 100,
                averageVersions: 4.8,
                missedDeadlines: 0,
                lastSubmission: '2025-01-08 14:20',
            },
            gradeTrend: 'up',
            recentGrades: [87, 89, 91, 93, 94],
            flagged: false,
        },
        {
            id: 's8',
            name: 'Henry Wilson',
            studentId: 'STU008',
            email: 'henry.wilson@university.edu',
            enrolledModules: ['CS3001', 'SE2001'],
            status: 'good',
            stats: {
                totalSubmissions: 6,
                averageGrade: 89.7,
                averagePlagiarism: 7.3,
                submissionRate: 85.7,
                onTimeRate: 100,
                averageVersions: 3.8,
                missedDeadlines: 1,
                lastSubmission: '2025-01-08 21:15',
            },
            gradeTrend: 'stable',
            recentGrades: [88, 90, 89, 91, 90],
            flagged: false,
        },
        {
            id: 's9',
            name: 'Isaac Thompson',
            studentId: 'STU012',
            email: 'isaac.thompson@university.edu',
            enrolledModules: ['CS2001'],
            status: 'critical',
            stats: {
                totalSubmissions: 2,
                averageGrade: 58.7,
                averagePlagiarism: 42.1,
                submissionRate: 40.0,
                onTimeRate: 50.0,
                averageVersions: 1.5,
                missedDeadlines: 3,
                lastSubmission: '2025-01-03 22:15',
            },
            gradeTrend: 'down',
            recentGrades: [65, 62, 58, 55, 52],
            flagged: true,
        },
        {
            id: 's10',
            name: 'Jessica Wang',
            studentId: 'STU015',
            email: 'jessica.wang@university.edu',
            enrolledModules: ['CS3001', 'CS2002'],
            status: 'good',
            stats: {
                totalSubmissions: 7,
                averageGrade: 84.3,
                averagePlagiarism: 8.5,
                submissionRate: 87.5,
                onTimeRate: 85.7,
                averageVersions: 3.7,
                missedDeadlines: 1,
                lastSubmission: '2025-01-07 18:30',
            },
            gradeTrend: 'up',
            recentGrades: [78, 81, 84, 87, 89],
            flagged: false,
        },
        {
            id: 's11',
            name: 'Kevin Liu',
            studentId: 'STU018',
            email: 'kevin.liu@university.edu',
            enrolledModules: ['CS1001'],
            status: 'average',
            stats: {
                totalSubmissions: 5,
                averageGrade: 76.8,
                averagePlagiarism: 12.4,
                submissionRate: 83.3,
                onTimeRate: 80.0,
                averageVersions: 3.2,
                missedDeadlines: 1,
                lastSubmission: '2025-01-06 16:45',
            },
            gradeTrend: 'stable',
            recentGrades: [75, 77, 76, 78, 77],
            flagged: false,
        },
        {
            id: 's12',
            name: 'Laura Chen',
            studentId: 'STU021',
            email: 'laura.chen@university.edu',
            phone: '+1-555-0121',
            enrolledModules: ['SE2001', 'CS3001'],
            status: 'good',
            stats: {
                totalSubmissions: 6,
                averageGrade: 86.2,
                averagePlagiarism: 9.1,
                submissionRate: 85.7,
                onTimeRate: 83.3,
                averageVersions: 3.9,
                missedDeadlines: 1,
                lastSubmission: '2025-01-08 14:00',
            },
            gradeTrend: 'up',
            recentGrades: [80, 83, 85, 88, 90],
            flagged: false,
        },
    ];

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
        const matchesModule = filterModule === 'all' || student.enrolledModules.includes(filterModule);
        return matchesSearch && matchesStatus && matchesModule;
    });

    const sortedStudents = [...filteredStudents].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'grade':
                return b.stats.averageGrade - a.stats.averageGrade;
            case 'submissions':
                return b.stats.totalSubmissions - a.stats.totalSubmissions;
            case 'plagiarism':
                return b.stats.averagePlagiarism - a.stats.averagePlagiarism;
            case 'lastActive':
                return new Date(b.stats.lastSubmission).getTime() - new Date(a.stats.lastSubmission).getTime();
            default:
                return 0;
        }
    });

    const stats = {
        total: students.length,
        excellent: students.filter(s => s.status === 'excellent').length,
        good: students.filter(s => s.status === 'good').length,
        average: students.filter(s => s.status === 'average').length,
        atRisk: students.filter(s => s.status === 'at-risk').length,
        critical: students.filter(s => s.status === 'critical').length,
        flagged: students.filter(s => s.flagged).length,
        classAverage: Math.round(students.reduce((sum, s) => sum + s.stats.averageGrade, 0) / students.length * 10) / 10,
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'excellent':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <Award size={14}/>
            Excellent
          </span>
                );
            case 'good':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <CheckCircle2 size={14}/>
            Good
          </span>
                );
            case 'average':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Minus size={14}/>
            Average
          </span>
                );
            case 'at-risk':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <AlertTriangle size={14}/>
            At Risk
          </span>
                );
            case 'critical':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle size={14}/>
            Critical
          </span>
                );
        }
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'up':
                return <TrendingUp className="text-green-600" size={20}/>;
            case 'down':
                return <TrendingDown className="text-red-600" size={20}/>;
            default:
                return <Minus className="text-gray-600" size={20}/>;
        }
    };

    const getGradeColor = (grade: number) => {
        if (grade >= 90) return 'text-green-600';
        if (grade >= 80) return 'text-blue-600';
        if (grade >= 70) return 'text-amber-600';
        if (grade >= 60) return 'text-orange-600';
        return 'text-red-600';
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <Users className="text-blue-600" size={40}/>
                    Student Insights
                </h1>
                <p className="text-gray-600">Track individual student performance and identify those
                    needing support</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                <div
                    className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg text-white shadow-lg">
                    <div className="text-3xl font-bold">{stats.total}</div>
                    <div className="text-xs text-blue-100 mt-1">Total Students</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{stats.excellent}</div>
                    <div className="text-xs text-green-600 mt-1">Excellent</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{stats.good}</div>
                    <div className="text-xs text-blue-600 mt-1">Good</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-700">{stats.average}</div>
                    <div className="text-xs text-gray-600 mt-1">Average</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">{stats.atRisk}</div>
                    <div className="text-xs text-amber-600 mt-1">At Risk</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
                    <div className="text-xs text-red-600 mt-1">Critical</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-700">{stats.flagged}</div>
                    <div className="text-xs text-purple-600 mt-1">Flagged</div>
                </div>
            </div>

            {/* Class Average Card */}
            <div
                className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg shadow-lg p-6 mb-8 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold mb-2">Class Performance Overview</h3>
                        <p className="text-blue-100 text-sm">
                            {stats.excellent + stats.good} students
                            ({Math.round((stats.excellent + stats.good) / stats.total * 100)}%) are
                            performing well.
                            {stats.atRisk + stats.critical > 0 && ` ${stats.atRisk + stats.critical} student${stats.atRisk + stats.critical > 1 ? 's' : ''} need${stats.atRisk + stats.critical === 1 ? 's' : ''} attention.`}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-bold">{stats.classAverage}%</div>
                        <div className="text-blue-100">Class Average</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col gap-4">
                    {/* Search and View Mode */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                    size={20}/>
                                <input
                                    type="text"
                                    placeholder="Search by name, student ID, or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                List
                            </button>
                        </div>
                    </div>

                    {/* Filters and Sort */}
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Filter size={20} className="text-gray-400"/>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as never)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="excellent">Excellent</option>
                                <option value="good">Good</option>
                                <option value="average">Average</option>
                                <option value="at-risk">At Risk</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>

                        <select
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Modules</option>
                            <option value="CS3001">CS3001 - DBMS</option>
                            <option value="SE2001">SE2001 - Software Eng</option>
                            <option value="CS2002">CS2002 - Data Structures</option>
                            <option value="CS1001">CS1001 - Programming</option>
                            <option value="CS2001">CS2001 - OOP</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as never)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="grade">Sort by Grade</option>
                            <option value="name">Sort by Name</option>
                            <option value="submissions">Sort by Submissions</option>
                            <option value="plagiarism">Sort by Plagiarism</option>
                            <option value="lastActive">Sort by Last Active</option>
                        </select>

                        <button
                            className="ml-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2">
                            <Download size={18}/>
                            Export List
                        </button>
                    </div>
                </div>
            </div>

            {/* Students Display */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedStudents.map((student) => (
                        <div
                            key={student.id}
                            className={`bg-white rounded-lg shadow-sm border-2 p-6 hover:shadow-lg transition-all cursor-pointer ${
                                student.flagged ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                            }`}
                            onClick={() => router.push(`/submissions/lecturer/students/${student.id}`)}
                        >
                            {/* Student Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                                            student.status === 'excellent' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                                                student.status === 'good' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                                                    student.status === 'average' ? 'bg-gradient-to-br from-gray-500 to-gray-600' :
                                                        student.status === 'at-risk' ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                                                            'bg-gradient-to-br from-red-500 to-red-600'
                                        }`}>
                                        {student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{student.name}</h3>
                                        <p className="text-xs text-gray-600">{student.studentId}</p>
                                    </div>
                                </div>
                                {student.flagged && (
                                    <AlertTriangle className="text-red-600" size={20}/>
                                )}
                            </div>

                            {getStatusBadge(student.status)}

                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-600">Average</span>
                                        {getTrendIcon(student.gradeTrend)}
                                    </div>
                                    <div
                                        className={`text-2xl font-bold ${getGradeColor(student.stats.averageGrade)}`}>
                                        {student.stats.averageGrade}%
                                    </div>
                                </div>

                                <div className={`p-3 rounded-lg border ${
                                    student.stats.averagePlagiarism < 10 ? 'bg-green-50 border-green-200' :
                                        student.stats.averagePlagiarism < 20 ? 'bg-blue-50 border-blue-200' :
                                            'bg-red-50 border-red-200'
                                }`}>
                                    <div className="text-xs text-gray-600 mb-1">Plagiarism</div>
                                    <div className={`text-2xl font-bold ${
                                        student.stats.averagePlagiarism < 10 ? 'text-green-600' :
                                            student.stats.averagePlagiarism < 20 ? 'text-blue-600' :
                                                'text-red-600'
                                    }`}>
                                        {student.stats.averagePlagiarism}%
                                    </div>
                                </div>

                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="text-xs text-gray-600 mb-1">Submissions</div>
                                    <div
                                        className="text-xl font-bold text-gray-900">{student.stats.totalSubmissions}</div>
                                </div>

                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="text-xs text-gray-600 mb-1">On-Time</div>
                                    <div
                                        className="text-xl font-bold text-gray-900">{student.stats.onTimeRate}%
                                    </div>
                                </div>
                            </div>

                            {/* Modules */}
                            <div className="mt-4">
                                <div className="text-xs text-gray-600 mb-2">Enrolled Modules:</div>
                                <div className="flex flex-wrap gap-1">
                                    {student.enrolledModules.map((module) => (
                                        <span key={module}
                                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {module}
                    </span>
                                    ))}
                                </div>
                            </div>

                            {/* Last Active */}
                            <div className="mt-4 text-xs text-gray-500 flex items-center gap-1">
                                <Clock size={12}/>
                                Last
                                active: {new Date(student.stats.lastSubmission).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                            })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <div
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Student</th>
                            <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Grade</th>
                            <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Trend</th>
                            <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Submissions</th>
                            <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Plagiarism</th>
                            <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Modules</th>
                            <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {sortedStudents.map((student, index) => (
                            <tr
                                key={student.id}
                                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                    student.flagged ? 'bg-red-50/30' : ''
                                }`}
                            >
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow ${
                                                student.status === 'excellent' ? 'bg-green-600' :
                                                    student.status === 'good' ? 'bg-blue-600' :
                                                        student.status === 'average' ? 'bg-gray-600' :
                                                            student.status === 'at-risk' ? 'bg-amber-600' :
                                                                'bg-red-600'
                                            }`}>
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div
                                                className="font-semibold text-gray-900 flex items-center gap-2">
                                                {student.name}
                                                {student.flagged &&
                                                    <AlertTriangle className="text-red-600"
                                                                   size={16}/>}
                                            </div>
                                            <div
                                                className="text-xs text-gray-600">{student.studentId}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-center py-4 px-4">{getStatusBadge(student.status)}</td>
                                <td className="text-center py-4 px-4">
                    <span
                        className={`text-xl font-bold ${getGradeColor(student.stats.averageGrade)}`}>
                      {student.stats.averageGrade}%
                    </span>
                                </td>
                                <td className="text-center py-4 px-4">{getTrendIcon(student.gradeTrend)}</td>
                                <td className="text-center py-4 px-4">
                                    <span
                                        className="font-bold text-gray-900">{student.stats.totalSubmissions}</span>
                                </td>
                                <td className="text-center py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        student.stats.averagePlagiarism < 10 ? 'bg-green-100 text-green-700' :
                            student.stats.averagePlagiarism < 20 ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                    }`}>
                      {student.stats.averagePlagiarism}%
                    </span>
                                </td>
                                <td className="text-center py-4 px-4">
                                    <span
                                        className="text-sm font-medium text-gray-700">{student.enrolledModules.length}</span>
                                </td>
                                <td className="text-center py-4 px-4">
                                    <button
                                        onClick={() => router.push(`/submissions/lecturer/students/${student.id}`)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 mx-auto"
                                    >
                                        <Eye size={16}/>
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {sortedStudents.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <Users size={64} className="mx-auto text-gray-400 mb-4"/>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No students found</h3>
                    <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
            )}

            {/* Quick Actions Card */}
            <div
                className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <BarChart3 size={24}/>
                    Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => {
                            setFilterStatus('at-risk');
                            setViewMode('list');
                        }}
                        className="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all text-left font-medium"
                    >
                        📋 View At-Risk Students ({stats.atRisk})
                    </button>
                    <button
                        onClick={() => {
                            setFilterStatus('critical');
                            setViewMode('list');
                        }}
                        className="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all text-left font-medium"
                    >
                        🚨 View Critical Students ({stats.critical})
                    </button>
                    <button
                        onClick={() => {
                            setFilterStatus('excellent');
                            setViewMode('grid');
                        }}
                        className="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all text-left font-medium"
                    >
                        ⭐ View Top Performers ({stats.excellent})
                    </button>
                </div>
            </div>
        </div>
    );
}