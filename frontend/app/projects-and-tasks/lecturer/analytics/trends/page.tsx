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

interface MomentumRow {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  currentCompletions: number;
  previousCompletions: number;
  deltaAbs: number;
  deltaPct: number;
  momentum: 'Improving' | 'Declining' | 'Flat';
}

type TrendPeriod = 'weekly' | 'monthly' | 'yearly';

export default function LecturerTrendsPage() {
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [studentsOptions, setStudentsOptions] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [itemType, setItemType] = useState<'all' | 'project' | 'task'>('all');
  const [period, setPeriod] = useState<TrendPeriod>('monthly');
  const [kpis, setKpis] = useState({
    completionRate: 0,
    completionRateDelta: 0,
    inProgressRatio: 0,
    inProgressRatioDelta: 0,
    activeStudents: 0,
    activeStudentsDelta: 0,
    doneCurrent: 0,
    donePrevious: 0,
  });
  const [series, setSeries] = useState({
    labels: [] as string[],
    done: [] as number[],
    inprogress: [] as number[],
    todo: [] as number[],
  });
  const [momentumRows, setMomentumRows] = useState<MomentumRow[]>([]);
  const [showStatusInfo, setShowStatusInfo] = useState(false);
  const [showMomentumInfo, setShowMomentumInfo] = useState(false);
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
    const fetchTrends = async () => {
      if (!selectedCourse?._id) {
        setStudentsOptions([]);
        setMomentumRows([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const periodConfig: Record<TrendPeriod, { granularity: 'daily' | 'weekly' | 'monthly'; window: number }> = {
          weekly: { granularity: 'daily', window: 7 },
          monthly: { granularity: 'daily', window: 30 },
          yearly: { granularity: 'monthly', window: 365 },
        };
        const { granularity, window } = periodConfig[period];
        const params = new URLSearchParams({
          courseId: selectedCourse._id,
          itemType,
          granularity,
          window: String(window),
        });
        if (selectedStudentId !== 'all') {
          params.set('studentId', selectedStudentId);
        }

        const response = await fetch(
          `/api/projects-and-tasks/lecturer/analytics/trends?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to fetch trends analytics');
        }

        setKpis(
          data.data?.kpis || {
            completionRate: 0,
            completionRateDelta: 0,
            inProgressRatio: 0,
            inProgressRatioDelta: 0,
            activeStudents: 0,
            activeStudentsDelta: 0,
            doneCurrent: 0,
            donePrevious: 0,
          }
        );
        setSeries({
          labels: data.data?.series?.labels || [],
          done: data.data?.series?.done || [],
          inprogress: data.data?.series?.inprogress || [],
          todo: data.data?.series?.todo || [],
        });
        setMomentumRows(data.data?.studentMomentum || []);
        setStudentsOptions(data.data?.studentsOptions || []);
      } catch (err) {
        console.error('Trends fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch trends analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrends();
  }, [selectedCourse?._id, selectedStudentId, itemType, period]);

  const maxStackTotal = useMemo(
    () =>
      Math.max(
        1,
        ...series.labels.map((_, idx) => series.done[idx] + series.inprogress[idx] + series.todo[idx])
      ),
    [series]
  );
  const scaleStep = period === 'weekly' ? 1 : period === 'monthly' ? 5 : 30;
  const scaleText = period === 'weekly' ? 'Scale 1:1' : period === 'monthly' ? 'Scale 1:5' : 'Scale 1:30';
  const visibleLabels = series.labels.map((label, idx) => {
    if (period === 'weekly') return label.slice(5);
    if (period === 'monthly') return idx % scaleStep === 0 ? label.slice(5) : '';
    return label;
  });

  const tone = (value: number) => (value >= 0 ? 'text-green-700' : 'text-red-700');
  const formatDelta = (value: number, suffix: string = '') => `${value >= 0 ? '+' : ''}${value}${suffix}`;
  const momentumBadge = (m: MomentumRow['momentum']) =>
    m === 'Improving'
      ? 'bg-green-50 text-green-700 border-green-200'
      : m === 'Declining'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trend Analytics</h1>
        <p className="text-sm text-gray-600 mt-1">
          {selectedCourse ? selectedCourse.courseName : 'Select a module from header dropdown'}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <label className="block text-xs text-gray-500 mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as TrendPeriod)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              disabled={!selectedCourse || isLoading}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Completion Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.completionRate}%</p>
          <p className={`text-xs mt-1 ${tone(kpis.completionRateDelta)}`}>
            {formatDelta(kpis.completionRateDelta, '%')} vs previous window
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">In Progress Ratio</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.inProgressRatio}%</p>
          <p className={`text-xs mt-1 ${tone(kpis.inProgressRatioDelta)}`}>
            {formatDelta(kpis.inProgressRatioDelta, '%')} vs previous window
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active Students</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.activeStudents}</p>
          <p className={`text-xs mt-1 ${tone(kpis.activeStudentsDelta)}`}>
            {formatDelta(kpis.activeStudentsDelta)} vs previous window
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Done (Current/Prev)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {kpis.doneCurrent} / {kpis.donePrevious}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Status Trend Series</h2>
          <button
            type="button"
            onClick={() => setShowStatusInfo(true)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            title="What is Status Trend Series?"
          >
            <Info size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader className="animate-spin text-brand-blue" size={28} />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : series.labels.length === 0 ? (
          <p className="text-sm text-gray-500">No trend points for selected filters.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{scaleText}</p>
              <p className="text-xs text-gray-500">Stacked by status</p>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                <div className="h-56 flex items-end gap-2 border-l border-b border-gray-300 px-2 pb-2">
                  {series.labels.map((label, idx) => {
                    const done = series.done[idx] || 0;
                    const inProgress = series.inprogress[idx] || 0;
                    const todo = series.todo[idx] || 0;
                    const total = done + inProgress + todo;
                    const doneH = (done / maxStackTotal) * 100;
                    const inProgressH = (inProgress / maxStackTotal) * 100;
                    const todoH = (todo / maxStackTotal) * 100;
                    return (
                      <div key={label} className="flex-1 min-w-[14px] h-full flex flex-col items-center justify-end">
                        <div className="w-full max-w-6 h-full flex flex-col justify-end">
                          <div
                            className="w-full rounded-t-sm bg-amber-400"
                            style={{ height: `${todoH}%` }}
                            title={`${label} • Todo: ${todo}`}
                          />
                          <div
                            className="w-full bg-blue-500"
                            style={{ height: `${inProgressH}%` }}
                            title={`${label} • In Progress: ${inProgress}`}
                          />
                          <div
                            className="w-full bg-green-500"
                            style={{ height: `${doneH}%` }}
                            title={`${label} • Done: ${done}`}
                          />
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 text-center leading-tight min-h-6">
                          {visibleLabels[idx]}
                        </div>
                        <div className="text-[10px] text-gray-400">{total}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-4 text-xs text-gray-600 pt-2 border-t border-gray-100">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-2 bg-green-500" />
                Done
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-2 bg-blue-500" />
                In Progress
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-2 bg-amber-500" />
                Todo
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Student Momentum</h2>
          <button
            type="button"
            onClick={() => setShowMomentumInfo(true)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            title="What is Student Momentum?"
          >
            <Info size={16} />
          </button>
        </div>
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader className="animate-spin text-brand-blue" size={28} />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : momentumRows.length === 0 ? (
          <p className="text-sm text-gray-500">No student momentum data for selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Current Done</th>
                  <th className="py-2 pr-3">Previous Done</th>
                  <th className="py-2 pr-3">Delta</th>
                  <th className="py-2 pr-3">Momentum</th>
                </tr>
              </thead>
              <tbody>
                {momentumRows.map((row) => (
                  <tr key={row.studentId} className="border-b border-gray-100">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-gray-900">{row.studentName}</p>
                      <p className="text-xs text-gray-500">{row.studentIdNumber}</p>
                    </td>
                    <td className="py-3 pr-3">{row.currentCompletions}</td>
                    <td className="py-3 pr-3">{row.previousCompletions}</td>
                    <td className={`py-3 pr-3 font-semibold ${row.deltaAbs >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {row.deltaAbs >= 0 ? '+' : ''}
                      {row.deltaAbs} ({row.deltaPct >= 0 ? '+' : ''}
                      {row.deltaPct}%)
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`px-2 py-1 rounded-full border text-xs font-medium ${momentumBadge(row.momentum)}`}>
                        {row.momentum}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showStatusInfo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Status Trend Series</h3>
              <button
                type="button"
                onClick={() => setShowStatusInfo(false)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-600 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700 space-y-2">
              <p>This chart shows how statuses changed across the selected period.</p>
              <p>Each bar is stacked by status:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Green: Done</li>
                <li>Blue: In Progress</li>
                <li>Amber: Todo</li>
              </ul>
              <p>
                Use it to detect trend direction, spikes, and whether work is moving from Todo/In Progress into Done.
              </p>
            </div>
          </div>
        </div>
      )}

      {showMomentumInfo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Student Momentum</h3>
              <button
                type="button"
                onClick={() => setShowMomentumInfo(false)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-600 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700 space-y-2">
              <p>Student Momentum compares completions in the current window vs previous window.</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Current Done: completions in selected period</li>
                <li>Previous Done: completions in equivalent prior period</li>
                <li>Delta: absolute and percentage change</li>
              </ul>
              <p>
                Momentum labels help identify improving, flat, and declining students for follow-up.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
