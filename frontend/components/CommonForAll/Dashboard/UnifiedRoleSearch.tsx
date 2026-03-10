'use client';

import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CalendarDays,
  FileText,
  FolderKanban,
  GraduationCap,
  LineChart,
  Search,
} from 'lucide-react';

type UserRole = 'student' | 'lecture' | 'superadmin';

interface StudentCourse {
  _id: string;
  courseName: string;
  courseCode?: string;
  year?: number;
  semester?: number;
}

interface SearchableWorkItem {
  _id: string;
  title: string;
  deadlineDate?: string;
  deadlineTime?: string;
  course?: StudentCourse;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  href: string;
  category: 'Page' | 'Course' | 'Project' | 'Task' | 'User' | 'Approval';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  keywords: string[];
  courseId?: string;
  score?: number;
}

interface UnifiedRoleSearchProps {
  userRole: UserRole;
  placeholder: string;
  selectedStudentCourse?: StudentCourse | null;
  selectedLecturerCourse?: StudentCourse | null;
}

interface AdminSearchUser {
  _id: string;
  name: string;
  email: string;
  userType: 'student' | 'lecturer';
  studentIdNumber?: string;
  position?: string;
  isVerified?: boolean;
}

interface AdminSearchCourse {
  _id: string;
  courseName: string;
  year?: number;
  semester?: number;
  credits?: number;
  isArchived?: boolean;
}

const studentPageResults: SearchResult[] = [
  {
    id: 'student-projects-dashboard',
    title: 'Projects & Tasks Dashboard',
    description: 'Student overview for project and task progress.',
    href: '/projects-and-tasks/student',
    category: 'Page',
    icon: FolderKanban,
    keywords: ['dashboard', 'projects', 'tasks', 'overview', 'student'],
  },
  {
    id: 'student-kanban',
    title: 'My Project & Tasks',
    description: 'Open your kanban board for active work items.',
    href: '/projects-and-tasks/student/kanban-board',
    category: 'Page',
    icon: FolderKanban,
    keywords: ['kanban', 'board', 'tasks', 'projects', 'todo', 'work'],
  },
  {
    id: 'student-heatmap',
    title: 'Activity Heatmap',
    description: 'See your project and task activity pattern.',
    href: '/projects-and-tasks/student/heatmap',
    category: 'Page',
    icon: CalendarDays,
    keywords: ['activity', 'heatmap', 'engagement', 'timeline'],
  },
  {
    id: 'student-notifications',
    title: 'Notifications & Alerts',
    description: 'Review project and task alerts.',
    href: '/projects-and-tasks/student/notifications',
    category: 'Page',
    icon: FileText,
    keywords: ['notifications', 'alerts', 'reminders', 'messages'],
  },
  {
    id: 'student-submissions-dashboard',
    title: 'Submissions Dashboard',
    description: 'Submission overview and current activity.',
    href: '/submissions/student',
    category: 'Page',
    icon: FileText,
    keywords: ['submissions', 'dashboard', 'feedback', 'submission'],
  },
  {
    id: 'student-my-submissions',
    title: 'My Assignments',
    description: 'Open all assignments and submitted work.',
    href: '/submissions/student/my-submissions',
    category: 'Page',
    icon: FileText,
    keywords: ['assignments', 'submissions', 'coursework', 'upload'],
  },
  {
    id: 'student-submissions-analytics',
    title: 'My Performance',
    description: 'Review grades and submission performance.',
    href: '/submissions/student/analytics',
    category: 'Page',
    icon: LineChart,
    keywords: ['performance', 'grades', 'analytics', 'feedback'],
  },
  {
    id: 'student-guidelines',
    title: 'Guidelines',
    description: 'Check academic integrity and submission guidance.',
    href: '/submissions/student/guidelines',
    category: 'Page',
    icon: BookOpen,
    keywords: ['guidelines', 'integrity', 'policy', 'help'],
  },
  {
    id: 'student-analytics-dashboard',
    title: 'Learning Analytics Dashboard',
    description: 'Overview of your progress and insights.',
    href: '/learning-analytics/student',
    category: 'Page',
    icon: LineChart,
    keywords: ['analytics', 'learning', 'overview', 'dashboard', 'insights'],
  },
  {
    id: 'student-learning-progress',
    title: 'Learning Progress',
    description: 'Track how your learning is moving over time.',
    href: '/learning-analytics/student/learning-progress',
    category: 'Page',
    icon: LineChart,
    keywords: ['learning', 'progress', 'growth', 'tracking'],
  },
  {
    id: 'student-learning-goals',
    title: 'Learning Goals',
    description: 'Open and manage your current goals.',
    href: '/learning-analytics/student/learning-goals',
    category: 'Page',
    icon: GraduationCap,
    keywords: ['goals', 'learning', 'targets', 'planning'],
  },
  {
    id: 'student-reports',
    title: 'My Reports',
    description: 'Access weekly, monthly, and full learning reports.',
    href: '/learning-analytics/student/reports',
    category: 'Page',
    icon: FileText,
    keywords: ['reports', 'weekly', 'monthly', 'analytics', 'download'],
  },
];

const lecturerPageResults: SearchResult[] = [
  {
    id: 'lecturer-projects-dashboard',
    title: 'Lecturer Dashboard',
    description: 'Overview of course workload, at-risk students, and upcoming items.',
    href: '/projects-and-tasks/lecturer',
    category: 'Page',
    icon: FolderKanban,
    keywords: ['dashboard', 'lecturer', 'projects', 'tasks', 'overview'],
  },
  {
    id: 'lecturer-projects-all',
    title: 'All Projects and Tasks',
    description: 'Manage all published and draft projects and tasks.',
    href: '/projects-and-tasks/lecturer/all-projects-and-tasks',
    category: 'Page',
    icon: FolderKanban,
    keywords: ['projects', 'tasks', 'manage', 'all', 'coursework'],
  },
  {
    id: 'lecturer-projects-create',
    title: 'Create Project and Task',
    description: 'Open the creator for new project or task work.',
    href: '/projects-and-tasks/lecturer/create-projects-and-tasks',
    category: 'Page',
    icon: FileText,
    keywords: ['create', 'project', 'task', 'new', 'assignment'],
  },
  {
    id: 'lecturer-teams',
    title: 'Teams',
    description: 'Manage course groups and team setup.',
    href: '/projects-and-tasks/lecturer/teams',
    category: 'Page',
    icon: GraduationCap,
    keywords: ['teams', 'groups', 'students', 'collaboration'],
  },
  {
    id: 'lecturer-pt-reports',
    title: 'Projects & Tasks Reports',
    description: 'Review course-level project and task reporting.',
    href: '/projects-and-tasks/lecturer/reports',
    category: 'Page',
    icon: LineChart,
    keywords: ['reports', 'projects', 'tasks', 'progress', 'export'],
  },
  {
    id: 'lecturer-submissions-dashboard',
    title: 'Submissions Dashboard',
    description: 'Open lecturer submissions overview.',
    href: '/submissions/lecturer',
    category: 'Page',
    icon: FileText,
    keywords: ['submissions', 'dashboard', 'lecturer', 'review'],
  },
  {
    id: 'lecturer-assignments',
    title: 'Manage Assignments',
    description: 'Review and manage created assignments.',
    href: '/submissions/lecturer/assignments',
    category: 'Page',
    icon: FileText,
    keywords: ['assignments', 'manage', 'coursework', 'submissions'],
  },
  {
    id: 'lecturer-submissions',
    title: 'All Submissions',
    description: 'Open student submissions for review.',
    href: '/submissions/lecturer/submissions',
    category: 'Page',
    icon: FileText,
    keywords: ['submissions', 'student work', 'grading', 'review'],
  },
  {
    id: 'lecturer-plagiarism',
    title: 'Plagiarism Detection',
    description: 'Inspect flagged integrity results.',
    href: '/submissions/lecturer/plagiarism',
    category: 'Page',
    icon: BookOpen,
    keywords: ['plagiarism', 'integrity', 'detection', 'flags'],
  },
  {
    id: 'lecturer-submission-analytics',
    title: 'Submission Analytics',
    description: 'Check lecturer-side submission insights.',
    href: '/submissions/lecturer/analytics',
    category: 'Page',
    icon: LineChart,
    keywords: ['analytics', 'submissions', 'performance', 'insights'],
  },
  {
    id: 'lecturer-student-insights-submissions',
    title: 'Student Insights',
    description: 'Inspect student-level submission progress.',
    href: '/submissions/lecturer/students',
    category: 'Page',
    icon: GraduationCap,
    keywords: ['students', 'insights', 'progress', 'performance'],
  },
  {
    id: 'lecturer-analytics-dashboard',
    title: 'Learning Analytics Dashboard',
    description: 'Open lecturer analytics overview.',
    href: '/learning-analytics/lecturer',
    category: 'Page',
    icon: LineChart,
    keywords: ['analytics', 'dashboard', 'learning', 'overview', 'lecturer'],
  },
  {
    id: 'lecturer-class-performance',
    title: 'Class Performance',
    description: 'Review class-level analytics and trends.',
    href: '/learning-analytics/lecturer/class-performance',
    category: 'Page',
    icon: LineChart,
    keywords: ['class performance', 'trends', 'overview', 'scores'],
  },
  {
    id: 'lecturer-analytics-students',
    title: 'Student Insights Analytics',
    description: 'Review student risk and performance breakdowns.',
    href: '/learning-analytics/lecturer/student-insights',
    category: 'Page',
    icon: GraduationCap,
    keywords: ['students', 'risk', 'analytics', 'insights'],
  },
  {
    id: 'lecturer-predictive',
    title: 'Predictive Analytics',
    description: 'Open predictive learning analysis.',
    href: '/learning-analytics/lecturer/predictive',
    category: 'Page',
    icon: LineChart,
    keywords: ['predictive', 'analytics', 'forecast', 'risk'],
  },
  {
    id: 'lecturer-analytics-reports',
    title: 'Learning Analytics Reports',
    description: 'Access class and individual analytics reports.',
    href: '/learning-analytics/lecturer/reports',
    category: 'Page',
    icon: FileText,
    keywords: ['reports', 'analytics', 'class summary', 'export'],
  },
];

const adminPageResults: SearchResult[] = [
  {
    id: 'admin-dashboard',
    title: 'Admin Dashboard',
    description: 'Overview of platform users, approvals, and courses.',
    href: '/admin',
    category: 'Page',
    icon: LineChart,
    keywords: ['admin', 'dashboard', 'system', 'overview'],
  },
  {
    id: 'admin-users',
    title: 'All Users',
    description: 'Manage all student and lecturer accounts.',
    href: '/admin/users',
    category: 'Page',
    icon: GraduationCap,
    keywords: ['users', 'accounts', 'students', 'lecturers', 'manage'],
  },
  {
    id: 'admin-students',
    title: 'Students',
    description: 'View student accounts only.',
    href: '/admin/users?filter=students',
    category: 'Page',
    icon: GraduationCap,
    keywords: ['students', 'accounts', 'users', 'filter'],
  },
  {
    id: 'admin-lecturers',
    title: 'Lecturers',
    description: 'View lecturer accounts only.',
    href: '/admin/users?filter=lecturers',
    category: 'Page',
    icon: GraduationCap,
    keywords: ['lecturers', 'accounts', 'users', 'filter'],
  },
  {
    id: 'admin-pending',
    title: 'Pending Approvals',
    description: 'Open users waiting for approval.',
    href: '/admin/users?filter=pending',
    category: 'Approval',
    icon: FileText,
    keywords: ['pending', 'approvals', 'approve', 'reject', 'verification'],
  },
  {
    id: 'admin-courses',
    title: 'Course Management',
    description: 'Manage active and archived courses.',
    href: '/admin/courses',
    category: 'Page',
    icon: BookOpen,
    keywords: ['courses', 'modules', 'management', 'active', 'archived'],
  },
  {
    id: 'admin-active-courses',
    title: 'Active Courses',
    description: 'View active courses only.',
    href: '/admin/courses?filter=active',
    category: 'Page',
    icon: BookOpen,
    keywords: ['active', 'courses', 'filter'],
  },
  {
    id: 'admin-archived-courses',
    title: 'Archived Courses',
    description: 'View archived courses only.',
    href: '/admin/courses?filter=archived',
    category: 'Page',
    icon: BookOpen,
    keywords: ['archived', 'courses', 'filter'],
  },
];

const getItemDeadlineText = (deadlineDate?: string, deadlineTime?: string) => {
  if (!deadlineDate) {
    return 'No deadline';
  }

  const parsedDate = new Date(`${deadlineDate}T${deadlineTime || '23:59'}`);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'No deadline';
  }

  return `Due ${parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

const buildLiveResults = (
  courses: StudentCourse[],
  projects: SearchableWorkItem[],
  tasks: SearchableWorkItem[],
  role: 'student' | 'lecture',
): SearchResult[] => [
  ...courses.map((course) => ({
    id: `course-${course._id}`,
    title: course.courseName,
    description: `${course.courseCode || 'Course'} • Year ${course.year || '-'} Semester ${course.semester || '-'}`,
    href: role === 'student' ? '/projects-and-tasks/student' : '/projects-and-tasks/lecturer',
    category: 'Course' as const,
    icon: BookOpen,
    keywords: [course.courseName, course.courseCode || '', 'course', 'module', 'class'],
    courseId: course._id,
  })),
  ...projects.map((project) => ({
    id: `project-${project._id}`,
    title: project.title,
    description: `${project.course?.courseCode || project.course?.courseName || 'Project'} • ${getItemDeadlineText(project.deadlineDate, project.deadlineTime)}`,
    href: role === 'student'
      ? '/projects-and-tasks/student/kanban-board'
      : '/projects-and-tasks/lecturer/all-projects-and-tasks',
    category: 'Project' as const,
    icon: FolderKanban,
    keywords: [
      project.title,
      project.course?.courseName || '',
      project.course?.courseCode || '',
      'project',
      'deadline',
    ],
    courseId: project.course?._id,
  })),
  ...tasks.map((task) => ({
    id: `task-${task._id}`,
    title: task.title,
    description: `${task.course?.courseCode || task.course?.courseName || 'Task'} • ${getItemDeadlineText(task.deadlineDate, task.deadlineTime)}`,
    href: role === 'student'
      ? '/projects-and-tasks/student/kanban-board'
      : '/projects-and-tasks/lecturer/all-projects-and-tasks',
    category: 'Task' as const,
    icon: FileText,
    keywords: [
      task.title,
      task.course?.courseName || '',
      task.course?.courseCode || '',
      'task',
      'deadline',
    ],
    courseId: task.course?._id,
  })),
];

const getCategoryPillClasses = (category: SearchResult['category']) => {
  if (category === 'Project') return 'bg-amber-100 text-amber-800';
  if (category === 'Task') return 'bg-blue-100 text-blue-800';
  if (category === 'Course') return 'bg-emerald-100 text-emerald-800';
  if (category === 'User') return 'bg-violet-100 text-violet-800';
  if (category === 'Approval') return 'bg-rose-100 text-rose-800';
  return 'bg-slate-100 text-slate-700';
};

export default function UnifiedRoleSearch({
  userRole,
  placeholder,
  selectedStudentCourse = null,
  selectedLecturerCourse = null,
}: UnifiedRoleSearchProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [studentCourses, setStudentCourses] = useState<StudentCourse[]>([]);
  const [studentProjects, setStudentProjects] = useState<SearchableWorkItem[]>([]);
  const [studentTasks, setStudentTasks] = useState<SearchableWorkItem[]>([]);
  const [lecturerCourses, setLecturerCourses] = useState<StudentCourse[]>([]);
  const [lecturerProjects, setLecturerProjects] = useState<SearchableWorkItem[]>([]);
  const [lecturerTasks, setLecturerTasks] = useState<SearchableWorkItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminSearchUser[]>([]);
  const [adminPendingUsers, setAdminPendingUsers] = useState<AdminSearchUser[]>([]);
  const [adminCourses, setAdminCourses] = useState<AdminSearchCourse[]>([]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (userRole !== 'student' && userRole !== 'lecture' && userRole !== 'superadmin') {
      return undefined;
    }

    let isMounted = true;

    const fetchSearchData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('authToken');
        if (!token) {
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        if (userRole === 'student') {
          const [coursesResponse, projectsResponse, tasksResponse] = await Promise.all([
            fetch('/api/student/get-courses', { headers }),
            fetch('/api/projects-and-tasks/student/projects', { headers }),
            fetch('/api/projects-and-tasks/student/tasks', { headers }),
          ]);

          if (!isMounted) {
            return;
          }

          const [coursesPayload, projectsPayload, tasksPayload] = await Promise.all([
            coursesResponse.ok ? coursesResponse.json() : Promise.resolve(null),
            projectsResponse.ok ? projectsResponse.json() : Promise.resolve(null),
            tasksResponse.ok ? tasksResponse.json() : Promise.resolve(null),
          ]);

          startTransition(() => {
            setStudentCourses(coursesPayload?.data?.courses || []);
            setStudentProjects(
              (projectsPayload?.data?.projects || []).map((project: {
                _id: string;
                projectName: string;
                deadlineDate?: string;
                deadlineTime?: string;
                course?: StudentCourse;
              }) => ({
                _id: project._id,
                title: project.projectName,
                deadlineDate: project.deadlineDate,
                deadlineTime: project.deadlineTime,
                course: project.course,
              }))
            );
            setStudentTasks(
              (tasksPayload?.data?.tasks || []).map((task: {
                _id: string;
                taskName: string;
                deadlineDate?: string;
                deadlineTime?: string;
                course?: StudentCourse;
              }) => ({
                _id: task._id,
                title: task.taskName,
                deadlineDate: task.deadlineDate,
                deadlineTime: task.deadlineTime,
                course: task.course,
              }))
            );
          });
        }

        if (userRole === 'lecture') {
          const coursesResponse = await fetch('/api/lecturer/courses', { headers });
          const coursesPayload = coursesResponse.ok ? await coursesResponse.json() : null;
          const fetchedCourses = coursesPayload?.data?.courses || [];

          let lecturerId = localStorage.getItem('lecturerId');
          if (!lecturerId) {
            const verifyResponse = await fetch('/api/projects-and-tasks/auth/verify', {
              method: 'GET',
              headers,
            });
            if (verifyResponse.ok) {
              const verifyPayload = await verifyResponse.json();
              lecturerId = verifyPayload?.data?.user?._id || '';
              if (lecturerId) {
                localStorage.setItem('lecturerId', lecturerId);
              }
            }
          }

          let projectsPayload = null;
          let tasksPayload = null;
          const activeCourseId = selectedLecturerCourse?._id;

          if (activeCourseId && lecturerId) {
            const query = new URLSearchParams({
              courseId: activeCourseId,
              lecturerId,
            });

            const [projectsResponse, tasksResponse] = await Promise.all([
              fetch(`/api/projects-and-tasks/lecturer/create-projects-and-tasks/project?${query.toString()}`, { headers }),
              fetch(`/api/projects-and-tasks/lecturer/create-projects-and-tasks/task?${query.toString()}`, { headers }),
            ]);

            projectsPayload = projectsResponse.ok ? await projectsResponse.json() : null;
            tasksPayload = tasksResponse.ok ? await tasksResponse.json() : null;
          }

          if (!isMounted) {
            return;
          }

          startTransition(() => {
            setLecturerCourses(fetchedCourses);
            setLecturerProjects(
              (projectsPayload?.data?.projects || []).map((project: {
                _id: string;
                projectName: string;
                deadlineDate?: string;
                deadlineTime?: string;
              }) => ({
                _id: project._id,
                title: project.projectName,
                deadlineDate: project.deadlineDate,
                deadlineTime: project.deadlineTime,
                course: activeCourseId ? {
                  _id: activeCourseId,
                  courseName: selectedLecturerCourse?.courseName || '',
                  courseCode: selectedLecturerCourse?.courseCode,
                  year: selectedLecturerCourse?.year,
                  semester: selectedLecturerCourse?.semester,
                } : undefined,
              }))
            );
            setLecturerTasks(
              (tasksPayload?.data?.tasks || []).map((task: {
                _id: string;
                taskName: string;
                deadlineDate?: string;
                deadlineTime?: string;
              }) => ({
                _id: task._id,
                title: task.taskName,
                deadlineDate: task.deadlineDate,
                deadlineTime: task.deadlineTime,
                course: activeCourseId ? {
                  _id: activeCourseId,
                  courseName: selectedLecturerCourse?.courseName || '',
                  courseCode: selectedLecturerCourse?.courseCode,
                  year: selectedLecturerCourse?.year,
                  semester: selectedLecturerCourse?.semester,
                } : undefined,
              }))
            );
          });
        }

        if (userRole === 'superadmin') {
          const [usersResponse, pendingResponse, coursesResponse] = await Promise.all([
            fetch('/api/admin/users', { headers }),
            fetch('/api/admin/users/pending', { headers }),
            fetch('/api/admin/courses', { headers }),
          ]);

          if (!isMounted) {
            return;
          }

          const [usersPayload, pendingPayload, coursesPayload] = await Promise.all([
            usersResponse.ok ? usersResponse.json() : Promise.resolve(null),
            pendingResponse.ok ? pendingResponse.json() : Promise.resolve(null),
            coursesResponse.ok ? coursesResponse.json() : Promise.resolve(null),
          ]);

          startTransition(() => {
            setAdminUsers(usersPayload?.data?.users || []);
            setAdminPendingUsers(pendingPayload?.data?.pendingUsers || []);
            setAdminCourses(coursesPayload?.data?.courses || []);
          });
        }
      } catch (error) {
        console.error('Failed to fetch header search data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSearchData();

    return () => {
      isMounted = false;
    };
  }, [
    selectedLecturerCourse?._id,
    selectedLecturerCourse?.courseCode,
    selectedLecturerCourse?.courseName,
    selectedLecturerCourse?.semester,
    selectedLecturerCourse?.year,
    userRole,
  ]);

  const adminSearchResults = useMemo<SearchResult[]>(() => [
    ...adminPageResults,
    ...adminUsers.map((user) => ({
      id: `admin-user-${user._id}`,
      title: user.name,
      description: `${user.userType === 'student' ? user.studentIdNumber || 'Student' : user.position || 'Lecturer'} • ${user.email}`,
      href: user.userType === 'student' ? '/admin/users?filter=students' : '/admin/users?filter=lecturers',
      category: 'User' as const,
      icon: GraduationCap,
      keywords: [user.name, user.email, user.studentIdNumber || '', user.position || '', user.userType],
    })),
    ...adminPendingUsers.map((user) => ({
      id: `admin-pending-user-${user._id}`,
      title: user.name,
      description: `Pending ${user.userType} approval • ${user.email}`,
      href: '/admin/users?filter=pending',
      category: 'Approval' as const,
      icon: FileText,
      keywords: [
        user.name,
        user.email,
        user.studentIdNumber || '',
        user.position || '',
        user.userType,
        'pending',
        'approval',
      ],
    })),
    ...adminCourses.map((course) => ({
      id: `admin-course-${course._id}`,
      title: course.courseName,
      description: `Year ${course.year || '-'} Semester ${course.semester || '-'} • ${course.isArchived ? 'Archived' : 'Active'}${course.credits ? ` • ${course.credits} credits` : ''}`,
      href: course.isArchived ? '/admin/courses?filter=archived' : '/admin/courses?filter=active',
      category: 'Course' as const,
      icon: BookOpen,
      keywords: [
        course.courseName,
        String(course.year || ''),
        String(course.semester || ''),
        course.isArchived ? 'archived' : 'active',
        'course',
      ],
    })),
  ], [adminCourses, adminPendingUsers, adminUsers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchIndex = useMemo(() => {
    if (userRole === 'student') {
      return [
        ...studentPageResults,
        ...buildLiveResults(studentCourses, studentProjects, studentTasks, 'student'),
      ];
    }

    if (userRole === 'lecture') {
      return [
        ...lecturerPageResults,
        ...buildLiveResults(lecturerCourses, lecturerProjects, lecturerTasks, 'lecture'),
      ];
    }

    if (userRole === 'superadmin') {
      return adminSearchResults;
    }

    return [];
  }, [
    adminSearchResults,
    lecturerCourses,
    lecturerProjects,
    lecturerTasks,
    studentCourses,
    studentProjects,
    studentTasks,
    userRole,
  ]);

  const results = useMemo(() => {
    if (userRole !== 'student' && userRole !== 'lecture' && userRole !== 'superadmin') {
      return [];
    }

    const normalizedQuery = deferredQuery.trim().toLowerCase();

    const indexedResults = searchIndex.map((item) => {
      const haystack = `${item.title} ${item.description} ${item.keywords.join(' ')}`.toLowerCase();
      let score = 0;

      if (!normalizedQuery) {
        score += item.category === 'Page' ? 40 : 20;
      } else {
        if (item.title.toLowerCase().startsWith(normalizedQuery)) score += 120;
        if (item.title.toLowerCase().includes(normalizedQuery)) score += 80;
        if (haystack.includes(normalizedQuery)) score += 50;
        if (item.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery))) score += 25;
      }

      const activeCourseId = userRole === 'student'
        ? selectedStudentCourse?._id
        : userRole === 'lecture'
          ? selectedLecturerCourse?._id
          : undefined;

      if (activeCourseId && item.courseId === activeCourseId) {
        score += 18;
      }

      return { ...item, score };
    });

    return indexedResults
      .filter((item) => (!normalizedQuery ? true : item.score > 0))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 8);
  }, [deferredQuery, searchIndex, selectedLecturerCourse, selectedStudentCourse, userRole]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [deferredQuery]);

  const handleNavigate = (href: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (!results.length) {
            if (event.key === 'Escape') {
              setIsOpen(false);
            }
            return;
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((prev) => (prev + 1) % results.length);
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length);
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            handleNavigate(results[highlightedIndex].href);
          }

          if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-4 pl-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                {userRole === 'student'
                  ? 'Student Search'
                  : userRole === 'lecture'
                    ? 'Lecturer Search'
                    : 'Admin Search'}
              </p>
              <p className="text-xs text-gray-500">
                {userRole === 'student'
                  ? 'Pages, modules, projects, tasks, and courses'
                  : userRole === 'lecture'
                    ? 'Pages, courses, projects, tasks, and lecturer tools'
                    : 'Pages, users, approvals, and courses'}
              </p>
            </div>
            {isLoading && <span className="text-xs font-medium text-blue-600">Syncing...</span>}
          </div>

          <div className="max-h-[24rem] overflow-y-auto p-2">
            {results.length > 0 ? (
              results.map((result, index) => {
                const Icon = result.icon;

                return (
                  <button
                    key={result.id}
                    onClick={() => handleNavigate(result.href)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                      highlightedIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{result.title}</p>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getCategoryPillClasses(result.category)}`}
                        >
                          {result.category}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{result.description}</p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center">
                <p className="text-sm font-medium text-gray-700">No matches found</p>
                <p className="mt-1 text-xs text-gray-500">
                  {userRole === 'superadmin'
                    ? 'Try a user name, email, course name, or admin page.'
                    : 'Try a course code, page name, task title, or project name.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
