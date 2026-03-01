'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { plagiarismService } from '@/lib/api/submission-services';
import type {
    PlagiarismReport,
    CheckPlagiarismPayload,
    UpdatePlagiarismReviewPayload,
    AsyncState,
    MutationState,
} from '@/types/submission.types';

// ─── usePlagiarismReport ──────────────────────────────────────

export function usePlagiarismReport(submissionId: string | null) {
    const [state, setState] = useState<AsyncState<PlagiarismReport>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        if (!submissionId) return;
        setState({ data: null, loading: true, error: null });
        try {
            const data = await plagiarismService.getReport(submissionId);
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load plagiarism report',
            });
        }
    }, [submissionId]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useAllPlagiarismReports (lecturer) ──────────────────────

export function useAllPlagiarismReports(params?: {
    minScore?: number;
    reviewStatus?: string;
    assignmentId?: string;
}) {
    const [state, setState] = useState<AsyncState<PlagiarismReport[]>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        setState({ data: null, loading: true, error: null });
        try {
            const data = await plagiarismService.getAllReports(params);
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load plagiarism reports',
            });
        }
    }, [params?.minScore, params?.reviewStatus, params?.assignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useCheckPlagiarism (with polling) ───────────────────────

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

export function useCheckPlagiarism() {
    const [state, setState] = useState<MutationState>({
        loading: false,
        error: null,
        success: false,
    });
    const [report, setReport] = useState<PlagiarismReport | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const attemptsRef = useRef(0);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        attemptsRef.current = 0;
    }, []);

    const pollStatus = useCallback(
        (reportId: string) => {
            pollRef.current = setInterval(async () => {
                attemptsRef.current += 1;
                try {
                    const status = await plagiarismService.getCheckStatus(reportId);

                    if (status.status === 'COMPLETED') {
                        stopPolling();
                        const full = await plagiarismService.getReportById(reportId);
                        setReport(full);
                        setState({ loading: false, error: null, success: true });
                    } else if (status.status === 'FAILED') {
                        stopPolling();
                        setState({
                            loading: false,
                            error: 'Plagiarism check failed. Please try again.',
                            success: false,
                        });
                    } else if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
                        stopPolling();
                        setState({
                            loading: false,
                            error: 'Check timed out. The report will be available shortly.',
                            success: false,
                        });
                    }
                } catch {
                    stopPolling();
                    setState({
                        loading: false,
                        error: 'Connection error during plagiarism check.',
                        success: false,
                    });
                }
            }, POLL_INTERVAL_MS);
        },
        [stopPolling]
    );

    const checkPlagiarism = useCallback(
        async (payload: CheckPlagiarismPayload): Promise<void> => {
            stopPolling();
            setReport(null);
            setState({ loading: true, error: null, success: false });

            try {
                const result = await plagiarismService.checkPlagiarism(payload);

                if (result.status === 'COMPLETED') {
                    setReport(result);
                    setState({ loading: false, error: null, success: true });
                } else {
                    pollStatus(result.id);
                }
            } catch (err) {
                setState({
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed to start plagiarism check',
                    success: false,
                });
            }
        },
        [pollStatus, stopPolling]
    );

    useEffect(() => () => stopPolling(), [stopPolling]);

    const reset = useCallback(() => {
        stopPolling();
        setReport(null);
        setState({ loading: false, error: null, success: false });
    }, [stopPolling]);

    return { ...state, report, checkPlagiarism, reset };
}

// ─── useUpdatePlagiarismReview (lecturer) ────────────────────

export function useUpdatePlagiarismReview() {
    const [state, setState] = useState<MutationState>({
        loading: false,
        error: null,
        success: false,
    });

    const updateReview = useCallback(
        async (
            reportId: string,
            payload: UpdatePlagiarismReviewPayload
        ): Promise<PlagiarismReport | null> => {
            setState({ loading: true, error: null, success: false });
            try {
                const result = await plagiarismService.updateReview(reportId, payload);
                setState({ loading: false, error: null, success: true });
                return result;
            } catch (err) {
                setState({
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed to update review',
                    success: false,
                });
                return null;
            }
        },
        []
    );

    return { ...state, updateReview };
}
