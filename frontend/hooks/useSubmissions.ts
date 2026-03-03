'use client';

import { useState, useEffect, useCallback } from 'react';
import { submissionService } from '@/lib/api/submission-services';
import type {
    Submission,
    CreateSubmissionPayload,
    UpdateSubmissionPayload,
    GradeSubmissionPayload,
    Assignment,
    AsyncState,
    MutationState,
} from '@/types/submission.types';

// ─── Sample fallback data ─────────────────────────────────────
// Used when the external assignments service is unavailable.
// Fields match the Assignment interface and reflect realistic
// module codes from the Smart LMS specializations:
//   IT · SE · DS · CSNE · CS · IM

const _now = Date.now();
const _day = 24 * 60 * 60 * 1000;

const SAMPLE_ASSIGNMENTS: Assignment[] = [
    {
        id: 'sample-asg-001',
        title: 'Software Requirements Analysis',
        description: 'Analyze and document software requirements for a library management system using UML diagrams.',
        moduleCode: 'SE3020',
        moduleName: 'Software Engineering',
        dueDate: new Date(_now + 7 * _day).toISOString(),
        totalMarks: 100,
        status: 'OPEN',
        submissionsCount: 12,
    },
    {
        id: 'sample-asg-002',
        title: 'Database Design Project',
        description: 'Design a normalized ER schema for an e-commerce platform and implement it in MySQL.',
        moduleCode: 'IT3040',
        moduleName: 'Database Management Systems',
        dueDate: new Date(_now + 14 * _day).toISOString(),
        totalMarks: 50,
        status: 'OPEN',
        submissionsCount: 8,
    },
    {
        id: 'sample-asg-003',
        title: 'Machine Learning Model Evaluation',
        description: 'Implement and compare two classification models on the provided dataset. Include a written analysis.',
        moduleCode: 'DS3010',
        moduleName: 'Data Science Fundamentals',
        dueDate: new Date(_now + 3 * _day).toISOString(),
        totalMarks: 75,
        status: 'OPEN',
        submissionsCount: 5,
    },
    {
        id: 'sample-asg-004',
        title: 'Network Security Audit Report',
        description: 'Conduct a basic security audit on the given network topology and propose mitigations for identified vulnerabilities.',
        moduleCode: 'CSNE3030',
        moduleName: 'Computer Networks & Security',
        dueDate: new Date(_now + 21 * _day).toISOString(),
        totalMarks: 60,
        status: 'OPEN',
        submissionsCount: 15,
    },
    {
        id: 'sample-asg-005',
        title: 'Information Systems Strategy',
        description: 'Develop a 5-year IT strategy plan for a medium-sized retail company.',
        moduleCode: 'IM3050',
        moduleName: 'Information Management',
        dueDate: new Date(_now - 2 * _day).toISOString(), // overdue
        totalMarks: 80,
        status: 'CLOSED',
        submissionsCount: 20,
    },
];

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

// ─── useAllSubmissions (lecturer view) ───────────────────────

export function useAllSubmissions(params?: {
    assignmentId?: string;
    status?: string;
}) {
    const assignmentId = params?.assignmentId;
    const status = params?.status;

    const [state, setState] = useState<AsyncState<Submission[]>>({
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
                const raw = await submissionService.getAllSubmissions(
                    assignmentId || status ? { assignmentId, status } : undefined
                );
                // Handle both paged and array responses
                const data = Array.isArray(raw) ? raw : (raw as { content: Submission[] }).content;
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
    }, [assignmentId, status, trigger]);

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

// ─── useAssignments ───────────────────────────────────────────

export function useAssignments(params?: { status?: string; moduleCode?: string }) {
    const status = params?.status;
    const moduleCode = params?.moduleCode;

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
                const data = await submissionService.getAssignments(
                    status || moduleCode ? { status, moduleCode } : undefined
                );
                if (!cancelled) setState({ data, loading: false, error: null });
            } catch {
                // External assignments API — fall back to sample data silently
                console.warn('[useAssignments] API unavailable, using sample data');
                if (!cancelled) {
                    let fallback = SAMPLE_ASSIGNMENTS;
                    if (status)     fallback = fallback.filter((a) => a.status === status);
                    if (moduleCode) fallback = fallback.filter((a) => a.moduleCode === moduleCode);
                    setState({ data: fallback, loading: false, error: null });
                }
            }
        }

        load();
        return () => { cancelled = true; };
    }, [status, moduleCode, trigger]);

    const refetch = useCallback(() => setTrigger((t) => t + 1), []);
    return { ...state, refetch };
}
