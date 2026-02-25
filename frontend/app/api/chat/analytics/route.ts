import { NextRequest } from 'next/server';
import { serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const chatbotUrl = process.env.CHATBOT_URL || 'http://localhost:5001/chat';

    const response = await fetch(chatbotUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return serverErrorResponse('Failed to reach chatbot service');
  }
}
