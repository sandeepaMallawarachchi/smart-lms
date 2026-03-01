'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader } from 'lucide-react';

type ReportItemType = 'all' | 'project' | 'task';

interface SelectedCourse {
  _id: string;
  courseName: string;
}

interface StudentOption {
  _id: string;
  name: string;
  studentIdNumber: string;
}

interface StudentRow {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  assigned: number;
  done: number;
  inProgress: number;
  todo: number;
  overdue: number;
  completionRate: number;
  lastActivity: string | null;
}

interface ReportData {
  courseId: string;
  courseName: string;
  generatedAt: string;
  itemType: ReportItemType;
  kpis: {
    totalStudents: number;
    totalAssigned: number;
    totalDone: number;
    totalInProgress: number;
    totalTodo: number;
    totalOverdue: number;
    completionRate: number;
  };
  students: StudentRow[];
  studentsOptions: StudentOption[];
}

export default function LecturerReportsPage() {
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [itemType, setItemType] = useState<ReportItemType>('all');
  const [studentId, setStudentId] = useState<string>('all');

  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null);
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
      setStudentId('all');
      setError(null);
    };

    window.addEventListener('courseSelected', onCourseSelected);
    return () => window.removeEventListener('courseSelected', onCourseSelected);
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedCourse?._id) {
        setReport(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const params = new URLSearchParams({
          courseId: selectedCourse._id,
          itemType,
        });
        if (studentId !== 'all') params.set('studentId', studentId);

        const response = await fetch(`/api/projects-and-tasks/lecturer/reports?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to fetch report');
        }

        setReport(data.data || null);
      } catch (err) {
        console.error('Fetch report error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch report');
        setReport(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [selectedCourse?._id, itemType, studentId]);

  const studentsOptions = useMemo(() => report?.studentsOptions || [], [report?.studentsOptions]);

  const exportReport = async (format: 'csv' | 'pdf') => {
    if (!selectedCourse?._id) return;

    setIsExporting(format);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        courseId: selectedCourse._id,
        itemType,
        format,
      });
      if (studentId !== 'all') params.set('studentId', studentId);

      const response = await fetch(`/api/projects-and-tasks/lecturer/reports/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Failed to export ${format.toUpperCase()}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `smartlms_report.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export report error:', err);
      setError(err instanceof Error ? err.message : `Failed to export ${format.toUpperCase()}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-600 mt-1">
            {selectedCourse ? selectedCourse.courseName : 'Select a module from header dropdown'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportReport('csv')}
            disabled={!report || isExporting !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            {isExporting === 'csv' ? <Loader size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => exportReport('pdf')}
            disabled={!report || isExporting !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-blue/30 bg-brand-blue/10 px-4 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue/20 disabled:opacity-60"
          >
            {isExporting === 'pdf' ? <Loader size={16} className="animate-spin" /> : <FileText size={16} />}
            Export PDF
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Item Type</label>
            <select
              value={itemType}
              onChange={(event) => setItemType(event.target.value as ReportItemType)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              disabled={!selectedCourse || isLoading}
            >
              <option value="all">All</option>
              <option value="project">Projects</option>
              <option value="task">Tasks</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Student</label>
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
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
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {!selectedCourse ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Select a module to generate reports.
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 flex justify-center">
          <Loader className="animate-spin text-brand-blue" size={28} />
        </div>
      ) : !report ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          No report data available.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{report.kpis.completionRate}%</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Assigned</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{report.kpis.totalAssigned}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{report.kpis.totalDone}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Overdue</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{report.kpis.totalOverdue}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Student Report Table</h2>
              <p className="text-xs text-gray-500 inline-flex items-center gap-1">
                <Download size={12} />
                Export professional CSV/PDF from top-right
              </p>
            </div>
            {report.students.length === 0 ? (
              <p className="text-sm text-gray-500">No rows for selected filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-600">
                      <th className="py-2 pr-3">Student</th>
                      <th className="py-2 pr-3">Assigned</th>
                      <th className="py-2 pr-3">Done</th>
                      <th className="py-2 pr-3">In Progress</th>
                      <th className="py-2 pr-3">Todo</th>
                      <th className="py-2 pr-3">Overdue</th>
                      <th className="py-2 pr-3">Completion %</th>
                      <th className="py-2 pr-3">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.students.map((row) => (
                      <tr key={row.studentId} className="border-b border-gray-100">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-gray-900">{row.studentName}</p>
                          <p className="text-xs text-gray-500">{row.studentIdNumber}</p>
                        </td>
                        <td className="py-3 pr-3">{row.assigned}</td>
                        <td className="py-3 pr-3 text-emerald-700 font-medium">{row.done}</td>
                        <td className="py-3 pr-3 text-blue-700 font-medium">{row.inProgress}</td>
                        <td className="py-3 pr-3">{row.todo}</td>
                        <td className="py-3 pr-3 text-red-700 font-medium">{row.overdue}</td>
                        <td className="py-3 pr-3">{row.completionRate}%</td>
                        <td className="py-3 pr-3 text-xs text-gray-600">
                          {row.lastActivity
                            ? new Date(row.lastActivity).toLocaleString('en-GB')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
