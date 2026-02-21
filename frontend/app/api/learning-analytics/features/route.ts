import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import Student from '@/model/Student';
import Course from '@/model/Course';
import { Project, Task, StudentProjectProgress, StudentTaskProgress } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { successResponse, unauthorizedResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';

type HeatmapResponse = {
  heatmap?: Array<{
    date: string;
    count: number;
    isPrediction?: boolean;
  }>;
  summary?: {
    totalActivities?: number;
    averageDaily?: number;
    maxDaily?: number;
    activeDays?: number;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

const safeNumber = (value: number | undefined | null, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

const stdDev = (values: number[]) => {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const variance = mean(values.map((v) => (v - avg) ** 2));
  return Math.sqrt(variance);
};

const getAgeBand = (dateOfBirth?: Date | null) => {
  if (!dateOfBirth) return '0-35';
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  if (age <= 35) return '0-35';
  if (age <= 55) return '35-55';
  return '55<=';
};

const mapGender = (gender?: string | null) => {
  if (!gender) return 'M';
  const g = gender.toLowerCase();
  if (g === 'female') return 'F';
  if (g === 'other') return 'O';
  return 'M';
};

const calcDaysEarly = (submittedAt?: string | null, dueDate?: string | null) => {
  if (!submittedAt || !dueDate) return null;
  const submitted = new Date(submittedAt).getTime();
  const due = new Date(dueDate).getTime();
  if (!Number.isFinite(submitted) || !Number.isFinite(due)) return null;
  return (due - submitted) / DAY_MS;
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
    if (!payload || payload.userRole !== 'student') {
      return unauthorizedResponse('Unauthorized');
    }

    const student = await Student.findById(payload.userId).lean();
    if (!student) {
      return errorResponse('Student not found', { studentId: ['Student does not exist'] }, 404);
    }

    const year = parseInt(student.academicYear || '1', 10);
    const semester = parseInt(student.semester || '1', 10);
    const specialization = student.specialization || '';

    const courses = await Course.find({
      year,
      semester,
      specializations: specialization,
      isArchived: false,
    }).lean();

    const studiedCredits = courses.reduce((sum, c) => sum + safeNumber(c.credits, 0), 0);

    const courseIds = courses.map((c) => c._id.toString());

    const [projects, tasks, projectProgress, taskProgress] = await Promise.all([
      Project.find({ courseId: { $in: courseIds } }).lean(),
      Task.find({ courseId: { $in: courseIds } }).lean(),
      StudentProjectProgress.find({ studentId: payload.userId }).lean(),
      StudentTaskProgress.find({ studentId: payload.userId }).lean(),
    ]);

    const projectMap = new Map(projects.map((p) => [p._id.toString(), p]));
    const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));

    const progressDates: Date[] = [];
    let completedProjects = 0;
    let completedTasks = 0;
    let lateTaskOrProjectCount = 0;

    for (const p of projectProgress) {
      if (p.updatedAt) progressDates.push(new Date(p.updatedAt));
      if (p.status === 'done') {
        completedProjects++;
        const project = projectMap.get(p.projectId);
        if (project?.deadlineDate && p.updatedAt) {
          const delayDays = calcDaysEarly(p.updatedAt.toISOString(), project.deadlineDate);
          if (delayDays !== null && delayDays < 0) lateTaskOrProjectCount++;
        }
      }
    }

    for (const t of taskProgress) {
      if (t.updatedAt) progressDates.push(new Date(t.updatedAt));
      if (t.status === 'done') {
        completedTasks++;
        const task = taskMap.get(t.taskId);
        if (task?.deadlineDate && t.updatedAt) {
          const delayDays = calcDaysEarly(t.updatedAt.toISOString(), task.deadlineDate);
          if (delayDays !== null && delayDays < 0) lateTaskOrProjectCount++;
        }
      }
    }

    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const totalItems = totalProjects + totalTasks;
    const itemsCompleted = completedProjects + completedTasks;
    const taskCompletionRate = totalItems > 0 ? itemsCompleted / totalItems : 0;

    let studySpanDays = 0;
    let daysActive = 0;
    if (progressDates.length > 0) {
      const sortedDates = progressDates.sort((a, b) => a.getTime() - b.getTime());
      const uniqueDays = new Set(sortedDates.map((d) => d.toISOString().slice(0, 10)));
      daysActive = uniqueDays.size;
      studySpanDays = Math.max(1, Math.round((sortedDates[sortedDates.length - 1].getTime() - sortedDates[0].getTime()) / DAY_MS) + 1);
    }

    // Heatmap service for activity metrics (proxy for VLE clicks)
    const heatmapUrl = process.env.HEATMAP_SERVICE_URL || 'http://localhost:5002/heatmap';
    let heatmapData: HeatmapResponse | null = null;
    try {
      const heatmapRes = await fetch(heatmapUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: payload.userId }),
      });
      if (heatmapRes.ok) {
        heatmapData = (await heatmapRes.json()) as HeatmapResponse;
      }
    } catch (err) {
      heatmapData = null;
    }

    const heatmapCounts = (heatmapData?.heatmap || [])
      .filter((d) => !d.isPrediction)
      .map((d) => safeNumber(d.count, 0));

    const totalClicks = safeNumber(heatmapData?.summary?.totalActivities, 0);
    const avgClicksPerDay = safeNumber(heatmapData?.summary?.averageDaily, mean(heatmapCounts));
    const maxClicksSingleDay = safeNumber(heatmapData?.summary?.maxDaily, Math.max(0, ...heatmapCounts));
    const clicksStd = stdDev(heatmapCounts);
    if (!daysActive && safeNumber(heatmapData?.summary?.activeDays, 0) > 0) {
      daysActive = safeNumber(heatmapData?.summary?.activeDays, 0);
    }

    const engagementRegularity = avgClicksPerDay > 0 ? clicksStd / avgClicksPerDay : 0;

    const avgScore = 0;
    const scoreStd = 0;
    const minScore = 0;
    const maxScore = 0;
    const firstScore = 0;
    const scoreImprovement = 0;
    const completionRate = taskCompletionRate;
    const avgDaysEarly = 0;
    const timingConsistency = 0;
    const worstDelay = 0;
    const lateSubmissionCount = lateTaskOrProjectCount;
    const numOfPrevAttempts = 0;

    const semesterStartMonth = semester === 1 ? 1 : 6;
    const semesterStart = new Date(new Date().getFullYear(), semesterStartMonth - 1, 1);
    const earlyRegistration = student.createdAt ? (new Date(student.createdAt) < semesterStart ? 1 : 0) : 0;

    const payloadData = {
      student_id: student.studentIdNumber,
      total_clicks: totalClicks,
      avg_clicks_per_day: avgClicksPerDay,
      clicks_std: clicksStd,
      max_clicks_single_day: maxClicksSingleDay,
      days_active: daysActive,
      study_span_days: studySpanDays,
      engagement_regularity: engagementRegularity,
      pre_course_clicks: 0,
      avg_score: avgScore,
      score_std: scoreStd,
      min_score: minScore,
      max_score: maxScore,
      completion_rate: completionRate,
      first_score: firstScore,
      score_improvement: scoreImprovement,
      avg_days_early: avgDaysEarly,
      timing_consistency: timingConsistency,
      worst_delay: worstDelay,
      late_submission_count: lateSubmissionCount,
      num_of_prev_attempts: numOfPrevAttempts,
      studied_credits: studiedCredits,
      early_registration: earlyRegistration,
      withdrew: 0,
      gender: mapGender(student.gender),
      age_band: getAgeBand(student.dateOfBirth ? new Date(student.dateOfBirth) : null),
      highest_education: 'A Level or Equivalent',
      disability: 'N',
    };

    return successResponse('Features computed successfully', {
      payload: payloadData,
      sources: {
        courses: courses.length,
        projects: projects.length,
        tasks: tasks.length,
        heatmap: Boolean(heatmapData),
      },
    }, 200);
  } catch (error: any) {
    console.error('Feature aggregation error:', error);
    return serverErrorResponse('An error occurred while computing features');
  }
}
