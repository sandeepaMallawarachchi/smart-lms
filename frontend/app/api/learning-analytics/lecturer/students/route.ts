import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';

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
    const courseId = params.get('courseId') || undefined;
    const year = params.get('year') || undefined;
    const semester = params.get('semester') || undefined;
    const specialization = params.get('specialization') || undefined;
    const includeLivePrediction = params.get('includeLivePrediction') === 'true';

    const chatbotBaseUrl =
      process.env.CHATBOT_BASE_URL ||
      (process.env.CHATBOT_URL ? process.env.CHATBOT_URL.replace(/\/chat\/?$/, '') : '') ||
      'http://localhost:5001';
    const chatbotResponse = await fetch(`${chatbotBaseUrl}/analytics/student-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lecturerId: payload.userId,
        courseId,
        year,
        semester,
        specialization,
        includeLivePrediction,
      }),
    });

    if (!chatbotResponse.ok) {
      const errorText = await chatbotResponse.text();
      console.error('Chatbot insights API error:', errorText);
      return serverErrorResponse('Failed to load student insights from chatbot service');
    }

    const chatbotData = await chatbotResponse.json();
    if (!chatbotData?.success) {
      console.error('Chatbot insights returned failure:', chatbotData);
      return serverErrorResponse('Chatbot service could not generate student insights');
    }

    let students = Array.isArray(chatbotData.students) ? [...chatbotData.students] : [];

    if (risk !== 'all') {
      students = students.filter((student) => String(student.riskLevel || '').toLowerCase() === risk);
    }

    if (q) {
      students = students.filter(
        (student) =>
          String(student.name || '').toLowerCase().includes(q) ||
          String(student.studentIdNumber || '').toLowerCase().includes(q) ||
          String(student.email || '').toLowerCase().includes(q)
      );
    }

    students.sort((a, b) => {
      const factor = order === 'asc' ? 1 : -1;
      if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || '')) * factor;
      if (sortBy === 'completion') return ((a.completionRate || 0) - (b.completionRate || 0)) * factor;
      if (sortBy === 'engagement') return ((a.engagement || 0) - (b.engagement || 0)) * factor;
      if (sortBy === 'score') return ((a.avgScore || 0) - (b.avgScore || 0)) * factor;
      return ((a.riskProbability || 0) - (b.riskProbability || 0)) * factor;
    });

    return successResponse('Lecturer student insights loaded successfully', {
      students,
      count: students.length,
      summary: chatbotData.summary || null,
      livePrediction: chatbotData.livePrediction || { requested: includeLivePrediction, enabled: false, error: null },
      filters: { q, risk, sortBy, order, courseId, year, semester, specialization, includeLivePrediction },
    });
  } catch (error: unknown) {
    console.error('Lecturer students insights error:', error);
    return serverErrorResponse('An error occurred while loading student insights');
  }
}
