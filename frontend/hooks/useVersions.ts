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
        if (!submissionId) {
            console.debug('[useVersions] Skipping fetch — no submissionId');
            return;
        }
        console.debug('[useVersions] Fetching versions for submissionId:', submissionId);
        setState({ data: null, loading: true, error: null });
        try {
            const data = await versionService.getVersions(submissionId);
            // Sort descending by version number
            const sorted = [...data].sort((a, b) => b.versionNumber - a.versionNumber);
            console.debug('[useVersions] SUCCESS — submissionId:', submissionId, '| count:', sorted.length,
                sorted.length > 0 ? '| versions: [' + sorted.map(v => 'v' + v.versionNumber).join(', ') + ']' : '');
            setState({ data: sorted, loading: false, error: null });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load versions';
            console.error('[useVersions] ERROR — submissionId:', submissionId, '| error:', message, err);
            setState({
                data: null,
                loading: false,
                error: message,
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
        if (!submissionId) {
            console.debug('[useLatestVersion] Skipping fetch — no submissionId');
            return;
        }
        console.debug('[useLatestVersion] Fetching latest version for submissionId:', submissionId);
        setState({ data: null, loading: true, error: null });
        try {
            const data = await versionService.getLatestVersion(submissionId);
            console.debug('[useLatestVersion] SUCCESS — submissionId:', submissionId,
                '| versionId:', data?.id, '| versionNumber:', data?.versionNumber);
            setState({ data, loading: false, error: null });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load latest version';
            console.error('[useLatestVersion] ERROR — submissionId:', submissionId, '| error:', message, err);
            setState({
                data: null,
                loading: false,
                error: message,
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
        if (!versionAId || !versionBId) {
            console.debug('[useVersionComparison] Skipping fetch — versionAId:', versionAId, '| versionBId:', versionBId);
            return;
        }
        console.debug('[useVersionComparison] Comparing versionA:', versionAId, 'vs versionB:', versionBId);
        setState({ data: null, loading: true, error: null });
        try {
            const data = await versionService.compareVersions(versionAId, versionBId);
            console.debug('[useVersionComparison] SUCCESS — versionA:', versionAId, '| versionB:', versionBId,
                '| fileDiffs:', (data as unknown as Record<string, unknown>)?.fileDiffs ? ((data as unknown as Record<string, unknown>).fileDiffs as unknown[]).length : 0);
            setState({ data, loading: false, error: null });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to compare versions';
            console.error('[useVersionComparison] ERROR — versionA:', versionAId, '| versionB:', versionBId, '| error:', message, err);
            setState({
                data: null,
                loading: false,
                error: message,
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
            console.debug('[useCreateVersion] Creating version — submissionId:', payload.submissionId,
                '| fileCount:', payload.files.length, '| commitMessage:', payload.commitMessage);
            setState({ loading: true, error: null, success: false });
            try {
                const result = await versionService.createVersion(payload);
                console.debug('[useCreateVersion] SUCCESS — versionId:', result?.id, '| versionNumber:', result?.versionNumber);
                setState({ loading: false, error: null, success: true });
                return result;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to create version';
                console.error('[useCreateVersion] ERROR — submissionId:', payload.submissionId, '| error:', message, err);
                setState({
                    loading: false,
                    error: message,
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
        console.debug('[useDownloadVersion] Downloading versionId:', versionId, '| requestedFileName:', fileName);
        setDownloading(true);
        setError(null);
        try {
            const { blob, fileName: serverFileName } = await versionService.downloadVersion(versionId);
            const finalName = fileName ?? serverFileName;
            console.debug('[useDownloadVersion] SUCCESS — versionId:', versionId, '| fileName:', finalName, '| blobSize:', blob.size, 'bytes');
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = finalName;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Download failed';
            console.error('[useDownloadVersion] ERROR — versionId:', versionId, '| error:', message, err);
            setError(message);
        } finally {
            setDownloading(false);
        }
    }, []);

    return { downloading, error, downloadVersion };
}
