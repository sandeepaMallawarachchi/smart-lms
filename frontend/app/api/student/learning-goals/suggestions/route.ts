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
import {
  Project,
  Task,
  StudentProjectProgress,
  StudentTaskProgress,
} from '@/model/projects-and-tasks/lecturer/projectTaskModel';

type CourseworkItem = {
  name: string;
  courseName: string;
  status: string;
  deadlineDate: string;
  updatedAt: string | null;
};

const normalizeGoalStatus = (status: string) => {
  if (status === 'completed' || status === 'done') return 'done';
  if (status === 'inprogress') return 'inprogress';
  return 'todo';
};

const toIso = (value?: Date | string | null) => {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
};

const analyticsBaseUrl = () => {
  const configured =
    process.env.LEARNING_ANALYTICS_API_URL ||
    process.env.NEXT_PUBLIC_LEARNING_ANALYTICS_API_URL ||
    process.env.ML_API_URL;

  return (configured || '').replace(/\/$/, '');
};

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

    const student = await Student.findById(payload.userId)
      .select('name studentIdNumber academicYear semester specialization gender dateOfBirth createdAt')
      .lean();

    if (!student) {
      return notFoundResponse('Student not found');
    }

    const courses = await Course.find({
      year: parseInt(student.academicYear || '1', 10),
      semester: parseInt(student.semester || '1', 10),
      specializations: student.specialization,
      isArchived: false,
    })
      .select('courseName credits year semester')
      .sort({ courseName: 1 })
      .lean();

    const courseIds = courses.map((course) => course._id.toString());

    const [projectProgresses, taskProgresses, projects, tasks, latestPrediction, existingGoals] =
      await Promise.all([
        StudentProjectProgress.find({ studentId: payload.userId }).sort({ updatedAt: -1 }).lean(),
        StudentTaskProgress.find({ studentId: payload.userId }).sort({ updatedAt: -1 }).lean(),
        Project.find({ courseId: { $in: courseIds } })
          .select('courseId projectName deadlineDate updatedAt')
          .lean(),
        Task.find({ courseId: { $in: courseIds } })
          .select('courseId taskName deadlineDate updatedAt')
          .lean(),
        Prediction.findOne({ studentId: payload.userId }).sort({ createdAt: -1 }).lean(),
        LearningGoal.find({ studentId: payload.userId })
          .select('title status category targetDate')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

    const courseMap = new Map(courses.map((course) => [course._id.toString(), course.courseName]));
    const projectMap = new Map(projects.map((project) => [project._id.toString(), project]));
    const taskMap = new Map(tasks.map((task) => [task._id.toString(), task]));

    const projectItems: CourseworkItem[] = projectProgresses
      .map((progress) => {
        const project = projectMap.get(progress.projectId);
        if (!project) return null;
        return {
          name: project.projectName,
          courseName: courseMap.get(project.courseId) || 'Unknown Course',
          status: progress.status,
          deadlineDate: project.deadlineDate || '',
          updatedAt: toIso(progress.updatedAt),
        };
      })
      .filter((item): item is CourseworkItem => Boolean(item))
      .slice(0, 8);

    const taskItems: CourseworkItem[] = taskProgresses
      .map((progress) => {
        const task = taskMap.get(progress.taskId);
        if (!task) return null;
        return {
          name: task.taskName,
          courseName: courseMap.get(task.courseId) || 'Unknown Course',
          status: progress.status,
          deadlineDate: task.deadlineDate || '',
          updatedAt: toIso(progress.updatedAt),
        };
      })
      .filter((item): item is CourseworkItem => Boolean(item))
      .slice(0, 8);

    const baseUrl = analyticsBaseUrl();
    if (!baseUrl) {
      return serverErrorResponse('LEARNING_ANALYTICS_API_URL is not configured');
    }

    const goalContext = {
      student: {
        name: student.name,
        studentIdNumber: student.studentIdNumber,
        academicYear: student.academicYear,
        semester: student.semester,
        specialization: student.specialization,
      },
      courses: courses.map((course) => ({
        courseId: course._id.toString(),
        courseName: course.courseName,
        credits: course.credits,
      })),
      projects: projectItems,
      tasks: taskItems,
      latest_prediction: latestPrediction
        ? {
            risk_level: latestPrediction.prediction?.risk_level || 'unknown',
            risk_probability: latestPrediction.prediction?.risk_probability || 0,
            risk_factors: latestPrediction.prediction?.risk_factors || [],
          }
        : null,
      existing_goals: existingGoals.map((goal) => ({
        title: goal.title,
        status: normalizeGoalStatus(String(goal.status || 'todo')),
        category: goal.category,
        targetDate: toIso(goal.targetDate),
      })),
    };

    const suggestionResponse = await fetch(`${baseUrl}/api/goal-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalContext),
    });

    if (!suggestionResponse.ok) {
      const errorText = await suggestionResponse.text();
      console.error('Goal suggestion backend error:', errorText);
      return serverErrorResponse('Failed to generate AI goal suggestions');
    }

    const suggestionData = await suggestionResponse.json();
    const goals = suggestionData?.data?.goals || [];

    return successResponse('AI goal suggestions generated successfully', {
      goals,
      context: {
        courses: goalContext.courses.length,
        projects: goalContext.projects.length,
        tasks: goalContext.tasks.length,
        existingGoals: goalContext.existing_goals.length,
      },
    });
  } catch (error: unknown) {
    console.error('Goal suggestion route error:', error);
    return serverErrorResponse('An error occurred while generating goal suggestions');
  }
}
