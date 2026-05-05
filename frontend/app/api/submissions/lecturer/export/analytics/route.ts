import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { unauthorizedResponse } from '@/lib/api-response';

// ─── CSV helpers ──────────────────────────────────────────────

const escapeCell = (value: unknown) => {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
};
const row = (...values: unknown[]) => values.map(escapeCell).join(',');

// ─── Backend URL ──────────────────────────────────────────────

const SUBMISSION_API =
    process.env.NEXT_PUBLIC_SUBMISSION_API_URL ?? 'https://api.smartapi.infinityfreeapp.com/submissions';

/**
 * GET /api/submissions/lecturer/export/analytics
 *
 * Returns a CSV with per-submission analytics:
 * every submission row, ordered by assignment then student, with all metrics.
 */
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (!token) return unauthorizedResponse('No token provided');

        const payload = verifyToken(token);
        if (!payload || payload.userRole !== 'lecture') {
            return unauthorizedResponse('Unauthorized');
        }

        // Fetch all submissions
        const subsRes = await fetch(`${SUBMISSION_API}/api/submissions`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!subsRes.ok) throw new Error(`Submissions API returned ${subsRes.status}`);
        const subsRaw = await subsRes.json();
        const submissions: Sub[] = normalizeList(subsRaw);

        // Sort by assignment then by student name
        submissions.sort((a, b) => {
            const aTitle = a.assignmentTitle || '';
            const bTitle = b.assignmentTitle || '';
            const cmp = aTitle.localeCompare(bTitle);
            if (cmp !== 0) return cmp;
            return (a.studentName || '').localeCompare(b.studentName || '');
        });

        // Compute aggregate stats
        const graded = submissions.filter((s) => s.status === 'GRADED');
        const totalSubmissions = submissions.length;
        const totalGraded = graded.length;
        const avgGrade =
            graded.length > 0
                ? Math.round(
                      graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / graded.length,
                  )
                : 0;
        const avgPlagiarism =
            submissions.length > 0
                ? Math.round(
                      submissions.reduce((sum, s) => sum + (s.plagiarismScore ?? 0), 0) /
                          submissions.length,
                  )
                : 0;
        const flaggedCount = submissions.filter((s) => (s.plagiarismScore ?? 0) >= 20).length;
        const lateCount = submissions.filter(
            (s) => s.status === 'LATE' || s.isLate,
        ).length;
        const uniqueStudents = new Set(submissions.map((s) => s.studentId).filter(Boolean)).size;

        const lines: string[] = [];

        // Summary section
        lines.push(row('Submission Analytics Report'));
        lines.push(row('Generated At', new Date().toISOString().slice(0, 19).replace('T', ' ')));
        lines.push('');
        lines.push(row('Summary'));
        lines.push(row('Total Submissions', totalSubmissions));
        lines.push(row('Total Graded', totalGraded));
        lines.push(row('Average Grade', avgGrade));
        lines.push(row('Average Plagiarism %', avgPlagiarism));
        lines.push(row('Flagged Submissions (>=20%)', flaggedCount));
        lines.push(row('Late Submissions', lateCount));
        lines.push(row('Unique Students', uniqueStudents));
        lines.push('');

        // Per-assignment summary
        const byAssignment = new Map<string, Sub[]>();
        for (const s of submissions) {
            const key = s.assignmentTitle || s.assignmentId || 'Unknown';
            if (!byAssignment.has(key)) byAssignment.set(key, []);
            byAssignment.get(key)!.push(s);
        }

        lines.push(row('Per-Assignment Summary'));
        lines.push(
            row('Assignment', 'Submissions', 'Graded', 'Average Grade', 'Avg Plagiarism %', 'Late'),
        );
        for (const [title, subs] of byAssignment.entries()) {
            const g = subs.filter((s) => s.status === 'GRADED');
            const ag = g.length > 0 ? Math.round(g.reduce((sum, s) => sum + (s.grade ?? 0), 0) / g.length) : 0;
            const ap = subs.length > 0 ? Math.round(subs.reduce((sum, s) => sum + (s.plagiarismScore ?? 0), 0) / subs.length) : 0;
            const lt = subs.filter((s) => s.status === 'LATE' || s.isLate).length;
            lines.push(row(title, subs.length, g.length, ag, ap, lt));
        }
        lines.push('');

        // Detail rows
        lines.push(row('Detailed Submissions'));
        lines.push(
            row(
                'Student Name',
                'Student ID',
                'Registration ID',
                'Assignment',
                'Module Code',
                'Status',
                'Grade',
                'Total Marks',
                'Plagiarism Score (%)',
                'AI Score',
                'Word Count',
                'Total Versions',
                'Submitted At',
                'Graded At',
                'Late',
            ),
        );

        for (const s of submissions) {
            lines.push(
                row(
                    s.studentName || 'Unknown',
                    s.studentId || '',
                    s.studentRegistrationId || '',
                    s.assignmentTitle || '',
                    s.moduleCode || '',
                    s.status || '',
                    s.grade ?? '',
                    s.totalMarks ?? '',
                    s.plagiarismScore ?? '',
                    s.aiScore ?? '',
                    s.wordCount ?? '',
                    s.totalVersions ?? '',
                    s.submittedAt ? new Date(s.submittedAt).toISOString().slice(0, 19).replace('T', ' ') : '',
                    s.gradedAt ? new Date(s.gradedAt).toISOString().slice(0, 19).replace('T', ' ') : '',
                    s.isLate || s.status === 'LATE' ? 'Yes' : 'No',
                ),
            );
        }

        const csv = lines.join('\n');
        const filename = `submission-analytics-${new Date().toISOString().slice(0, 10)}.csv`;

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: unknown) {
        console.error('[export/analytics] Error:', error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : 'Export failed' },
            { status: 500 },
        );
    }
}

// ─── Helpers ──────────────────────────────────────────────────

interface Sub {
    studentId?: string;
    studentName?: string;
    studentRegistrationId?: string;
    assignmentId?: string;
    assignmentTitle?: string;
    moduleCode?: string;
    status?: string;
    grade?: number;
    totalMarks?: number;
    plagiarismScore?: number;
    aiScore?: number;
    wordCount?: number;
    totalVersions?: number;
    submittedAt?: string;
    gradedAt?: string;
    isLate?: boolean;
}

function normalizeList(raw: unknown): Sub[] {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data as Sub[];
        if (obj.data && typeof obj.data === 'object') {
            return ((obj.data as Record<string, unknown>).content as Sub[]) ?? [];
        }
        if (Array.isArray(obj.content)) return obj.content as Sub[];
    }
    return [];
}
