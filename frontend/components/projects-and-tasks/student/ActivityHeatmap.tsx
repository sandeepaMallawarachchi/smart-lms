'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';

interface HeatmapData {
  date: string;
  count: number;
  level: number;
}

export default function ActivityHeatmap() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalActivities, setTotalActivities] = useState(0);

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  const fetchHeatmapData = async () => {
    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        throw new Error('Not authenticated');
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      const studentId = payload.userId || payload.studentIdNumber || payload.id;

      console.log('Fetching heatmap for student:', studentId);

      const response = await fetch('http://localhost:5001/heatmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch heatmap');
      }

      const data = await response.json();
      console.log('Heatmap data:', data);
      setHeatmapData(data.heatmap || []);
      setTotalActivities(data.totalActivities || 0);
    } catch (error) {
      console.error('Heatmap error:', error);
      setHeatmapData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getColor = (level: number) => {
    const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
    return colors[level] || colors[0];
  };

  const groupByWeeks = () => {
    if (!heatmapData.length) return [];
    
    const weeks: HeatmapData[][] = [];
    let week: HeatmapData[] = [];

    heatmapData.forEach((day, index) => {
      week.push(day);
      if ((index + 1) % 7 === 0) {
        weeks.push(week);
        week = [];
      }
    });

    if (week.length > 0) weeks.push(week);
    return weeks;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-brand-blue" size={32} />
        </div>
      </div>
    );
  }

  const weeks = groupByWeeks();

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">📊 Your Activity</h3>
        <p className="text-sm text-gray-600">
          {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'} in the last year
        </p>
      </div>
      
      {weeks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No activity data yet. Start working on projects to see your progress!</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day) => (
                    <motion.div
                      key={day.date}
                      whileHover={{ scale: 1.2 }}
                      className="w-3 h-3 rounded-sm cursor-pointer"
                      style={{ backgroundColor: getColor(day.level) }}
                      title={`${day.date}: ${day.count} ${day.count === 1 ? 'activity' : 'activities'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-600">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getColor(level) }}
              />
            ))}
            <span>More</span>
          </div>
        </>
      )}
    </div>
  );
}