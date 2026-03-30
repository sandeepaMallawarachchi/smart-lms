'use client';

/**
 * QuestionCard.tsx
 * ─────────────────────────────────────────────────────────────
 * Per-question container that wires together:
 *   • RichTextEditor    — the student's input area
 *   • LiveFeedbackPanel — right-column AI feedback
 *   • PlagiarismWarning — inline similarity alert
 *   • useAnswerEditor   — all debounced logic (feedback / plagiarism / auto-save)
 *
 * Layout:
 *   Mobile / tablet  : stacked (editor on top, feedback below)
 *   Desktop (lg+)    : two-column (editor left, feedback right — sticky)
 *
 * The card surfaces an auto-save status indicator ("Saving…" / "Saved ✓ HH:MM")
 * below the editor. No "Save" button — persistence is fully transparent.
 *
 * Props:
 *   question       — Question object (id, text, order, expectedWordCount, …)
 *   submissionId   — ID of the parent draft submission
 *   studentId      — Student's user ID (for plagiarism payload)
 *   assignmentId   — Assignment ID (for plagiarism payload)
 *   initialAnswer  — Pre-loaded answer text (from auto-save data)
 *   disabled       — True after submission (read-only)
 *   onAnswerChange — Callback fired on every text change (parent can track progress)
 *   questionIndex  — 0-based index used for display ("Question 1", "Question 2", …)
 *
 * Debug:
 *  All console.debug calls are prefixed with "[QuestionCard]".
 */

import { useEffect } from 'react';
import { useAnswerEditor } from '@/hooks/useAnswerEditor';
import { RichTextEditor } from './RichTextEditor';
import { LiveFeedbackPanel } from './LiveFeedbackPanel';
import { PlagiarismWarning } from './PlagiarismWarning';
import type { Question, LiveFeedback, LivePlagiarismResult } from '@/types/submission.types';

// ─── Grade Calculation ────────────────────────────────────────

/**
 * Compute a projected grade (0 – maxPoints) from live AI scores + plagiarism.
 *
 * SHORT ANSWERS (≤ 5 marks):
 *   Additive weighted scoring — relevance(50%) + completeness(25%) + clarity(15%) + grammar(10%).
 *   Minimum floor: if relevance ≥ 5/10 the student earns at least 20% of maxPoints.
 *   Word-count penalty is not applied (short answers are intentionally brief).
 *
 * LONG ANSWERS (> 5 marks):
 *   Relevance acts as a soft multiplier (clamped to 0.5–1.0 to avoid harsh gates).
 *   Content quality = grammar(20%) + clarity(30%) + completeness(50%).
 *   Word-count and plagiarism penalties apply in full.
 */
function calcProjectedGrade(
    feedback: LiveFeedback | null,
    plagiarism: LivePlagiarismResult | null,
    wordCount: number,
    expectedWordCount: number | undefined,
    maxPoints: number,
): number | null {
    if (!feedback) return null;

    const isShort = maxPoints <= 5;

    // ── Plagiarism penalty (shared) ────────────────────────────────────────
    const simPct = plagiarism?.similarityScore ?? 0;
    let plagPenalty = 0;
    if      (simPct >= 70) plagPenalty = 0.60;
    else if (simPct >= 50) plagPenalty = 0.50;
    else if (simPct >= 30) plagPenalty = 0.30;
    else if (simPct >= 15) plagPenalty = 0.10;

    if (isShort) {
        // ── Short-answer scoring ─────────────────────────────────────────
        // Weighting: concept/relevance 50%, completeness 25%, clarity 15%, grammar 10%
        const qualityScore =
            (feedback.relevanceScore    * 0.50 +
             feedback.completenessScore * 0.25 +
             feedback.clarityScore      * 0.15 +
             feedback.grammarScore      * 0.10) / 10;   // → 0.0 – 1.0

        // Minimum floor: correct concept (relevance ≥ 5) → at least 20% of marks
        const floored = feedback.relevanceScore >= 5
            ? Math.max(qualityScore, 0.20)
            : qualityScore;

        const adjusted = Math.max(0, floored - plagPenalty);
        return Math.round(adjusted * maxPoints * 10) / 10;

    } else {
        // ── Long-answer scoring ─────────────────────────────────────────
        // Content quality: grammar(20%) + clarity(30%) + completeness(50%)
        const contentScore =
            (feedback.grammarScore      * 0.20 +
             feedback.clarityScore      * 0.30 +
             feedback.completenessScore * 0.50) / 10;   // → 0.0 – 1.0

        // Soft relevance gate: clamp to 0.5–1.0 so even partially relevant
        // answers earn some credit (avoids complete zeroing for borderline cases)
        const relevanceFactor = Math.max(0.5, feedback.relevanceScore / 10);
        // Still zero out completely irrelevant answers (relevance < 2/10)
        const effectiveFactor = feedback.relevanceScore < 2 ? feedback.relevanceScore / 10 : relevanceFactor;

        const base = contentScore * effectiveFactor;

        // Word count penalty (long answers only)
        let wcPenalty = 0;
        if (expectedWordCount && expectedWordCount > 0) {
            const ratio = wordCount / expectedWordCount;
            if      (ratio < 0.50) wcPenalty = 0.25;
            else if (ratio < 0.75) wcPenalty = 0.10;
        }

        const adjusted = Math.max(0, base - plagPenalty - wcPenalty);
        return Math.round(adjusted * maxPoints * 10) / 10;
    }
}

// ─── Props ────────────────────────────────────────────────────

export interface QuestionCardProps {
    question: Question;
    submissionId: string;
    studentId: string;
    assignmentId: string;
    /** Assignment-level description passed to AI for context (combined with question text). */
    assignmentDescription?: string;
    /** Pre-loaded text from a previous auto-save, or empty string. */
    initialAnswer?: string;
    /** Saved AI feedback loaded from DB — shown immediately without re-calling the API. */
    initialFeedback?: LiveFeedback | null;
    /** Saved plagiarism result loaded from DB — shown immediately without re-calling the API. */
    initialPlagiarism?: LivePlagiarismResult | null;
    /** True once the submission has been officially submitted. */
    disabled?: boolean;
    /** Fired on every keystroke so the parent page can track overall progress. */
    onAnswerChange: (questionId: string, text: string) => void;
    /** Fired whenever the projected grade changes (null = no feedback yet). */
    onGradeChange?: (questionId: string, grade: number | null) => void;
    /** Fired whenever the live AI feedback changes. */
    onFeedbackChange?: (questionId: string, feedback: LiveFeedback | null) => void;
    /** Fired whenever the live plagiarism result changes. */
    onPlagiarismChange?: (questionId: string, result: LivePlagiarismResult | null) => void;
    /** 0-based index for display order. */
    questionIndex: number;
}

// ─── Component ────────────────────────────────────────────────

export function QuestionCard({
    question,
    submissionId,
    studentId,
    assignmentId,
    assignmentDescription,
    initialAnswer = '',
    initialFeedback = null,
    initialPlagiarism = null,
    disabled = false,
    onAnswerChange,
    onGradeChange,
    onFeedbackChange,
    onPlagiarismChange,
    questionIndex,
}: QuestionCardProps) {

    console.debug('[QuestionCard] render — questionId:', question.id, '| index:', questionIndex, '| submissionId:', submissionId, '| initialAnswer.length:', (initialAnswer ?? '').length, '| hasSavedFeedback:', !!initialFeedback, '| hasSavedPlagiarism:', !!initialPlagiarism);

    // ── Hook: all debounced behaviour ─────────────────────────
    // Build the prompt sent to the AI: include assignment description (if any) so the
    // model has full context when scoring relevance.
    const questionPrompt = assignmentDescription
        ? `${assignmentDescription}\n\n${question.text}`
        : question.text;

    const {
        answerText,
        liveFeedback,
        feedbackLoading,
        plagiarismResult,
        plagiarismLoading,
        autoSaving,
        lastSaved,
        saveError,
        handleChange,
    } = useAnswerEditor({
        submissionId,
        questionId: question.id,
        questionText: questionPrompt,
        studentId,
        assignmentId,
        initialText: initialAnswer,
        expectedWordCount: question.expectedWordCount,
        maxPoints: question.maxPoints ?? undefined,
        initialFeedback,
        initialPlagiarism,
    });

    // Projected grade — recalculate whenever feedback/plagiarism/text changes.
    const maxPoints = question.maxPoints ?? 10;
    const wordCount = answerText.trim() === '' ? 0 : answerText.trim().split(/\s+/).length;
    const projectedGrade = calcProjectedGrade(
        liveFeedback,
        plagiarismResult,
        wordCount,
        question.expectedWordCount,
        maxPoints,
    );

    // Notify parent whenever projected grade changes.
    useEffect(() => {
        onGradeChange?.(question.id, projectedGrade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectedGrade]);

    // Notify parent whenever live AI feedback changes.
    useEffect(() => {
        onFeedbackChange?.(question.id, liveFeedback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveFeedback]);

    // Notify parent whenever live plagiarism result changes.
    useEffect(() => {
        onPlagiarismChange?.(question.id, plagiarismResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plagiarismResult]);

    // Propagate text to parent for progress tracking.
    const handleTextChange = (newText: string) => {
        handleChange(newText);
        onAnswerChange(question.id, newText);
        console.debug('[QuestionCard] handleTextChange — questionId:', question.id, '| chars:', newText.length);
    };

    // ── Auto-save status indicator ────────────────────────────

    const saveIndicator = autoSaving
        ? (
            <span className="flex items-center gap-1 text-xs text-gray-400">
                <svg className="h-3 w-3 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
            </span>
        )
        : lastSaved
        ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Saved {lastSaved.toLocaleTimeString()}
            </span>
        )
        : null;

    // ── Render ────────────────────────────────────────────────

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

            {/* ── Question header ───────────────────────────── */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex flex-wrap items-start gap-3">
                {/* Question number badge */}
                <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                    {questionIndex + 1}
                </span>

                <div className="flex-1 min-w-0">
                    {/* Question text */}
                    <p className="text-sm font-medium text-gray-900 leading-snug">
                        {question.text}
                    </p>

                    {/* Optional description / hint */}
                    {question.description && (
                        <p className="mt-1 text-xs text-gray-500">{question.description}</p>
                    )}
                </div>

                {/* Expected word count badge */}
                {question.expectedWordCount != null && (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                        Target: {question.expectedWordCount} words
                    </span>
                )}

                {/* Required badge */}
                {question.isRequired && (
                    <span className="flex-shrink-0 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Required
                    </span>
                )}
            </div>

            {/* ── Body (editor + feedback) ─────────────────── */}
            <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* ── Left: editor + plagiarism + save status ── */}
                    <div className="flex-1 flex flex-col gap-3">
                        <RichTextEditor
                            value={answerText}
                            onChange={handleTextChange}
                            placeholder={`Write your answer here…`}
                            disabled={disabled}
                            expectedWordCount={question.expectedWordCount}
                            maxWordCount={question.maxWordCount}
                            ariaLabel={`Answer for question ${questionIndex + 1}`}
                        />

                        {/* Plagiarism warning — invisible unless severity ≥ LOW with a result */}
                        <PlagiarismWarning result={plagiarismResult} loading={plagiarismLoading} />

                        {/* Auto-save failure warning */}
                        {!disabled && saveError && (
                            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                <span>{saveError}</span>
                            </div>
                        )}

                        {/* Auto-save status */}
                        {!disabled && (
                            <div className="flex justify-end min-h-[18px]">
                                {saveIndicator}
                            </div>
                        )}
                    </div>

                    {/* ── Right: AI feedback panel (sticky on desktop) ── */}
                    <div className="lg:w-72 xl:w-80 flex-shrink-0">
                        <div className="lg:sticky lg:top-4 flex flex-col gap-3">
                            <LiveFeedbackPanel
                                feedback={liveFeedback}
                                loading={feedbackLoading}
                            />

                            {/* Projected grade badge */}
                            {projectedGrade !== null && (
                                <div className={`rounded-lg border px-4 py-3 text-center ${
                                    projectedGrade / maxPoints >= 0.75
                                        ? 'bg-green-50 border-green-200'
                                        : projectedGrade / maxPoints >= 0.50
                                        ? 'bg-amber-50 border-amber-200'
                                        : 'bg-red-50 border-red-200'
                                }`}>
                                    <p className="text-xs font-medium text-gray-500 mb-0.5">Projected Grade</p>
                                    <p className={`text-xl font-bold ${
                                        projectedGrade / maxPoints >= 0.75
                                            ? 'text-green-700'
                                            : projectedGrade / maxPoints >= 0.50
                                            ? 'text-amber-700'
                                            : 'text-red-700'
                                    }`}>
                                        {projectedGrade} <span className="text-sm font-normal text-gray-400">/ {maxPoints}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">Instructor may adjust</p>
                                </div>
                            )}
                            {feedbackLoading && !liveFeedback && (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center animate-pulse">
                                    <p className="text-xs text-gray-400">Calculating grade…</p>
                                </div>
                            )}

                            {disabled && liveFeedback && (
                                <p className="text-xs text-gray-400 text-center">
                                    AI feedback from your last submission
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
