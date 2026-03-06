import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { unauthorizedResponse } from '@/lib/api-response';
import { getLecturerReportData } from '@/lib/learning-analytics/lecturer-report-data';

const escapeCell = (value: unknown) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const row = (...values: unknown[]) => values.map(escapeCell).join(',');

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Unauthorized');
    }

    const params = request.nextUrl.searchParams;
    const courseId = params.get('courseId') || undefined;
    const year = params.get('year') || undefined;
    const semester = params.get('semester') || undefined;
    const specialization = params.get('specialization') || undefined;
    const limit = parseInt(params.get('limit') || '200', 10);
    const recommendationLimit = parseInt(params.get('recommendationLimit') || '8', 10);

    const chatbotBaseUrl =
      process.env.CHATBOT_BASE_URL ||
      (process.env.CHATBOT_URL ? process.env.CHATBOT_URL.replace(/\/chat\/?$/, '') : '') ||
      'http://localhost:5001';

    const report = await getLecturerReportData(chatbotBaseUrl, {
      lecturerId: payload.userId,
      courseId,
      year,
      semester,
      specialization,
      limit,
      recommendationLimit,
    });

    const lines: string[] = [];
    lines.push(row('Lecturer Analytics Report'));
    lines.push(row('Generated At', report.generatedAt));
    lines.push('');

    lines.push(row('Summary'));
    lines.push(row('Total Students', report.summary.totalStudents || 0));
    lines.push(row('High Risk', report.summary.highRisk || 0));
    lines.push(row('Medium Risk', report.summary.mediumRisk || 0));
    lines.push(row('Low Risk', report.summary.lowRisk || 0));
    lines.push(row('Average Risk Probability (%)', report.summary.averageRiskProbability || 0));
    lines.push(row('High Risk Ratio (%)', report.summary.highRiskRatio || 0));
    lines.push(row('Live Prediction Enabled', report.livePrediction?.enabled ? 'Yes' : 'No'));
    lines.push(row('Live Prediction Error', report.livePrediction?.error || ''));
    lines.push('');

    lines.push(row('Course Summary'));
    lines.push(row('Course', 'Students', 'Average Risk (%)', 'Average Completion (%)'));
    for (const course of report.courses || []) {
      lines.push(
        row(course.courseName, course.students, course.avgRiskProbability, course.avgCompletionRate)
      );
    }
    lines.push('');

    lines.push(row('Top Students By Risk'));
    lines.push(row('Student ID', 'Name', 'Risk Level', 'Risk Probability (%)', 'Completion (%)', 'Engagement'));
    for (const student of report.topStudentsByRisk || []) {
      lines.push(
        row(
          student.studentIdNumber,
          student.name,
          student.riskLevel,
          student.riskProbability,
          student.completionRate,
          student.engagement
        )
      );
    }
    lines.push('');

    lines.push(row('Personalized Recommendations'));
    lines.push(row('Student ID', 'Name', 'Risk Level', 'Risk Probability (%)', 'Recommendation'));
    for (const item of report.personalizedRecommendations || []) {
      lines.push(
        row(
          item.studentIdNumber,
          item.name,
          item.riskLevel,
          item.riskProbability,
          item.recommendation
        )
      );
    }

    const csv = lines.join('\n');
    const filename = `lecturer-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('Lecturer CSV report export error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export lecturer CSV report' },
      { status: 500 }
    );
  }
}

