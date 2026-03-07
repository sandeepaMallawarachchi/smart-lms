import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { unauthorizedResponse } from '@/lib/api-response';
import { getStudentProgressReportData } from '@/lib/learning-analytics/student-report-data';

const esc = (value: unknown) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const row = (...values: unknown[]) => values.map(esc).join(',');

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'student') {
      return unauthorizedResponse('Unauthorized');
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '200', 10);
    const report = await getStudentProgressReportData({
      studentId: payload.userId,
      limit,
    });

    const lines: string[] = [];
    lines.push(row('Student Progress Report'));
    lines.push(row('Generated At', report.generatedAt));
    lines.push('');

    lines.push(row('Student Information'));
    lines.push(row('Student ID', report.student.studentIdNumber));
    lines.push(row('Name', report.student.name));
    lines.push(row('Email', report.student.email));
    lines.push(row('Specialization', report.student.specialization));
    lines.push(row('Academic Year', report.student.academicYear));
    lines.push(row('Semester', report.student.semester));
    lines.push('');

    lines.push(row('Summary'));
    lines.push(row('Total Predictions', report.summary.totalPredictions));
    lines.push(row('Latest Risk Level', report.summary.latestRiskLevel));
    lines.push(row('Latest Risk Probability (%)', report.summary.latestRiskProbability));
    lines.push(row('Latest Completion (%)', report.summary.latestCompletionRate));
    lines.push(row('Latest Score (%)', report.summary.latestScore));
    lines.push(row('Latest Engagement', report.summary.latestEngagement));
    lines.push('');

    lines.push(row('Averages'));
    lines.push(row('Average Risk Probability (%)', report.averages.riskProbability));
    lines.push(row('Average Completion Rate (%)', report.averages.completionRate));
    lines.push(row('Average Score (%)', report.averages.score));
    lines.push(row('Average Engagement', report.averages.engagement));
    lines.push(row('Average Late Submissions', report.averages.lateSubmissions));
    lines.push('');

    lines.push(row('Recent Predictions'));
    lines.push(
      row(
        'Date',
        'Risk Level',
        'Risk Probability (%)',
        'Completion (%)',
        'Score (%)',
        'Engagement',
        'Confidence (%)'
      )
    );
    for (const item of report.recentPredictions) {
      lines.push(
        row(
          item.createdAt ? new Date(item.createdAt).toISOString() : '',
          item.riskLevel,
          item.riskProbability,
          item.completionRate,
          item.avgScore,
          item.engagement,
          item.confidence
        )
      );
    }

    const csv = lines.join('\n');
    const filename = `student-progress-report-${report.student.studentIdNumber}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('Student CSV export error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export student progress CSV report' },
      { status: 500 }
    );
  }
}

