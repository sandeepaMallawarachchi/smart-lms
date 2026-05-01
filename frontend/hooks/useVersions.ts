'use client';

import { useState, useEffect, useCallback } from 'react';
import { versionService } from '@/lib/api/submission-services';
import type { SubmissionVersion, VcsDiffRequest, VcsDiffResponse, AsyncState, MutationState } from '@/types/submission.types';

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

    useEffect(() => { const t = setTimeout(fetch, 0); return () => clearTimeout(t); }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useLatestVersion — full detail (with metadata.answers) ──────────────────

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

    useEffect(() => { const t = setTimeout(fetch, 0); return () => clearTimeout(t); }, [fetch]);

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

    useEffect(() => { const t = setTimeout(fetch, 0); return () => clearTimeout(t); }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useDownloadVersion — triggers a real browser download via VCS ────────────

export function useDownloadVersion() {
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const downloadVersion = useCallback(async (versionId: string) => {
        setDownloading(true);
        setError(null);
        try {
            const { blob, filename } = await versionService.downloadVersion(versionId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Download failed');
        } finally {
            setDownloading(false);
        }
    }, []);

    return { downloading, error, downloadVersion };
}

// ─── useDiffVersions — line-level diff between two VCS versions ───────────────

export function useDiffVersions() {
    const [state, setState] = useState<MutationState & { data: VcsDiffResponse | null }>({
        data: null,
        loading: false,
        error: null,
        success: false,
    });

    const diff = useCallback(async (request: VcsDiffRequest) => {
        setState({ data: null, loading: true, error: null, success: false });
        try {
            const data = await versionService.diffVersions(request);
            setState({ data, loading: false, error: null, success: true });
            return data;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Diff failed';
            setState({ data: null, loading: false, error: msg, success: false });
            return null;
        }
    }, []);

    return { ...state, diff };
}
