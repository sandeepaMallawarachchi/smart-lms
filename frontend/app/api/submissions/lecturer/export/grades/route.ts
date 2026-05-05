import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { unauthorizedResponse } from '@/lib/api-response';

// ─── CSV helpers (server-side duplicate — no DOM dependency) ──

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
 * GET /api/submissions/lecturer/export/grades
 *
 * Returns a CSV "grade sheet" — a student × assignment matrix.
 * Columns: Student Name, Student ID, then one column per assignment (grade / totalMarks).
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

        // Fetch all submissions from backend
        const subsRes = await fetch(`${SUBMISSION_API}/api/submissions`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!subsRes.ok) throw new Error(`Submissions API returned ${subsRes.status}`);
        const subsRaw = await subsRes.json();
        const submissions: Sub[] = normalizeList(subsRaw);

        // Build unique assignment list and student list
        const assignmentMap = new Map<string, { id: string; title: string; totalMarks: number }>();
        const studentMap = new Map<string, { name: string; id: string; regId: string }>();

        for (const s of submissions) {
            const aId = s.assignmentId;
            if (aId && !assignmentMap.has(aId)) {
                assignmentMap.set(aId, {
                    id: aId,
                    title: s.assignmentTitle || aId,
                    totalMarks: s.totalMarks ?? 100,
                });
            }
            if (s.studentId && !studentMap.has(s.studentId)) {
                studentMap.set(s.studentId, {
                    name: s.studentName || 'Unknown',
                    id: s.studentId,
                    regId: s.studentRegistrationId || '',
                });
            }
        }

        const assignments = Array.from(assignmentMap.values()).sort((a, b) =>
            a.title.localeCompare(b.title),
        );
        const students = Array.from(studentMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name),
        );

        // Header row
        const lines: string[] = [];
        lines.push(
            row(
                'Student Name',
                'Student ID',
                'Registration ID',
                ...assignments.map((a) => `${a.title} (/${a.totalMarks})`),
            ),
        );

        // Build a lookup: studentId → assignmentId → grade/status
        const lookup = new Map<string, Map<string, string>>();
        for (const s of submissions) {
            if (!s.studentId || !s.assignmentId) continue;
            if (!lookup.has(s.studentId)) lookup.set(s.studentId, new Map());
            const cell =
                s.grade != null
                    ? String(s.grade)
                    : s.status === 'SUBMITTED'
                      ? 'Submitted'
                      : s.status === 'DRAFT'
                        ? 'Draft'
                        : s.status || '—';
            lookup.get(s.studentId)!.set(s.assignmentId, cell);
        }

        for (const stu of students) {
            const grades = lookup.get(stu.id);
            lines.push(
                row(
                    stu.name,
                    stu.id,
                    stu.regId,
                    ...assignments.map((a) => grades?.get(a.id) ?? '—'),
                ),
            );
        }

        const csv = lines.join('\n');
        const filename = `grade-sheet-${new Date().toISOString().slice(0, 10)}.csv`;

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: unknown) {
        console.error('[export/grades] Error:', error);
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
    totalMarks?: number;
    grade?: number;
    status?: string;
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
