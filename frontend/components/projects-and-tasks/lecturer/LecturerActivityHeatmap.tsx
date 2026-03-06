'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Info, Loader, X } from 'lucide-react';

interface SelectedCourse {
  _id: string;
  courseName: string;
}

interface HeatmapItem {
  type: 'task' | 'project';
  name: string;
  status: string;
  id: string;
  studentId: string;
  studentName: string;
}

interface HeatmapDay {
  date: string;
  count: number;
  level: number;
  items?: HeatmapItem[];
}

interface StudentOption {
  _id: string;
  name: string;
  studentIdNumber: string;
}

export default function LecturerActivityHeatmap() {
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<HeatmapDay | null>(null);
  const [showHeatmapInfo, setShowHeatmapInfo] = useState(false);

  useEffect(() => {
    try {
      const savedCourse = localStorage.getItem('selectedCourse');
      if (savedCourse) {
        setSelectedCourse(JSON.parse(savedCourse));
      }
    } catch (err) {
      console.error('Error reading selected course:', err);
    }
  }, []);

  useEffect(() => {
    const handleCourseSelected = (event: Event) => {
      const customEvent = event as CustomEvent<SelectedCourse>;
      setSelectedCourse(customEvent.detail);
      setSelectedStudentId('all');
      setError(null);
    };
    window.addEventListener('courseSelected', handleCourseSelected);
    return () => window.removeEventListener('courseSelected', handleCourseSelected);
  }, []);

  useEffect(() => {
    const fetchHeatmap = async () => {
      if (!selectedCourse?._id) {
        setIsLoading(false);
        setHeatmapData([]);
        setStudents([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const params = new URLSearchParams({ courseId: selectedCourse._id });
        if (selectedStudentId !== 'all') {
          params.set('studentId', selectedStudentId);
        }
        const response = await fetch(`/api/projects-and-tasks/lecturer/analytics/heatmap?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to fetch lecturer heatmap');
        }

        setHeatmapData(data.data?.heatmap || []);
        setTotalActivities(data.data?.totalActivities || 0);
        setStudents(data.data?.students || []);
      } catch (err) {
        console.error('Lecturer heatmap fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load heatmap');
        setHeatmapData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeatmap();
  }, [selectedCourse?._id, selectedStudentId]);

  const weeks = useMemo(() => {
    if (!heatmapData.length) return [];
    const result: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];

    heatmapData.forEach((day, index) => {
      currentWeek.push(day);
      if ((index + 1) % 7 === 0) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length) result.push(currentWeek);
    return result;
  }, [heatmapData]);

  const getCellColor = (level: number) => {
    const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
    return colors[level] || colors[0];
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Heatmap</h1>
          <p className="text-sm text-gray-600 mt-1">
            {selectedCourse ? selectedCourse.courseName : 'Select a module to view analytics'}
          </p>
        </div>
        <div className="min-w-56">
          <label className="block text-xs text-gray-500 mb-1">Student Filter</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            disabled={!selectedCourse || isLoading}
          >
            <option value="all">All Students</option>
            {students.map((student) => (
              <option key={student._id} value={student._id}>
                {student.name} ({student.studentIdNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 flex items-center justify-center">
          <Loader size={28} className="animate-spin text-brand-blue" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : !selectedCourse ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Select a module from header dropdown.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">Daily activity distribution for the last 6 months</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">{totalActivities} activities</p>
              <button
                type="button"
                onClick={() => setShowHeatmapInfo(true)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                title="What is included in this heatmap?"
              >
                <Info size={16} />
              </button>
            </div>
          </div>

          {weeks.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">No activity data for this module.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((day) => (
                        <div
                          key={day.date}
                          className="w-3 h-3 rounded-sm cursor-pointer"
                          style={{ backgroundColor: getCellColor(day.level) }}
                          onMouseEnter={() => setHoverDay(day)}
                          onMouseLeave={() => setHoverDay(null)}
                          title={`${day.date}: ${day.count} activities`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 text-xs text-gray-600">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <div key={level} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getCellColor(level) }} />
                ))}
                <span>More</span>
              </div>

              {hoverDay && hoverDay.items && hoverDay.items.length > 0 && (
                <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">{hoverDay.date}</p>
                  <ul className="space-y-1 text-sm">
                    {hoverDay.items.slice(0, 8).map((item, idx) => (
                      <li key={`${item.id}-${idx}`} className="flex justify-between gap-3">
                        <span className="text-gray-700 truncate">
                          {item.type === 'project' ? '📁' : '📝'} {item.name} - {item.studentName}
                        </span>
                        <span className="text-xs text-gray-600 uppercase">{item.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showHeatmapInfo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Heatmap Guide</h3>
              <button
                type="button"
                onClick={() => setShowHeatmapInfo(false)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-600 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700 space-y-2">
              <p>This heatmap shows student task/project progress updates for the last 6 months.</p>
              <p>Each square represents one day and color intensity indicates update volume.</p>
              <p>Hover a day to see which student updated which project/task and current status.</p>
              <p>This lecturer view is historical activity only. It does not include ML predictions or anomaly flags.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
