'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {
    AlertTriangle,
    Award,
    BookOpen,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    Eye,
    FileText,
    Filter,
    Search,
} from 'lucide-react';

interface Assignment {
    id: string;
    title: string;
    module: {
        code: string;
        name: string;
    };
    type: 'assignment' | 'quiz' | 'exam';
    totalMarks: number;
    questions: number;
    dueDate: string;
    status: 'pending' | 'in-progress' | 'submitted' | 'graded' | 'overdue';
    submissionCount?: number;
    latestVersion?: number;
    grade?: number;
    description: string;
    allowLateSubmission: boolean;
    hasStarted?: boolean;
}

export default function StudentAssignmentsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'assignment' | 'quiz' | 'exam'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in-progress' | 'submitted' | 'graded' | 'overdue'>('all');

    // Hardcoded assignments data
    const assignments: Assignment[] = [
        {
            id: '1',
            title: 'Database Design and Normalization',
            module: {code: 'CS3001', name: 'Database Management Systems'},
            type: 'assignment',
            totalMarks: 100,
            questions: 5,
            dueDate: '2025-01-15 23:59',
            status: 'pending',
            description: 'Design a normalized database schema for an e-commerce system. Include ER diagrams and explain normalization up to 3NF.',
            allowLateSubmission: true,
        },
        {
            id: '2',
            title: 'Software Development Lifecycle Quiz',
            module: {code: 'SE2001', name: 'Software Engineering'},
            type: 'quiz',
            totalMarks: 50,
            questions: 20,
            dueDate: '2025-01-10 18:00',
            status: 'in-progress',
            submissionCount: 2,
            latestVersion: 2,
            description: 'Multiple choice and short answer questions on SDLC, Agile, and Waterfall methodologies.',
            allowLateSubmission: false,
            hasStarted: true,
        },
        {
            id: '3',
            title: 'Data Structures Implementation',
            module: {code: 'CS2002', name: 'Data Structures & Algorithms'},
            type: 'assignment',
            totalMarks: 100,
            questions: 3,
            dueDate: '2025-01-08 23:59',
            status: 'submitted',
            submissionCount: 4,
            latestVersion: 4,
            description: 'Implement Binary Search Tree, AVL Tree, and Hash Table in Java with comprehensive test cases.',
            allowLateSubmission: true,
        },
        {
            id: '4',
            title: 'Web Technologies Final Exam',
            module: {code: 'WT3001', name: 'Web Technologies'},
            type: 'exam',
            totalMarks: 100,
            questions: 8,
            dueDate: '2025-01-20 14:00',
            status: 'pending',
            description: 'Comprehensive exam covering HTML5, CSS3, JavaScript ES6+, React, and Node.js fundamentals.',
            allowLateSubmission: false,
        },
        {
            id: '5',
            title: 'Python Programming Basics',
            module: {code: 'CS1001', name: 'Programming Fundamentals'},
            type: 'assignment',
            totalMarks: 100,
            questions: 6,
            dueDate: '2025-01-05 23:59',
            status: 'graded',
            submissionCount: 5,
            latestVersion: 5,
            grade: 95,
            description: 'Basic Python programming exercises including loops, functions, and data structures.',
            allowLateSubmission: true,
        },
        {
            id: '6',
            title: 'Object-Oriented Programming Concepts',
            module: {code: 'CS2001', name: 'Object-Oriented Programming'},
            type: 'quiz',
            totalMarks: 40,
            questions: 15,
            dueDate: '2025-01-03 23:59',
            status: 'overdue',
            description: 'Quiz on inheritance, polymorphism, encapsulation, and abstraction principles.',
            allowLateSubmission: true,
        },
        {
            id: '7',
            title: 'Network Security Analysis',
            module: {code: 'CS3002', name: 'Computer Networks'},
            type: 'assignment',
            totalMarks: 100,
            questions: 4,
            dueDate: '2025-01-18 23:59',
            status: 'pending',
            description: 'Analyze security vulnerabilities in a given network topology and propose solutions.',
            allowLateSubmission: true,
        },
        {
            id: '8',
            title: 'Machine Learning Mid-Term',
            module: {code: 'ML4001', name: 'Machine Learning'},
            type: 'exam',
            totalMarks: 100,
            questions: 10,
            dueDate: '2025-01-12 10:00',
            status: 'pending',
            description: 'Mid-term examination on supervised learning, regression, and classification algorithms.',
            allowLateSubmission: false,
        },
    ];

    const filteredAssignments = assignments.filter(assignment => {
        const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            assignment.module.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            assignment.module.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || assignment.type === filterType;
        const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus;
        return matchesSearch && matchesType && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock size={14}/>
            Not Started
          </span>
                );
            case 'in-progress':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Edit size={14}/>
            In Progress
          </span>
                );
            case 'submitted':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            <CheckCircle2 size={14}/>
            Submitted
          </span>
                );
            case 'graded':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <Award size={14}/>
            Graded
          </span>
                );
            case 'overdue':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle size={14}/>
            Overdue
          </span>
                );
        }
    };

    const getTypeBadge = (type: string) => {
        const colors = {
            assignment: 'bg-blue-100 text-blue-700',
            quiz: 'bg-purple-100 text-purple-700',
            exam: 'bg-red-100 text-red-700',
        };
        return (
            <span
                className={`px-2 py-1 rounded text-xs font-medium ${colors[type as keyof typeof colors]}`}>
        {type.toUpperCase()}
      </span>
        );
    };

    const getDaysRemaining = (dueDate: string) => {
        const due = new Date(dueDate);
        const now = new Date();
        const diff = due.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return `${Math.abs(days)} days overdue`;
        if (days === 0) return 'Due today';
        if (days === 1) return 'Due tomorrow';
        return `${days} days remaining`;
    };

    const handleStartAssignment = (assignmentId: string) => {
        router.push(`/submissions/student/submit/${assignmentId}`);
    };

    const handleContinue = (assignmentId: string) => {
        router.push(`/submissions/student/submit/${assignmentId}`);
    };

    const handleViewSubmission = (assignmentId: string) => {
        router.push(`/submissions/student/my-submissions/${assignmentId}`);
    };

    const stats = {
        total: assignments.length,
        pending: assignments.filter(a => a.status === 'pending').length,
        inProgress: assignments.filter(a => a.status === 'in-progress').length,
        submitted: assignments.filter(a => a.status === 'submitted').length,
        graded: assignments.filter(a => a.status === 'graded').length,
        overdue: assignments.filter(a => a.status === 'overdue').length,
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">My Assignments</h1>
                <p className="text-gray-600">All assignments, quizzes, and exams for your enrolled
                    modules</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-xs text-gray-600 mt-1">Total</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{stats.pending}</div>
                    <div className="text-xs text-blue-600 mt-1">Pending</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">{stats.inProgress}</div>
                    <div className="text-xs text-amber-600 mt-1">In Progress</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-700">{stats.submitted}</div>
                    <div className="text-xs text-purple-600 mt-1">Submitted</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{stats.graded}</div>
                    <div className="text-xs text-green-600 mt-1">Graded</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
                    <div className="text-xs text-red-600 mt-1">Overdue</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                size={20}/>
                            <input
                                type="text"
                                placeholder="Search assignments, modules..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-400"/>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as never)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="all">All Types</option>
                            <option value="assignment">Assignments</option>
                            <option value="quiz">Quizzes</option>
                            <option value="exam">Exams</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as never)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="submitted">Submitted</option>
                            <option value="graded">Graded</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Assignments List */}
            <div className="space-y-4">
                {filteredAssignments.map((assignment) => (
                    <div key={assignment.id}
                         className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div
                            className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            {/* Left Section */}
                            <div className="flex-1">
                                <div className="flex items-start gap-4 mb-3">
                                    <div
                                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                            assignment.status === 'graded' ? 'bg-green-100' :
                                                assignment.status === 'submitted' ? 'bg-purple-100' :
                                                    assignment.status === 'in-progress' ? 'bg-amber-100' :
                                                        assignment.status === 'overdue' ? 'bg-red-100' :
                                                            'bg-blue-100'
                                        }`}>
                                        <FileText size={24} className={
                                            assignment.status === 'graded' ? 'text-green-600' :
                                                assignment.status === 'submitted' ? 'text-purple-600' :
                                                    assignment.status === 'in-progress' ? 'text-amber-600' :
                                                        assignment.status === 'overdue' ? 'text-red-600' :
                                                            'text-blue-600'
                                        }/>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                                            {getTypeBadge(assignment.type)}
                                        </div>

                                        <div
                                            className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                            <BookOpen size={16}/>
                                            <span
                                                className="font-medium">{assignment.module.code}</span>
                                            <span>•</span>
                                            <span>{assignment.module.name}</span>
                                        </div>

                                        <p className="text-sm text-gray-600 mb-3">{assignment.description}</p>

                                        <div className="flex flex-wrap items-center gap-4 text-sm">
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Award size={16}/>
                                                <span>{assignment.totalMarks} marks</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <FileText size={16}/>
                                                <span>{assignment.questions} questions</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Calendar size={16}/>
                                                <span>Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</span>
                                            </div>
                                            <div className={`font-medium ${
                                                assignment.status === 'overdue' ? 'text-red-600' :
                                                    getDaysRemaining(assignment.dueDate).includes('tomorrow') ||
                                                    getDaysRemaining(assignment.dueDate).includes('today') ? 'text-amber-600' :
                                                        'text-gray-600'
                                            }`}>
                                                {getDaysRemaining(assignment.dueDate)}
                                            </div>
                                        </div>

                                        {assignment.submissionCount && (
                                            <div
                                                className="mt-3 text-sm text-purple-600 font-medium">
                                                {assignment.submissionCount} submission(s) •
                                                Version {assignment.latestVersion}
                                            </div>
                                        )}

                                        {assignment.grade !== undefined && (
                                            <div
                                                className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg inline-block">
                                                <div className="flex items-center gap-2">
                                                    <Award className="text-green-600" size={20}/>
                                                    <span
                                                        className="text-sm font-medium text-gray-700">Your Grade:</span>
                                                    <span
                                                        className="text-xl font-bold text-green-600">{assignment.grade}%</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Section - Status and Actions */}
                            <div className="flex flex-col items-end gap-3">
                                {getStatusBadge(assignment.status)}

                                <div className="flex gap-2">
                                    {assignment.status === 'pending' && (
                                        <button
                                            onClick={() => handleStartAssignment(assignment.id)}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                                        >
                                            <Edit size={18}/>
                                            Start Assignment
                                        </button>
                                    )}

                                    {assignment.status === 'in-progress' && (
                                        <button
                                            onClick={() => handleContinue(assignment.id)}
                                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center gap-2"
                                        >
                                            <Edit size={18}/>
                                            Continue
                                        </button>
                                    )}

                                    {(assignment.status === 'submitted' || assignment.status === 'graded') && (
                                        <button
                                            onClick={() => handleViewSubmission(assignment.id)}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                                        >
                                            <Eye size={18}/>
                                            View Details
                                        </button>
                                    )}

                                    {assignment.status === 'overdue' && assignment.allowLateSubmission && (
                                        <button
                                            onClick={() => handleStartAssignment(assignment.id)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                                        >
                                            <Edit size={18}/>
                                            Submit Late
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredAssignments.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <FileText size={48} className="mx-auto text-gray-400 mb-4"/>
                        <p className="text-gray-500 text-lg">No assignments found</p>
                        <p className="text-gray-400 text-sm mt-2">Try adjusting your search or
                            filters</p>
                    </div>
                )}
            </div>
        </div>
    );
}
