import { jsPDF } from 'jspdf';
import type { SubmissionVersion, VersionAnswer } from '@/types/submission.types';

/**
 * Generate and download a PDF containing the questions and answers
 * from the latest submission version.
 */
export function downloadSubmissionPdf(
    version: SubmissionVersion,
    assignmentTitle: string,
    courseName: string,
    studentName?: string,
) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // ── Helper: check if we need a new page ──────────────────
    function ensureSpace(needed: number) {
        if (y + needed > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
    }

    // ── Helper: wrap and render text, returns new Y ──────────
    function renderWrappedText(
        text: string,
        x: number,
        startY: number,
        maxWidth: number,
        lineHeight: number,
    ): number {
        const lines = doc.splitTextToSize(text, maxWidth);
        for (const line of lines) {
            ensureSpace(lineHeight);
            doc.text(line, x, startY);
            startY += lineHeight;
        }
        return startY;
    }

    // ── Title ────────────────────────────────────────────────
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    y = renderWrappedText(assignmentTitle, margin, y, contentWidth, 8);
    y += 4;

    // ── Metadata ─────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);

    if (courseName) {
        doc.text(`Course: ${courseName}`, margin, y);
        y += 5;
    }
    if (studentName) {
        doc.text(`Student: ${studentName}`, margin, y);
        y += 5;
    }
    doc.text(
        `Submitted: ${new Date(version.submittedAt).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
        })}`,
        margin,
        y,
    );
    y += 5;
    doc.text(`Version: ${version.versionNumber}`, margin, y);
    y += 8;

    // ── Divider ──────────────────────────────────────────────
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ── Answers (sorted by question order) ───────────────────
    doc.setTextColor(0);
    const answers: VersionAnswer[] = [...(version.answers ?? [])];
    // Sort by questionId as fallback order; questionText availability varies
    answers.sort((a, b) => {
        const aQ = a.questionText ?? a.questionId;
        const bQ = b.questionText ?? b.questionId;
        return aQ.localeCompare(bQ);
    });

    answers.forEach((answer, idx) => {
        ensureSpace(20);

        // Question header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const qLabel = `Question ${idx + 1}`;
        doc.text(qLabel, margin, y);
        y += 6;

        // Question text
        if (answer.questionText) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50);
            y = renderWrappedText(answer.questionText, margin, y, contentWidth, 5.5);
            y += 4;
        }

        // Answer text
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);

        const answerText = answer.answerText?.trim() || '(No answer provided)';
        y = renderWrappedText(answerText, margin, y, contentWidth, 5.5);
        y += 8;

        // Light separator between questions
        if (idx < answers.length - 1) {
            ensureSpace(6);
            doc.setDrawColor(220);
            doc.line(margin, y, pageWidth - margin, y);
            y += 8;
        }
    });

    if (answers.length === 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120);
        doc.text('No answers found for this submission version.', margin, y);
    }

    // ── Download ─────────────────────────────────────────────
    const safeTitle = assignmentTitle
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 60);
    doc.save(`${safeTitle}_v${version.versionNumber}.pdf`);
}
