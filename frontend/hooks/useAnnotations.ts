import { useState, useCallback } from 'react';

export interface Annotation {
    id: string;
    /** Character offset where the highlight starts */
    start: number;
    /** Character offset where the highlight ends (exclusive) */
    end: number;
    /** The selected text at creation time */
    selectedText: string;
    /** User comment */
    comment: string;
    createdAt: string;
}

const STORAGE_PREFIX = 'lms-annotations:';

function storageKey(versionId: string, questionId: string) {
    return `${STORAGE_PREFIX}${versionId}:${questionId}`;
}

function loadAnnotations(versionId: string, questionId: string): Annotation[] {
    try {
        const raw = localStorage.getItem(storageKey(versionId, questionId));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveAnnotations(versionId: string, questionId: string, annotations: Annotation[]) {
    localStorage.setItem(storageKey(versionId, questionId), JSON.stringify(annotations));
}

/**
 * Hook to manage text annotations for one answer (versionId + questionId).
 * Persisted to localStorage.
 */
export function useAnnotations(versionId: string, questionId: string) {
    const [annotations, setAnnotations] = useState<Annotation[]>(() =>
        loadAnnotations(versionId, questionId)
    );

    const addAnnotation = useCallback(
        (start: number, end: number, selectedText: string, comment: string) => {
            const annotation: Annotation = {
                id: crypto.randomUUID(),
                start,
                end,
                selectedText,
                comment,
                createdAt: new Date().toISOString(),
            };
            setAnnotations(prev => {
                const next = [...prev, annotation];
                saveAnnotations(versionId, questionId, next);
                return next;
            });
        },
        [versionId, questionId],
    );

    const removeAnnotation = useCallback(
        (id: string) => {
            setAnnotations(prev => {
                const next = prev.filter(a => a.id !== id);
                saveAnnotations(versionId, questionId, next);
                return next;
            });
        },
        [versionId, questionId],
    );

    const updateAnnotation = useCallback(
        (id: string, comment: string) => {
            setAnnotations(prev => {
                const next = prev.map(a => (a.id === id ? { ...a, comment } : a));
                saveAnnotations(versionId, questionId, next);
                return next;
            });
        },
        [versionId, questionId],
    );

    return { annotations, addAnnotation, removeAnnotation, updateAnnotation };
}
