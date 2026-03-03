'use client';

import { useEffect, useState } from 'react';

interface CoursePerformance {
  courseId: string;
  courseName: string;
  year: number;
  semester: number;
  students: number;
  avgCompletionRate: number;
  avgRiskProbability: number;
}

export default function LecturerClassPerformancePage() {
  const [courses, setCourses] = useState<CoursePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">Class Performance</h1>
        <p className="text-sm text-slate-600">Course-level analytics for your assigned classes.</p>
      </div>
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
              <tr><td className="px-4 py-4 text-slate-500" colSpan={5}>No courses assigned yet.</td></tr>
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
    </div>
  );
}
