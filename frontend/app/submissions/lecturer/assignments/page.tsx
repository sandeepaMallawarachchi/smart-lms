'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {
    Archive,
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Copy,
    Edit,
    Eye,
    FileText,
    Filter,
    MoreVertical,
    Plus,
    Search,
    Trash2,
    Users,
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
    status: 'draft' | 'active' | 'closed' | 'archived';
    submissions: number;
    totalStudents: number;
    graded: number;
    averageGrade?: number;
    createdAt: string;
}

export default function LecturerManageAssignmentsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'assignment' | 'quiz' | 'exam'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'active' | 'closed' | 'archived'>('all');
    const [showMenu, setShowMenu] = useState<string | null>(null);

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
            status: 'active',
            submissions: 45,
            totalStudents: 80,
            graded: 0,
            createdAt: '2025-01-01 10:00',
        },
        {
            id: '2',
            title: 'Software Development Lifecycle Quiz',
            module: {code: 'SE2001', name: 'Software Engineering'},
            type: 'quiz',
            totalMarks: 50,
            questions: 20,
            dueDate: '2025-01-10 18:00',
            status: 'active',
            submissions: 68,
            totalStudents: 75,
            graded: 23,
            averageGrade: 82,
            createdAt: '2024-12-28 14:30',
        },
        {
            id: '3',
            title: 'Data Structures Implementation',
            module: {code: 'CS2002', name: 'Data Structures & Algorithms'},
            type: 'assignment',
            totalMarks: 100,
            questions: 3,
            dueDate: '2025-01-08 23:59',
            status: 'closed',
            submissions: 92,
            totalStudents: 95,
            graded: 92,
            averageGrade: 88,
            createdAt: '2024-12-20 09:00',
        },
        {
            id: '4',
            title: 'Web Technologies Final Exam',
            module: {code: 'WT3001', name: 'Web Technologies'},
            type: 'exam',
            totalMarks: 100,
            questions: 8,
            dueDate: '2025-01-20 14:00',
            status: 'draft',
            submissions: 0,
            totalStudents: 60,
            graded: 0,
            createdAt: '2025-01-03 16:20',
        },
        {
            id: '5',
            title: 'Python Programming Basics',
            module: {code: 'CS1001', name: 'Programming Fundamentals'},
            type: 'assignment',
            totalMarks: 100,
            questions: 6,
            dueDate: '2025-01-05 23:59',
            status: 'closed',
            submissions: 118,
            totalStudents: 120,
            graded: 118,
            averageGrade: 85,
            createdAt: '2024-12-15 11:00',
        },
        {
            id: '6',
            title: 'Object-Oriented Programming Mid-Term',
            module: {code: 'CS2001', name: 'Object-Oriented Programming'},
            type: 'exam',
            totalMarks: 100,
            questions: 10,
            dueDate: '2024-12-20 10:00',
            status: 'archived',
            submissions: 85,
            totalStudents: 90,
            graded: 85,
            averageGrade: 76,
            createdAt: '2024-12-01 10:00',
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

    const stats = {
        total: assignments.length,
        active: assignments.filter(a => a.status === 'active').length,
        draft: assignments.filter(a => a.status === 'draft').length,
        closed: assignments.filter(a => a.status === 'closed').length,
        archived: assignments.filter(a => a.status === 'archived').length,
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Edit size={14}/>
            Draft
          </span>
                );
            case 'active':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 size={14}/>
            Active
          </span>
                );
            case 'closed':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock size={14}/>
            Closed
          </span>
                );
            case 'archived':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            <Archive size={14}/>
            Archived
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

    const handleDuplicate = (assignmentId: string) => {
        alert(`Duplicating assignment ${assignmentId}...`);
        setShowMenu(null);
    };

    const handleDelete = (assignmentId: string) => {
        if (confirm('Are you sure you want to delete this assignment?')) {
            alert(`Deleting assignment ${assignmentId}...`);
            setShowMenu(null);
        }
    };

    const handleArchive = (assignmentId: string) => {
        alert(`Archiving assignment ${assignmentId}...`);
        setShowMenu(null);
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage
                            Assignments</h1>
                        <p className="text-gray-600">Create, edit, and organize all your
                            assignments</p>
                    </div>
                    <button
                        onClick={() => router.push('/submissions/lecturer/assignments/create')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-lg"
                    >
                        <Plus size={20}/>
                        Create Assignment
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-xs text-gray-600 mt-1">Total</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{stats.active}</div>
                    <div className="text-xs text-green-600 mt-1">Active</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-700">{stats.draft}</div>
                    <div className="text-xs text-gray-600 mt-1">Drafts</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{stats.closed}</div>
                    <div className="text-xs text-blue-600 mt-1">Closed</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-700">{stats.archived}</div>
                    <div className="text-xs text-purple-600 mt-1">Archived</div>
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
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-400"/>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as never)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Drafts</option>
                            <option value="active">Active</option>
                            <option value="closed">Closed</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Assignments List */}
            <div className="space-y-4">
                {filteredAssignments.map((assignment) => (
                    <div key={assignment.id}
                         className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            {/* Left Section */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <FileText className="text-blue-600" size={24}/>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                                            {getTypeBadge(assignment.type)}
                                            {getStatusBadge(assignment.status)}
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {assignment.module.code} • {assignment.module.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <Award className="text-purple-600" size={16}/>
                                        <span>{assignment.totalMarks} marks</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <FileText className="text-blue-600" size={16}/>
                                        <span>{assignment.questions} questions</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <Users className="text-green-600" size={16}/>
                                        <span>{assignment.submissions}/{assignment.totalStudents} submitted</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <Calendar className="text-amber-600" size={16}/>
                                        <span>
                      Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                    </span>
                                    </div>
                                </div>

                                {/* Progress Bars */}
                                <div className="space-y-2">
                                    <div>
                                        <div
                                            className="flex justify-between text-xs text-gray-600 mb-1">
                                            <span>Submissions</span>
                                            <span>{Math.round((assignment.submissions / assignment.totalStudents) * 100)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{width: `${(assignment.submissions / assignment.totalStudents) * 100}%`}}
                                            />
                                        </div>
                                    </div>

                                    {assignment.graded > 0 && (
                                        <div>
                                            <div
                                                className="flex justify-between text-xs text-gray-600 mb-1">
                                                <span>Graded</span>
                                                <span>{Math.round((assignment.graded / assignment.submissions) * 100)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-600 h-2 rounded-full"
                                                    style={{width: `${(assignment.graded / assignment.submissions) * 100}%`}}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {assignment.averageGrade !== undefined && (
                                    <div
                                        className="mt-3 inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                        Average Grade: {assignment.averageGrade}%
                                    </div>
                                )}
                            </div>

                            {/* Right Section - Actions */}
                            <div className="flex flex-col items-end gap-3 ml-4">
                                <div className="relative">
                                    <button
                                        onClick={() => setShowMenu(showMenu === assignment.id ? null : assignment.id)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <MoreVertical size={20} className="text-gray-600"/>
                                    </button>

                                    {showMenu === assignment.id && (
                                        <div
                                            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                            <button
                                                onClick={() => router.push(`/submissions/lecturer/assignments/${assignment.id}/edit`)}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                            >
                                                <Edit size={16}/>
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDuplicate(assignment.id)}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                            >
                                                <Copy size={16}/>
                                                Duplicate
                                            </button>
                                            <button
                                                onClick={() => handleArchive(assignment.id)}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                            >
                                                <Archive size={16}/>
                                                Archive
                                            </button>
                                            <button
                                                onClick={() => handleDelete(assignment.id)}
                                                className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-sm text-red-600"
                                            >
                                                <Trash2 size={16}/>
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => router.push(`/submissions/lecturer/assignments/${assignment.id}`)}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                                    >
                                        <Eye size={16}/>
                                        View
                                    </button>
                                    {assignment.submissions > 0 && (
                                        <button
                                            onClick={() => router.push(`/submissions/lecturer/grading?assignment=${assignment.id}`)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm"
                                        >
                                            <Edit size={16}/>
                                            Grade ({assignment.submissions - assignment.graded})
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
