'use client';

/**
 * useAnswerEditor.ts
 * ─────────────────────────────────────────────────────────────
 * Per-question hook that manages all the real-time behaviour for a
 * single text editor in the assignment answer page:
 *
 *  • Immediate text + word count state
 *  • Debounced AI feedback request  (3 s after typing stops)
 *  • Debounced plagiarism check     (3 s after typing stops)
 *  • Debounced auto-save            (5 s after typing stops, persists to backend)
 *
 * Debounce is implemented with plain setTimeout / useRef — no external library.
 * Each timer is cleared on every keystroke and reset from scratch, so the
 * callbacks only fire after the specified idle period.
 *
 * The hook is designed to be completely transparent to the student:
 *  - No "Save" button required
 *  - No version numbers shown
 *  - Only a small "Saving…" / "Saved ✓" indicator is surfaced
 *
 * Debug:
 *  All console.debug calls are prefixed with "[useAnswerEditor]" so they can
 *  be filtered in the browser DevTools console.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { submissionService, feedbackService, plagiarismService } from '@/lib/api/submission-services';
import type { LiveFeedback, LivePlagiarismResult } from '@/types/submission.types';

// ─── Word count helper ─────────────────────────────────────────

/** Count words by splitting on whitespace and filtering empties. */
function countWords(text: string): number {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

// ─── Hook params ───────────────────────────────────────────────

export interface UseAnswerEditorParams {
    /** ID of the parent submission (or empty string before submission is created). */
    submissionId: string;
    /** ID of the question this editor belongs to. */
    questionId: string;
    /** Question prompt text — sent to the AI for relevance scoring. */
    questionText?: string;
    /** Student's user ID — sent for plagiarism detection. */
    studentId: string;
    /** Assignment ID — sent with plagiarism check payload. */
    assignmentId?: string;
    /** Initial answer text (from pre-loaded auto-save data). */
    initialText?: string;
    /** Expected word count — used in the AI feedback prompt. */
    expectedWordCount?: number;
}

// ─── Hook return type ──────────────────────────────────────────

export interface UseAnswerEditorReturn {
    /** Current text content of the editor. */
    answerText: string;
    /** Live word count (updates on every keystroke). */
    wordCount: number;
    /** AI feedback (null until first successful response). */
    liveFeedback: LiveFeedback | null;
    /** True while the AI feedback request is in-flight. */
    feedbackLoading: boolean;
    /** Real-time plagiarism check result (null until first response). */
    plagiarismResult: LivePlagiarismResult | null;
    /** True while the plagiarism check is in-flight. */
    plagiarismLoading: boolean;
    /** True for the duration of the auto-save API call. */
    autoSaving: boolean;
    /** Timestamp of the last successful auto-save (null before first save). */
    lastSaved: Date | null;
    /** Call this from the textarea onChange event. */
    handleChange: (newText: string) => void;
}

// ─── Timing constants ──────────────────────────────────────────

/** Milliseconds of inactivity after which AI feedback is requested. */
const FEEDBACK_DEBOUNCE_MS = 3000;

/** Milliseconds of inactivity after which the plagiarism check is run. */
const PLAGIARISM_DEBOUNCE_MS = 3000;

/** Milliseconds of inactivity after which the text is auto-saved to the backend. */
const AUTO_SAVE_DEBOUNCE_MS = 5000;

/** Minimum character length to trigger AI feedback / plagiarism (matches backend config). */
const MIN_TEXT_LENGTH = 50;

// ─── Hook ─────────────────────────────────────────────────────

export function useAnswerEditor({
    submissionId,
    questionId,
    questionText,
    studentId,
    assignmentId,
    initialText = '',
    expectedWordCount,
}: UseAnswerEditorParams): UseAnswerEditorReturn {

    // ── Core text state ────────────────────────────────────────
    const [answerText, setAnswerText]       = useState<string>(initialText);
    const [wordCount, setWordCount]         = useState<number>(countWords(initialText));

    // ── AI feedback state ──────────────────────────────────────
    const [liveFeedback, setLiveFeedback]         = useState<LiveFeedback | null>(null);
    const [feedbackLoading, setFeedbackLoading]   = useState<boolean>(false);

    // ── Plagiarism state ───────────────────────────────────────
    const [plagiarismResult, setPlagiarismResult] = useState<LivePlagiarismResult | null>(null);
    const [plagiarismLoading, setPlagiarismLoading] = useState<boolean>(false);

    // ── Auto-save state ────────────────────────────────────────
    const [autoSaving, setAutoSaving]   = useState<boolean>(false);
    const [lastSaved, setLastSaved]     = useState<Date | null>(null);

    // ── Debounce timer refs ────────────────────────────────────
    // Using refs (not state) so resetting timers doesn't cause re-renders.
    const feedbackTimer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const plagiarismTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const autoSaveTimer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Stable session ID for the plagiarism realtime endpoint (stays constant for
    // the lifetime of this question editor to let the backend correlate requests).
    const sessionId = useRef<string>(
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `session-${Date.now()}-${Math.random()}`
    );

    // ── Inner async helpers ────────────────────────────────────

    /** Fire AI feedback request for the given text. */
    const requestFeedback = useCallback(async (text: string) => {
        if (!text || text.length < MIN_TEXT_LENGTH) {
            console.debug('[useAnswerEditor] Skipping AI feedback — text too short:', text.length, 'chars');
            return;
        }
        console.debug('[useAnswerEditor] Requesting live feedback for questionId:', questionId);
        setFeedbackLoading(true);
        try {
            const feedback = await feedbackService.generateLiveFeedback({
                questionId,
                answerText: text,
                questionPrompt: questionText,
                expectedWordCount,
            });
            console.debug('[useAnswerEditor] Live feedback received — grammar:', feedback.grammarScore, '| clarity:', feedback.clarityScore);
            setLiveFeedback(feedback);
        } catch (err) {
            console.warn('[useAnswerEditor] Live feedback request failed:', err);
            // Don't clear existing feedback — keep the last good result visible.
        } finally {
            setFeedbackLoading(false);
        }
    }, [questionId, questionText, expectedWordCount]);

    /** Fire plagiarism check for the given text. */
    const requestPlagiarismCheck = useCallback(async (text: string) => {
        if (!text || text.length < MIN_TEXT_LENGTH) {
            console.debug('[useAnswerEditor] Skipping plagiarism check — text too short:', text.length, 'chars');
            return;
        }
        console.debug('[useAnswerEditor] Requesting plagiarism check for questionId:', questionId);
        setPlagiarismLoading(true);
        try {
            const result = await plagiarismService.checkLiveSimilarity({
                sessionId: sessionId.current,
                studentId,
                questionId,
                textContent: text,
                questionText,
            });
            console.debug('[useAnswerEditor] Plagiarism result — severity:', result.severity, '| score:', result.similarityScore, '%');
            setPlagiarismResult(result);
        } catch (err) {
            console.warn('[useAnswerEditor] Plagiarism check failed:', err);
        } finally {
            setPlagiarismLoading(false);
        }
    }, [questionId, studentId, questionText]);

    /** Auto-save the current text to the backend. */
    const autoSave = useCallback(async (text: string) => {
        // Only auto-save if there is a valid submission to attach the answer to.
        if (!submissionId) {
            console.debug('[useAnswerEditor] Skipping auto-save — no submissionId yet.');
            return;
        }
        const words = countWords(text);
        console.debug('[useAnswerEditor] Auto-saving — submissionId:', submissionId, '| questionId:', questionId, '| words:', words);
        setAutoSaving(true);
        try {
            await submissionService.saveAnswer(submissionId, questionId, {
                answerText: text,
                wordCount: words,
                characterCount: text.length,
                questionText,
            });
            const savedAt = new Date();
            setLastSaved(savedAt);
            console.debug('[useAnswerEditor] Auto-save complete at', savedAt.toLocaleTimeString());
        } catch (err) {
            console.warn('[useAnswerEditor] Auto-save failed:', err);
        } finally {
            setAutoSaving(false);
        }
    }, [submissionId, questionId, questionText]);

    // ── Main change handler ────────────────────────────────────

    /**
     * handleChange — called by the textarea's onChange event on every keystroke.
     *
     * Updates text + word count immediately, then reschedules all three
     * debounced operations (clearing any pending timers first).
     */
    const handleChange = useCallback((newText: string) => {
        setAnswerText(newText);
        const words = countWords(newText);
        setWordCount(words);

        // ── Reset and reschedule AI feedback (3 s debounce) ────
        clearTimeout(feedbackTimer.current);
        if (newText.length >= MIN_TEXT_LENGTH) {
            feedbackTimer.current = setTimeout(() => requestFeedback(newText), FEEDBACK_DEBOUNCE_MS);
        }

        // ── Reset and reschedule plagiarism check (3 s debounce)
        clearTimeout(plagiarismTimer.current);
        if (newText.length >= MIN_TEXT_LENGTH) {
            plagiarismTimer.current = setTimeout(() => requestPlagiarismCheck(newText), PLAGIARISM_DEBOUNCE_MS);
        }

        // ── Reset and reschedule auto-save (5 s debounce) ──────
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => autoSave(newText), AUTO_SAVE_DEBOUNCE_MS);
    }, [requestFeedback, requestPlagiarismCheck, autoSave]);

    // ── Cleanup on unmount ─────────────────────────────────────
    // Clears all pending timers so no API calls fire after unmount.
    useEffect(() => {
        return () => {
            console.debug('[useAnswerEditor] Unmounting — clearing timers for questionId:', questionId);
            clearTimeout(feedbackTimer.current);
            clearTimeout(plagiarismTimer.current);
            clearTimeout(autoSaveTimer.current);
        };
    }, [questionId]);

    // ── Sync initialText changes ───────────────────────────────
    // When the parent loads previously saved answers and updates initialText,
    // sync the editor state without triggering debounced side-effects.
    useEffect(() => {
        if (initialText && answerText === '') {
            console.debug('[useAnswerEditor] Syncing initialText for questionId:', questionId, '| words:', countWords(initialText));
            setAnswerText(initialText);
            setWordCount(countWords(initialText));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialText]);

    return {
        answerText,
        wordCount,
        liveFeedback,
        feedbackLoading,
        plagiarismResult,
        plagiarismLoading,
        autoSaving,
        lastSaved,
        handleChange,
    };
}
