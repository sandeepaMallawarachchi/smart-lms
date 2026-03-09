'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Info, Loader, X } from 'lucide-react';

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

const CELL_SIZE = 20;
const CELL_GAP = 4;

export default function LecturerActivityHeatmap() {
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
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
          headers: { Authorization: `Bearer ${token}` },
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

  const organizeIntoWeeks = (days: HeatmapDay[]) => {
    if (!days.length) return [] as HeatmapDay[][];
    const weeks: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];

    const firstDay = new Date(days[0].date);
    const startOffset = firstDay.getDay();
    for (let i = 0; i < startOffset; i++) {
      currentWeek.push({ date: '', count: 0, level: 0, items: [] });
    }

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0, level: 0, items: [] });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const weeks = useMemo(() => organizeIntoWeeks(heatmapData), [heatmapData]);

  const monthMarkers = useMemo(() => {
    const markers: Array<{ weekIndex: number; label: string }> = [];
    weeks.forEach((week, index) => {
      const firstValid = week.find((day) => day.date);
      if (!firstValid) return;
      const monthLabel = new Date(firstValid.date).toLocaleDateString('en-US', { month: 'short' });
      const previous = markers[markers.length - 1];
      if (!previous || previous.label !== monthLabel) {
        markers.push({ weekIndex: index, label: monthLabel });
      }
    });
    return markers;
  }, [weeks]);

  const getColor = (level: number) => {
    const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
    return colors[level] || colors[0];
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleMouseMove = (e: React.MouseEvent, day: HeatmapDay) => {
    setHoveredDay(day);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-cyan-600" />
              Semester Activity Map
            </h2>
            <p className="text-gray-600 mt-1">
              {selectedCourse ? selectedCourse.courseName : 'Select a module to view analytics'}
            </p>
          </div>
          <div className="w-full md:w-80">
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
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Semester Activity Map</h3>
            <p className="text-sm text-gray-600">Daily activity distribution for the last 6 months</p>
          </div>
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
        ) : weeks.length === 0 ? (
          <div className="text-sm text-gray-500 py-8 text-center">No activity data for this module.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="relative mb-2 ml-8 h-4">
                  {monthMarkers.map((marker) => (
                    <span
                      key={`${marker.label}-${marker.weekIndex}`}
                      className="absolute text-xs text-gray-600 font-medium"
                      style={{ left: `${marker.weekIndex * (CELL_SIZE + CELL_GAP)}px` }}
                    >
                      {marker.label}
                    </span>
                  ))}
                </div>

                <div className="flex gap-1">
                  <div className="flex flex-col gap-1 text-xs text-gray-600 mr-2">
                    <div style={{ height: `${CELL_SIZE}px` }}>Sun</div>
                    <div style={{ height: `${CELL_SIZE}px` }}>Mon</div>
                    <div style={{ height: `${CELL_SIZE}px` }}>Tue</div>
                    <div style={{ height: `${CELL_SIZE}px` }}>Wed</div>
                    <div style={{ height: `${CELL_SIZE}px` }}>Thu</div>
                    <div style={{ height: `${CELL_SIZE}px` }}>Fri</div>
                    <div style={{ height: `${CELL_SIZE}px` }}>Sat</div>
                  </div>

                  <div className="flex gap-1">
                    {weeks.map((week, weekIdx) => (
                      <div key={weekIdx} className="flex flex-col gap-1">
                        {week.map((day, dayIdx) => (
                          <div
                            key={`${weekIdx}-${dayIdx}`}
                            className={`rounded-sm ${day.date ? 'cursor-pointer' : ''}`}
                            style={{
                              width: `${CELL_SIZE}px`,
                              height: `${CELL_SIZE}px`,
                              backgroundColor: day.date ? getColor(day.level) : 'transparent',
                              border: day.date ? '1px solid rgba(0,0,0,0.1)' : 'none',
                            }}
                            onMouseMove={(e) => day.date && handleMouseMove(e, day)}
                            onMouseLeave={() => setHoveredDay(null)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 font-medium">Less</span>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="w-4 h-4 rounded-sm border border-gray-300"
                        style={{ backgroundColor: getColor(level) }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 font-medium">More</span>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-green-400 border border-gray-300" />
                    <span className="text-gray-700">Historical</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {hoveredDay && hoveredDay.date && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-2xl max-w-sm pointer-events-none"
          style={{
            left: `${mousePosition.x + 15}px`,
            top: `${mousePosition.y + 15}px`,
          }}
        >
          <p className="font-semibold text-sm mb-2">{formatDate(hoveredDay.date)}</p>
          <p className="text-sm mb-2">
            {hoveredDay.count} {hoveredDay.count === 1 ? 'activity' : 'activities'}
          </p>
          {(hoveredDay.items || []).length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
              {(hoveredDay.items || []).slice(0, 4).map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="text-xs flex items-center gap-2">
                  <span>{item.type === 'project' ? '📁' : '📝'}</span>
                  <span className="truncate">{item.name}</span>
                  <span className="text-gray-300">({item.studentName})</span>
                </div>
              ))}
              {(hoveredDay.items || []).length > 4 && (
                <p className="text-xs text-gray-400">+{(hoveredDay.items || []).length - 4} more</p>
              )}
            </div>
          )}
        </div>
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
              <p>This heatmap shows student project/task activity for the last 6 months.</p>
              <p>Each square represents one day. Darker green means more activity updates.</p>
              <p>Use the student filter to inspect a single student or view all students together.</p>
              <p>Hover any day to view activity details and student names for that date.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
