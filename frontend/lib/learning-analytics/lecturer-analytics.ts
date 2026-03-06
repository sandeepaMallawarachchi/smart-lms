import Course from '@/model/Course';
import Student from '@/model/Student';
import Prediction from '@/model/Prediction';

type RiskLevel = 'high' | 'medium' | 'low' | 'unknown';

interface LecturerStudentInsight {
  studentId: string;
  studentIdNumber: string;
  name: string;
  email: string;
  specialization: string;
  academicYear: string;
  semester: string;
  riskLevel: RiskLevel;
  riskProbability: number;
  completionRate: number;
  engagement: number;
  avgScore: number;
  lateSubmissionCount: number;
  predictionCreatedAt: string | null;
}

const mean = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const toIso = (value: Date | string | undefined | null) => {
  if (!value) return null;
  return new Date(value).toISOString();
};

export async function getLecturerScopedData(lecturerId: string) {
  const courses = await Course.find({
    isArchived: false,
    $or: [{ lecturerInCharge: lecturerId }, { lecturers: lecturerId }],
  }).lean();

  const studentFilters = courses.flatMap((course) =>
    (course.specializations || []).map((specialization) => ({
      academicYear: String(course.year),
      semester: String(course.semester),
      specialization,
    }))
  );

  const students =
    studentFilters.length > 0
      ? await Student.find({ $or: studentFilters }).lean()
      : [];

  const uniqueStudentsMap = new Map(students.map((student) => [student._id.toString(), student]));
  const uniqueStudents = Array.from(uniqueStudentsMap.values());

  const studentIds = uniqueStudents.map((student) => student._id.toString());
  const predictions =
    studentIds.length > 0
      ? await Prediction.find({ studentId: { $in: studentIds } }).sort({ createdAt: -1 }).lean()
      : [];

  const latestPredictionByStudent = new Map<string, (typeof predictions)[number]>();
  const predictionsByStudent = new Map<string, (typeof predictions)[]>();

  for (const prediction of predictions) {
    const studentId = prediction.studentId.toString();
    if (!latestPredictionByStudent.has(studentId)) {
      latestPredictionByStudent.set(studentId, prediction);
    }
    if (!predictionsByStudent.has(studentId)) {
      predictionsByStudent.set(studentId, []);
    }
    predictionsByStudent.get(studentId)!.push(prediction);
  }

  const studentInsights: LecturerStudentInsight[] = uniqueStudents.map((student) => {
    const studentId = student._id.toString();
    const latest = latestPredictionByStudent.get(studentId);

    return {
      studentId,
      studentIdNumber: student.studentIdNumber,
      name: student.name,
      email: student.email,
      specialization: student.specialization || '',
      academicYear: student.academicYear,
      semester: student.semester,
      riskLevel: (latest?.prediction?.risk_level as RiskLevel) || 'unknown',
      riskProbability: Number(((latest?.prediction?.risk_probability || 0) * 100).toFixed(1)),
      completionRate: Number((((latest?.inputData?.completion_rate || 0) as number) * 100).toFixed(1)),
      engagement: Math.round((latest?.inputData?.total_clicks || 0) as number),
      avgScore: Number(((latest?.inputData?.avg_score || 0) as number).toFixed(1)),
      lateSubmissionCount: Math.round((latest?.inputData?.late_submission_count || 0) as number),
      predictionCreatedAt: toIso(latest?.createdAt),
    };
  });

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const currentStart = new Date(now - sevenDaysMs);
  const previousStart = new Date(now - sevenDaysMs * 2);

  const currentPeriod = predictions.filter((prediction) => new Date(prediction.createdAt) >= currentStart);
  const previousPeriod = predictions.filter(
    (prediction) =>
      new Date(prediction.createdAt) >= previousStart && new Date(prediction.createdAt) < currentStart
  );

  const periodMetrics = (rows: typeof predictions) => ({
    avgCompletionRate: mean(rows.map((row) => ((row.inputData?.completion_rate || 0) as number) * 100)),
    avgEngagement: mean(rows.map((row) => (row.inputData?.total_clicks || 0) as number)),
    avgRisk: mean(rows.map((row) => ((row.prediction?.risk_probability || 0) as number) * 100)),
  });

  const current = periodMetrics(currentPeriod);
  const previous = periodMetrics(previousPeriod);

  const overview = {
    totals: {
      students: uniqueStudents.length,
      courses: courses.length,
      predictions: predictions.length,
      highRiskStudents: studentInsights.filter((student) => student.riskLevel === 'high').length,
      mediumRiskStudents: studentInsights.filter((student) => student.riskLevel === 'medium').length,
      lowRiskStudents: studentInsights.filter((student) => student.riskLevel === 'low').length,
    },
    averages: {
      completionRate: Number(mean(studentInsights.map((student) => student.completionRate)).toFixed(1)),
      riskProbability: Number(mean(studentInsights.map((student) => student.riskProbability)).toFixed(1)),
      engagement: Math.round(mean(studentInsights.map((student) => student.engagement))),
      avgScore: Number(mean(studentInsights.map((student) => student.avgScore)).toFixed(1)),
    },
    trends: {
      completionRateChange: Number((current.avgCompletionRate - previous.avgCompletionRate).toFixed(1)),
      engagementChange: Number((current.avgEngagement - previous.avgEngagement).toFixed(1)),
      riskChange: Number((current.avgRisk - previous.avgRisk).toFixed(1)),
    },
    byCourse: courses.map((course) => {
      const courseStudents = uniqueStudents.filter(
        (student) =>
          student.academicYear === String(course.year) &&
          student.semester === String(course.semester) &&
          (course.specializations || []).includes(student.specialization || '')
      );

      const courseStudentInsights = courseStudents
        .map((student) => studentInsights.find((insight) => insight.studentId === student._id.toString()))
        .filter((item): item is LecturerStudentInsight => Boolean(item));

      return {
        courseId: course._id.toString(),
        courseName: course.courseName,
        year: course.year,
        semester: course.semester,
        students: courseStudents.length,
        avgCompletionRate: Number(
          mean(courseStudentInsights.map((student) => student.completionRate)).toFixed(1)
        ),
        avgRiskProbability: Number(
          mean(courseStudentInsights.map((student) => student.riskProbability)).toFixed(1)
        ),
      };
    }),
  };

  return {
    courses,
    students: uniqueStudents,
    predictions,
    predictionsByStudent,
    studentInsights,
    overview,
  };
}
