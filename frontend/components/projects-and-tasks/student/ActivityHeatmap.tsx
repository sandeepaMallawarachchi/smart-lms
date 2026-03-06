'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, AlertTriangle, Sparkles, Info, X } from 'lucide-react';

interface HeatmapDay {
  date: string;
  count: number;
  level: number;
  isPrediction: boolean;
  isAnomaly: boolean;
  anomalyType?: 'positive' | 'negative' | null;
  items: Array<{
    id: string;
    name: string;
    status: string;
    type: 'project' | 'task';
  }>;
}

interface HeatmapData {
  heatmap: HeatmapDay[];
  summary: {
    totalDays: number;
    totalActivities: number;
    averageDaily: number;
    maxDaily: number;
    activeDays: number;
    anomalyCount: number;
    positiveAnomalyCount?: number;
    negativeAnomalyCount?: number;
    predictedDays: number;
  };
  model_info: {
    prediction_enabled: boolean;
    anomaly_detection_enabled: boolean;
    forecast_days: number;
    training_samples: number;
    feature_count: number;
  };
  feature_importance?: Record<string, number>;
}

export default function ActivityHeatmap() {
  const CELL_SIZE = 20;
  const CELL_GAP = 4;
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showHeatmapInfo, setShowHeatmapInfo] = useState(false);

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  const fetchHeatmapData = async () => {
    try {
      setError(null);
      
      // CRITICAL FIX: Try multiple ways to get studentId
      let studentId: string | null = null;

      // Method 1: Direct lecturerId from localStorage
      studentId = localStorage.getItem('lecturerId');

      // Method 2: Try user object
      if (!studentId) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            studentId = user._id || user.id || user.userId;
          } catch (e) {
            console.error('Failed to parse user:', e);
          }
        }
      }

      // Method 3: Extract from JWT token
      if (!studentId) {
        const token = localStorage.getItem('authToken');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            studentId = payload.userId || payload.id;
          } catch (e) {
            console.error('Failed to decode JWT:', e);
          }
        }
      }

      if (!studentId) {
        throw new Error('Student ID not found. Please log in again.');
      }

      console.log('✅ Fetching heatmap for studentId:', studentId);

      const response = await fetch('http://localhost:5002/heatmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          lookbackDays: 182,
          forecastDays: 14,
        }),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch heatmap');
      }

      const result = await response.json();
      console.log('✅ Heatmap data received:', {
        totalDays: result.heatmap.length,
        activeDays: result.summary.activeDays,
        predictedDays: result.summary.predictedDays
      });
      
      setData(result);
    } catch (error) {
      console.error('❌ Error fetching heatmap:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Color palettes
  const greenColors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  const blueColors = ['#ebedf0', '#9db7f5', '#6d9aec', '#3b7ee6', '#1e5fcf'];

  const getColor = (day: HeatmapDay) => {
    if (day.isPrediction) {
      return blueColors[day.level];
    }
    if (day.count === 0) {
      return '#ebedf0';
    }
    return greenColors[day.level];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleMouseMove = (e: React.MouseEvent, day: HeatmapDay) => {
    setHoveredDay(day);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  // Organize days into weeks
  const organizeIntoWeeks = (days: HeatmapDay[]) => {
    const weeks: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];
    
    const firstDay = new Date(days[0].date);
    const dayOfWeek = firstDay.getDay();
    
    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek.push({
        date: '',
        count: 0,
        level: 0,
        isPrediction: false,
        isAnomaly: false,
        items: []
      });
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
        currentWeek.push({
          date: '',
          count: 0,
          level: 0,
          isPrediction: false,
          isAnomaly: false,
          items: []
        });
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const getLatestWorks = () => {
    if (!data) return [];
    
    const worksWithDates = data.heatmap
      .filter(day => day.items.length > 0 && !day.isPrediction)
      .flatMap(day => 
        day.items.map(item => ({
          ...item,
          date: day.date
        }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    
    return worksWithDates;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        <p className="text-gray-600">Loading ML-powered heatmap...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Failed to load activity heatmap
          </h3>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <button
            onClick={fetchHeatmapData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data available
      </div>
    );
  }

  const weeks = organizeIntoWeeks(data.heatmap);
  const monthMarkers = (() => {
    const markers: Array<{ weekIndex: number; label: string }> = [];
    weeks.forEach((week, index) => {
      const firstValid = week.find((day) => day.date);
      if (!firstValid) return;
      const monthLabel = new Date(firstValid.date).toLocaleDateString('en-US', { month: 'short' });
      const prev = markers[markers.length - 1];
      if (!prev || prev.label !== monthLabel) {
        markers.push({ weekIndex: index, label: monthLabel });
      }
    });
    return markers;
  })();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-cyan-600" />
            Activity Heatmap (Last 6 Months)
          </h2>
          <p className="text-gray-600 mt-1">
            Your learning activity patterns with ML-powered predictions
          </p>
        </div>
        
        {data.model_info.prediction_enabled && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              ML Predictions Active
            </span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Active Days</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {data.summary.activeDays}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-700" />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">
            {data.summary.totalActivities} total activities
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 font-medium">Avg Daily</p>
              <p className="text-3xl font-bold text-amber-900 mt-1">
                {data.summary.averageDaily.toFixed(1)}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-700" />
            </div>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            Max: {data.summary.maxDaily} in a day
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">Anomalies</p>
              <p className="text-3xl font-bold text-red-900 mt-1">
                {data.summary.anomalyCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-700" />
            </div>
          </div>
          <p className="text-xs text-red-600 mt-2">
            Unusual activity patterns
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Predicted</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {data.summary.predictedDays}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-blue-700" />
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            ML forecast days
          </p>
        </motion.div>
      </div>

      {/* Heatmap Grid */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Semester Activity Map</h3>
          <button
            type="button"
            onClick={() => setShowHeatmapInfo(true)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            title="What is included in this heatmap?"
          >
            <Info size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Month Labels */}
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

            {/* Grid */}
            <div className="flex gap-1">
              {/* Day Labels */}
              <div className="flex flex-col gap-1 text-xs text-gray-600 mr-2">
                <div style={{ height: `${CELL_SIZE}px` }}>Sun</div>
                <div style={{ height: `${CELL_SIZE}px` }}>Mon</div>
                <div style={{ height: `${CELL_SIZE}px` }}>Tue</div>
                <div style={{ height: `${CELL_SIZE}px` }}>Wed</div>
                <div style={{ height: `${CELL_SIZE}px` }}>Thu</div>
                <div style={{ height: `${CELL_SIZE}px` }}>Fri</div>
                <div style={{ height: `${CELL_SIZE}px` }}>Sat</div>
              </div>

              {/* Weeks */}
              <div className="flex gap-1">
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-1">
                    {week.map((day, dayIdx) => (
                      <motion.div
                        key={`${weekIdx}-${dayIdx}`}
                        className="relative"
                        onMouseMove={(e) => day.date && handleMouseMove(e, day)}
                        onMouseLeave={handleMouseLeave}
                        whileHover={{ scale: day.date ? 1.3 : 1 }}
                      >
                        <div
                          className={`rounded-sm ${
                            day.date ? 'cursor-pointer' : ''
                          }`}
                          style={{
                            width: `${CELL_SIZE}px`,
                            height: `${CELL_SIZE}px`,
                            backgroundColor: day.date ? getColor(day) : 'transparent',
                            border: day.date ? '1px solid rgba(0,0,0,0.1)' : 'none',
                          }}
                        >
                          {/* Anomaly Indicator */}
                          {day.isAnomaly && !day.isPrediction && (
                            <div
                              className={`absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full ${
                                day.anomalyType === 'positive' ? 'bg-emerald-600' : 'bg-red-600'
                              }`}
                            />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 font-medium">Less</span>
              <div className="flex gap-1">
                {greenColors.map((color, idx) => (
                  <div
                    key={idx}
                    className="w-4 h-4 rounded-sm border border-gray-300"
                    style={{ backgroundColor: color }}
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
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-blue-400 border border-gray-300" />
                <span className="text-gray-700">Predicted</span>
              </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-gray-200 border border-gray-300 relative">
                    <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                  </div>
                  <span className="text-gray-700">Positive Anomaly</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-gray-200 border border-gray-300 relative">
                    <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-600 rounded-full" />
                  </div>
                  <span className="text-gray-700">Negative Anomaly</span>
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* Latest Works */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Latest 5 Works
        </h3>
        <div className="space-y-3">
          {getLatestWorks().map((work, idx) => (
            <motion.div
              key={`${work.id}-${idx}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {work.type === 'project' ? '📁' : '📝'}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{work.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(work.date)}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  work.status === 'done'
                    ? 'bg-green-100 text-green-700'
                    : work.status === 'inprogress'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {work.status}
              </span>
            </motion.div>
          ))}
          {getLatestWorks().length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No activities yet
            </p>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-2xl max-w-xs pointer-events-none"
          style={{
            left: `${mousePosition.x + 15}px`,
            top: `${mousePosition.y + 15}px`,
          }}
        >
          <div className="space-y-2">
            <p className="font-semibold text-sm">{formatDate(hoveredDay.date)}</p>
            <div className="flex items-center gap-2">
              <p className="text-sm">
                {hoveredDay.isPrediction ? (
                  <span className="text-blue-300">
                    Predicted: {hoveredDay.count.toFixed(2)} activities
                  </span>
                ) : (
                  <span>
                    {hoveredDay.count} {hoveredDay.count === 1 ? 'activity' : 'activities'}
                  </span>
                )}
              </p>
            </div>

            {hoveredDay.isAnomaly && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  hoveredDay.anomalyType === 'positive' ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {hoveredDay.anomalyType === 'positive'
                    ? 'Positive anomaly (higher than usual activity)'
                    : 'Negative anomaly (lower than usual activity)'}
                </span>
              </div>
            )}

            {hoveredDay.isPrediction && (
              <div className="flex items-center gap-2 text-blue-300 text-sm">
                <Sparkles className="w-4 h-4" />
                <span>ML Prediction</span>
              </div>
            )}

            {hoveredDay.items.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
                {hoveredDay.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="text-xs flex items-center gap-2">
                    <span>{item.type === 'project' ? '📁' : '📝'}</span>
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
                {hoveredDay.items.length > 3 && (
                  <p className="text-xs text-gray-400">
                    +{hoveredDay.items.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
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
              <p>This heatmap includes your project/task activity for the last 6 months.</p>
              <p>Green squares are historical activity. Blue squares are ML-predicted activity for the next 14 days.</p>
              <p>Prediction is based on your recent activity pattern, upcoming deadlines, active projects, and semester context.</p>
              <p>Red-dot anomaly means the day’s activity is unusually high/low compared with your normal pattern.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
