import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { connectDB } from '@/lib/db';
import { buildStudentReportData } from '@/lib/learning-analytics/report-data';
import { unauthorizedResponse } from '@/lib/api-response';

type ReportRange = 'weekly' | 'monthly' | 'all';

const parseRange = (value: string | null): ReportRange => {
  if (value === 'weekly' || value === 'monthly' || value === 'all') return value;
  return 'monthly';
};

const escapeCell = (value: unknown) => {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const row = (...values: unknown[]) => values.map(escapeCell).join(',');

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

    const range = parseRange(request.nextUrl.searchParams.get('range'));
    const report = await buildStudentReportData(payload.userId, range);

    const lines: string[] = [];
    lines.push(row('Learning Analytics Report'));
    lines.push(row('Generated At', report.generatedAt));
    lines.push(row('Range', report.range));
    lines.push('');

    lines.push(row('Student Information'));
    lines.push(row('Student ID', report.student.studentIdNumber));
    lines.push(row('Name', report.student.name));
    lines.push(row('Email', report.student.email));
    lines.push(row('Specialization', report.student.specialization));
    lines.push(row('Semester', report.student.semester));
    lines.push(row('Academic Year', report.student.academicYear));
    lines.push('');

    lines.push(row('Overview'));
    lines.push(row('Total Courses', report.overview.totalCourses));
    lines.push(row('Overall Progress (%)', report.overview.overallProgress));
    lines.push(row('Completion Rate (%)', report.overview.completionRate));
    lines.push(row('Achievements', report.overview.achievements));
    lines.push(row('Latest Risk Level', report.overview.latestRiskLevel));
    lines.push(row('Latest Risk Probability (%)', report.overview.latestRiskProbability));
    lines.push('');

    lines.push(row('Metrics'));
    lines.push(row('Average Score (%)', report.metrics.averageScore));
    lines.push(row('Average Completion Rate (%)', report.metrics.averageCompletionRate));
    lines.push(row('Average Engagement', report.metrics.averageEngagement));
    lines.push(row('Average Risk Probability (%)', report.metrics.averageRiskProbability));
    lines.push(row('Late Submission Count', report.metrics.lateSubmissionCount));
    lines.push(row('Active Days', report.metrics.activeDays));
    lines.push(row('Studied Credits', report.metrics.studiedCredits));
    lines.push('');

    lines.push(row('Goal Summary'));
    lines.push(row('Total Goals', report.goals.total));
    lines.push(row('To Do', report.goals.todo));
    lines.push(row('In Progress', report.goals.inprogress));
    lines.push(row('Done', report.goals.done));
    lines.push('');

    lines.push(row('Goals'));
    lines.push(row('Title', 'Status', 'Category', 'Priority', 'Target Date'));
    for (const goal of report.goals.items) {
      lines.push(
        row(
          goal.title,
          goal.status,
          goal.category,
          goal.priority,
          goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : ''
        )
      );
    }
    lines.push('');

    lines.push(row('Courses'));
    lines.push(row('Course Name', 'Credits', 'Completion Rate (%)', 'Items Completed', 'Items Total'));
    for (const course of report.courses) {
      lines.push(
        row(
          course.courseName,
          course.credits ?? 0,
          course.completionRate,
          course.tasksCompleted,
          course.tasksTotal
        )
      );
    }
    lines.push('');

    lines.push(row('Recent Predictions'));
    lines.push(row('Date', 'Risk Level', 'Risk Probability (%)', 'Average Score (%)', 'Completion Rate (%)', 'Engagement'));
    for (const prediction of report.recentPredictions) {
      lines.push(
        row(
          prediction.date ? new Date(prediction.date).toISOString() : '',
          prediction.riskLevel,
          prediction.riskProbability,
          prediction.avgScore,
          prediction.completionRate,
          prediction.engagement
        )
      );
    }

    const csv = lines.join('\n');
    const filename = `learning-analytics-report-${report.student.studentIdNumber}-${report.range}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('CSV report export error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while exporting CSV report' },
      { status: 500 }
    );
  }
}
