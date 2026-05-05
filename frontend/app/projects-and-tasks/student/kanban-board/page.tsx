'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    GripVertical,
    Calendar,
    FileText,
    Loader,
    AlertCircle,
    ArrowRight,
    CheckCircle
} from 'lucide-react';
import StudentDetailPanel from '@/components/projects-and-tasks/student/StudentDetailPanel';

interface Subtask {
    id: string;
    title: string;
    description?: string;
    completed?: boolean;
}

interface MainTask {
    id: string;
    title: string;
    description?: string;
    subtasks?: Subtask[];
    completed?: boolean;
}

interface Document {
    url: string;
    name: string;
    fileSize: number;
}

interface Course {
    _id: string;
    courseName: string;
    courseCode: string;
    credits: number;
    year: number;
    semester: number;
    specializations?: string[];
}

interface Project {
    _id: string;
    projectName: string;
    description: { html: string; text: string };
    projectType: 'group' | 'individual';
    deadlineDate: string;
    deadlineTime: string;
    specialNotes?: { html: string; text: string };
    templateDocuments?: Document[];
    otherDocuments?: Document[];
    images?: Document[];
    mainTasks?: MainTask[];
    course: Course;
    createdAt: string;
    updatedAt: string;
    progress?: {
        status?: 'todo' | 'inprogress' | 'done';
        updatedAt?: string;
        mainTasks?: MainTask[];
    };
}

interface Task {
    _id: string;
    taskName: string;
    description: { html: string; text: string };
    deadlineDate?: string;
    deadlineTime?: string;
    specialNotes?: { html: string; text: string };
    templateDocuments?: Document[];
    otherDocuments?: Document[];
    images?: Document[];
    subtasks?: Subtask[];
    course: Course;
    createdAt: string;
    updatedAt: string;
    progress?: {
        status?: 'todo' | 'inprogress' | 'done';
        updatedAt?: string;
        subtasks?: Subtask[];
    };
}

interface KanbanItem {
    _id: string;
    name: string;
    type: 'project' | 'task';
    item: Project | Task;
    status: 'todo' | 'inprogress' | 'done';
    completedAt?: string;
}

interface StudentData {
    id: string;
    name: string;
    studentIdNumber: string;
    academicYear: string;
    semester: string;
    specialization: string;
}

const getDeadlineStatus = (deadlineDate: string, deadlineTime: string = '23:59') => {
    try {
        const deadline = new Date(`${deadlineDate}T${deadlineTime}`);
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const startOfDeadline = new Date(deadline);
        startOfDeadline.setHours(0, 0, 0, 0);
        const dayDiff = Math.round((startOfDeadline.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

        if (deadline.getTime() < now.getTime()) {
            return { status: 'overdue', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
        } else if (dayDiff <= 2) {
            return { status: 'urgent', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
        } else if (dayDiff <= 5) {
            return { status: 'warning', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
        } else {
            return { status: 'ok', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
        }
    } catch {
        return { status: 'unknown', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    }
};

const getDeadlineText = (deadlineDate: string, deadlineTime: string = '23:59') => {
    try {
        const deadline = new Date(`${deadlineDate}T${deadlineTime}`);
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const startOfDeadline = new Date(deadline);
        startOfDeadline.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((startOfDeadline.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

        if (deadline.getTime() < now.getTime()) {
            const overdueDays = Math.max(1, Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)));
            return `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`;
        } else if (daysUntil === 0) {
            return 'Due today';
        } else if (daysUntil === 1) {
            return 'Due tomorrow';
        } else {
            return `${daysUntil} days left`;
        }
    } catch {
        return 'Invalid date';
    }
};

const formatDateTime = (input?: string) => {
    if (!input) return 'Unknown date';
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return 'Unknown date';
    return parsed.toLocaleString();
};

const getDeadlineDate = (item: Project | Task): Date | null => {
    if (!item.deadlineDate) return null;
    const parsed = new Date(`${item.deadlineDate}T${item.deadlineTime || '23:59'}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

interface KanbanCardProps {
    item: KanbanItem;
    onDragStart: (item: KanbanItem) => void;
    onClick: (item: KanbanItem) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ item, onDragStart, onClick }) => {
    const deadlineStatus = item.item.deadlineDate
        ? getDeadlineStatus(item.item.deadlineDate, item.item.deadlineTime)
        : null;
    const deadline = getDeadlineDate(item.item);
    const completedAtDate = item.completedAt ? new Date(item.completedAt) : null;
    const isCompletedLate = Boolean(
        item.status === 'done' &&
        completedAtDate &&
        !Number.isNaN(completedAtDate.getTime()) &&
        deadline &&
        completedAtDate.getTime() > deadline.getTime()
    );
    const doneBadgeClasses = isCompletedLate
        ? { text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' }
        : { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };

    return (
        <motion.div
            draggable={item.status !== 'done'}
            onDragStart={() => item.status !== 'done' && onDragStart(item)}
            onClick={() => onClick(item)}
            whileHover={item.status !== 'done' ? { y: -4, boxShadow: '0 10px 25px rgba(59, 130, 246, 0.15)' } : {}}
            whileTap={item.status !== 'done' ? { scale: 0.98 } : {}}
            className={`
        p-4 rounded-lg border-2 cursor-grab active:cursor-grabbing 
        transition-all bg-white
        ${item.status === 'done' ? doneBadgeClasses.border : deadlineStatus?.borderColor}
        hover:shadow-lg
        ${item.status === 'done' ? 'cursor-not-allowed opacity-75' : ''}
      `}
        >
            <div className="flex gap-2 mb-2">
                <GripVertical size={16} className="text-gray-400 shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate text-sm">
                        {item.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {item.type === 'project' ? '📋' : '✓'} {item.item.course.courseName}
                    </p>
                </div>
            </div>

            {item.status === 'done' ? (
                <div className={`mt-3 p-2 rounded border ${doneBadgeClasses.bg} ${doneBadgeClasses.border}`}>
                    <p className={`text-xs font-semibold ${doneBadgeClasses.text}`}>
                        Completed on {formatDateTime(item.completedAt)}
                    </p>
                </div>
            ) : (
                item.item.deadlineDate && deadlineStatus && (
                    <div className={`mt-3 p-2 rounded ${deadlineStatus.bgColor} border border-current border-opacity-20`}>
                        <p className={`text-xs font-semibold ${deadlineStatus.color}`}>
                            {getDeadlineText(item.item.deadlineDate, item.item.deadlineTime)}
                        </p>
                    </div>
                )
            )}

            <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                <Calendar size={14} />
                <span>{item.item.deadlineDate || 'No deadline'}</span>
            </div>
        </motion.div>
    );
};

export default function StudentProjectsAndTasksPage() {
    const [student, setStudent] = useState<StudentData | null>(null);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [allItems, setAllItems] = useState<KanbanItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<KanbanItem | null>(null);
    const [draggedItem, setDraggedItem] = useState<KanbanItem | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    const [todoItems, setTodoItems] = useState<KanbanItem[]>([]);
    const [inProgressItems, setInProgressItems] = useState<KanbanItem[]>([]);
    const [doneItems, setDoneItems] = useState<KanbanItem[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const token = localStorage.getItem('authToken');

                if (!token) {
                    window.location.href = '/login';
                    return;
                }

                const projectsResponse = await fetch('/api/projects-and-tasks/student/projects', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!projectsResponse.ok) {
                    throw new Error('Failed to fetch projects');
                }

                const projectsData = await projectsResponse.json();
                const projects = projectsData.data.projects || [];
                setAllProjects(projects);
                setStudent(projectsData.data.student);

                const tasksResponse = await fetch('/api/projects-and-tasks/student/tasks', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!tasksResponse.ok) {
                    throw new Error('Failed to fetch tasks');
                }

                const tasksData = await tasksResponse.json();
                const tasks = tasksData.data.tasks || [];
                setAllTasks(tasks);

                const projectItems: KanbanItem[] = [];
                const taskItems: KanbanItem[] = [];

                for (const project of projects) {
                    const status: 'todo' | 'inprogress' | 'done' = project.progress?.status || 'todo';
                    const progressUpdatedAt = project.progress?.updatedAt;

                    projectItems.push({
                        _id: project._id,
                        name: project.projectName,
                        type: 'project',
                        item: project,
                        status,
                        completedAt: status === 'done' ? progressUpdatedAt : undefined,
                    });
                }

                for (const task of tasks) {
                    const status: 'todo' | 'inprogress' | 'done' = task.progress?.status || 'todo';
                    const progressUpdatedAt = task.progress?.updatedAt;

                    taskItems.push({
                        _id: task._id,
                        name: task.taskName,
                        type: 'task',
                        item: task,
                        status,
                        completedAt: status === 'done' ? progressUpdatedAt : undefined,
                    });
                }

                setAllItems([...projectItems, ...taskItems]);

                setError(null);
            } catch (err: unknown) {
                console.error('Error fetching data:', err);
                const message = err instanceof Error ? err.message : 'Failed to load projects and tasks';
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const handleCourseSelected = (event: Event) => {
            const customEvent = event as CustomEvent;
            setSelectedCourse(customEvent.detail);
        };

        window.addEventListener('studentCourseSelected', handleCourseSelected);
        return () => {
            window.removeEventListener('studentCourseSelected', handleCourseSelected);
        };
    }, []);

    useEffect(() => {
        const savedCourse = localStorage.getItem('selectedStudentCourse');
        if (savedCourse) {
            try {
                setSelectedCourse(JSON.parse(savedCourse));
            } catch (error) {
                console.error('Error loading saved course:', error);
            }
        }
    }, []);

    useEffect(() => {
        const visibleItems = selectedCourse
            ? allItems.filter((entry) => entry.item.course._id === selectedCourse._id)
            : allItems;

        setTodoItems(visibleItems.filter((entry) => entry.status === 'todo'));
        setInProgressItems(visibleItems.filter((entry) => entry.status === 'inprogress'));
        setDoneItems(visibleItems.filter((entry) => entry.status === 'done'));
    }, [selectedCourse, allItems]);

    const handleDragStart = (item: KanbanItem) => {
        if (item.status !== 'done') {
            setDraggedItem(item);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const persistItemStatus = async (
        item: KanbanItem,
        status: 'todo' | 'inprogress' | 'done'
    ): Promise<string | undefined> => {
        const token = localStorage.getItem('authToken');

        if (!token) {
            throw new Error('No auth token found');
        }

        const endpoint =
            item.type === 'project'
                ? '/api/projects-and-tasks/student/project-progress'
                : '/api/projects-and-tasks/student/task-progress';
        const body = item.type === 'project'
            ? { projectId: item._id, status }
            : { taskId: item._id, status };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const message = payload?.message || `Failed to update ${item.type} status`;
            throw new Error(message);
        }

        const payload = await response.json().catch(() => null);
        return payload?.data?.progress?.updatedAt;
    };

    const handleDrop = async (status: 'todo' | 'inprogress' | 'done') => {
        if (!draggedItem || draggedItem.status === 'done') return;
        if (draggedItem.status === status) {
            setDraggedItem(null);
            return;
        }

        const previousStatus = draggedItem.status;
        const updatedItem = {
            ...draggedItem,
            status,
            completedAt: status === 'done' ? draggedItem.completedAt : undefined,
        };

        setAllItems((prev) =>
            prev.map((entry) => (entry._id === updatedItem._id ? { ...entry, status } : entry))
        );

        try {
            const persistedCompletedAt = await persistItemStatus(draggedItem, status);
            setAllItems((prev) =>
                prev.map((entry) =>
                    entry._id === updatedItem._id
                        ? {
                            ...entry,
                            status,
                            completedAt: status === 'done' ? persistedCompletedAt : undefined,
                        }
                        : entry
                )
            );
            setSelectedItem((prev) => (
                prev && prev._id === updatedItem._id
                    ? {
                        ...prev,
                        status,
                        completedAt: status === 'done' ? persistedCompletedAt : undefined,
                    }
                    : prev
            ));
        } catch (err: unknown) {
            console.error('Error updating status:', err);
            setAllItems((prev) =>
                prev.map((entry) =>
                    entry._id === updatedItem._id ? { ...entry, status: previousStatus } : entry
                )
            );
            setError(err instanceof Error ? err.message : 'Failed to save status change');
        }

        setDraggedItem(null);
    };

    const handleTaskUpdate = (projectId: string, mainTasks: MainTask[], progressUpdatedAt?: string) => {
        if (!mainTasks || mainTasks.length === 0) return;

        const allTasksCompleted = mainTasks.every((task) => task.completed);
        const newStatus: 'inprogress' | 'done' = allTasksCompleted ? 'done' : 'inprogress';

        setAllItems((prev) =>
            prev.map((entry) =>
                entry._id === projectId
                    ? { ...entry, status: newStatus, completedAt: newStatus === 'done' ? progressUpdatedAt : undefined }
                    : entry
            )
        );
        setSelectedItem((prev) => (
            prev && prev._id === projectId
                ? { ...prev, status: newStatus, completedAt: newStatus === 'done' ? progressUpdatedAt : undefined }
                : prev
        ));
    };

    const handleSubtaskUpdate = (taskId: string, subtasks: Subtask[], progressUpdatedAt?: string) => {
        if (!subtasks || subtasks.length === 0) return;

        const allSubtasksCompleted = subtasks.every((subtask) => subtask.completed);

        const newStatus: 'inprogress' | 'done' = allSubtasksCompleted ? 'done' : 'inprogress';

        setAllItems((prev) =>
            prev.map((entry) =>
                entry._id === taskId
                    ? { ...entry, status: newStatus, completedAt: newStatus === 'done' ? progressUpdatedAt : undefined }
                    : entry
            )
        );
        setSelectedItem((prev) => (
            prev && prev._id === taskId
                ? { ...prev, status: newStatus, completedAt: newStatus === 'done' ? progressUpdatedAt : undefined }
                : prev
        ));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-linear-to-r from-brand-blue to-brand-yellow flex items-center justify-center shadow-lg">
                            <Loader className="animate-spin text-white" size={32} />
                        </div>
                        <p className="text-gray-600 font-semibold">Loading your projects and tasks...</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ y: [0, 30, 0] }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-10 right-20 w-96 h-96 bg-linear-to-r from-brand-blue/5 to-brand-yellow/5 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ y: [0, -30, 0] }}
                    transition={{ duration: 8, repeat: Infinity, delay: 1 }}
                    className="absolute -bottom-32 -left-32 w-96 h-96 bg-linear-to-r from-brand-yellow/5 to-brand-blue/5 rounded-full blur-3xl"
                />
            </div>

            <div className="relative w-full px-4 py-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-brand-yellow flex items-center justify-center text-brand-blue text-xl font-bold shadow-lg">
                            {student?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-brand-blue">My Projects & Tasks</h1>
                            <p className="text-gray-600 mt-1">
                                {student?.name} • Year {student?.academicYear}, Semester {student?.semester}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
                    >
                        <AlertCircle className="text-red-600" size={20} />
                        <p className="text-red-700 font-semibold">{error}</p>
                    </motion.div>
                )}

                {!selectedCourse && allProjects.length === 0 && allTasks.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 bg-white rounded-xl border-2 border-gray-200 text-center"
                    >
                        <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Projects or Tasks Yet</h3>
                        <p className="text-gray-600">Select a module from the header to view projects and tasks</p>
                    </motion.div>
                )}

                {selectedCourse && todoItems.length === 0 && inProgressItems.length === 0 && doneItems.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 bg-white rounded-xl border-2 border-blue-200 text-center"
                    >
                        <FileText className="mx-auto text-blue-300 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Projects or Tasks in {selectedCourse.courseName}</h3>
                        <p className="text-gray-600">Check back soon for new assignments</p>
                    </motion.div>
                )}

                {(todoItems.length > 0 || inProgressItems.length > 0 || doneItems.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        <motion.div
                            onDragOver={handleDragOver}
                            onDrop={() => { void handleDrop('todo'); }}
                            className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[600px]"
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <FileText size={18} className="text-gray-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">TO DO</h2>
                                <span className="ml-auto px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold">
                                    {todoItems.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {todoItems.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-12"
                                    >
                                        <FileText className="mx-auto text-gray-300 mb-2" size={32} />
                                        <p className="text-gray-500 text-sm">No tasks yet</p>
                                    </motion.div>
                                ) : (
                                    todoItems.map((item, idx) => (
                                        <motion.div
                                            key={item._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <KanbanCard
                                                item={item}
                                                onDragStart={() => handleDragStart(item)}
                                                onClick={setSelectedItem}
                                            />
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>

                        <motion.div
                            onDragOver={handleDragOver}
                            onDrop={() => { void handleDrop('inprogress'); }}
                            className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-brand-blue/30 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[600px]"
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <ArrowRight size={18} className="text-brand-blue" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">IN PROGRESS</h2>
                                <span className="ml-auto px-3 py-1 rounded-full bg-blue-100 text-brand-blue text-sm font-semibold">
                                    {inProgressItems.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {inProgressItems.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-12"
                                    >
                                        <ArrowRight className="mx-auto text-blue-200 mb-2" size={32} />
                                        <p className="text-gray-500 text-sm">Drag items here</p>
                                    </motion.div>
                                ) : (
                                    inProgressItems.map((item, idx) => (
                                        <motion.div
                                            key={item._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <KanbanCard
                                                item={item}
                                                onDragStart={() => handleDragStart(item)}
                                                onClick={setSelectedItem}
                                            />
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>

                        <motion.div
                            onDragOver={handleDragOver}
                            onDrop={() => { void handleDrop('done'); }}
                            className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-green-300 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[600px]"
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                    <CheckCircle size={18} className="text-green-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">DONE</h2>
                                <span className="ml-auto px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                                    {doneItems.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {doneItems.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-12"
                                    >
                                        <CheckCircle className="mx-auto text-green-200 mb-2" size={32} />
                                        <p className="text-gray-500 text-sm">No completed items</p>
                                    </motion.div>
                                ) : (
                                    doneItems.map((item, idx) => (
                                        <motion.div
                                            key={item._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <KanbanCard
                                                item={item}
                                                onDragStart={() => handleDragStart(item)}
                                                onClick={setSelectedItem}
                                            />
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </div>

            {selectedCourse && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border-l-4 border-brand-blue rounded-lg p-4 flex items-center justify-between"
                >
                    <div>
                        <p className="text-xs font-semibold text-blue-600 mb-1">VIEWING MODULE</p>
                        <p className="text-lg font-bold text-gray-900">{selectedCourse.courseName}</p>
                        <p className="text-sm text-gray-600">
                            {selectedCourse.courseCode} • Year {selectedCourse.year}, Semester {selectedCourse.semester} • {selectedCourse.credits} Credits
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setSelectedCourse(null)}
                        className="px-4 py-2 bg-white border border-blue-200 text-brand-blue rounded-lg hover:bg-blue-100 transition-colors font-medium"
                    >
                        Clear Filter
                    </motion.button>
                </motion.div>
            )}

            <StudentDetailPanel
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onTaskUpdate={handleTaskUpdate}
                onSubtaskUpdate={handleSubtaskUpdate}
            />
        </div>
    );
}
