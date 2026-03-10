'use client';

/**
 * FileUploader.tsx
 * ─────────────────────────────────────────────────────────────
 * Drag-and-drop + click-to-browse file upload widget used in
 * the student "Submit Assignment" flow.
 *
 * Responsibilities:
 *  • Render a drop zone that highlights on drag-over.
 *  • Accept files via drag-and-drop OR the hidden <input type="file">.
 *  • Validate each file against the maxSizeMB limit and duplicate check.
 *  • Propagate the merged file list upward via onFilesChange.
 *  • Display per-file upload progress bars when the parent provides
 *    the uploadProgress map (fileName → 0-100).
 *
 * Debug:
 *  All console.debug calls are prefixed with "[FileUploader]" so they
 *  can be easily filtered in the browser DevTools console.
 *  In production builds they are no-ops because most bundlers strip
 *  console.debug in minified output, but if needed you can set
 *  process.env.NEXT_PUBLIC_DEBUG_UPLOADS=true to see them.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────

const DEFAULT_MAX_MB = 50; // 50 MB per-file ceiling
const DEFAULT_ACCEPT =
    '.pdf,.docx,.doc,.txt,.zip,.rar,.py,.java,.js,.ts,.jsx,.tsx,.html,.css,.json,.md';

/**
 * MIME types explicitly allowed by our validation.
 * We include 'application/octet-stream' as a catch-all for text-based
 * source files whose OS MIME type may not be recognised at the browser level.
 * Final validation still happens server-side in the Submission service.
 */
const ALLOWED_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-zip-compressed',
    'text/x-python',
    'text/javascript',
    'text/html',
    'text/css',
    'application/json',
    'text/markdown',
    'application/octet-stream', // generic — let server validate further
]);

// ─── Types ────────────────────────────────────────────────────

export interface FileUploaderProps {
    /** Called whenever the selected file list changes (add or remove). */
    onFilesChange: (files: File[]) => void;
    /** Current list of selected files (controlled). */
    files: File[];
    /** Maximum allowed size per file in megabytes. Defaults to 50. */
    maxSizeMB?: number;
    /** Accepted file extension filter for the file picker. */
    accept?: string;
    /** Allow picking more than one file at a time. Defaults to true. */
    multiple?: boolean;
    /** When true the drop zone is visually disabled and ignores events. */
    disabled?: boolean;
    /**
     * Per-file upload progress map keyed by File.name.
     * Values: 0–100. 100 shows a green check mark instead of the remove button.
     * Provided by the parent after it starts uploading via the API.
     */
    uploadProgress?: Record<string, number>;
    className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * formatBytes — human-readable file size.
 * e.g. 1536 → "1.5 KB", 2097152 → "2.0 MB"
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * getFileIcon — emoji icon based on file extension for visual flair.
 * Returns a generic paperclip for unknown extensions.
 */
function getFileIcon(file: File): string {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) return '📄';
    if (name.endsWith('.zip') || name.endsWith('.rar')) return '🗜️';
    if (['.py', '.java', '.js', '.ts', '.jsx', '.tsx'].some((ext) => name.endsWith(ext)))
        return '💻';
    if (['.html', '.css', '.json'].some((ext) => name.endsWith(ext))) return '🌐';
    if (['.doc', '.docx', '.txt', '.md'].some((ext) => name.endsWith(ext))) return '📝';
    return '📎';
}

// ─── Component ────────────────────────────────────────────────

export default function FileUploader({
    onFilesChange,
    files,
    maxSizeMB = DEFAULT_MAX_MB,
    accept = DEFAULT_ACCEPT,
    multiple = true,
    disabled = false,
    uploadProgress = {},
    className = '',
}: FileUploaderProps) {
    // Ref to the hidden <input type="file"> so we can trigger it programmatically.
    const inputRef = useRef<HTMLInputElement>(null);

    // isDragging controls the drop-zone highlight style.
    const [isDragging, setIsDragging] = useState(false);

    // Validation error messages shown below the drop zone.
    const [errors, setErrors] = useState<string[]>([]);

    /**
     * validateAndAdd
     * ──────────────
     * Core validation + merge logic called by both drag-drop and click paths.
     *
     * For each incoming file:
     *  1. Reject if it exceeds maxSizeMB.
     *  2. Reject if the exact same file (name + size) is already in the list.
     *  3. Otherwise add to the "valid" list.
     *
     * After validation, calls onFilesChange with the merged list:
     *  • multiple=true  → append valid files to existing list.
     *  • multiple=false → replace the list with only the first valid file.
     */
    const validateAndAdd = useCallback(
        (incoming: File[]) => {
            console.debug('[FileUploader] validateAndAdd called with', incoming.length, 'file(s)');

            const newErrors: string[] = [];
            const valid: File[] = [];

            for (const file of incoming) {
                console.debug('[FileUploader] Checking file:', file.name, formatBytes(file.size), file.type);

                // ── Size check
                if (file.size > maxSizeMB * 1024 * 1024) {
                    const msg = `"${file.name}" exceeds ${maxSizeMB} MB limit.`;
                    console.warn('[FileUploader] Rejected (size):', msg);
                    newErrors.push(msg);
                    continue;
                }

                // ── Duplicate check (name + size fingerprint)
                const already = files.some(
                    (f) => f.name === file.name && f.size === file.size
                );
                if (already) {
                    const msg = `"${file.name}" is already in the list.`;
                    console.warn('[FileUploader] Rejected (duplicate):', msg);
                    newErrors.push(msg);
                    continue;
                }

                valid.push(file);
                console.debug('[FileUploader] Accepted:', file.name);
            }

            setErrors(newErrors);

            if (valid.length > 0) {
                const next = multiple ? [...files, ...valid] : valid;
                console.debug('[FileUploader] Emitting onFilesChange with', next.length, 'file(s)');
                onFilesChange(next);
            } else {
                console.debug('[FileUploader] No valid files to add.');
            }
        },
        [files, maxSizeMB, multiple, onFilesChange]
    );

    // ── Drag-and-drop event handlers ──────────────────────────

    /**
     * handleDrop — fires when the user releases dragged files over the zone.
     * Prevents default browser behaviour (opening the file) and delegates
     * to validateAndAdd.
     */
    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled) {
                console.debug('[FileUploader] Drop ignored — uploader is disabled.');
                return;
            }
            const dropped = Array.from(e.dataTransfer.files);
            console.debug('[FileUploader] Drop event — files dropped:', dropped.length);
            validateAndAdd(dropped);
        },
        [disabled, validateAndAdd]
    );

    /**
     * handleDragOver — fires repeatedly while a dragged item is over the zone.
     * e.preventDefault() is required to allow the drop event to fire.
     */
    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            if (!disabled) {
                if (!isDragging) console.debug('[FileUploader] Drag over — highlighting zone.');
                setIsDragging(true);
            }
        },
        [disabled, isDragging]
    );

    /**
     * handleDragLeave — resets the highlight when the cursor leaves the zone.
     * Note: this can fire spuriously when the cursor moves over child elements;
     * the brief flicker is acceptable UX.
     */
    const handleDragLeave = useCallback(() => {
        console.debug('[FileUploader] Drag leave — removing highlight.');
        setIsDragging(false);
    }, []);

    // ── Click-to-browse handler ────────────────────────────────

    /**
     * handleInputChange — fired by the hidden <input type="file"> when the
     * user selects files through the OS picker.
     * The input value is cleared afterwards so re-selecting the same file
     * works after it has been removed from the list.
     */
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files) return;
            const selected = Array.from(e.target.files);
            console.debug('[FileUploader] Input change — files selected:', selected.length);
            validateAndAdd(selected);
            // Reset so onChange fires again if the user re-picks the same file.
            e.target.value = '';
        },
        [validateAndAdd]
    );

    // ── Remove handler ─────────────────────────────────────────

    /**
     * removeFile — removes a file at position `index` from the list.
     * The parent is notified via onFilesChange.
     */
    const removeFile = useCallback(
        (index: number) => {
            console.debug('[FileUploader] Removing file at index', index, '—', files[index]?.name);
            const next = files.filter((_, i) => i !== index);
            onFilesChange(next);
        },
        [files, onFilesChange]
    );

    // ─── Render ────────────────────────────────────────────────

    return (
        <div className={className}>
            {/* ── Drop zone ──────────────────────────────────────── */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !disabled && inputRef.current?.click()}
                className={`
                    relative border-2 border-dashed rounded-xl p-10 text-center
                    transition-all cursor-pointer select-none
                    ${isDragging
                        ? 'border-purple-500 bg-purple-50 scale-[1.01]'
                        : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                {/* Hidden native file input — triggered programmatically */}
                <input
                    ref={inputRef}
                    type="file"
                    multiple={multiple}
                    accept={accept}
                    onChange={handleInputChange}
                    disabled={disabled}
                    className="hidden"
                    aria-label="File upload"
                />

                <Upload
                    size={48}
                    className={`mx-auto mb-4 ${isDragging ? 'text-purple-500' : 'text-gray-400'}`}
                />
                <p className="text-gray-700 font-medium mb-1">
                    {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                <p className="text-xs text-gray-400">
                    Max {maxSizeMB} MB per file • PDF, DOCX, TXT, ZIP, source code files
                </p>

                {/* Explicit "Choose Files" button — stopPropagation prevents double-firing
                    the parent onClick which would also try to open the picker. */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        console.debug('[FileUploader] Choose Files button clicked.');
                        inputRef.current?.click();
                    }}
                    disabled={disabled}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors text-sm font-medium"
                >
                    <Upload size={16} />
                    Choose Files
                </button>
            </div>

            {/* ── Validation error list ──────────────────────────── */}
            {errors.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    {errors.map((err, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{err}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Selected file list ─────────────────────────────── */}
            {files.length > 0 && (
                <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                        Selected Files ({files.length})
                    </p>

                    {files.map((file, index) => {
                        // Progress value: undefined means not started yet;
                        // 100 means upload complete → show green check.
                        const progress = uploadProgress[file.name];
                        const isDone = progress === 100;

                        return (
                            <div
                                key={`${file.name}-${index}`}
                                className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                            >
                                {/* Visual file type indicator */}
                                <span className="text-xl shrink-0">{getFileIcon(file)}</span>

                                {/* File name, size, and optional progress bar */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>

                                    {/* Progress bar — only rendered while uploadProgress is active */}
                                    {progress != null && (
                                        <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                                    isDone ? 'bg-green-500' : 'bg-purple-500'
                                                }`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Right side: green check when done, remove button otherwise */}
                                <div className="shrink-0">
                                    {isDone ? (
                                        <CheckCircle2 size={20} className="text-green-500" />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            disabled={disabled}
                                            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 cursor-pointer"
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
