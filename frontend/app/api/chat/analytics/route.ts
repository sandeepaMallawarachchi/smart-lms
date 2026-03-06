import { NextRequest } from 'next/server';
import { serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const configuredChatbotUrl = process.env.CHATBOT_URL || process.env.CHATBOT_BASE_URL;
    if (!configuredChatbotUrl) {
      return serverErrorResponse('CHATBOT_URL is not configured');
    }
    const normalized = configuredChatbotUrl.replace(/\/$/, '');
    const chatbotUrl = /\/chat$/.test(normalized) ? normalized : `${normalized}/chat`;

    const response = await fetch(chatbotUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          success: false,
          message: `Chatbot request failed (${response.status})`,
          error: errorText,
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return serverErrorResponse('Failed to reach chatbot service');
  }
}
