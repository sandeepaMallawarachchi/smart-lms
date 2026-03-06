import Student from '@/model/Student';
import Prediction from '@/model/Prediction';

type StudentReportFilters = {
  studentId: string;
  limit?: number;
};

const mean = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export async function getStudentProgressReportData(filters: StudentReportFilters) {
  const student = await Student.findById(filters.studentId).lean();
  if (!student) {
    throw new Error('Student not found');
  }

  const limit = filters.limit || 200;
  const predictions = await Prediction.find({ studentId: filters.studentId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const latest = predictions[0] || null;
  const recentPredictions = predictions.slice(0, 20).map((row) => ({
    createdAt: row.createdAt,
    riskLevel: row.prediction?.risk_level || 'unknown',
    riskProbability: Number(((row.prediction?.risk_probability || 0) * 100).toFixed(1)),
    completionRate: Number(((row.inputData?.completion_rate || 0) * 100).toFixed(1)),
    avgScore: Number((row.inputData?.avg_score || 0).toFixed(1)),
    engagement: Math.round(row.inputData?.total_clicks || 0),
    confidence: Number(((row.prediction?.confidence || 0) * 100).toFixed(1)),
  }));

  const completionValues = predictions.map((row) => (row.inputData?.completion_rate || 0) * 100);
  const riskValues = predictions.map((row) => (row.prediction?.risk_probability || 0) * 100);
  const scoreValues = predictions.map((row) => row.inputData?.avg_score || 0);
  const engagementValues = predictions.map((row) => row.inputData?.total_clicks || 0);
  const lateValues = predictions.map((row) => row.inputData?.late_submission_count || 0);

  return {
    generatedAt: new Date().toISOString(),
    student: {
      id: String(student._id),
      studentIdNumber: student.studentIdNumber,
      name: student.name,
      email: student.email,
      specialization: student.specialization,
      academicYear: student.academicYear,
      semester: student.semester,
    },
    summary: {
      totalPredictions: predictions.length,
      latestRiskLevel: latest?.prediction?.risk_level || 'unknown',
      latestRiskProbability: Number((((latest?.prediction?.risk_probability as number) || 0) * 100).toFixed(1)),
      latestCompletionRate: Number((((latest?.inputData?.completion_rate as number) || 0) * 100).toFixed(1)),
      latestScore: Number((((latest?.inputData?.avg_score as number) || 0)).toFixed(1)),
      latestEngagement: Math.round(((latest?.inputData?.total_clicks as number) || 0)),
    },
    averages: {
      riskProbability: Number(mean(riskValues).toFixed(1)),
      completionRate: Number(mean(completionValues).toFixed(1)),
      score: Number(mean(scoreValues).toFixed(1)),
      engagement: Math.round(mean(engagementValues)),
      lateSubmissions: Number(mean(lateValues).toFixed(1)),
    },
    recommendations: latest?.recommendations || null,
    riskFactors: Array.isArray(latest?.prediction?.risk_factors) ? latest?.prediction?.risk_factors : [],
    recentPredictions,
  };
}

