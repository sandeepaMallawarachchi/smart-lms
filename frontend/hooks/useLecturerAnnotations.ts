import { useState, useEffect, useCallback } from 'react';

export interface LecturerAnnotation {
  _id: string;
  submissionId: string;
  versionId: string;
  questionId: string;
  lecturerId: string;
  start: number;
  end: number;
  selectedText: string;
  comment: string;
  createdAt: string;
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return {
    Authorization: `Bearer ${token ?? ''}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch / create / delete lecturer annotations for a specific answer.
 * Data is persisted in MongoDB via the /api/submissions/annotations endpoint.
 */
export function useLecturerAnnotations(
  submissionId: string | null,
  versionId: string | null,
  questionId: string | null,
) {
  const [annotations, setAnnotations] = useState<LecturerAnnotation[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch annotations when IDs are available
  useEffect(() => {
    if (!versionId || !questionId) return;
    let cancelled = false;
    setLoading(true);

    fetch(`/api/submissions/annotations?versionId=${encodeURIComponent(versionId)}&questionId=${encodeURIComponent(questionId)}`, {
      headers: authHeaders(),
    })
      .then(r => r.json())
      .then(res => {
        if (!cancelled && res.success) setAnnotations(res.data ?? []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [versionId, questionId]);

  const addAnnotation = useCallback(
    async (start: number, end: number, selectedText: string, comment: string) => {
      if (!submissionId || !versionId || !questionId) return;

      const res = await fetch('/api/submissions/annotations', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ submissionId, versionId, questionId, start, end, selectedText, comment }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAnnotations(prev => [...prev, json.data]);
      }
    },
    [submissionId, versionId, questionId],
  );

  const removeAnnotation = useCallback(async (id: string) => {
    const res = await fetch(`/api/submissions/annotations?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const json = await res.json();
    if (json.success) {
      setAnnotations(prev => prev.filter(a => a._id !== id));
    }
  }, []);

  return { annotations, loading, addAnnotation, removeAnnotation };
}
