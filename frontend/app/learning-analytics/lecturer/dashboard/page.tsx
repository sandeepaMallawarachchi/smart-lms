'use client';

import { ReactNode, useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, TrendingDown, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

interface OverviewResponse {
  overview: {
    totals: {
      students: number;
      courses: number;
      predictions: number;
      highRiskStudents: number;
      mediumRiskStudents: number;
      lowRiskStudents: number;
    };
    averages: {
      completionRate: number;
      riskProbability: number;
      engagement: number;
      avgScore: number;
    };
    trends: {
      completionRateChange: number;
      engagementChange: number;
      riskChange: number;
    };
    byCourse: Array<{
      courseId: string;
      courseName: string;
      year: number;
      semester: number;
      students: number;
      avgCompletionRate: number;
      avgRiskProbability: number;
    }>;
  };
  topAtRiskStudents: Array<{
    studentId: string;
    studentIdNumber: string;
    name: string;
    riskLevel: string;
    riskProbability: number;
    completionRate: number;
    engagement: number;
  }>;
}

export default function LecturerDashboardPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/learning-analytics/lecturer/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to load lecturer overview');
      }

      const json = await response.json();
      setData(json.data || null);
    } catch (err) {
      console.error('Lecturer dashboard fetch error:', err);
      setError('Failed to load lecturer analytics dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading dashboard...</div>;
  }

  if (error || !data) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error || 'No data available'}</div>;
  }

  const { overview, topAtRiskStudents } = data;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Lecturer Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-cyan-100">Class-wide insight summary with estimated risk, completion, and engagement indicators.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="Students" value={overview.totals.students} icon={<Users size={18} />} />
        <KpiCard label="Courses" value={overview.totals.courses} icon={<BarChart3 size={18} />} />
        <KpiCard label="High Risk" value={overview.totals.highRiskStudents} icon={<AlertTriangle size={18} />} />
        <KpiCard label="Avg Completion" value={`${overview.averages.completionRate}%`} icon={<TrendingUp size={18} />} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Completion Trend (7d vs previous 7d)</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{overview.trends.completionRateChange}%</p>
          <TrendHint positive={overview.trends.completionRateChange >= 0} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Engagement Trend</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{overview.trends.engagementChange}</p>
          <TrendHint positive={overview.trends.engagementChange >= 0} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Estimated Risk Trend</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{overview.trends.riskChange}%</p>
          <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">
            {overview.trends.riskChange <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            Lower is better
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Top At-Risk Students</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Estimated Risk</th>
                  <th className="px-4 py-3 font-semibold">Completion</th>
                  <th className="px-4 py-3 font-semibold">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {topAtRiskStudents.length === 0 ? (
                  <tr><td className="px-4 py-4 text-slate-500" colSpan={4}>No at-risk students found.</td></tr>
                ) : (
                  topAtRiskStudents.map((student) => (
                    <tr key={student.studentId} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.studentIdNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-red-700">{student.riskProbability}%</td>
                      <td className="px-4 py-3 text-slate-700">{student.completionRate}%</td>
                      <td className="px-4 py-3 text-slate-700">{student.engagement}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 p-4">
            <Link href="/learning-analytics/lecturer/student-insights" className="text-sm font-semibold text-blue-700 hover:text-blue-900">
              View all student insights
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Course Performance Snapshot</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Students</th>
                  <th className="px-4 py-3 font-semibold">Avg Completion</th>
                  <th className="px-4 py-3 font-semibold">Avg Estimated Risk</th>
                </tr>
              </thead>
              <tbody>
                {overview.byCourse.length === 0 ? (
                  <tr><td className="px-4 py-4 text-slate-500" colSpan={4}>No courses assigned to this lecturer.</td></tr>
                ) : (
                  overview.byCourse.map((course) => (
                    <tr key={course.courseId} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-800">{course.courseName}</td>
                      <td className="px-4 py-3 text-slate-700">{course.students}</td>
                      <td className="px-4 py-3 text-slate-700">{course.avgCompletionRate}%</td>
                      <td className="px-4 py-3 text-slate-700">{course.avgRiskProbability}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 p-4">
            <Link href="/learning-analytics/lecturer/class-performance" className="text-sm font-semibold text-blue-700 hover:text-blue-900">
              Open class performance view
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className="text-slate-400">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function TrendHint({ positive }: { positive: boolean }) {
  return (
    <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">
      {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {positive ? 'Improvement from previous window' : 'Drop from previous window'}
    </p>
  );
}
