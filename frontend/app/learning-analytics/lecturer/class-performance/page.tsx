'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface CoursePerformance {
  courseId: string;
  courseName: string;
  year: number;
  semester: number;
  students: number;
  avgCompletionRate: number;
  avgRiskProbability: number;
}

type ViewMode = 'overview' | 'distribution' | 'trends';

export default function LecturerClassPerformancePage() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<CoursePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const view = (searchParams.get('view') as ViewMode) || 'overview';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch('/api/learning-analytics/lecturer/overview', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to load class performance');
        }

        const json = await response.json();
        setCourses(json.data?.overview?.byCourse || []);
      } catch (err) {
        console.error('Class performance fetch error:', err);
        setError('Failed to load class performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading class performance...</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;

  const safeView: ViewMode =
    view === 'distribution' || view === 'trends' || view === 'overview' ? view : 'overview';

  const title =
    safeView === 'distribution'
      ? 'Risk Distribution'
      : safeView === 'trends'
      ? 'Trend Monitor'
      : 'Overview';

  const totalStudents = courses.reduce((sum, course) => sum + course.students, 0);
  const avgCompletion =
    courses.length > 0
      ? (courses.reduce((sum, course) => sum + course.avgCompletionRate, 0) / courses.length).toFixed(1)
      : '0.0';
  const avgRisk =
    courses.length > 0
      ? (courses.reduce((sum, course) => sum + course.avgRiskProbability, 0) / courses.length).toFixed(1)
      : '0.0';

  const highRiskCourses = courses.filter((course) => course.avgRiskProbability >= 60);
  const mediumRiskCourses = courses.filter(
    (course) => course.avgRiskProbability >= 35 && course.avgRiskProbability < 60
  );
  const lowRiskCourses = courses.filter((course) => course.avgRiskProbability < 35);

  const topCompletion = [...courses].sort((a, b) => b.avgCompletionRate - a.avgCompletionRate).slice(0, 5);
  const lowestCompletion = [...courses].sort((a, b) => a.avgCompletionRate - b.avgCompletionRate).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">Class Performance</h1>
        <p className="text-sm text-slate-600">{title} - course-level analytics for your assigned classes.</p>
      </div>

      {safeView === 'overview' && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card label="Courses" value={courses.length} />
            <Card label="Total Students" value={totalStudents} />
            <Card label="Avg Completion / Risk" value={`${avgCompletion}% / ${avgRisk}%`} />
          </div>
          <CourseTable courses={courses} />
        </>
      )}

      {safeView === 'distribution' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <BucketCard title="High Risk Courses" value={highRiskCourses.length} tone="red" />
          <BucketCard title="Medium Risk Courses" value={mediumRiskCourses.length} tone="amber" />
          <BucketCard title="Low Risk Courses" value={lowRiskCourses.length} tone="green" />
        </div>
      )}

      {safeView === 'trends' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ListCard
            title="Top Completion Courses"
            rows={topCompletion.map((course) => `${course.courseName} - ${course.avgCompletionRate}%`)}
          />
          <ListCard
            title="Needs Attention (Low Completion)"
            rows={lowestCompletion.map((course) => `${course.courseName} - ${course.avgCompletionRate}%`)}
          />
        </div>
      )}
    </div>
  );
}

function CourseTable({ courses }: { courses: CoursePerformance[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Course</th>
            <th className="px-4 py-3 font-semibold">Year/Semester</th>
            <th className="px-4 py-3 font-semibold">Students</th>
            <th className="px-4 py-3 font-semibold">Avg Completion</th>
            <th className="px-4 py-3 font-semibold">Avg Risk</th>
          </tr>
        </thead>
        <tbody>
          {courses.length === 0 ? (
            <tr>
              <td className="px-4 py-4 text-slate-500" colSpan={5}>No courses assigned yet.</td>
            </tr>
          ) : (
            courses.map((course) => (
              <tr key={course.courseId} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-800">{course.courseName}</td>
                <td className="px-4 py-3 text-slate-700">Y{course.year} / S{course.semester}</td>
                <td className="px-4 py-3 text-slate-700">{course.students}</td>
                <td className="px-4 py-3 text-slate-700">{course.avgCompletionRate}%</td>
                <td className="px-4 py-3 text-slate-700">{course.avgRiskProbability}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function BucketCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: 'red' | 'amber' | 'green';
}) {
  const style =
    tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-green-200 bg-green-50 text-green-700';

  return (
    <div className={`rounded-xl border p-5 ${style}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function ListCard({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No data available.</p>
        ) : (
          rows.map((row, index) => (
            <div key={`${row}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {row}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
