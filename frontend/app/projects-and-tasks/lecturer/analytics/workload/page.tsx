'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Info, Loader, X } from 'lucide-react';

interface SelectedCourse {
  _id: string;
  courseName: string;
}

interface StudentOption {
  _id: string;
  name: string;
  studentIdNumber: string;
}

interface StudentWorkloadRow {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  assigned: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  workloadScore: number;
  risk: 'High' | 'Balanced' | 'Low Activity';
}

interface DistributionBucket {
  bucket: string;
  count: number;
}

export default function LecturerWorkloadPage() {
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [studentsOptions, setStudentsOptions] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [itemType, setItemType] = useState<'all' | 'project' | 'task'>('all');
  const [windowDays, setWindowDays] = useState<number>(14);
  const [rows, setRows] = useState<StudentWorkloadRow[]>([]);
  const [distribution, setDistribution] = useState<DistributionBucket[]>([]);
  const [showPendingInfo, setShowPendingInfo] = useState(false);
  const [kpis, setKpis] = useState({
    totalStudents: 0,
    avgPending: 0,
    overloadedCount: 0,
    underloadedCount: 0,
    upcomingDeadlines: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedCourse = localStorage.getItem('selectedCourse');
      if (savedCourse) {
        setSelectedCourse(JSON.parse(savedCourse));
      }
    } catch (err) {
      console.error('Error reading selected module:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const onCourseSelected = (event: Event) => {
      const customEvent = event as CustomEvent<SelectedCourse>;
      setSelectedCourse(customEvent.detail);
      setSelectedStudentId('all');
      setError(null);
    };
    window.addEventListener('courseSelected', onCourseSelected);
    return () => window.removeEventListener('courseSelected', onCourseSelected);
  }, []);

  useEffect(() => {
    const fetchWorkload = async () => {
      if (!selectedCourse?._id) {
        setRows([]);
        setStudentsOptions([]);
        setDistribution([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const params = new URLSearchParams({
          courseId: selectedCourse._id,
          itemType,
          window: String(windowDays),
        });
        if (selectedStudentId !== 'all') {
          params.set('studentId', selectedStudentId);
        }

        const response = await fetch(
          `/api/projects-and-tasks/lecturer/analytics/workload?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to fetch workload analytics');
        }

        setRows(data.data?.students || []);
        setStudentsOptions(data.data?.studentsOptions || []);
        setDistribution(data.data?.distribution || []);
        setKpis(
          data.data?.kpis || {
            totalStudents: 0,
            avgPending: 0,
            overloadedCount: 0,
            underloadedCount: 0,
            upcomingDeadlines: 0,
          }
        );
      } catch (err) {
        console.error('Workload fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch workload analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkload();
  }, [selectedCourse?._id, selectedStudentId, itemType, windowDays]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.workloadScore - a.workloadScore),
    [rows]
  );

  const riskClass = (risk: StudentWorkloadRow['risk']) => {
    if (risk === 'High') return 'bg-red-50 text-red-700 border-red-200';
    if (risk === 'Low Activity') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workload Analytics</h1>
        <p className="text-sm text-gray-600 mt-1">
          {selectedCourse ? selectedCourse.courseName : 'Select a module from header dropdown'}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              disabled={!selectedCourse || isLoading}
            >
              <option value="all">All Students</option>
              {studentsOptions.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name} ({student.studentIdNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Item Type</label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value as 'all' | 'project' | 'task')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              disabled={!selectedCourse || isLoading}
            >
              <option value="all">All</option>
              <option value="project">Projects</option>
              <option value="task">Tasks</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Window</label>
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(Number.parseInt(e.target.value, 10))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              disabled={!selectedCourse || isLoading}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active Students</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalStudents}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Pending</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.avgPending}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Overloaded</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{kpis.overloadedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Low Activity</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{kpis.underloadedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Due in Window</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.upcomingDeadlines}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Pending Distribution</h2>
          <button
            type="button"
            onClick={() => setShowPendingInfo(true)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            title="What is Pending Distribution?"
          >
            <Info size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {distribution.map((bucket) => (
            <div key={bucket.bucket} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
              <p className="text-xs text-gray-500">{bucket.bucket}</p>
              <p className="text-xl font-bold text-gray-900">{bucket.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Student Workload</h2>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader className="animate-spin text-brand-blue" size={28} />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : sortedRows.length === 0 ? (
          <p className="text-sm text-gray-500">No workload data available for the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Assigned</th>
                  <th className="py-2 pr-3">Completed</th>
                  <th className="py-2 pr-3">In Progress</th>
                  <th className="py-2 pr-3">Pending</th>
                  <th className="py-2 pr-3">Overdue</th>
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2 pr-3">Risk</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.studentId} className="border-b border-gray-100">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-gray-900">{row.studentName}</p>
                      <p className="text-xs text-gray-500">{row.studentIdNumber}</p>
                    </td>
                    <td className="py-3 pr-3">{row.assigned}</td>
                    <td className="py-3 pr-3">{row.completed}</td>
                    <td className="py-3 pr-3">{row.inProgress}</td>
                    <td className="py-3 pr-3">{row.pending}</td>
                    <td className="py-3 pr-3">{row.overdue}</td>
                    <td className="py-3 pr-3 font-semibold">{row.workloadScore}</td>
                    <td className="py-3 pr-3">
                      <span className={`px-2 py-1 rounded-full border text-xs font-medium ${riskClass(row.risk)}`}>
                        {row.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPendingInfo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Pending Distribution</h3>
              <button
                type="button"
                onClick={() => setShowPendingInfo(false)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-600 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700 space-y-2">
              <p>Pending Distribution shows how student workload is spread.</p>
              <p>It groups students by pending item count:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>0-2</li>
                <li>3-5</li>
                <li>6-8</li>
                <li>9+</li>
              </ul>
              <p>
                This helps you quickly see whether workload is balanced or if many students are overloaded.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
