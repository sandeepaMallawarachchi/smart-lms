'use client';

/**
 * SubmissionCard.tsx
 * ─────────────────────────────────────────────────────────────
 * A rich summary card that represents a single student submission.
 * Used in both student views (my-submissions) and lecturer views
 * (all-submissions). The `showStudent` prop toggles the student
 * name section so the same component works in both contexts.
 *
 * Responsibilities:
 *  • Render status badge with appropriate icon and colour per status.
 *  • Render grade, plagiarism, and AI score chips when data is present.
 *  • Show a lecturer-feedback snippet when one exists.
 *  • Expose four optional action buttons: View, Versions, Plagiarism, Delete.
 *    Buttons are only rendered when the corresponding callback prop is provided,
 *    so unused actions produce no empty space.
 *  • Delete button is only visible when the submission is in DRAFT status
 *    (submitted / graded submissions cannot be deleted by students).
 *
 * Debug:
 *  All console.debug calls are prefixed with "[SubmissionCard]" so they can
 *  be filtered in the browser DevTools console.
 */

import React from 'react';
import {
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Eye,
    FileText,
    GitBranch,
    Shield,
    Star,
    Trash2,
    AlertTriangle,
} from 'lucide-react';
import type { Submission, SubmissionStatus } from '@/types/submission.types';

// ─── Status configuration ─────────────────────────────────────
//
// Maps every SubmissionStatus to the human-readable label, Lucide icon,
// and Tailwind colour classes used for the StatusBadge pill.
// Using a lookup object (instead of a switch) keeps the component tree
// simple and makes adding new statuses trivial.

const STATUS_CONFIG: Record<
    SubmissionStatus,
    { label: string; icon: React.ElementType; classes: string }
> = {
    DRAFT: {
        label: 'Draft',
        icon: Clock,
        classes: 'bg-gray-100 text-gray-700',
    },
    SUBMITTED: {
        label: 'Submitted',
        icon: CheckCircle2,
        classes: 'bg-purple-100 text-purple-700',
    },
    GRADED: {
        label: 'Graded',
        icon: Award,
        // Green conveys a positive outcome (grading is complete).
        classes: 'bg-green-100 text-green-700',
    },
    LATE: {
        label: 'Late Submission',
        icon: AlertTriangle,
        // Orange signals a warning without being as severe as red.
        classes: 'bg-orange-100 text-orange-700',
    },
    PENDING_REVIEW: {
        label: 'Pending Review',
        icon: Clock,
        // Amber: action may be needed soon.
        classes: 'bg-amber-100 text-amber-700',
    },
    FLAGGED: {
        label: 'Flagged',
        icon: AlertTriangle,
        // Red: plagiarism or integrity concern — requires immediate attention.
        classes: 'bg-red-100 text-red-700',
    },
};

// ─── StatusBadge ─────────────────────────────────────────────
//
// Pill-shaped badge rendered next to the assignment title.
// Falls back to the SUBMITTED style when the status is not found in
// STATUS_CONFIG (defensive: handles future API additions gracefully).
// For GRADED submissions, appends the numeric grade in parentheses.

function StatusBadge({ status, grade }: { status: SubmissionStatus; grade?: number }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.SUBMITTED;
    const Icon = cfg.icon;
    return (
        <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${cfg.classes}`}
        >
            <Icon size={13} />
            {cfg.label}
            {/* Append "(grade%)" only when graded and a numeric grade exists */}
            {status === 'GRADED' && grade != null ? ` (${grade}%)` : ''}
        </span>
    );
}

// ─── ScoreChip ────────────────────────────────────────────────
//
// Small metric tile (grade, plagiarism score, AI score).
// Fully generic: the caller provides the colour/background/border classes
// so each chip can use its own colour scheme without ScoreChip needing
// to know what it's displaying.
//
// Props:
//   label      — visible label above the value (e.g. "Grade")
//   value      — the number or string to display prominently
//   suffix     — unit appended to value (e.g. "%")
//   colorClass — Tailwind text colour for the large value
//   bgClass    — Tailwind background colour for the tile
//   borderClass — Tailwind border colour for the tile
//   icon       — Lucide icon rendered before the label

function ScoreChip({
    label,
    value,
    suffix = '',
    colorClass,
    bgClass,
    borderClass,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    suffix?: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    icon: React.ElementType;
}) {
    return (
        <div className={`p-3 border rounded-lg ${bgClass} ${borderClass}`}>
            <div className={`flex items-center gap-1 text-xs text-gray-600 mb-1`}>
                <Icon size={14} />
                {label}
            </div>
            <div className={`text-xl font-bold ${colorClass}`}>
                {value}
                {suffix}
            </div>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────

export interface SubmissionCardProps {
    submission: Submission;
    /** Called with submission.id when the "View Details" button is clicked. */
    onView?: (id: string) => void;
    /** Called with submission.id when the "Versions" button is clicked. */
    onVersionHistory?: (id: string) => void;
    /** Called with submission.id when the "Plagiarism" button is clicked. */
    onPlagiarismReport?: (id: string) => void;
    /** Called with submission.id when the "Delete" button is clicked (DRAFT only). */
    onDelete?: (id: string) => void;
    /** When true, displays the student name row (used in lecturer views). */
    showStudent?: boolean;
}

// ─── Component ────────────────────────────────────────────────

export default function SubmissionCard({
    submission,
    onView,
    onVersionHistory,
    onPlagiarismReport,
    onDelete,
    showStudent = false,
}: SubmissionCardProps) {
    console.debug(
        '[SubmissionCard] render — id:', submission.id,
        '| status:', submission.status,
        '| grade:', submission.grade ?? 'n/a',
        '| plagiarism:', submission.plagiarismScore ?? 0, '%'
    );

    // ── Plagiarism colour thresholds ───────────────────────────
    // < 10%  → green  (safe / original)
    // 10–19% → amber  (minor concern, monitor)
    // ≥ 20%  → red    (requires review, matches FLAGGED threshold)
    const plagiarism = submission.plagiarismScore ?? 0;
    const plagiarismColor =
        plagiarism < 10 ? 'text-green-600' : plagiarism < 20 ? 'text-amber-600' : 'text-red-600';
    const plagiarismBg =
        plagiarism < 10 ? 'bg-green-50' : plagiarism < 20 ? 'bg-amber-50' : 'bg-red-50';
    const plagiarismBorder =
        plagiarism < 10 ? 'border-green-200' : plagiarism < 20 ? 'border-amber-200' : 'border-red-200';

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                {/* ── Left Section ──────────────────────────────── */}
                <div className="flex-1">
                    {/* Header row: colour-coded icon + title + status badge */}
                    <div className="flex items-start gap-4 mb-4">
                        {/*
                         * Icon background changes with submission status:
                         * GRADED → green, SUBMITTED → purple, everything else → amber.
                         * This gives an immediate at-a-glance colour signal.
                         */}
                        <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                                submission.status === 'GRADED'
                                    ? 'bg-green-100'
                                    : submission.status === 'SUBMITTED'
                                    ? 'bg-purple-100'
                                    : 'bg-amber-100'
                            }`}
                        >
                            <FileText
                                size={24}
                                className={
                                    submission.status === 'GRADED'
                                        ? 'text-green-600'
                                        : submission.status === 'SUBMITTED'
                                        ? 'text-purple-600'
                                        : 'text-amber-600'
                                }
                            />
                        </div>

                        <div className="flex-1">
                            {/* Title + StatusBadge on the same line (wraps on narrow screens) */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {submission.assignmentTitle ?? 'Untitled Submission'}
                                </h3>
                                <StatusBadge
                                    status={submission.status}
                                    grade={submission.grade}
                                />
                            </div>

                            {/* Student name row — only shown in lecturer view */}
                            {showStudent && submission.studentName && (
                                <p className="text-sm text-gray-700 mb-1">
                                    <span className="font-medium">{submission.studentName}</span>
                                    {submission.studentRegistrationId && (
                                        <span className="text-gray-500 ml-2">
                                            ({submission.studentRegistrationId})
                                        </span>
                                    )}
                                </p>
                            )}

                            {/* Module code + name */}
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                {submission.moduleCode && (
                                    <span className="font-medium text-gray-700">
                                        {submission.moduleCode}
                                    </span>
                                )}
                                {submission.moduleName && (
                                    <>
                                        <span>•</span>
                                        <span>{submission.moduleName}</span>
                                    </>
                                )}
                            </div>

                            {/* Metadata row: submission date, version count, word count */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                {submission.submittedAt && (
                                    <div className="flex items-center gap-1">
                                        <Calendar size={15} />
                                        <span>
                                            Submitted{' '}
                                            {new Date(submission.submittedAt).toLocaleDateString(
                                                'en-US',
                                                {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                }
                                            )}
                                        </span>
                                    </div>
                                )}
                                {/* Version indicator — always shown (every submission has ≥1 version) */}
                                <div className="flex items-center gap-1 text-purple-600 font-medium">
                                    <GitBranch size={15} />
                                    <span>
                                        {submission.totalVersions} version
                                        {submission.totalVersions !== 1 ? 's' : ''} • v
                                        {submission.currentVersionNumber}
                                    </span>
                                </div>
                                {submission.wordCount != null && (
                                    <div className="flex items-center gap-1">
                                        <FileText size={15} />
                                        <span>{submission.wordCount.toLocaleString()} words</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Score chips ───────────────────────────────── */}
                    {/*
                     * Up to 3 chips: Grade (only when graded), Plagiarism (always),
                     * AI Score (only when the backend has generated one).
                     * The 4-column grid degrades gracefully on narrow screens (2 cols → 1 col).
                     */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {submission.grade != null && (
                            <ScoreChip
                                label="Grade"
                                value={submission.grade}
                                suffix="%"
                                colorClass="text-green-600"
                                bgClass="bg-green-50"
                                borderClass="border-green-200"
                                icon={Award}
                            />
                        )}
                        <ScoreChip
                            label="Plagiarism"
                            value={plagiarism}
                            suffix="%"
                            colorClass={plagiarismColor}
                            bgClass={plagiarismBg}
                            borderClass={plagiarismBorder}
                            icon={Shield}
                        />
                        {submission.aiScore != null && (
                            <ScoreChip
                                label="AI Score"
                                value={`${submission.aiScore}/100`}
                                colorClass="text-purple-600"
                                bgClass="bg-purple-50"
                                borderClass="border-purple-200"
                                icon={Star}
                            />
                        )}
                    </div>

                    {/* ── Lecturer feedback snippet ─────────────────── */}
                    {/* Rendered only when lecturerFeedback exists. Capped at 2 lines
                        to keep the card compact; full feedback is visible on the details page. */}
                    {submission.lecturerFeedback && (
                        <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-sm text-blue-800">
                            <p className="font-medium text-blue-900 text-xs mb-1">
                                Lecturer Feedback:
                            </p>
                            <p className="line-clamp-2">{submission.lecturerFeedback}</p>
                        </div>
                    )}
                </div>

                {/* ── Right Section — action buttons ────────────── */}
                {/*
                 * Each button is only rendered when its corresponding callback prop
                 * was provided. This prevents empty button groups in contexts where
                 * certain actions are not available (e.g. no delete in lecturer view).
                 *
                 * min-w-[140px] ensures buttons stay readable on wide screens without
                 * the right column becoming too narrow.
                 */}
                <div className="flex flex-col gap-2 lg:min-w-[140px]">
                    {onView && (
                        <button
                            onClick={() => {
                                console.debug('[SubmissionCard] "View Details" clicked — id:', submission.id);
                                onView(submission.id);
                            }}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2 justify-center text-sm cursor-pointer"
                        >
                            <Eye size={16} />
                            View Details
                        </button>
                    )}
                    {onVersionHistory && (
                        <button
                            onClick={() => {
                                console.debug('[SubmissionCard] "Versions" clicked — id:', submission.id);
                                onVersionHistory(submission.id);
                            }}
                            className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium flex items-center gap-2 justify-center text-sm cursor-pointer"
                        >
                            <GitBranch size={16} />
                            Versions
                        </button>
                    )}
                    {onPlagiarismReport && (
                        <button
                            onClick={() => {
                                console.debug('[SubmissionCard] "Plagiarism" clicked — id:', submission.id);
                                onPlagiarismReport(submission.id);
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2 justify-center text-sm cursor-pointer"
                        >
                            <Shield size={16} />
                            Plagiarism
                        </button>
                    )}
                    {/*
                     * Delete is only available for DRAFT submissions.
                     * Submitted / graded submissions are locked server-side and the
                     * button is hidden here to match that contract.
                     */}
                    {onDelete && submission.status === 'DRAFT' && (
                        <button
                            onClick={() => {
                                console.debug('[SubmissionCard] "Delete" clicked — id:', submission.id);
                                onDelete(submission.id);
                            }}
                            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center gap-2 justify-center text-sm cursor-pointer"
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
