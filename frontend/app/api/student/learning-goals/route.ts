import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import LearningGoal from '@/model/learning-analytics/LearningGoal';
import {
    successResponse,
    unauthorizedResponse,
    serverErrorResponse,
} from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return unauthorizedResponse('No token provided');
        }

        const payload = verifyToken(token);

        if (!payload || payload.userRole !== 'student') {
            return unauthorizedResponse('Unauthorized access');
        }

        const body = await request.json();
        const {
            title,
            description,
            category,
            targetDate,
            priority,
            milestones,
            tags,
            courseId,
        } = body;

        // Validation
        if (!title || !description || !targetDate) {
            return serverErrorResponse('Title, description, and target date are required');
        }

        // Create goal
        const goal = new LearningGoal({
            studentId: payload.userId,
            title,
            description,
            category: category || 'academic',
            targetDate: new Date(targetDate),
            priority: priority || 'medium',
            status: 'active',
            progress: 0,
            milestones: milestones || [],
            tags: tags || [],
            courseId: courseId || null,
        });

        await goal.save();

        return successResponse('Goal created successfully', { goal }, 201);
    } catch (error: any) {
        console.error('Create goal error:', error);
        return serverErrorResponse('An error occurred while creating goal');
    }
}

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
            return unauthorizedResponse('Unauthorized access');
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const priority = searchParams.get('priority');

        // Build query
        let query: any = { studentId: payload.userId };

        if (status && status !== 'all') {
            query.status = status;
        }

        if (category && category !== 'all') {
            query.category = category;
        }

        if (priority && priority !== 'all') {
            query.priority = priority;
        }

        // Fetch goals
        const goals = await LearningGoal.find(query)
            .populate('courseId', 'courseName credits')
            .sort({ createdAt: -1 });

        // Calculate statistics
        const stats = {
            total: goals.length,
            active: goals.filter((g) => g.status === 'active').length,
            completed: goals.filter((g) => g.status === 'completed').length,
            overdue: goals.filter((g) => g.status === 'overdue').length,
            avgProgress:
                goals.length > 0
                    ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
                    : 0,
        };

        return successResponse(
            'Goals retrieved successfully',
            {
                goals,
                stats,
            },
            200
        );
    } catch (error: any) {
        console.error('Get goals error:', error);
        return serverErrorResponse('An error occurred while fetching goals');
    }
}