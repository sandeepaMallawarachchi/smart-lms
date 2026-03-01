'use client';

import { useState, useEffect, useCallback } from 'react';
import { versionService } from '@/lib/api/submission-services';
import type {
    SubmissionVersion,
    VersionComparison,
    AsyncState,
    MutationState,
} from '@/types/submission.types';

// ─── useVersions (all versions for a submission) ──────────────

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
            // Sort descending by version number
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

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useLatestVersion ─────────────────────────────────────────

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

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useVersionComparison ─────────────────────────────────────

export function useVersionComparison(
    versionAId: string | null,
    versionBId: string | null
) {
    const [state, setState] = useState<AsyncState<VersionComparison>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetch = useCallback(async () => {
        if (!versionAId || !versionBId) return;
        setState({ data: null, loading: true, error: null });
        try {
            const data = await versionService.compareVersions(versionAId, versionBId);
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to compare versions',
            });
        }
    }, [versionAId, versionBId]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
}

// ─── useCreateVersion ─────────────────────────────────────────

export function useCreateVersion() {
    const [state, setState] = useState<MutationState>({
        loading: false,
        error: null,
        success: false,
    });

    const createVersion = useCallback(
        async (payload: {
            submissionId: string;
            files: File[];
            commitMessage?: string;
        }): Promise<SubmissionVersion | null> => {
            setState({ loading: true, error: null, success: false });
            try {
                const result = await versionService.createVersion(payload);
                setState({ loading: false, error: null, success: true });
                return result;
            } catch (err) {
                setState({
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed to create version',
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

    return { ...state, createVersion, reset };
}

// ─── useDownloadVersion ───────────────────────────────────────

export function useDownloadVersion() {
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const downloadVersion = useCallback(async (versionId: string, fileName?: string) => {
        setDownloading(true);
        setError(null);
        try {
            const blob = await versionService.downloadVersion(versionId);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName ?? `version-${versionId}.zip`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Download failed');
        } finally {
            setDownloading(false);
        }
    }, []);

    return { downloading, error, downloadVersion };
}
