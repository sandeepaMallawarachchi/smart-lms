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

type ReportRange = 'weekly' | 'monthly' | 'all';

const DAY_MS = 24 * 60 * 60 * 1000;

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const normalizeGoalStatus = (status: string) => {
  if (status === 'completed' || status === 'done') return 'done';
  if (status === 'inprogress') return 'inprogress';
  return 'todo';
};

export async function buildStudentReportData(userId: string, range: ReportRange = 'monthly') {
  const student = await Student.findById(userId).lean();
  if (!student) {
    throw new Error('Student not found');
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

  const courseIds = courses.map((course) => course._id.toString());

  const [projects, tasks, projectProgress, taskProgress, goals, latestPrediction] = await Promise.all([
    Project.find({ courseId: { $in: courseIds } }).lean(),
    Task.find({ courseId: { $in: courseIds } }).lean(),
    StudentProjectProgress.find({ studentId: userId }).lean(),
    StudentTaskProgress.find({ studentId: userId }).lean(),
    LearningGoal.find({ studentId: userId }).sort({ createdAt: -1 }).lean(),
    Prediction.findOne({ studentId: userId }).sort({ createdAt: -1 }).lean(),
  ]);

  const now = new Date();
  const rangeStart =
    range === 'weekly'
      ? new Date(now.getTime() - 7 * DAY_MS)
      : range === 'monthly'
      ? new Date(now.getTime() - 30 * DAY_MS)
      : null;

  const predictionFilter: Record<string, any> = { studentId: userId };
  if (rangeStart) {
    predictionFilter.createdAt = { $gte: rangeStart, $lte: now };
  }

  const predictions = await Prediction.find(predictionFilter).sort({ createdAt: -1 }).limit(200).lean();

  const scoreValues = predictions.map((prediction) => prediction.inputData?.avg_score ?? 0);
  const completionValues = predictions.map(
    (prediction) => (prediction.inputData?.completion_rate ?? 0) * 100
  );
  const engagementValues = predictions.map((prediction) => prediction.inputData?.total_clicks ?? 0);
  const riskValues = predictions.map(
    (prediction) => (prediction.prediction?.risk_probability ?? 0) * 100
  );

  const projectDone = projectProgress.filter((item) => item.status === 'done').length;
  const taskDone = taskProgress.filter((item) => item.status === 'done').length;
  const projectTotal = projects.length;
  const taskTotal = tasks.length;
  const workTotal = projectTotal + taskTotal;
  const workCompleted = projectDone + taskDone;
  const overallProgress = workTotal > 0 ? (workCompleted / workTotal) * 100 : 0;

  const goalStats = goals.reduce(
    (acc, goal) => {
      const normalized = normalizeGoalStatus(goal.status as string);
      if (normalized === 'todo') acc.todo += 1;
      if (normalized === 'inprogress') acc.inprogress += 1;
      if (normalized === 'done') acc.done += 1;
      return acc;
    },
    { todo: 0, inprogress: 0, done: 0 }
  );

  const courseReports = courses.map((course) => {
    const courseProjects = projectProgress.filter((item) =>
      projects.some(
        (project) => project._id.toString() === item.projectId && project.courseId === course._id.toString()
      )
    );
    const courseTasks = taskProgress.filter((item) =>
      tasks.some((task) => task._id.toString() === item.taskId && task.courseId === course._id.toString())
    );

    const total = courseProjects.length + courseTasks.length;
    const completed =
      courseProjects.filter((item) => item.status === 'done').length +
      courseTasks.filter((item) => item.status === 'done').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      courseId: course._id.toString(),
      courseName: course.courseName,
      credits: course.credits,
      completionRate: Number(completionRate.toFixed(1)),
      tasksTotal: total,
      tasksCompleted: completed,
    };
  });

  const recentPredictions = predictions.slice(0, 10).map((prediction) => ({
    date: prediction.createdAt,
    riskLevel: prediction.prediction?.risk_level ?? 'unknown',
    riskProbability: Number(((prediction.prediction?.risk_probability ?? 0) * 100).toFixed(1)),
    avgScore: Number((prediction.inputData?.avg_score ?? 0).toFixed(1)),
    completionRate: Number(((prediction.inputData?.completion_rate ?? 0) * 100).toFixed(1)),
    engagement: Math.round(prediction.inputData?.total_clicks ?? 0),
  }));

  return {
    generatedAt: new Date().toISOString(),
    range,
    student: {
      id: student._id.toString(),
      studentIdNumber: student.studentIdNumber,
      name: student.name,
      specialization: student.specialization,
      semester: student.semester,
      academicYear: student.academicYear,
      email: student.email,
    },
    overview: {
      totalCourses: courses.length,
      overallProgress: Number(overallProgress.toFixed(1)),
      completionRate: Number(overallProgress.toFixed(1)),
      achievements: workCompleted,
      atRisk:
        latestPrediction?.prediction?.risk_level === 'high' ||
        latestPrediction?.prediction?.risk_level === 'medium',
      latestRiskLevel: latestPrediction?.prediction?.risk_level ?? 'unknown',
      latestRiskProbability: Number(
        ((latestPrediction?.prediction?.risk_probability ?? 0) * 100).toFixed(1)
      ),
    },
    metrics: {
      averageScore: Number(mean(scoreValues).toFixed(1)),
      averageCompletionRate: Number(mean(completionValues).toFixed(1)),
      averageEngagement: Math.round(mean(engagementValues)),
      averageRiskProbability: Number(mean(riskValues).toFixed(1)),
      lateSubmissionCount: predictions.reduce(
        (sum, prediction) => sum + (prediction.inputData?.late_submission_count ?? 0),
        0
      ),
      activeDays: Math.max(
        0,
        ...predictions.map((prediction) => prediction.inputData?.days_active ?? 0)
      ),
      studiedCredits: courses.reduce((sum, course) => sum + (course.credits ?? 0), 0),
    },
    goals: {
      total: goals.length,
      todo: goalStats.todo,
      inprogress: goalStats.inprogress,
      done: goalStats.done,
      items: goals.slice(0, 20).map((goal) => ({
        id: goal._id.toString(),
        title: goal.title,
        status: normalizeGoalStatus(goal.status as string),
        category: goal.category,
        priority: goal.priority,
        targetDate: goal.targetDate,
      })),
    },
    courses: courseReports,
    recentPredictions,
  };
}

export type StudentReportData = Awaited<ReturnType<typeof buildStudentReportData>>;

