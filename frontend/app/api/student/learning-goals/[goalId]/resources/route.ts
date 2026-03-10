import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import Student from '@/model/Student';
import Course from '@/model/Course';
import Prediction from '@/model/Prediction';
import LearningGoal from '@/model/learning-analytics/LearningGoal';

type Provider = 'youtube' | 'google' | 'linkedin';

type ResourceItem = {
  title: string;
  provider: Provider;
  resourceType: 'video' | 'article' | 'course' | 'documentation' | 'practice';
  query: string;
  url: string;
  reason: string;
  tags: string[];
};

const normalizeGoalStatus = (status: string) => {
  if (status === 'completed' || status === 'done') return 'done';
  if (status === 'inprogress') return 'inprogress';
  return 'todo';
};

const analyticsBaseUrl = () => {
  const configured =
    process.env.LEARNING_ANALYTICS_API_URL ||
    process.env.NEXT_PUBLIC_LEARNING_ANALYTICS_API_URL ||
    process.env.ML_API_URL;

  return (configured || '').replace(/\/$/, '');
};

const youtubeApiKey = process.env.YOUTUBE_API_KEY || '';
const googleSearchApiKey = process.env.GOOGLE_SEARCH_API_KEY || '';
const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';

const withSearchFallback = (provider: Provider, query: string) => {
  const encoded = encodeURIComponent(query);
  if (provider === 'youtube') {
    return `https://www.youtube.com/results?search_query=${encoded}`;
  }
  if (provider === 'linkedin') {
    return `https://www.linkedin.com/search/results/content/?keywords=${encoded}`;
  }
  return `https://www.google.com/search?q=${encoded}`;
};

const resolveYoutubeResource = async (resource: ResourceItem) => {
  if (!youtubeApiKey) {
    return resource;
  }

  try {
    const endpoint = new URL('https://www.googleapis.com/youtube/v3/search');
    endpoint.searchParams.set('part', 'snippet');
    endpoint.searchParams.set('q', resource.query);
    endpoint.searchParams.set('type', 'video');
    endpoint.searchParams.set('maxResults', '1');
    endpoint.searchParams.set('key', youtubeApiKey);

    const response = await fetch(endpoint.toString(), { cache: 'no-store' });
    if (!response.ok) {
      return resource;
    }

    const data = await response.json();
    const item = Array.isArray(data.items) ? data.items[0] : null;
    const videoId = item?.id?.videoId;
    const title = item?.snippet?.title;

    if (!videoId) {
      return resource;
    }

    return {
      ...resource,
      title: title || resource.title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch {
    return resource;
  }
};

const resolveGoogleResource = async (resource: ResourceItem) => {
  if (!googleSearchApiKey || !googleSearchEngineId) {
    return resource;
  }

  try {
    const endpoint = new URL('https://www.googleapis.com/customsearch/v1');
    endpoint.searchParams.set('key', googleSearchApiKey);
    endpoint.searchParams.set('cx', googleSearchEngineId);
    endpoint.searchParams.set('q', resource.query);
    endpoint.searchParams.set('num', '1');

    const response = await fetch(endpoint.toString(), { cache: 'no-store' });
    if (!response.ok) {
      return resource;
    }

    const data = await response.json();
    const item = Array.isArray(data.items) ? data.items[0] : null;
    const link = item?.link;
    const title = item?.title;

    if (!link) {
      return resource;
    }

    return {
      ...resource,
      title: title || resource.title,
      url: link,
    };
  } catch {
    return resource;
  }
};

const resolveExactResource = async (resource: ResourceItem) => {
  if (resource.provider === 'youtube') {
    return resolveYoutubeResource(resource);
  }
  if (resource.provider === 'google') {
    return resolveGoogleResource(resource);
  }
  return resource;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    await connectDB();

    const { goalId } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'student') {
      return unauthorizedResponse('Unauthorized access');
    }

    const [student, goal, latestPrediction] = await Promise.all([
      Student.findById(payload.userId)
        .select('name studentIdNumber academicYear semester specialization')
        .lean(),
      LearningGoal.findOne({ _id: goalId, studentId: payload.userId })
        .select('title description category priority targetDate milestones tags status')
        .lean(),
      Prediction.findOne({ studentId: payload.userId }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!student) {
      return notFoundResponse('Student not found');
    }

    if (!goal) {
      return notFoundResponse('Goal not found');
    }

    const courses = await Course.find({
      year: parseInt(student.academicYear || '1', 10),
      semester: parseInt(student.semester || '1', 10),
      specializations: student.specialization,
      isArchived: false,
    })
      .select('courseName credits')
      .sort({ courseName: 1 })
      .lean();

    const baseUrl = analyticsBaseUrl();
    if (!baseUrl) {
      return serverErrorResponse('LEARNING_ANALYTICS_API_URL is not configured');
    }

    const resourceContext = {
      student: {
        name: student.name,
        studentIdNumber: student.studentIdNumber,
        academicYear: student.academicYear,
        semester: student.semester,
        specialization: student.specialization,
      },
      goal: {
        title: goal.title,
        description: goal.description,
        category: goal.category,
        priority: goal.priority,
        targetDate: goal.targetDate,
        status: normalizeGoalStatus(String(goal.status || 'todo')),
        milestones: Array.isArray(goal.milestones) ? goal.milestones : [],
        tags: Array.isArray(goal.tags) ? goal.tags : [],
      },
      courses: courses.map((course) => ({
        courseName: course.courseName,
        credits: course.credits,
      })),
      latest_prediction: latestPrediction
        ? {
            risk_level: latestPrediction.prediction?.risk_level || 'unknown',
            risk_probability: latestPrediction.prediction?.risk_probability || 0,
            risk_factors: latestPrediction.prediction?.risk_factors || [],
          }
        : null,
    };

    const resourceResponse = await fetch(`${baseUrl}/api/goal-resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resourceContext),
    });

    if (!resourceResponse.ok) {
      const errorText = await resourceResponse.text();
      console.error('Goal resource backend error:', errorText);
      return serverErrorResponse('Failed to generate AI resource suggestions');
    }

    const resourceData = await resourceResponse.json();

    const rawResources: ResourceItem[] = Array.isArray(resourceData?.data?.resources)
      ? resourceData.data.resources.map((resource: ResourceItem) => ({
          ...resource,
          url: resource.url || withSearchFallback(resource.provider, resource.query),
        }))
      : [];

    const resolvedResources = await Promise.all(rawResources.map(resolveExactResource));

    return successResponse('AI resource suggestions generated successfully', {
      resources: resolvedResources.slice(0, 3),
      goal: {
        id: goalId,
        title: goal.title,
      },
    });
  } catch (error: unknown) {
    console.error('Goal resources route error:', error);
    return serverErrorResponse('An error occurred while generating goal resources');
  }
}
