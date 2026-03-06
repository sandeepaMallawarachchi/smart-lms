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

import { useAnswerEditor } from '@/hooks/useAnswerEditor';
import { RichTextEditor } from './RichTextEditor';
import { LiveFeedbackPanel } from './LiveFeedbackPanel';
import { PlagiarismWarning } from './PlagiarismWarning';
import type { Question } from '@/types/submission.types';

// ─── Props ────────────────────────────────────────────────────

export interface QuestionCardProps {
    question: Question;
    submissionId: string;
    studentId: string;
    assignmentId: string;
    /** Pre-loaded text from a previous auto-save, or empty string. */
    initialAnswer?: string;
    /** True once the submission has been officially submitted. */
    disabled?: boolean;
    /** Fired on every keystroke so the parent page can track overall progress. */
    onAnswerChange: (questionId: string, text: string) => void;
    /** 0-based index for display order. */
    questionIndex: number;
}

// ─── Component ────────────────────────────────────────────────

export function QuestionCard({
    question,
    submissionId,
    studentId,
    assignmentId,
    initialAnswer = '',
    disabled = false,
    onAnswerChange,
    questionIndex,
}: QuestionCardProps) {

    console.debug('[QuestionCard] render — questionId:', question.id, '| index:', questionIndex, '| submissionId:', submissionId, '| initialAnswer.length:', (initialAnswer ?? '').length);

    // ── Hook: all debounced behaviour ─────────────────────────
    const {
        answerText,
        liveFeedback,
        feedbackLoading,
        plagiarismResult,
        plagiarismLoading,
        autoSaving,
        lastSaved,
        handleChange,
    } = useAnswerEditor({
        submissionId,
        questionId: question.id,
        questionText: question.text,
        studentId,
        assignmentId,
        initialText: initialAnswer,
        expectedWordCount: question.expectedWordCount,
    });

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
