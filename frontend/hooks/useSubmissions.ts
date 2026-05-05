'use client';

import { useState, useEffect, useCallback } from 'react';
import { submissionService, projectsAndTasksService } from '@/lib/api/submission-services';
import type {
    Submission,
    CreateSubmissionPayload,
    UpdateSubmissionPayload,
    GradeSubmissionPayload,
    Assignment,
    AsyncState,
    MutationState,
} from '@/types/submission.types';

// ─── useSubmissions (list for a student) ─────────────────────

export function useSubmissions(studentId: string | null) {
    const [state, setState] = useState<AsyncState<Submission[]>>({
        data: null,
        loading: false,
        error: null,
    });
    const [trigger, setTrigger] = useState(0);

    useEffect(() => {
        if (!studentId) return;
        let cancelled = false;

        async function load() {
            setState({ data: null, loading: true, error: null });
            try {
                const data = await submissionService.getStudentSubmissions(studentId!);
                if (!cancelled) setState({ data, loading: false, error: null });
            } catch (err) {
                if (!cancelled) setState({
                    data: null,
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed to load submissions',
                });
            }
        }

        load();
        return () => { cancelled = true; };
    }, [studentId, trigger]);

    const refetch = useCallback(() => setTrigger((t) => t + 1), []);
    return { ...state, refetch };
}

// ─── useAllSubmissions (lecturer view, paginated) ────────────

export interface AllSubmissionsState {
    data: Submission[] | null;
    loading: boolean;
    error: string | null;
    totalPages: number;
    totalElements: number;
}

export function useAllSubmissions(params?: {
    assignmentId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
}) {
    const assignmentId = params?.assignmentId;
    const status = params?.status;
    const page = params?.page ?? 0;
    const pageSize = params?.pageSize ?? 15;

    const [state, setState] = useState<AllSubmissionsState>({
        data: null,
        loading: false,
        error: null,
        totalPages: 0,
        totalElements: 0,
    });
    const [trigger, setTrigger] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setState((prev) => ({ ...prev, data: null, loading: true, error: null }));
            try {
                const raw = await submissionService.getAllSubmissions(
                    assignmentId || status
                        ? { assignmentId, status }
                        : { page, size: pageSize }
                );
                if (cancelled) return;

                // Handle ApiResponse<List>, paged, and direct array responses
                let data: Submission[];
                let totalPages = 0;
                let totalElements = 0;

                if (Array.isArray(raw)) {
                    data = raw;
                } else {
                    const obj = raw as unknown as Record<string, unknown>;
                    if (Array.isArray(obj.data)) {
                        // ApiResponse<List> → { data: Submission[] }
                        data = obj.data as Submission[];
                    } else if (obj.data && typeof obj.data === 'object') {
                        // Paged inside ApiResponse → { data: { content, totalPages, totalElements } }
                        const paged = obj.data as Record<string, unknown>;
                        data         = (paged.content as Submission[]) ?? [];
                        totalPages   = (paged.totalPages   as number) ?? 0;
                        totalElements= (paged.totalElements as number) ?? 0;
                    } else {
                        data = (obj.content as Submission[]) ?? [];
                    }
                }

                setState({ data, loading: false, error: null, totalPages, totalElements });
            } catch (err) {
                if (!cancelled) setState({
                    data: null,
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed to load submissions',
                    totalPages: 0,
                    totalElements: 0,
                });
            }
        }

        load();
        return () => { cancelled = true; };
    }, [assignmentId, status, page, pageSize, trigger]);

    const refetch = useCallback(() => setTrigger((t) => t + 1), []);
    return { ...state, refetch };
}

// ─── useSubmission (single) ───────────────────────────────────

export function useSubmission(id: string | null) {
    const [state, setState] = useState<AsyncState<Submission>>({
        data: null,
        loading: false,
        error: null,
    });
    const [trigger, setTrigger] = useState(0);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        async function load() {
            setState({ data: null, loading: true, error: null });
            try {
                const data = await submissionService.getSubmission(id!);
                if (!cancelled) setState({ data, loading: false, error: null });
            } catch (err) {
                if (!cancelled) setState({
                    data: null,
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed to load submission',
                });
            }
        }

        load();
        return () => { cancelled = true; };
    }, [id, trigger]);

    const refetch = useCallback(() => setTrigger((t) => t + 1), []);
    return { ...state, refetch };
}

// ─── useCreateSubmission ──────────────────────────────────────

export function useCreateSubmission() {
    const [state, setState] = useState<MutationState>({
        loading: false,
        error: null,
        success: false,
    });

    const createSubmission = useCallback(
        async (payload: CreateSubmissionPayload): Promise<Submission | null> => {
            setState({ loading: true, error: null, success: false });
            try {
                const result = await submissionService.createSubmission(payload);
                setState({ loading: false, error: null, success: true });
                return result;
            } catch (err) {
                setState({
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed to create submission',
                    success: false,
                });
                return null;
            }
        },
        []
    );

    const reset = useCallback(() => {
        setState({ loading: false, error: null, success: false });
    }, []);

    return { ...state, createSubmission, reset };
}

// ─── useUpdateSubmission ──────────────────────────────────────

export function useUpdateSubmission() {
    const [state, setState] = useState<MutationState>({
        loading: false,
        error: null,
        success: false,
    });

    const updateSubmission = useCallback(
        async (id: string, payload: UpdateSubmissionPayload): Promise<Submission | null> => {
            setState({ loading: true, error: null, success: false });
            try {
                const result = await submissionService.updateSubmission(id, payload);
                setState({ loading: false, error: null, success: true });
                return result;
            } catch (err) {
                setState({
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed to update submission',
                    success: false,
                });
                return null;
            }
        },
        []
    );

    return { ...state, updateSubmission };
}

// ─── useSubmitSubmission ──────────────────────────────────────

export function useSubmitSubmission() {
    const [state, setState] = useState<MutationState>({
        loading: false,
        error: null,
        success: false,
    });

    const submitSubmission = useCallback(async (id: string): Promise<Submission | null> => {
        setState({ loading: true, error: null, success: false });
        try {
            const result = await submissionService.submitSubmission(id);
            setState({ loading: false, error: null, success: true });
            return result;
        } catch (err) {
            setState({
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to submit',
                success: false,
            });
            return null;
        }
    }, []);

    const reset = useCallback(() => {
        setState({ loading: false, error: null, success: false });
    }, []);

    return { ...state, submitSubmission, reset };
}

// ─── useUploadFile ────────────────────────────────────────────

export interface UploadProgress {
    fileName: string;
    progress: number;   // 0-100
    status: 'pending' | 'uploading' | 'done' | 'error';
    error?: string;
}

export function useUploadFiles() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<UploadProgress[]>([]);

    const uploadFiles = useCallback(
        async (submissionId: string, files: File[]): Promise<Submission | null> => {
            setUploading(true);
            setError(null);
            setProgress(files.map((f) => ({ fileName: f.name, progress: 0, status: 'uploading' })));

            try {
                const result = await submissionService.uploadFiles(submissionId, files);
                setProgress(files.map((f) => ({ fileName: f.name, progress: 100, status: 'done' })));
                setUploading(false);
                return result;
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Upload failed';
                setError(msg);
                setProgress((p) => p.map((item) => ({ ...item, status: 'error', error: msg })));
                setUploading(false);
                return null;
            }
        },
        []
    );

    const reset = useCallback(() => {
        setUploading(false);
        setError(null);
        setProgress([]);
    }, []);

    return { uploading, error, progress, uploadFiles, reset };
}

// ─── useGradeSubmission (lecturer) ───────────────────────────

export function useGradeSubmission() {
    const [state, setState] = useState<MutationState>({
        loading: false,
        error: null,
        success: false,
    });

    const gradeSubmission = useCallback(
        async (id: string, payload: GradeSubmissionPayload): Promise<Submission | null> => {
            setState({ loading: true, error: null, success: false });
            try {
                const result = await submissionService.gradeSubmission(id, payload);
                setState({ loading: false, error: null, success: true });
                return result;
            } catch (err) {
                setState({
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed to submit grade',
                    success: false,
                });
                return null;
            }
        },
        []
    );

    return { ...state, gradeSubmission };
}

// ─── Assignment cache (module-level, survives remounts, TTL = 5 min) ─────────

const ASSIGNMENT_CACHE_TTL_MS = 5 * 60 * 1000;

interface AssignmentCacheEntry {
    data: Assignment[];
    fetchedAt: number;
}

const assignmentCache = new Map<string, AssignmentCacheEntry>();

function makeAssignmentCacheKey(
    role: string | null,
    status: string | undefined,
    moduleCode: string | undefined,
    lecturerId: string | undefined,
    courseId: string | undefined,
    jwtUserId: string | null,
): string {
    return [role, status, moduleCode, lecturerId, courseId, jwtUserId]
        .map((v) => v ?? '')
        .join('|');
}

// ─── useAssignments ───────────────────────────────────────────

export function useAssignments(params?: {
    status?: string;
    moduleCode?: string;
    /** Lecturer-only: required by the lecturer project/task endpoints */
    lecturerId?: string;
    courseId?: string;
}) {
    const status     = params?.status;
    const moduleCode = params?.moduleCode;
    const lecturerId = params?.lecturerId;
    const courseId   = params?.courseId;

    const [state, setState] = useState<AsyncState<Assignment[]>>({
        data: null,
        loading: false,
        error: null,
    });
    const [trigger, setTrigger] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setState({ data: null, loading: true, error: null });
            try {
                const role = typeof window !== 'undefined'
                    ? localStorage.getItem('userRole')
                    : null;
                const token = typeof window !== 'undefined'
                    ? localStorage.getItem('authToken')
                    : null;

                // Extract userId from JWT (used as lecturerId for lecturer endpoints)
                let jwtUserId: string | null = null;
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        jwtUserId = payload.userId ?? payload.sub ?? null;
                    } catch { /* ignore */ }
                }

                // Check module-level cache before hitting any API.
                const cacheKey = makeAssignmentCacheKey(role, status, moduleCode, lecturerId, courseId, jwtUserId);
                const cached = assignmentCache.get(cacheKey);
                if (cached && Date.now() - cached.fetchedAt < ASSIGNMENT_CACHE_TTL_MS) {
                    if (!cancelled) setState({ data: cached.data, loading: false, error: null });
                    return;
                }

                let data: Assignment[];

                if (role === 'student') {
                    // Student: fetch projects + tasks in parallel from student-specific endpoints.
                    // Use allSettled so one endpoint failing doesn't wipe out the other.
                    const [projectsResult, tasksResult] = await Promise.allSettled([
                        projectsAndTasksService.getStudentProjects(),
                        projectsAndTasksService.getStudentTasks(),
                    ]);
                    const projects = projectsResult.status === 'fulfilled' ? projectsResult.value : [];
                    const tasks    = tasksResult.status    === 'fulfilled' ? tasksResult.value    : [];
                    if (projectsResult.status === 'rejected') {
                        console.error('[useAssignments] getStudentProjects failed:', projectsResult.reason);
                    }
                    if (tasksResult.status === 'rejected') {
                        console.error('[useAssignments] getStudentTasks failed:', tasksResult.reason);
                    }
                    data = [...projects, ...tasks];

                } else if (role === 'lecture') {
                    // Lecturer: resolve lecturerId from param or JWT
                    const resolvedLecturerId = lecturerId ?? jwtUserId;

                    if (resolvedLecturerId && courseId) {
                        // Explicit courseId provided — fetch just that course
                        const [projects, tasks] = await Promise.all([
                            projectsAndTasksService.getLecturerProjects(courseId, resolvedLecturerId),
                            projectsAndTasksService.getLecturerTasks(courseId, resolvedLecturerId),
                        ]);
                        data = [...projects, ...tasks];

                    } else if (resolvedLecturerId) {
                        // No explicit courseId — auto-fetch all courses for this lecturer
                        const coursesRes = await fetch('/api/lecturer/courses', {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                        });

                        if (coursesRes.ok) {
                            const json = await coursesRes.json();
                            const courses: Array<{ _id: unknown }> = json.data?.courses ?? [];

                            // Fetch projects + tasks for every course in parallel
                            const allResults = await Promise.all(
                                courses.map(async (c) => {
                                    const cid = String(
                                        c._id && typeof c._id === 'object'
                                            ? (c._id as { toString(): string }).toString()
                                            : c._id
                                    );
                                    try {
                                        const [p, t] = await Promise.all([
                                            projectsAndTasksService.getLecturerProjects(cid, resolvedLecturerId),
                                            projectsAndTasksService.getLecturerTasks(cid, resolvedLecturerId),
                                        ]);
                                        return [...p, ...t] as Assignment[];
                                    } catch {
                                        return [] as Assignment[];
                                    }
                                })
                            );
                            data = allResults.flat();
                        } else {
                            // Courses endpoint failed — fall back to legacy
                            data = await submissionService.getAssignments(
                                status || moduleCode ? { status, moduleCode } : undefined
                            );
                        }

                    } else {
                        // No userId available — legacy fallback
                        data = await submissionService.getAssignments(
                            status || moduleCode ? { status, moduleCode } : undefined
                        );
                    }

                } else {
                    // Unknown role — try legacy assignments endpoint (port 8081)
                    data = await submissionService.getAssignments(
                        status || moduleCode ? { status, moduleCode } : undefined
                    );
                }

                // Apply optional client-side filters
                if (status)     data = data.filter((a) => a.status === status);
                if (moduleCode) data = data.filter((a) => a.moduleCode === moduleCode);

                // Populate cache for subsequent mounts within the TTL window.
                assignmentCache.set(cacheKey, { data, fetchedAt: Date.now() });

                if (!cancelled) setState({ data, loading: false, error: null });
            } catch (err) {
                console.error('[useAssignments] Failed to load assignments:', err);
                if (!cancelled) setState({
                    data: [],
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed to load assignments',
                });
            }
        }

        load();
        return () => { cancelled = true; };
    }, [status, moduleCode, lecturerId, courseId, trigger]);

    const refetch = useCallback(() => {
        // Invalidate all cache entries so the next load hits the network.
        assignmentCache.clear();
        setTrigger((t) => t + 1);
    }, []);
    return { ...state, refetch };
}
