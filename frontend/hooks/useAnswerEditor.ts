'use client';

/**
 * useAnswerEditor.ts
 * ─────────────────────────────────────────────────────────────
 * Per-question hook that manages all the real-time behaviour for a
 * single text editor in the assignment answer page:
 *
 *  • Immediate text + word count state
 *  • Debounced AI feedback request  (2 s after typing stops)
 *  • Debounced plagiarism check     (2 s after typing stops)
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
 * AI Detection logs are prefixed with "[AI-Detection]" — filter in DevTools.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { submissionService, feedbackService, plagiarismService } from '@/lib/api/submission-services';
import type { LiveFeedback, LivePlagiarismResult, AiDetectionResult } from '@/types/submission.types';

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
    /** Maximum marks available for this question — sent to AI to calibrate strictness. */
    maxPoints?: number;
    /** Previously saved AI feedback for this answer (loaded from DB on page load). */
    initialFeedback?: LiveFeedback | null;
    /** Previously saved plagiarism result for this answer (loaded from DB on page load). */
    initialPlagiarism?: LivePlagiarismResult | null;
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
    /** AI-generated content detection result (null until first response). */
    aiDetectionResult: AiDetectionResult | null;
    /** True while the AI detection request is in-flight. */
    aiDetectionLoading: boolean;
    /** True for the duration of the auto-save API call. */
    autoSaving: boolean;
    /** Timestamp of the last successful auto-save (null before first save). */
    lastSaved: Date | null;
    /**
     * Non-null when auto-save has failed 3 or more times in a row without a
     * successful save in between. Cleared automatically on the next success.
     * The page should display this prominently so the student knows to copy
     * their work before navigating away.
     */
    saveError: string | null;
    /** Call this from the textarea onChange event. */
    handleChange: (newText: string) => void;
}

// ─── Timing constants ──────────────────────────────────────────

/** Milliseconds of inactivity after which AI feedback is requested. */
const FEEDBACK_DEBOUNCE_MS = 2000;

/** Milliseconds of inactivity after which the plagiarism check is run. */
const PLAGIARISM_DEBOUNCE_MS = 2000;

/** Milliseconds of inactivity after which the text is auto-saved to the backend. */
const AUTO_SAVE_DEBOUNCE_MS = 5000;

/** Minimum character length to trigger AI feedback / plagiarism.
 *  10 characters ≈ 2 words — low enough to cover short correct answers
 *  (e.g. single-word definitions, numeric answers) while excluding stray
 *  key presses. Backend handles short answers via SHORT_ANSWER prompt. */
const MIN_TEXT_LENGTH = 10;

// ─── Hook ─────────────────────────────────────────────────────

export function useAnswerEditor({
    submissionId,
    questionId,
    questionText,
    studentId,
    assignmentId,
    initialText = '',
    expectedWordCount,
    maxPoints,
    initialFeedback = null,
    initialPlagiarism = null,
}: UseAnswerEditorParams): UseAnswerEditorReturn {

    // ── Core text state ────────────────────────────────────────
    const [answerText, setAnswerText]       = useState<string>(initialText);
    const [wordCount, setWordCount]         = useState<number>(countWords(initialText));

    // ── AI feedback state — seed with saved value if available ─
    const [liveFeedback, setLiveFeedback]         = useState<LiveFeedback | null>(initialFeedback);
    const [feedbackLoading, setFeedbackLoading]   = useState<boolean>(false);

    // ── Plagiarism state — seed with saved value if available ──
    const [plagiarismResult, setPlagiarismResult] = useState<LivePlagiarismResult | null>(initialPlagiarism);
    const [plagiarismLoading, setPlagiarismLoading] = useState<boolean>(false);

    // ── AI detection state ─────────────────────────────────────
    const [aiDetectionResult, setAiDetectionResult] = useState<AiDetectionResult | null>(null);
    const [aiDetectionLoading, setAiDetectionLoading] = useState<boolean>(false);

    // Refs that let async callbacks read the latest state without stale-closure issues.
    // Updated in sync via useEffect so requestFeedback / requestPlagiarismCheck always
    // see the freshest values without needing them in their dependency arrays.
    const liveFeedbackRef     = useRef<LiveFeedback | null>(initialFeedback);
    const plagiarismResultRef = useRef<LivePlagiarismResult | null>(initialPlagiarism);

    // ── Auto-save state ────────────────────────────────────────
    const [autoSaving, setAutoSaving]         = useState<boolean>(false);
    const [lastSaved, setLastSaved]           = useState<Date | null>(null);
    const [saveError, setSaveError]           = useState<string | null>(null);
    const consecutiveFailuresRef              = useRef<number>(0);
    const SAVE_ERROR_THRESHOLD                = 3;

    // ── Debounce timer refs ────────────────────────────────────
    // Using refs (not state) so resetting timers doesn't cause re-renders.
    const feedbackTimer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const plagiarismTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const aiDetectionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const autoSaveTimer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // ── Pending analysis refs ──────────────────────────────────
    // AI feedback and plagiarism results received BEFORE the answer row was created
    // (feedback fires at 2s, auto-save fires at 5s — row may not exist yet).
    // After auto-save creates the row, we flush these immediately so they're
    // persisted and available on the next "continue writing" session.
    const pendingFeedbackRef   = useRef<LiveFeedback | null>(null);
    const pendingPlagiarismRef = useRef<LivePlagiarismResult | null>(null);

    // Ref always holds the latest AI detection result so grade recalculations can read it without
    // waiting for a React re-render (same pattern as plagiarismResultRef).
    const aiDetectionResultRef = useRef<AiDetectionResult | null>(null);

    // Cache key = the exact text that produced the last successful feedback / plagiarism / AI detection result.
    // When the debounce fires with the identical text, we skip the API call and reuse the result.
    const lastFeedbackTextRef     = useRef<string>('');
    const lastPlagiarismTextRef   = useRef<string>('');
    const lastAiDetectionTextRef  = useRef<string>('');

    // Tracks whether the one-time initialText seed has been applied.
    // Prevents re-seeding on subsequent renders and guards the race-condition
    // where initialText arrives after the student has already started typing.
    const hasSeededRef = useRef<boolean>(false);

    // Stable session ID for the plagiarism realtime endpoint (stays constant for
    // the lifetime of this question editor to let the backend correlate requests).
    const sessionId = useRef<string>(
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `session-${Date.now()}-${Math.random()}`
    );

    // Keep refs in sync so async callbacks always see the current state.
    useEffect(() => { liveFeedbackRef.current    = liveFeedback;    }, [liveFeedback]);
    useEffect(() => { plagiarismResultRef.current = plagiarismResult; }, [plagiarismResult]);

    // ── Inner async helpers ────────────────────────────────────

    /** Fire AI feedback request for the given text, then persist the result. */
    const requestFeedback = useCallback(async (text: string) => {
        if (!text || text.length < MIN_TEXT_LENGTH) {
            return;
        }
        // Skip API call if text hasn't changed since the last successful response.
        if (text === lastFeedbackTextRef.current && liveFeedbackRef.current) {
            return;
        }
        setFeedbackLoading(true);
        const t0 = performance.now();
        try {
            const feedback = await feedbackService.generateLiveFeedback({
                questionId,
                answerText: text,
                questionPrompt: questionText,
                expectedWordCount,
                maxPoints,
                // Pass current scores so the backend can include both penalties in projectedGrade.
                similarityScore: plagiarismResultRef.current?.similarityScore,
                aiDetectionScore: aiDetectionResultRef.current?.aiScore ?? undefined,
            });
            const latencyMs = Math.round(performance.now() - t0);
            console.log(`[Feedback latency] questionId=${questionId} | ${latencyMs}ms`);
            setLiveFeedback(feedback);
            lastFeedbackTextRef.current = text;
            // Track latest feedback so auto-save can flush it if the row didn't exist yet
            pendingFeedbackRef.current = feedback;

            // Race-condition guard: if plagiarism already completed before this feedback
            // response arrived, the backend computed projectedGrade without the similarity
            // penalty.  Re-run grade calculation now with the known similarity score so the
            // displayed grade reflects the penalty immediately.
            const currentPlag = plagiarismResultRef.current;
            const currentAi   = aiDetectionResultRef.current;
            if ((currentPlag?.similarityScore != null || (currentAi != null && currentAi.aiScore >= 0)) && maxPoints) {
                const wc = countWords(text);
                feedbackService.calculateGrade({
                    grammarScore:      feedback.grammarScore,
                    clarityScore:      feedback.clarityScore,
                    completenessScore: feedback.completenessScore,
                    relevanceScore:    feedback.relevanceScore,
                    maxPoints,
                    wordCount: wc,
                    expectedWordCount,
                    similarityScore:   currentPlag != null ? currentPlag.similarityScore : undefined,
                    aiDetectionScore:  currentAi != null && currentAi.aiScore >= 0 ? currentAi.aiScore : undefined,
                }).then(grade => {
                    setLiveFeedback(prev => prev ? { ...prev, ...grade } : null);
                    if (grade.projectedGrade != null) {
                        submissionService.saveAnswerAnalysis(submissionId, questionId, {
                            aiGeneratedMark: grade.projectedGrade,
                        }).catch(() => {});
                    }
                }).catch(() => {});
            }

            // Persist silently — server guards wordCount >= 1
            submissionService.saveAnswerAnalysis(submissionId, questionId, {
                grammarScore:       feedback.grammarScore,
                clarityScore:       feedback.clarityScore,
                completenessScore:  feedback.completenessScore,
                relevanceScore:     feedback.relevanceScore,
                strengths:          feedback.strengths,
                improvements:       feedback.improvements,
                suggestions:        feedback.suggestions,
                // Store actual earned mark (0-maxPoints scale) directly — no 0-10 normalization
                ...(feedback.projectedGrade != null && { aiGeneratedMark: feedback.projectedGrade }),
            }).then(() => {
                pendingFeedbackRef.current = null;
            }).catch(() => {});
        } catch {
            // Don't clear existing feedback — keep the last good result visible.
        } finally {
            setFeedbackLoading(false);
        }
    }, [submissionId, questionId, questionText, expectedWordCount, maxPoints]);

    /** Fire plagiarism check for the given text, then persist the result. */
    const requestPlagiarismCheck = useCallback(async (text: string) => {
        if (!text || text.length < MIN_TEXT_LENGTH) {
            return;
        }
        // Skip API call if text hasn't changed since the last successful response.
        if (text === lastPlagiarismTextRef.current && plagiarismResultRef.current) {
            return;
        }
        setPlagiarismLoading(true);
        try {
            const result = await plagiarismService.checkLiveSimilarity({
                sessionId: sessionId.current,
                studentId,
                questionId,
                textContent: text,
                questionText,
                submissionId: submissionId || undefined,
            });
            setPlagiarismResult(result);
            lastPlagiarismTextRef.current = text;
            // Keep ref in sync immediately (don't wait for useEffect) so requestFeedback
            // can read the latest similarity score if it completes after this.
            plagiarismResultRef.current = result;
            // Track latest result so auto-save can flush it if the row didn't exist yet
            pendingPlagiarismRef.current = result;

            // Re-compute projected grade now that we have the real similarity score.
            // Also pass current AI detection score so both penalties are applied together.
            const fb = liveFeedbackRef.current;
            if (fb && maxPoints) {
                const wc = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
                const curAi = aiDetectionResultRef.current;
                feedbackService.calculateGrade({
                    grammarScore:      fb.grammarScore,
                    clarityScore:      fb.clarityScore,
                    completenessScore: fb.completenessScore,
                    relevanceScore:    fb.relevanceScore,
                    maxPoints,
                    wordCount: wc,
                    expectedWordCount,
                    similarityScore:  result.similarityScore,
                    aiDetectionScore: curAi != null && curAi.aiScore >= 0 ? curAi.aiScore : undefined,
                }).then(grade => {
                    setLiveFeedback(prev => prev ? { ...prev, ...grade } : null);
                }).catch(() => {});
            }

            // Persist silently — server guards wordCount >= 1
            submissionService.saveAnswerAnalysis(submissionId, questionId, {
                similarityScore:    result.similarityScore,
                plagiarismSeverity: result.severity,
                plagiarismFlagged:  result.flagged,
                // Serialise source URLs so the PDF report can render them without re-running the check
                ...(result.internetMatches?.length && {
                    plagiarismSources: JSON.stringify(result.internetMatches),
                }),
            }).then(() => {
                pendingPlagiarismRef.current = null;
            }).catch(() => {});
        } catch {
            // Silent failure — plagiarism check is a background operation
        } finally {
            setPlagiarismLoading(false);
        }
    }, [submissionId, questionId, studentId, questionText]);

    /** Fire AI-generated content detection for the given text, then persist and re-apply grade. */
    const requestAiDetection = useCallback(async (text: string) => {
        if (!text || text.length < MIN_TEXT_LENGTH) return;
        if (text === lastAiDetectionTextRef.current && aiDetectionResultRef.current) {
            return;
        }
        setAiDetectionLoading(true);
        try {
            const result = await feedbackService.detectAiContent(text);
            setAiDetectionResult(result);
            lastAiDetectionTextRef.current = text;
            aiDetectionResultRef.current   = result;

            // Skip grade recalculation when service is unavailable (score = -1)
            if (result.aiScore >= 0 && maxPoints) {
                const fb = liveFeedbackRef.current;
                if (fb) {
                    const wc = countWords(text);
                    const curPlag = plagiarismResultRef.current;
                    feedbackService.calculateGrade({
                        grammarScore:      fb.grammarScore,
                        clarityScore:      fb.clarityScore,
                        completenessScore: fb.completenessScore,
                        relevanceScore:    fb.relevanceScore,
                        maxPoints,
                        wordCount: wc,
                        expectedWordCount,
                        similarityScore:  curPlag != null ? curPlag.similarityScore : undefined,
                        aiDetectionScore: result.aiScore,
                    }).then(grade => {
                        setLiveFeedback(prev => prev ? { ...prev, ...grade } : null);
                        if (grade.projectedGrade != null) {
                            submissionService.saveAnswerAnalysis(submissionId, questionId, {
                                aiGeneratedMark:  grade.projectedGrade,
                                aiDetectionScore: result.aiScore,
                                aiDetectionLabel: result.label,
                            }).catch(() => {});
                        }
                    }).catch(() => {});
                } else {
                    // No feedback yet — just persist the detection result
                    submissionService.saveAnswerAnalysis(submissionId, questionId, {
                        aiDetectionScore: result.aiScore,
                        aiDetectionLabel: result.label,
                    }).catch(() => {});
                }
            }
        } catch {
            // silent failure
        } finally {
            setAiDetectionLoading(false);
        }
    }, [submissionId, questionId, expectedWordCount, maxPoints]);

    /** Auto-save the current text to the backend. */
    const autoSave = useCallback(async (text: string) => {
        // Only auto-save if there is a valid submission to attach the answer to.
        if (!submissionId) {
            return;
        }
        const words = countWords(text);
        setAutoSaving(true);
        try {
            await submissionService.saveAnswer(submissionId, questionId, {
                answerText: text,
                wordCount: words,
                characterCount: text.length,
                questionText,
                studentId: studentId || undefined,
                maxPoints,
            });
            const savedAt = new Date();
            setLastSaved(savedAt);
            consecutiveFailuresRef.current = 0;
            setSaveError(null);

            // ── Flush deferred analysis ────────────────────────
            // If feedback/plagiarism arrived before this auto-save created the row,
            // the saveAnalysis call was a no-op. Now that the row exists, persist them.
            const fb = pendingFeedbackRef.current;
            const pl = pendingPlagiarismRef.current;
            if (fb || pl) {
                submissionService.saveAnswerAnalysis(submissionId, questionId, {
                    ...(fb && {
                        grammarScore:       fb.grammarScore,
                        clarityScore:       fb.clarityScore,
                        completenessScore:  fb.completenessScore,
                        relevanceScore:     fb.relevanceScore,
                        strengths:          fb.strengths,
                        improvements:       fb.improvements,
                        suggestions:        fb.suggestions,
                        ...(fb.projectedGrade != null && { aiGeneratedMark: fb.projectedGrade }),
                    }),
                    ...(pl && {
                        similarityScore:    pl.similarityScore,
                        plagiarismSeverity: pl.severity,
                        plagiarismFlagged:  pl.flagged,
                        ...(pl.internetMatches?.length && {
                            plagiarismSources: JSON.stringify(pl.internetMatches),
                        }),
                    }),
                }).then(() => {
                    pendingFeedbackRef.current   = null;
                    pendingPlagiarismRef.current = null;
                }).catch(() => {});
            }
        } catch {
            consecutiveFailuresRef.current += 1;
            if (consecutiveFailuresRef.current >= SAVE_ERROR_THRESHOLD) {
                setSaveError(
                    'Your answer is not saving. Check your connection — copy your work to avoid losing it.'
                );
            }
        } finally {
            setAutoSaving(false);
        }
    }, [submissionId, questionId, questionText, studentId]);

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

        // ── Reset and reschedule AI feedback (2 s debounce) ────
        clearTimeout(feedbackTimer.current);
        if (newText.length >= MIN_TEXT_LENGTH) {
            feedbackTimer.current = setTimeout(() => requestFeedback(newText), FEEDBACK_DEBOUNCE_MS);
        }

        // ── Reset and reschedule plagiarism check (2 s debounce)
        clearTimeout(plagiarismTimer.current);
        if (newText.length >= MIN_TEXT_LENGTH) {
            plagiarismTimer.current = setTimeout(() => requestPlagiarismCheck(newText), PLAGIARISM_DEBOUNCE_MS);
        }

        // ── Reset and reschedule AI detection (2 s debounce) ───
        clearTimeout(aiDetectionTimer.current);
        if (newText.length >= MIN_TEXT_LENGTH) {
            aiDetectionTimer.current = setTimeout(() => requestAiDetection(newText), PLAGIARISM_DEBOUNCE_MS);
        }

        // ── Reset and reschedule auto-save (5 s debounce) ──────
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => autoSave(newText), AUTO_SAVE_DEBOUNCE_MS);
    }, [requestFeedback, requestPlagiarismCheck, requestAiDetection, autoSave, questionId, submissionId]);

    // ── Cleanup on unmount ─────────────────────────────────────
    // Clears all pending timers so no API calls fire after unmount.
    useEffect(() => {
        return () => {
            clearTimeout(feedbackTimer.current);
            clearTimeout(plagiarismTimer.current);
            clearTimeout(aiDetectionTimer.current);
            clearTimeout(autoSaveTimer.current);
        };
    }, [questionId]);

    // ── Sync initialText on load ───────────────────────────────
    // When the parent loads previously saved answers and updates initialText,
    // sync the editor text/wordCount.  The seed is applied exactly once
    // (hasSeededRef) so re-renders or parent re-fetches don't overwrite the
    // student's subsequent edits.
    //
    // Race-condition handling: if initialText arrives after the student has
    // already started typing, only apply the saved answer when it contains
    // MORE content than what the student typed — recovering more work rather
    // than discarding it.
    useEffect(() => {
        if (!initialText || hasSeededRef.current) return;
        hasSeededRef.current = true;
        // Read the current editor value via functional-update to avoid adding
        // answerText to the dependency array (which would cause repeated firing).
        setAnswerText(current => {
            if (initialText.length > current.length) {
                setWordCount(countWords(initialText));
                return initialText;
            }
            return current;
        });
    }, [initialText, questionId]);

    // ── Generate feedback on mount for pre-loaded text without feedback ─────
    // If the student returns to a partially answered assignment and their
    // previous answer had no saved feedback (e.g. analysis was skipped because
    // the answer row didn't exist yet when it first arrived), fire fresh
    // feedback and plagiarism requests immediately so the panels fill in
    // without the student having to retype anything.
    useEffect(() => {
        if (
            initialText &&
            initialText.length >= MIN_TEXT_LENGTH &&
            !initialFeedback
        ) {
            requestFeedback(initialText);
        }
        const plagiarismNeedsHydration =
            !initialPlagiarism ||
            !initialPlagiarism.internetMatches?.length;   // saved result has no source details
        if (
            initialText &&
            initialText.length >= MIN_TEXT_LENGTH &&
            plagiarismNeedsHydration
        ) {
            requestPlagiarismCheck(initialText);
        }
        // Fire AI detection on mount if there's pre-loaded text (always — no DB cache for this)
        if (initialText && initialText.length >= MIN_TEXT_LENGTH) {
            requestAiDetection(initialText);
        }
        // Run only once on mount; stable callbacks
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        answerText,
        wordCount,
        liveFeedback,
        feedbackLoading,
        plagiarismResult,
        plagiarismLoading,
        aiDetectionResult,
        aiDetectionLoading,
        autoSaving,
        lastSaved,
        saveError,
        handleChange,
    };
}
