'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { feedbackService } from '@/lib/api/submission-services';
import type { Feedback, GenerateFeedbackPayload, AsyncState, MutationState } from '@/types/submission.types';

// ─── useFeedback ──────────────────────────────────────────────

export function useFeedback(submissionId: string | null) {
    const [state, setState] = useState<AsyncState<Feedback>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        if (!submissionId) return;
        setState({ data: null, loading: true, error: null });
        try {
            const data = await feedbackService.getFeedback(submissionId);
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load feedback',
            });
        }
    }, [submissionId]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useAllFeedback (across versions) ────────────────────────

export function useAllFeedback(submissionId: string | null) {
    const [state, setState] = useState<AsyncState<Feedback[]>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        if (!submissionId) return;
        setState({ data: null, loading: true, error: null });
        try {
            const data = await feedbackService.getAllFeedbackForSubmission(submissionId);
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load feedback history',
            });
        }
    }, [submissionId]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useGenerateFeedback (with polling) ──────────────────────

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20; // ~60 seconds

export function useGenerateFeedback() {
    const [state, setState] = useState<MutationState>({
        loading: false,
        error: null,
        success: false,
    });
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const attemptsRef = useRef(0);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        attemptsRef.current = 0;
    }, []);

    const pollStatus = useCallback((feedbackId: string) => {
        pollRef.current = setInterval(async () => {
            attemptsRef.current += 1;

            try {
                const status = await feedbackService.getFeedbackStatus(feedbackId);

                if (status.status === 'COMPLETED') {
                    stopPolling();
                    const full = await feedbackService.getFeedbackById(feedbackId);
                    setFeedback(full);
                    setState({ loading: false, error: null, success: true });
                } else if (status.status === 'FAILED') {
                    stopPolling();
                    setState({
                        loading: false,
                        error: 'AI feedback generation failed. Please try again.',
                        success: false,
                    });
                } else if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
                    stopPolling();
                    setState({
                        loading: false,
                        error: 'Feedback generation timed out. Please check back later.',
                        success: false,
                    });
                }
                // still PROCESSING — keep polling
            } catch {
                stopPolling();
                setState({
                    loading: false,
                    error: 'Lost connection while waiting for feedback.',
                    success: false,
                });
            }
        }, POLL_INTERVAL_MS);
    }, [stopPolling]);

    const generateFeedback = useCallback(
        async (payload: GenerateFeedbackPayload): Promise<void> => {
            stopPolling();
            setFeedback(null);
            setState({ loading: true, error: null, success: false });

            try {
                const result = await feedbackService.generateFeedback(payload);

                if (result.status === 'COMPLETED') {
                    // Already done synchronously
                    setFeedback(result);
                    setState({ loading: false, error: null, success: true });
                } else {
                    // Start polling for async completion
                    pollStatus(result.id);
                }
            } catch (err) {
                setState({
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed to generate feedback',
                    success: false,
                });
            }
        },
        [pollStatus, stopPolling]
    );

    // Cleanup on unmount
    useEffect(() => () => stopPolling(), [stopPolling]);

    const reset = useCallback(() => {
        stopPolling();
        setFeedback(null);
        setState({ loading: false, error: null, success: false });
    }, [stopPolling]);

    return { ...state, feedback, generateFeedback, reset };
}
