// /components/projects-and-tasks/lecturer/templates/DeadlineForm.tsx

'use client';

import React from 'react';
import { Calendar, Clock, Award } from 'lucide-react';
import FormSection from './FormSection';

interface DeadlineFormProps {
  deadlineDate: string;
  deadlineTime: string;
  totalMarks: number;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onMarksChange: (marks: number) => void;
}

export default function DeadlineForm({
  deadlineDate,
  deadlineTime,
  totalMarks,
  onDateChange,
  onTimeChange,
  onMarksChange,
}: DeadlineFormProps) {
  // Get today's date for minimum date
  const today = new Date().toISOString().split('T')[0];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateChange(e.target.value);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeChange(e.target.value);
  };

  const handleMarksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Math.min(1000, parseInt(e.target.value) || 0));
    onMarksChange(value);
  };

  return (
    <FormSection title="Deadline & Marking" icon="📅">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Deadline Date */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
            <Calendar size={16} />
            Deadline Date
            <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={deadlineDate}
            onChange={handleDateChange}
            min={today}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
          />
          <p className="text-xs text-gray-500 mt-2">
            Choose the submission deadline
          </p>
        </div>

        {/* Deadline Time */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
            <Clock size={16} />
            Deadline Time
          </label>
          <input
            type="time"
            value={deadlineTime}
            onChange={handleTimeChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
          />
          <p className="text-xs text-gray-500 mt-2">
            Default: 23:59
          </p>
        </div>

        {/* Total Marks */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
            <Award size={16} />
            Total Marks
          </label>
          <div className="flex items-center">
            <input
              type="number"
              value={totalMarks}
              onChange={handleMarksChange}
              min="0"
              max="1000"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
            <span className="ml-2 text-sm text-gray-600">/ 1000</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Maximum marks for this {totalMarks > 0 ? '' : '(optional)'}
          </p>
        </div>
      </div>
    </FormSection>
  );
}