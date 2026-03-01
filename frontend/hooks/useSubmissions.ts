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

// ─── useSubmissions (list for a student) ─────────────────────

export function useSubmissions(studentId: string | null) {
    const [state, setState] = useState<AsyncState<Submission[]>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        if (!studentId) return;
        setState({ data: null, loading: true, error: null });
        try {
            const data = await submissionService.getStudentSubmissions(studentId);
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load submissions',
            });
        }
    }, [studentId]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useAllSubmissions (lecturer view) ───────────────────────

export function useAllSubmissions(params?: {
    assignmentId?: string;
    status?: string;
}) {
    const [state, setState] = useState<AsyncState<Submission[]>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        setState({ data: null, loading: true, error: null });
        try {
            const raw = await submissionService.getAllSubmissions(params);
            // Handle both paged and array responses
            const data = Array.isArray(raw) ? raw : (raw as { content: Submission[] }).content;
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load submissions',
            });
        }
    }, [params?.assignmentId, params?.status]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useSubmission (single) ───────────────────────────────────

export function useSubmission(id: string | null) {
    const [state, setState] = useState<AsyncState<Submission>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        if (!id) return;
        setState({ data: null, loading: true, error: null });
        try {
            const data = await submissionService.getSubmission(id);
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load submission',
            });
        }
    }, [id]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
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
    const [state, setState] = useState<AsyncState<Assignment[]>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        setState({ data: null, loading: true, error: null });
        try {
            const data = await submissionService.getAssignments(params);
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load assignments',
            });
        }
    }, [params?.status, params?.moduleCode]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
}
