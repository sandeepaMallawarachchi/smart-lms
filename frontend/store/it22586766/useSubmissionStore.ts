import { create } from 'zustand';
import { Submission } from '@/types/it22586766';

interface SubmissionState {
    submissions: Submission[];
    currentSubmission: Submission | null;
    loading: boolean;
    error: string | null;
    setSubmissions: (submissions: Submission[]) => void;
    setCurrentSubmission: (submission: Submission | null) => void;
    addSubmission: (submission: Submission) => void;
    updateSubmission: (id: number, submission: Partial<Submission>) => void;
    removeSubmission: (id: number) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useSubmissionStore = create<SubmissionState>((set) => ({
    submissions: [],
    currentSubmission: null,
    loading: false,
    error: null,
    setSubmissions: (submissions) => set({ submissions }),
    setCurrentSubmission: (submission) => set({ currentSubmission: submission }),
    addSubmission: (submission) =>
        set((state) => ({ submissions: [submission, ...state.submissions] })),
    updateSubmission: (id, updatedSubmission) =>
        set((state) => ({
            submissions: state.submissions.map((s) =>
                s.id === id ? { ...s, ...updatedSubmission } : s
            ),
            currentSubmission:
                state.currentSubmission?.id === id
                    ? { ...state.currentSubmission, ...updatedSubmission }
                    : state.currentSubmission,
        })),
    removeSubmission: (id) =>
        set((state) => ({
            submissions: state.submissions.filter((s) => s.id !== id),
            currentSubmission:
                state.currentSubmission?.id === id ? null : state.currentSubmission,
        })),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
}));