import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import { getLecturerScopedData } from '@/lib/learning-analytics/lecturer-analytics';

type SortBy = 'risk' | 'completion' | 'engagement' | 'score' | 'name';
type RiskFilter = 'all' | 'high' | 'medium' | 'low' | 'unknown';

const parseSortBy = (value: string | null): SortBy => {
  if (value === 'risk' || value === 'completion' || value === 'engagement' || value === 'score' || value === 'name') {
    return value;
  }
  return 'risk';
};

const parseRisk = (value: string | null): RiskFilter => {
  if (value === 'all' || value === 'high' || value === 'medium' || value === 'low' || value === 'unknown') {
    return value;
  }
  return 'all';
};

export async function GET(request: NextRequest) {
  try {
    await connectDB();

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
    const q = (params.get('q') || '').trim().toLowerCase();
    const risk = parseRisk(params.get('risk'));
    const sortBy = parseSortBy(params.get('sortBy'));
    const order = params.get('order') === 'asc' ? 'asc' : 'desc';

    const data = await getLecturerScopedData(payload.userId);
    let students = [...data.studentInsights];

    if (risk !== 'all') {
      students = students.filter((student) => student.riskLevel === risk);
    }

    if (q) {
      students = students.filter(
        (student) =>
          student.name.toLowerCase().includes(q) ||
          student.studentIdNumber.toLowerCase().includes(q) ||
          student.email.toLowerCase().includes(q)
      );
    }

    students.sort((a, b) => {
      const factor = order === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * factor;
      if (sortBy === 'completion') return (a.completionRate - b.completionRate) * factor;
      if (sortBy === 'engagement') return (a.engagement - b.engagement) * factor;
      if (sortBy === 'score') return (a.avgScore - b.avgScore) * factor;
      return (a.riskProbability - b.riskProbability) * factor;
    });

    return successResponse('Lecturer student insights loaded successfully', {
      students,
      count: students.length,
      filters: { q, risk, sortBy, order },
    });
  } catch (error: unknown) {
    console.error('Lecturer students insights error:', error);
    return serverErrorResponse('An error occurred while loading student insights');
  }
}
