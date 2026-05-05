'use client';

/**
 * RichTextEditor.tsx
 * ─────────────────────────────────────────────────────────────
 * A styled, auto-resizing textarea for student text answers.
 *
 * Deliberately avoids third-party rich-text libraries (Tiptap, Quill, etc.)
 * to keep the bundle lean. Core features:
 *
 *  • Auto-resize: the textarea grows vertically as the student types —
 *    no awkward scrollbars inside the editor.
 *  • Word-count progress bar + numeric display at the bottom-right.
 *    Colour shifts: green ≥ 80 % of target, amber 50–79 %, red < 50 %.
 *  • Spell-check enabled.
 *  • Disabled state (read-only appearance after submission).
 *  • Minimum height 160 px; no maximum (grows with content).
 *
 * Debug:
 *  All console.debug calls are prefixed with "[RichTextEditor]".
 */

import { useRef, useCallback, useEffect } from 'react';

// ─── Props ────────────────────────────────────────────────────

export interface RichTextEditorProps {
    /** Controlled value (the current answer text). */
    value: string;
    /** Called on every keystroke with the new raw string. */
    onChange: (newText: string) => void;
    /** Placeholder shown when the editor is empty. */
    placeholder?: string;
    /** When true, textarea is read-only and styled as disabled. */
    disabled?: boolean;
    /** Target word count — used for the progress bar. */
    expectedWordCount?: number;
    /** Hard cap on words (UI-only warning; backend may enforce separately). */
    maxWordCount?: number;
    /** Optional accessible label for the textarea. */
    ariaLabel?: string;
}

// ─── Helpers ──────────────────────────────────────────────────

/** Count words by splitting on whitespace and filtering empties. */
function countWords(text: string): number {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

/**
 * Returns Tailwind colour classes for the progress bar fill based on
 * what fraction of the expected word count the student has reached.
 *
 *   ≥ 80 % → green  (bg-green-500)
 *   50–79 % → amber (bg-amber-400)
 *   < 50 %  → red   (bg-red-400)
 */
function barColour(words: number, expected: number): string {
    const pct = expected > 0 ? (words / expected) * 100 : 100;
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-amber-400';
    return 'bg-red-400';
}

/**
 * Returns Tailwind text colour classes for the "X / Y words" label,
 * mirroring the bar colour logic.
 */
function labelColour(words: number, expected: number): string {
    const pct = expected > 0 ? (words / expected) * 100 : 100;
    if (pct >= 80) return 'text-green-700';
    if (pct >= 50) return 'text-amber-600';
    return 'text-red-600';
}

// ─── Component ────────────────────────────────────────────────

export function RichTextEditor({
    value,
    onChange,
    placeholder = 'Type your answer here…',
    disabled = false,
    expectedWordCount,
    maxWordCount,
    ariaLabel,
}: RichTextEditorProps) {

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const wordCount = countWords(value);

    // ── Auto-resize ───────────────────────────────────────────
    /**
     * Shrink to 'auto' first so the scrollHeight measurement reflects the
     * true content height (not the previously set height). Then apply it.
     * Called on every value change and on initial mount.
     */
    const syncHeight = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, []);

    // Resize whenever value changes (e.g. when initialText is pre-filled).
    useEffect(() => {
        syncHeight();
    }, [value, syncHeight]);

    // ── Change handler ────────────────────────────────────────
    const handleInput = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newText = e.target.value;
            const words = countWords(newText);
            // console.debug('[RichTextEditor] onChange — words:', words, '| chars:', newText.length, '| expectedWordCount:', expectedWordCount ?? '(none)');
            onChange(newText);
            // Height sync happens via the useEffect above (value change).
        },
        [onChange, expectedWordCount]
    );

    // ── Derived display values ────────────────────────────────

    /** Fraction of target reached, clamped to [0, 1]. */
    const progressFraction = expectedWordCount
        ? Math.min(1, wordCount / expectedWordCount)
        : null;

    /** Warning when student exceeds the optional hard cap. */
    const overLimit = maxWordCount != null && wordCount > maxWordCount;

    // ── Render ────────────────────────────────────────────────

    return (
        <div className="relative flex flex-col gap-2">

            {/* ── Textarea ────────────────────────────────────── */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInput}
                placeholder={placeholder}
                disabled={disabled}
                spellCheck
                aria-label={ariaLabel}
                rows={6}
                style={{ minHeight: '160px', resize: 'none', overflow: 'hidden' }}
                className={[
                    'w-full rounded-lg border px-4 py-3 text-sm leading-relaxed',
                    'focus:outline-none focus:ring-2 transition-colors duration-150',
                    disabled
                        ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-purple-400 focus:ring-purple-200',
                    overLimit
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                        : '',
                ].join(' ')}
            />

            {/* ── Bottom bar ──────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3">

                {/* Progress bar (only when expectedWordCount is provided) */}
                {progressFraction !== null ? (
                    <div className="flex-1">
                        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${barColour(wordCount, expectedWordCount!)}`}
                                style={{ width: `${progressFraction * 100}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    /* No target — spacer so the word count label stays right-aligned */
                    <div className="flex-1" />
                )}

                {/* Word count label */}
                <span
                    className={`text-sm font-medium tabular-nums whitespace-nowrap ${
                        overLimit
                            ? 'text-red-600'
                            : expectedWordCount
                            ? labelColour(wordCount, expectedWordCount)
                            : 'text-gray-500'
                    }`}
                >
                    {expectedWordCount
                        ? `${wordCount} / ${expectedWordCount} words`
                        : `${wordCount} word${wordCount !== 1 ? 's' : ''}`}
                    {overLimit && (
                        <span className="ml-1 text-red-500">
                            (max {maxWordCount})
                        </span>
                    )}
                </span>
            </div>
        </div>
    );
}
