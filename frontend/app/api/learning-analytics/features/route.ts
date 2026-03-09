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

const parseDueDateTime = (dueDate?: string | null, dueTime?: string | null) => {
  if (!dueDate) return null;
  const time = (dueTime && dueTime.trim()) ? dueTime.trim() : '23:59';
  const candidate = new Date(`${dueDate}T${time}:00`);
  if (Number.isNaN(candidate.getTime())) return null;
  return candidate;
};

const calcDaysEarly = (submittedAt?: string | null, dueDate?: string | null, dueTime?: string | null) => {
  if (!submittedAt || !dueDate) return null;
  const submitted = new Date(submittedAt).getTime();
  const dueDateTime = parseDueDateTime(dueDate, dueTime);
  if (!dueDateTime) return null;
  const due = dueDateTime.getTime();
  if (!Number.isFinite(submitted) || !Number.isFinite(due)) return null;
  return (due - submitted) / DAY_MS;
};

const projectPossibleMarks = (project: any) => {
  const mainTasks = Array.isArray(project?.mainTasks) ? project.mainTasks : [];
  let total = 0;
  for (const mainTask of mainTasks) {
    total += safeNumber(Number(mainTask?.marks), 0);
    const subtasks = Array.isArray(mainTask?.subtasks) ? mainTask.subtasks : [];
    for (const subtask of subtasks) {
      total += safeNumber(Number(subtask?.marks), 0);
    }
  }
  return total;
};

const taskPossibleMarks = (task: any) => {
  const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
  let total = 0;
  for (const subtask of subtasks) {
    total += safeNumber(Number(subtask?.marks), 0);
  }
  return total;
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
    const projectMarksMap = new Map(projects.map((p) => [p._id.toString(), projectPossibleMarks(p)]));
    const taskMarksMap = new Map(tasks.map((t) => [t._id.toString(), taskPossibleMarks(t)]));

    const latestProjectProgress = new Map<string, any>();
    const latestTaskProgress = new Map<string, any>();
    const progressDates: Date[] = [];
    let completedProjects = 0;
    let completedTasks = 0;
    let lateTaskOrProjectCount = 0;
    let totalPossibleAssignedMarks = 0;
    let totalEarnedAssignedMarks = 0;
    const assignedScoreValues: number[] = [];
    const completionScores: Array<{ score: number; completedAt: Date }> = [];
    const daysEarlyValues: number[] = [];
    let worstDelay = 0;

    for (const p of projectProgress) {
      const project = projectMap.get(p.projectId);
      if (!project) continue;
      const existing = latestProjectProgress.get(p.projectId);
      if (!existing || (p.updatedAt && (!existing.updatedAt || new Date(p.updatedAt).getTime() > new Date(existing.updatedAt).getTime()))) {
        latestProjectProgress.set(p.projectId, p);
      }
    }

    for (const t of taskProgress) {
      const task = taskMap.get(t.taskId);
      if (!task) continue;
      const existing = latestTaskProgress.get(t.taskId);
      if (!existing || (t.updatedAt && (!existing.updatedAt || new Date(t.updatedAt).getTime() > new Date(existing.updatedAt).getTime()))) {
        latestTaskProgress.set(t.taskId, t);
      }
    }

    for (const project of projects) {
      const projectId = project._id.toString();
      const progress = latestProjectProgress.get(projectId);
      const possibleMarks = safeNumber(projectMarksMap.get(projectId), 0);
      if (progress?.updatedAt) progressDates.push(new Date(progress.updatedAt));

      const isDone = progress?.status === 'done';
      if (isDone) completedProjects++;

      let daysEarly: number | null = null;
      if (isDone && project.deadlineDate && progress?.updatedAt) {
        daysEarly = calcDaysEarly(progress.updatedAt.toISOString(), project.deadlineDate, project.deadlineTime);
        if (daysEarly !== null) {
          daysEarlyValues.push(daysEarly);
          if (daysEarly < 0) {
            lateTaskOrProjectCount++;
            worstDelay = Math.min(worstDelay, daysEarly);
          }
        }
      }

      if (possibleMarks > 0) {
        totalPossibleAssignedMarks += possibleMarks;
        const earnedMarks = isDone && (daysEarly === null || daysEarly >= 0) ? possibleMarks : 0;
        totalEarnedAssignedMarks += earnedMarks;
        assignedScoreValues.push((earnedMarks / possibleMarks) * 100);
        if (isDone && progress?.updatedAt) {
          completionScores.push({
            score: (earnedMarks / possibleMarks) * 100,
            completedAt: new Date(progress.updatedAt),
          });
        }
      }
    }

    for (const task of tasks) {
      const taskId = task._id.toString();
      const progress = latestTaskProgress.get(taskId);
      const possibleMarks = safeNumber(taskMarksMap.get(taskId), 0);
      if (progress?.updatedAt) progressDates.push(new Date(progress.updatedAt));

      const isDone = progress?.status === 'done';
      if (isDone) completedTasks++;

      let daysEarly: number | null = null;
      if (isDone && task.deadlineDate && progress?.updatedAt) {
        daysEarly = calcDaysEarly(progress.updatedAt.toISOString(), task.deadlineDate, task.deadlineTime);
        if (daysEarly !== null) {
          daysEarlyValues.push(daysEarly);
          if (daysEarly < 0) {
            lateTaskOrProjectCount++;
            worstDelay = Math.min(worstDelay, daysEarly);
          }
        }
      }

      if (possibleMarks > 0) {
        totalPossibleAssignedMarks += possibleMarks;
        const earnedMarks = isDone && (daysEarly === null || daysEarly >= 0) ? possibleMarks : 0;
        totalEarnedAssignedMarks += earnedMarks;
        assignedScoreValues.push((earnedMarks / possibleMarks) * 100);
        if (isDone && progress?.updatedAt) {
          completionScores.push({
            score: (earnedMarks / possibleMarks) * 100,
            completedAt: new Date(progress.updatedAt),
          });
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
    const configuredHeatmapUrl = process.env.HEATMAP_SERVICE_URL;
    if (!configuredHeatmapUrl) {
      return serverErrorResponse('HEATMAP_SERVICE_URL is not configured');
    }
    const normalizedHeatmapUrl = configuredHeatmapUrl.replace(/\/$/, '');
    const heatmapUrl = /\/heatmap$/.test(normalizedHeatmapUrl)
      ? normalizedHeatmapUrl
      : `${normalizedHeatmapUrl}/heatmap`;
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

    completionScores.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
    const scoreValues = completionScores.map((entry) => entry.score);
    const avgScore = totalPossibleAssignedMarks > 0
      ? (totalEarnedAssignedMarks / totalPossibleAssignedMarks) * 100
      : 0;
    const scoreStd = stdDev(assignedScoreValues);
    const minScore = assignedScoreValues.length > 0 ? Math.min(...assignedScoreValues) : 0;
    const maxScore = assignedScoreValues.length > 0 ? Math.max(...assignedScoreValues) : 0;
    const firstScore = scoreValues.length > 0 ? scoreValues[0] : 0;
    const scoreImprovement = scoreValues.length > 1 ? scoreValues[scoreValues.length - 1] - scoreValues[0] : 0;
    const completionRate = taskCompletionRate;
    const avgDaysEarly = mean(daysEarlyValues);
    const timingConsistency = stdDev(daysEarlyValues);
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
