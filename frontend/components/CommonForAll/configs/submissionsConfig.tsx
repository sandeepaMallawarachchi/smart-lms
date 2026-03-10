import React from 'react';
import {
    LayoutDashboard,
    FileText,
    Upload,
    Clock,
    AlertCircle,
    CheckCircle2,
    Star,
    Shield,
    GitBranch,
    Eye,
    TrendingUp,
    Settings,
    Plus,
    MessageSquare,
    Award,
    BarChart3,
    FileEdit,
    History,
    Bell,
    BookOpen,
    Target,
} from 'lucide-react';

interface SubSection {
    id: string;
    label: string;
    badge?: number;
    href?: string;
}

interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    description?: string;
    badge?: number | string;
    href?: string;
    subsections?: SubSection[];
}

interface Notification {
    id: number;
    message: string;
    time: string;
    type: 'alert' | 'warning' | 'info' | 'success';
    icon: React.ComponentType<never>;
}

interface SidebarConfig {
    roleLabel?: string;
    showStats?: boolean;
    stats?: {
        total: number;
        dueSoon: number;
    };
    navItems: NavItem[];
    showTip?: boolean;
    tipContent?: {
        title: string;
        description: string;
    };
}

interface HeaderConfig {
    courseCode: string;
    courseName: string;
    searchPlaceholder: string;
    avatarColor: string;
    primaryColor: string;
    notifications: Notification[];
    showPendingTasks?: boolean;
    pendingTasksCount?: number;
}

interface ModuleConfig {
    header: HeaderConfig;
    sidebar: SidebarConfig;
}

export const submissionsConfig: Record<'student' | 'lecture', ModuleConfig> = {
    student: {
        header: {
            courseCode: 'SUBMISSIONS',
            courseName: 'Smart Submission System',
            searchPlaceholder: 'Search assignments, submissions, feedback...',
            avatarColor: 'from-purple-500 to-purple-600',
            primaryColor: 'purple',
            showPendingTasks: true,
            pendingTasksCount: 3,
            notifications: [
                {
                    id: 1,
                    message: 'New assignment "Database Design" posted',
                    time: '2 hours ago',
                    type: 'info',
                    icon: FileText,
                },
                {
                    id: 2,
                    message: 'Submission deadline in 24 hours for "Software Engineering Essay"',
                    time: '1 hour ago',
                    type: 'warning',
                    icon: Clock,
                },
                {
                    id: 3,
                    message: 'Your "Python Programming" assignment has been graded',
                    time: '30 minutes ago',
                    type: 'success',
                    icon: CheckCircle2,
                },
                {
                    id: 4,
                    message: 'New AI feedback available for your latest submission',
                    time: '15 minutes ago',
                    type: 'info',
                    icon: Star,
                },
            ],
        },
        sidebar: {
            roleLabel: 'Student',
            showStats: true,
            stats: {
                total: 0,
                dueSoon: 0,
            },
            navItems: [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: <LayoutDashboard size={20} />,
                    description: 'Overview and stats',
                    href: '/submissions/student',
                },
                {
                    id: 'my-assignments',
                    label: 'My Assignments',
                    icon: <FileText size={20} />,
                    description: 'All assignments & submissions',
                    href: '/submissions/student/my-submissions',
                },
                {
                    id: 'analytics',
                    label: 'My Performance',
                    icon: <TrendingUp size={20} />,
                    description: 'Grades and progress',
                    href: '/submissions/student/analytics',
                },
                {
                    id: 'guidelines',
                    label: 'Guidelines',
                    icon: <BookOpen size={20} />,
                    description: 'Academic integrity',
                    href: '/submissions/student/guidelines',
                },
            ],
            showTip: true,
            tipContent: {
                title: 'Smart Tip',
                description: 'Always run the plagiarism check before final submission. Each version is automatically saved with feedback and plagiarism reports.',
            },
        },
    },
    lecture: {
        header: {
            courseCode: 'SUBMISSIONS',
            courseName: 'Smart Submission System - Lecturer',
            searchPlaceholder: 'Search submissions, students, assignments...',
            avatarColor: 'from-blue-500 to-blue-600',
            primaryColor: 'blue',
            showPendingTasks: true,
            pendingTasksCount: 23,
            notifications: [
                {
                    id: 1,
                    message: '23 new submissions awaiting review',
                    time: '1 hour ago',
                    type: 'info',
                    icon: FileText,
                },
                {
                    id: 2,
                    message: '8 submissions flagged for high plagiarism',
                    time: '30 minutes ago',
                    type: 'alert',
                    icon: Shield,
                },
                {
                    id: 3,
                    message: 'Student "Alice Johnson" submitted Version 5',
                    time: '15 minutes ago',
                    type: 'success',
                    icon: GitBranch,
                },
                {
                    id: 4,
                    message: 'Assignment "Database Design" deadline in 2 days',
                    time: '10 minutes ago',
                    type: 'warning',
                    icon: Clock,
                },
            ],
        },
        sidebar: {
            roleLabel: 'Lecturer',
            navItems: [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: <LayoutDashboard size={22} />,
                    description: 'Overview of all activities',
                    href: '/submissions/lecturer',
                },
                // {
                //     id: 'create-assignment',
                //     label: 'Create Assignment',
                //     icon: <Plus size={22} />,
                //     description: 'New assignment',
                //     href: '/submissions/lecturer/assignments/create',
                // },
                {
                    id: 'submissions',
                    label: 'All Submissions',
                    icon: <FileText size={22} />,
                    description: 'Student submissions',
                    href: '/submissions/lecturer/submissions',
                },
                {
                    id: 'analytics',
                    label: 'Analytics',
                    icon: <BarChart3 size={22} />,
                    description: 'Performance insights',
                    href: '/submissions/lecturer/analytics',
                },
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: <Settings size={22} />,
                    description: 'Configure system',
                    href: '/submissions/lecturer/settings',
                },
            ],
            showTip: true,
            tipContent: {
                title: 'Pro Tip',
                description: 'Use AI-assisted grading to speed up the review process. You can always modify or add to the AI-generated feedback before publishing.',
            },
        },
    },
};
