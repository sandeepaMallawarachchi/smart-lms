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
    process.env.NEXT_PUBLIC_SUBMISSION_API_URL ?? 'http://localhost:8081';

/**
 * GET /api/submissions/lecturer/export/plagiarism
 *
 * Returns a CSV plagiarism report — one row per submission with plagiarism data.
 * Optionally filter: ?minScore=20 to only include flagged ones.
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

        const params = request.nextUrl.searchParams;
        const minScore = parseInt(params.get('minScore') || '0', 10);

        // Fetch all submissions
        const subsRes = await fetch(`${SUBMISSION_API}/api/submissions`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!subsRes.ok) throw new Error(`Submissions API returned ${subsRes.status}`);
        const subsRaw = await subsRes.json();
        const submissions: Sub[] = normalizeList(subsRaw);

        // Filter by plagiarism threshold
        const filtered = submissions.filter((s) => (s.plagiarismScore ?? 0) >= minScore);

        // Sort by plagiarism score descending
        filtered.sort((a, b) => (b.plagiarismScore ?? 0) - (a.plagiarismScore ?? 0));

        const lines: string[] = [];
        lines.push(
            row(
                'Student Name',
                'Student ID',
                'Registration ID',
                'Assignment',
                'Module Code',
                'Plagiarism Score (%)',
                'AI Score',
                'Status',
                'Submitted At',
                'Word Count',
                'Total Versions',
            ),
        );

        for (const s of filtered) {
            lines.push(
                row(
                    s.studentName || 'Unknown',
                    s.studentId || '',
                    s.studentRegistrationId || '',
                    s.assignmentTitle || '',
                    s.moduleCode || '',
                    s.plagiarismScore ?? '',
                    s.aiScore ?? '',
                    s.status || '',
                    s.submittedAt ? new Date(s.submittedAt).toISOString().slice(0, 19).replace('T', ' ') : '',
                    s.wordCount ?? '',
                    s.totalVersions ?? '',
                ),
            );
        }

        const csv = lines.join('\n');
        const label = minScore > 0 ? `plagiarism-flagged-${minScore}` : 'plagiarism-report';
        const filename = `${label}-${new Date().toISOString().slice(0, 10)}.csv`;

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: unknown) {
        console.error('[export/plagiarism] Error:', error);
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
    plagiarismScore?: number;
    aiScore?: number;
    status?: string;
    submittedAt?: string;
    wordCount?: number;
    totalVersions?: number;
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
