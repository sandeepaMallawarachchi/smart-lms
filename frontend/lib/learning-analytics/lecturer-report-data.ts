type LecturerReportFilters = {
  lecturerId: string;
  courseId?: string;
  year?: string;
  semester?: string;
  specialization?: string;
  limit?: number;
  recommendationLimit?: number;
};

const mean = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export async function getLecturerReportData(
  chatbotBaseUrl: string,
  filters: LecturerReportFilters
) {
  const predictiveResponse = await fetch(`${chatbotBaseUrl}/analytics/predictive-analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });

  if (!predictiveResponse.ok) {
    const text = await predictiveResponse.text();
    throw new Error(`Predictive analytics failed: ${text}`);
  }

  const predictive = await predictiveResponse.json();
  if (!predictive?.success) {
    throw new Error(predictive?.error || 'Predictive analytics response failed');
  }

  const insightsResponse = await fetch(`${chatbotBaseUrl}/analytics/student-insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...filters,
      includeLivePrediction: true,
    }),
  });

  if (!insightsResponse.ok) {
    const text = await insightsResponse.text();
    throw new Error(`Student insights failed: ${text}`);
  }

  const insights = await insightsResponse.json();
  if (!insights?.success) {
    throw new Error(insights?.error || 'Student insights response failed');
  }

  const students = Array.isArray(insights.students) ? insights.students : [];
  const courseAggMap = new Map<
    string,
    {
      courseId: string;
      courseName: string;
      students: number;
      risks: number[];
      completions: number[];
    }
  >();

  for (const student of students) {
    const courses = Array.isArray(student.courses) ? student.courses : [];
    for (const course of courses) {
      const key = String(course.courseId || '');
      if (!key) continue;
      if (!courseAggMap.has(key)) {
        courseAggMap.set(key, {
          courseId: key,
          courseName: String(course.courseName || 'Unknown Course'),
          students: 0,
          risks: [],
          completions: [],
        });
      }
      const item = courseAggMap.get(key)!;
      item.students += 1;
      item.risks.push(Number(student.riskProbability || 0));
      item.completions.push(Number(student.completionRate || 0));
    }
  }

  const courses = Array.from(courseAggMap.values()).map((course) => ({
    courseId: course.courseId,
    courseName: course.courseName,
    students: course.students,
    avgRiskProbability: Number(mean(course.risks).toFixed(1)),
    avgCompletionRate: Number(mean(course.completions).toFixed(1)),
  }));

  courses.sort((a, b) => b.avgRiskProbability - a.avgRiskProbability);

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      courseId: filters.courseId || null,
      year: filters.year || null,
      semester: filters.semester || null,
      specialization: filters.specialization || null,
      limit: filters.limit || 200,
      recommendationLimit: filters.recommendationLimit || 8,
    },
    summary: predictive.summary || insights.summary || {},
    riskBands: predictive.riskBands || null,
    livePrediction: predictive.livePrediction || insights.livePrediction || null,
    classGuidance: Array.isArray(predictive.classGuidance) ? predictive.classGuidance : [],
    topStudentsByRisk: Array.isArray(predictive.topStudentsByRisk)
      ? predictive.topStudentsByRisk
      : [],
    personalizedRecommendations: Array.isArray(predictive.personalizedRecommendations)
      ? predictive.personalizedRecommendations
      : [],
    students,
    courses,
  };
}

