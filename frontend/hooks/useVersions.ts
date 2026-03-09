'use client';

import { useState, useEffect, useCallback } from 'react';
import { versionService } from '@/lib/api/submission-services';
import type { SubmissionVersion, AsyncState } from '@/types/submission.types';

// ─── useVersions — list all version headers (no answer detail) ───────────────

export function useVersions(submissionId: string | null) {
    const [state, setState] = useState<AsyncState<SubmissionVersion[]>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        if (!submissionId) return;
        setState({ data: null, loading: true, error: null });
        try {
            const data = await versionService.getVersions(submissionId);
            // Already returned newest-first from backend; sort defensively
            const sorted = [...data].sort((a, b) => b.versionNumber - a.versionNumber);
            setState({ data: sorted, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load versions',
            });
        }
    }, [submissionId]);

    useEffect(() => { fetch(); }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useLatestVersion — full detail (with answers) ───────────────────────────

export function useLatestVersion(submissionId: string | null) {
    const [state, setState] = useState<AsyncState<SubmissionVersion>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        if (!submissionId) return;
        setState({ data: null, loading: true, error: null });
        try {
            const data = await versionService.getLatestVersion(submissionId);
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load latest version',
            });
        }
    }, [submissionId]);

    useEffect(() => { fetch(); }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useVersion — single version full detail ─────────────────────────────────

export function useVersion(submissionId: string | null, versionId: string | null) {
    const [state, setState] = useState<AsyncState<SubmissionVersion>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        if (!submissionId || !versionId) return;
        setState({ data: null, loading: true, error: null });
        try {
            const data = await versionService.getVersion(submissionId, versionId);
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load version',
            });
        }
    }, [submissionId, versionId]);

    useEffect(() => { fetch(); }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useDownloadVersion — stub (no file downloads in text-only system) ───────

export function useDownloadVersion() {
    const downloadVersion = useCallback((_versionId: string) => {
        // Text-based submissions have no file downloads.
        // This stub keeps existing call sites from breaking.
        console.warn('[useDownloadVersion] File downloads are not available for text-based submissions.');
    }, []);
    return { downloading: false, error: null as string | null, downloadVersion };
}
