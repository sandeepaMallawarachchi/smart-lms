import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';

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

    const configuredChatbotUrl = process.env.CHATBOT_URL || process.env.CHATBOT_BASE_URL;
    if (!configuredChatbotUrl) {
      return serverErrorResponse('CHATBOT_URL is not configured');
    }
    const chatbotBaseUrl = configuredChatbotUrl.replace(/\/chat\/?$/, '').replace(/\/$/, '');

    const chatbotResponse = await fetch(`${chatbotBaseUrl}/analytics/predictive-analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lecturerId: payload.userId,
        courseId,
        year,
        semester,
        specialization,
        limit,
        recommendationLimit,
      }),
    });

    if (!chatbotResponse.ok) {
      const txt = await chatbotResponse.text();
      console.error('Predictive analytics chatbot error:', txt);
      return serverErrorResponse('Failed to load predictive analytics from chatbot service');
    }

    const chatbotData = await chatbotResponse.json();
    if (!chatbotData?.success) {
      console.error('Predictive analytics chatbot failed payload:', chatbotData);
      return serverErrorResponse('Chatbot service could not generate predictive analytics');
    }

    return successResponse('Predictive analytics loaded successfully', chatbotData);
  } catch (error: unknown) {
    console.error('Predictive analytics API error:', error);
    return serverErrorResponse('An error occurred while loading predictive analytics');
  }
}
