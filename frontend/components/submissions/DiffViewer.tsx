'use client';

/**
 * DiffViewer.tsx
 * ─────────────────────────────────────────────────────────────
 * Renders a unified-diff view comparing two versions of a submission.
 * Used in the student "Version History" page after the user selects
 * two versions to compare via VersionTimeline.
 *
 * Responsibilities:
 *  • Render each changed file as a collapsible FileDiffSection.
 *  • Within each section, show diff hunks with line-level add/remove/context.
 *  • Display per-file addition/deletion counts and a global summary in the
 *    header bar.
 *  • Handle loading, error, and empty-diff (identical versions) states.
 *
 * Data model:
 *  • FileDiff      — one changed file, contains an array of DiffHunk.
 *  • DiffHunk      — a contiguous block of changes with an old/new line range.
 *  • DiffLine      — a single line with type: 'add' | 'remove' | 'context'.
 *
 * Line styling helpers (lineClass, lineTextClass, linePrefix):
 *   'add'    → green background / text, Plus icon, strikethrough removed
 *   'remove' → red background / text, Minus icon, line-through + opacity
 *   'context'→ white background, neutral text, blank spacer instead of icon
 *
 * Hunk header format follows the unified-diff standard:
 *   @@ -oldStart +newStart @@
 *
 * Debug:
 *  All console.debug calls are prefixed with "[DiffViewer]" or
 *  "[FileDiffSection]" so they can be filtered in the browser DevTools console.
 */

import React, { useState } from 'react';
import { GitBranch, Plus, Minus, FileText } from 'lucide-react';
import type { FileDiff, DiffLine } from '@/types/submission.types';

// ─── Line styling helpers ─────────────────────────────────────
//
// These three small helpers are kept as standalone functions (not inline
// ternaries in JSX) so the colour logic is documented in one place and
// easy to adjust if the theme changes.

/**
 * lineClass — Tailwind classes for the full line row background + left border.
 * 'add'    → green bg + bold green left border
 * 'remove' → red bg + bold red left border
 * 'context'→ plain white (no coloured border)
 */
function lineClass(type: DiffLine['type']): string {
    switch (type) {
        case 'add':
            return 'bg-green-50 border-l-4 border-green-500';
        case 'remove':
            return 'bg-red-50 border-l-4 border-red-500';
        default:
            return 'bg-white';
    }
}

/**
 * lineTextClass — Tailwind classes for the line content text colour.
 * 'remove' also applies line-through + reduced opacity to make deleted text
 * visually "struck out" without hiding it.
 */
function lineTextClass(type: DiffLine['type']): string {
    switch (type) {
        case 'add':
            return 'text-green-800';
        case 'remove':
            return 'text-red-800 line-through opacity-60';
        default:
            return 'text-gray-700';
    }
}

/**
 * linePrefix — The +/- indicator icon rendered at the left of each line.
 * 'add'    → Plus icon (green)
 * 'remove' → Minus icon (red)
 * 'context'→ blank spacer (same width as the icons) for alignment
 */
function linePrefix(type: DiffLine['type']): React.ReactNode {
    if (type === 'add')
        return <Plus size={14} className="text-green-600 shrink-0" />;
    if (type === 'remove')
        return <Minus size={14} className="text-red-600 shrink-0" />;
    // Return an empty spacer so context lines align with add/remove lines
    return <span className="w-3.5 shrink-0" />;
}

// ─── FileDiffSection ─────────────────────────────────────────
//
// Renders one file's diff within a collapsible card.
//
// The file header shows:
//   [file icon] filename.ext          +added -removed ▼
//
// Clicking the header toggles the diff body (collapsed state).
// The body contains all hunks for this file, each preceded by a
// standard unified-diff hunk header: "@@ -oldStart +newStart @@"

function FileDiffSection({ diff }: { diff: FileDiff }) {
    // collapsed=false by default so diffs are immediately visible
    const [collapsed, setCollapsed] = useState(false);

    // ── Compute totals across all hunks for this file ──────────
    // These are shown in the file header so the user can gauge the
    // extent of changes without expanding the diff body.
    const totalAdded = diff.hunks.reduce(
        (n, h) => n + h.lines.filter((l) => l.type === 'add').length,
        0
    );
    const totalRemoved = diff.hunks.reduce(
        (n, h) => n + h.lines.filter((l) => l.type === 'remove').length,
        0
    );

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 last:mb-0">
            {/* ── File header ─────────────────────────────────── */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => {
                    console.debug(
                        '[FileDiffSection] collapse toggle for', diff.fileName,
                        '→', !collapsed ? 'collapsed' : 'expanded'
                    );
                    setCollapsed(!collapsed);
                }}
            >
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-600" />
                    <span className="font-mono text-sm font-semibold text-gray-800">
                        {diff.fileName}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                    {/* Green = additions, red = deletions — standard diff convention */}
                    <span className="text-green-600">+{totalAdded}</span>
                    <span className="text-red-600">-{totalRemoved}</span>
                    {/* ▶ when collapsed, ▼ when expanded */}
                    <span className="text-gray-400 text-base leading-none">
                        {collapsed ? '▶' : '▼'}
                    </span>
                </div>
            </div>

            {/* ── Diff body ───────────────────────────────────── */}
            {!collapsed && (
                <div className="overflow-x-auto">
                    {diff.hunks.map((hunk, hi) => (
                        <div key={hi}>
                            {/*
                             * Hunk header — standard unified-diff format:
                             *   @@ -oldStart +newStart @@
                             * oldStart = first line of this hunk in the old file
                             * newStart = first line of this hunk in the new file
                             * Shown in blue to differentiate from actual diff lines.
                             */}
                            <div className="px-4 py-1.5 bg-blue-50 border-y border-blue-100 font-mono text-xs text-blue-600">
                                @@ -{hunk.oldStart} +{hunk.newStart} @@
                            </div>

                            {/* ── Lines within this hunk ──────────── */}
                            {hunk.lines.map((line, li) => (
                                <div
                                    key={li}
                                    className={`flex items-start gap-2 px-4 py-1 font-mono text-xs ${lineClass(line.type)}`}
                                >
                                    {/*
                                     * Optional line number column.
                                     * Not all diff data includes line numbers (depends on
                                     * the server's diff generator), so we only render the
                                     * column when lineNumber is present.
                                     */}
                                    {line.lineNumber != null && (
                                        <span className="text-gray-400 select-none w-8 text-right shrink-0">
                                            {line.lineNumber}
                                        </span>
                                    )}
                                    {/* +/- indicator or blank spacer */}
                                    {linePrefix(line.type)}
                                    {/* Line content — pre-wrap preserves indentation */}
                                    <span className={`whitespace-pre-wrap break-all ${lineTextClass(line.type)}`}>
                                        {line.content}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────

export interface DiffViewerProps {
    /** Array of per-file diffs returned by the Version service. */
    diffs: FileDiff[];
    /**
     * Version number (or ID) of the "from" version.
     * Used only for the header label (e.g. "v1 → v2").
     */
    versionA?: string | number;
    /**
     * Version number (or ID) of the "to" version.
     * Used only for the header label.
     */
    versionB?: string | number;
    /** True while the diff API request is in-flight. */
    loading?: boolean;
    /** Error message when the diff fetch fails. */
    error?: string | null;
    className?: string;
}

// ─── Component ────────────────────────────────────────────────

export default function DiffViewer({
    diffs,
    versionA,
    versionB,
    loading = false,
    error = null,
    className = '',
}: DiffViewerProps) {
    // ── Global totals across all files ────────────────────────
    // Aggregated from the nested hunk → line structure so the header
    // can show a single "N additions / M deletions / K files changed" line.
    const totalAdded = diffs.reduce(
        (n, d) =>
            n + d.hunks.reduce((m, h) => m + h.lines.filter((l) => l.type === 'add').length, 0),
        0
    );
    const totalRemoved = diffs.reduce(
        (n, d) =>
            n + d.hunks.reduce((m, h) => m + h.lines.filter((l) => l.type === 'remove').length, 0),
        0
    );

    console.debug(
        '[DiffViewer] render — vA:', versionA ?? 'n/a', '→ vB:', versionB ?? 'n/a',
        '| files:', diffs.length,
        '| +', totalAdded, '-', totalRemoved,
        '| loading:', loading,
        '| error:', error ?? 'none'
    );

    // ── Loading state ──────────────────────────────────────────
    if (loading) {
        console.debug('[DiffViewer] Rendering loading skeleton.');
        return (
            <div className={`animate-pulse space-y-2 ${className}`}>
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-40 bg-gray-50 rounded-lg" />
                <div className="h-6 bg-gray-100 rounded" />
            </div>
        );
    }

    // ── Error state ────────────────────────────────────────────
    if (error) {
        console.debug('[DiffViewer] Rendering error state:', error);
        return (
            <div className={`p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 ${className}`}>
                {error}
            </div>
        );
    }

    // ── Empty diff (versions are identical) ───────────────────
    if (!diffs.length) {
        console.debug('[DiffViewer] Rendering empty state — no differences between versions.');
        return (
            <div className={`flex flex-col items-center py-12 text-gray-500 ${className}`}>
                <GitBranch size={40} className="text-gray-300 mb-3" />
                <p className="font-medium">No differences found</p>
                <p className="text-sm text-gray-400 mt-1">
                    These versions appear to be identical.
                </p>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* ── Global diff header ───────────────────────────── */}
            {/*
             * Shown only when version labels are provided.
             * Left side: "v1 → v2" navigation breadcrumb.
             * Right side: aggregate addition / deletion / file counts.
             * vA is styled red (old), vB is styled green (new) to match
             * the conventional "red = before, green = after" diff colour scheme.
             */}
            {(versionA || versionB) && (
                <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                        <GitBranch size={16} className="text-purple-600" />
                        {versionA != null && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                                v{versionA}
                            </span>
                        )}
                        <span className="text-gray-400">→</span>
                        {versionB != null && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                                v{versionB}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium">
                        <span className="text-green-600">+{totalAdded} additions</span>
                        <span className="text-red-600">-{totalRemoved} deletions</span>
                        <span className="text-gray-500">{diffs.length} file(s) changed</span>
                    </div>
                </div>
            )}

            {/* ── Per-file diffs ───────────────────────────────── */}
            {/*
             * Key includes both fileName and index to handle edge cases where
             * the same filename appears more than once (e.g. a rename that the
             * API represents as delete + create of the same name).
             */}
            {diffs.map((diff, i) => (
                <FileDiffSection key={`${diff.fileName}-${i}`} diff={diff} />
            ))}
        </div>
    );
}
