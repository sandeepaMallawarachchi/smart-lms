import { NextResponse } from 'next/server';

const SUBMISSION_API = process.env.NEXT_PUBLIC_SUBMISSION_API_URL ?? 'http://localhost:8081';
const PLAGIARISM_API = process.env.NEXT_PUBLIC_PLAGIARISM_API_URL ?? 'http://localhost:8084';

interface SubmissionDTO {
    id: number;
    studentId: string;
    studentName?: string;
    assignmentId: string;
    assignmentTitle?: string;
    status: string;
    plagiarismScore?: number;
    submittedAt?: string;
    createdAt?: string;
}

interface AnswerDTO {
    questionId: string;
    questionText?: string;
    answerText?: string;
    wordCount?: number;
    similarityScore?: number;
    plagiarismSeverity?: string;
    plagiarismFlagged?: boolean;
}

interface IntegrityCheckDTO {
    id: number;
    submissionId: number;
    studentId: string;
    assignmentId?: string;
    questionId?: number;
    overallSimilarityScore?: number;
    internetSimilarityScore?: number;
    studentSimilarityScore?: number;
    matchesFound?: number;
    internetMatchesFound?: number;
    flagged?: boolean;
    status?: string;
    internetMatches?: {
        url?: string;
        title?: string;
        snippet?: string;
        similarityScore?: number;
        sourceDomain?: string;
    }[];
    createdAt?: string;
}

interface PlagiarismReportOut {
    id: string;
    submissionId: string;
    overallScore: number;
    status: string;
    sourcesChecked: number;
    matchesFound: number;
    topMatches: { source: string; percentage: number; type: string; url?: string }[];
    createdAt: string;
    studentId?: string;
    studentName?: string;
    assignmentId?: string;
    assignmentTitle?: string;
}

/**
 * GET /api/submissions/lecturer/plagiarism-reports
 *
 * Aggregates plagiarism data from two sources:
 *   1. Submissions from port 8081 — each has an aggregate plagiarismScore and per-answer details
 *   2. Integrity checks from port 8084 — flagged checks with internet match details
 *
 * Returns a unified PlagiarismReport[] for the plagiarism detection dashboard.
 */
export async function GET() {
    try {
        // ── 1. Fetch all submissions from the submission-management-service ──
        const subsRes = await fetch(`${SUBMISSION_API}/api/submissions`, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        if (!subsRes.ok) {
            return NextResponse.json(
                { success: false, message: `Submission service error: HTTP ${subsRes.status}` },
                { status: 502 },
            );
        }
        const subsBody = await subsRes.json();
        const allSubmissions: SubmissionDTO[] = Array.isArray(subsBody)
            ? subsBody
            : subsBody.data ?? subsBody.content ?? [];

        // Filter to submitted/graded/late submissions with any plagiarism signal
        const relevant = allSubmissions.filter(
            (s) =>
                ['SUBMITTED', 'GRADED', 'LATE'].includes(s.status) &&
                s.plagiarismScore != null &&
                s.plagiarismScore > 0,
        );

        // ── 2. Fetch per-answer detail for relevant submissions (parallel, max 15) ──
        const reports: PlagiarismReportOut[] = [];
        const batchSize = 15;

        for (let i = 0; i < relevant.length; i += batchSize) {
            const batch = relevant.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map(async (sub) => {
                    let answers: AnswerDTO[] = [];
                    try {
                        const ansRes = await fetch(
                            `${SUBMISSION_API}/api/submissions/${sub.id}/answers`,
                            { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' },
                        );
                        if (ansRes.ok) {
                            const ansBody = await ansRes.json();
                            answers = Array.isArray(ansBody) ? ansBody : ansBody.data ?? [];
                        }
                    } catch {
                        // Answers unavailable — use submission-level score only
                    }

                    // Build topMatches from flagged/high-scoring answers
                    const topMatches = answers
                        .filter((a) => (a.similarityScore ?? 0) > 0)
                        .sort((a, b) => (b.similarityScore ?? 0) - (a.similarityScore ?? 0))
                        .slice(0, 5)
                        .map((a) => ({
                            source: a.questionText
                                ? `Q: ${a.questionText.slice(0, 60)}${a.questionText.length > 60 ? '…' : ''}`
                                : `Question ${a.questionId}`,
                            percentage: Math.round((a.similarityScore ?? 0) * 10) / 10,
                            type: a.plagiarismSeverity ?? 'Unknown',
                            url: undefined as string | undefined,
                        }));

                    const matchesFound = answers.filter(
                        (a) => a.plagiarismFlagged || (a.similarityScore ?? 0) >= 20,
                    ).length;

                    return {
                        id: `sub-${sub.id}`,
                        submissionId: String(sub.id),
                        overallScore: Math.round((sub.plagiarismScore ?? 0) * 10) / 10,
                        status: 'COMPLETED' as const,
                        sourcesChecked: answers.length,
                        matchesFound,
                        topMatches,
                        createdAt: sub.submittedAt ?? sub.createdAt ?? new Date().toISOString(),
                        studentId: sub.studentId,
                        studentName: sub.studentName ?? sub.studentId,
                        assignmentId: sub.assignmentId,
                        assignmentTitle: sub.assignmentTitle ?? sub.assignmentId,
                    } satisfies PlagiarismReportOut;
                }),
            );

            for (const r of results) {
                if (r.status === 'fulfilled') reports.push(r.value);
            }
        }

        // ── 3. Try to enrich with integrity service flagged checks (internet matches) ──
        try {
            const flaggedRes = await fetch(`${PLAGIARISM_API}/api/integrity/checks/flagged`, {
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
            });
            if (flaggedRes.ok) {
                const flaggedBody = await flaggedRes.json();
                const flaggedChecks: IntegrityCheckDTO[] = Array.isArray(flaggedBody)
                    ? flaggedBody
                    : flaggedBody.data ?? [];

                // Group flagged checks by submissionId — take the one with the highest score
                const checksBySubmission = new Map<string, IntegrityCheckDTO>();
                for (const chk of flaggedChecks) {
                    const key = String(chk.submissionId);
                    const existing = checksBySubmission.get(key);
                    if (
                        !existing ||
                        (chk.overallSimilarityScore ?? 0) > (existing.overallSimilarityScore ?? 0)
                    ) {
                        checksBySubmission.set(key, chk);
                    }
                }

                // Merge internet matches into existing reports
                for (const report of reports) {
                    const chk = checksBySubmission.get(report.submissionId);
                    if (!chk) continue;

                    // Add internet match sources to topMatches
                    const internetMatches = (chk.internetMatches ?? [])
                        .filter((m) => m.url || m.title)
                        .map((m) => ({
                            source: m.title ?? m.sourceDomain ?? 'Internet source',
                            percentage: Math.round((m.similarityScore ?? 0) * 100 * 10) / 10,
                            type: 'Internet match',
                            url: m.url,
                        }));

                    if (internetMatches.length > 0) {
                        report.topMatches = [...internetMatches, ...report.topMatches].slice(0, 5);
                        report.matchesFound = Math.max(report.matchesFound, internetMatches.length);
                    }

                    // Remove from map so we don't create duplicates
                    checksBySubmission.delete(report.submissionId);
                }

                // Add flagged checks that don't match any submission
                for (const [, chk] of checksBySubmission) {
                    const score = Math.round((chk.overallSimilarityScore ?? 0) * 100 * 10) / 10;
                    if (score <= 0) continue;

                    reports.push({
                        id: `chk-${chk.id}`,
                        submissionId: String(chk.submissionId),
                        overallScore: score,
                        status: 'COMPLETED',
                        sourcesChecked: (chk.internetMatchesFound ?? 0) + (chk.matchesFound ?? 0),
                        matchesFound: chk.matchesFound ?? 0,
                        topMatches: (chk.internetMatches ?? []).slice(0, 5).map((m) => ({
                            source: m.title ?? m.sourceDomain ?? 'Internet source',
                            percentage: Math.round((m.similarityScore ?? 0) * 100 * 10) / 10,
                            type: 'Internet match',
                            url: m.url,
                        })),
                        createdAt: chk.createdAt ?? new Date().toISOString(),
                        studentId: chk.studentId,
                        studentName: chk.studentId,
                        assignmentId: chk.assignmentId,
                        assignmentTitle: chk.assignmentId,
                    });
                }
            }
        } catch {
            // Integrity service unavailable — use submission data only
        }

        // Sort by score descending
        reports.sort((a, b) => b.overallScore - a.overallScore);

        return NextResponse.json(reports);
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }
}
