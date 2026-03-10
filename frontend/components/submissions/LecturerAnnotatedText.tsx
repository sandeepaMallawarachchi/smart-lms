'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MessageSquarePlus, Trash2, X } from 'lucide-react';
import {
  useLecturerAnnotations,
  type LecturerAnnotation,
} from '@/hooks/useLecturerAnnotations';

// ─── Helpers ──────────────────────────────────────────────────

type Segment = { text: string; annotations: LecturerAnnotation[] };

function buildSegments(text: string, annotations: LecturerAnnotation[]): Segment[] {
  if (!annotations.length) return [{ text, annotations: [] }];

  const points = new Set<number>();
  points.add(0);
  points.add(text.length);
  for (const a of annotations) {
    points.add(Math.max(0, a.start));
    points.add(Math.min(text.length, a.end));
  }
  const sorted = Array.from(points).sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i];
    const e = sorted[i + 1];
    if (s === e) continue;
    const covering = annotations.filter(a => a.start <= s && a.end >= e);
    segments.push({ text: text.slice(s, e), annotations: covering });
  }
  return segments;
}

// ─── Add popover ─────────────────────────────────────────────

function AddPopover({
  position,
  onAdd,
  onCancel,
}: {
  position: { x: number; y: number };
  onAdd: (comment: string) => void;
  onCancel: () => void;
}) {
  const [comment, setComment] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div
      className="fixed z-[200] bg-white rounded-xl shadow-2xl border border-blue-200 p-3 w-72"
      style={{ top: position.y + 8, left: position.x }}
    >
      <p className="text-xs font-semibold text-blue-700 mb-1.5">Add Lecturer Annotation</p>
      <textarea
        ref={ref}
        value={comment}
        onChange={e => setComment(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (comment.trim()) onAdd(comment.trim()); }
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Add inline feedback…"
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer">Cancel</button>
        <button
          disabled={!comment.trim()}
          onClick={() => onAdd(comment.trim())}
          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ─── View popover ────────────────────────────────────────────

function ViewPopover({
  annotation,
  position,
  onClose,
  onDelete,
  readOnly,
}: {
  annotation: LecturerAnnotation;
  position: { x: number; y: number };
  onClose: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  return (
    <div
      className="fixed z-[200] bg-white rounded-xl shadow-2xl border border-blue-200 p-3 w-72"
      style={{ top: position.y + 8, left: position.x }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[10px] text-gray-400 font-medium">
          {new Date(annotation.createdAt).toLocaleDateString()}
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <X size={14} />
        </button>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{annotation.comment}</p>
      {!readOnly && (
        <div className="mt-2 flex justify-end">
          <button onClick={onDelete} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 cursor-pointer">
            <Trash2 size={12} /> Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

interface Props {
  text: string;
  submissionId: string;
  versionId: string;
  questionId: string;
  /** When true, annotations are display-only (used on student feedback page) */
  readOnly?: boolean;
}

export default function LecturerAnnotatedText({
  text,
  submissionId,
  versionId,
  questionId,
  readOnly = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { annotations, addAnnotation, removeAnnotation } = useLecturerAnnotations(
    submissionId,
    versionId,
    questionId,
  );

  const [pendingSelection, setPendingSelection] = useState<{
    start: number;
    end: number;
    selectedText: string;
    position: { x: number; y: number };
  } | null>(null);

  const [viewingAnnotation, setViewingAnnotation] = useState<{
    annotation: LecturerAnnotation;
    position: { x: number; y: number };
  } | null>(null);

  const getCharOffset = useCallback((node: Node, offset: number): number => {
    const container = containerRef.current;
    if (!container) return 0;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let charCount = 0;
    let current: Node | null;
    while ((current = walker.nextNode())) {
      if (current === node) return charCount + offset;
      charCount += (current.textContent?.length ?? 0);
    }
    return charCount;
  }, []);

  const handleMouseUp = useCallback(() => {
    setViewingAnnotation(null);
    if (readOnly) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { setPendingSelection(null); return; }

    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) { setPendingSelection(null); return; }

    const start = getCharOffset(range.startContainer, range.startOffset);
    const end = getCharOffset(range.endContainer, range.endOffset);
    if (start === end) { setPendingSelection(null); return; }

    const rect = range.getBoundingClientRect();
    setPendingSelection({
      start: Math.min(start, end),
      end: Math.max(start, end),
      selectedText: text.slice(Math.min(start, end), Math.max(start, end)),
      position: { x: rect.left, y: rect.bottom },
    });
  }, [text, getCharOffset, readOnly]);

  const handleAdd = useCallback(
    (comment: string) => {
      if (!pendingSelection) return;
      addAnnotation(pendingSelection.start, pendingSelection.end, pendingSelection.selectedText, comment);
      setPendingSelection(null);
      window.getSelection()?.removeAllRanges();
    },
    [pendingSelection, addAnnotation],
  );

  const segments = buildSegments(text, annotations);

  const highlightClass = readOnly
    ? 'bg-blue-100 border-b-2 border-blue-400 cursor-pointer hover:bg-blue-200 transition-colors'
    : 'bg-blue-100 border-b-2 border-blue-400 cursor-pointer hover:bg-blue-200 transition-colors';

  return (
    <>
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="text-sm leading-relaxed whitespace-pre-wrap select-text cursor-text"
      >
        {segments.map((seg, i) =>
          seg.annotations.length === 0 ? (
            <span key={i}>{seg.text}</span>
          ) : (
            <span
              key={i}
              onClick={e => {
                setViewingAnnotation({
                  annotation: seg.annotations[0],
                  position: { x: e.clientX, y: e.clientY },
                });
                e.stopPropagation();
              }}
              className={highlightClass}
              title={`${seg.annotations.length} annotation${seg.annotations.length > 1 ? 's' : ''} – click to view`}
            >
              {seg.text}
            </span>
          ),
        )}
      </div>

      {/* Hint */}
      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-400">
        {readOnly ? (
          annotations.length > 0 && (
            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
              {annotations.length} lecturer annotation{annotations.length > 1 ? 's' : ''} — click highlighted text to view
            </span>
          )
        ) : (
          <>
            <MessageSquarePlus size={12} />
            <span>Select text to add an inline annotation</span>
            {annotations.length > 0 && (
              <span className="ml-auto bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                {annotations.length} annotation{annotations.length > 1 ? 's' : ''}
              </span>
            )}
          </>
        )}
      </div>

      {/* Add popover (lecturer only) */}
      {!readOnly && pendingSelection && (
        <AddPopover
          position={pendingSelection.position}
          onAdd={handleAdd}
          onCancel={() => { setPendingSelection(null); window.getSelection()?.removeAllRanges(); }}
        />
      )}

      {/* View popover */}
      {viewingAnnotation && (
        <ViewPopover
          annotation={viewingAnnotation.annotation}
          position={viewingAnnotation.position}
          onClose={() => setViewingAnnotation(null)}
          onDelete={() => {
            removeAnnotation(viewingAnnotation.annotation._id);
            setViewingAnnotation(null);
          }}
          readOnly={readOnly}
        />
      )}
    </>
  );
}
