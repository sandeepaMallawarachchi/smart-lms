// /components/projects-and-tasks/lecturer/templates/FormSection.tsx

import React from 'react';
import { ChevronDown } from 'lucide-react';

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  collapsible?: boolean;
}

export default function FormSection({
  title,
  description,
  icon,
  children,
  isExpanded = true,
  onToggle,
  collapsible = false,
}: FormSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className={`px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white ${
          collapsible ? 'cursor-pointer hover:bg-gray-100' : ''
        }`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && <div className="text-brand-blue">{icon}</div>}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
          </div>
          {collapsible && (
            <ChevronDown
              size={20}
              className={`text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>
      </div>

      {/* Content */}
      {(!collapsible || isExpanded) && (
        <div className="px-6 py-6 space-y-6">{children}</div>
      )}
    </div>
  );
}