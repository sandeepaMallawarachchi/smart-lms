// /components/projects-and-tasks/lecturer/templates/MarkingRubricForm.tsx

import React from 'react';
import { Zap } from 'lucide-react';
import RichTextEditor from '@/components/projects-and-tasks/lecturer/RichTextEditor';
import FormSection from './FormSection';

interface MarkingRubricFormProps {
  markingDescription: { html: string; text: string };
  onMarkingChange: (desc: { html: string; text: string }) => void;
}

export default function MarkingRubricForm({
  markingDescription,
  onMarkingChange,
}: MarkingRubricFormProps) {
  return (
    <FormSection
      title="Marking Rubric"
      description="Define how the project/task will be marked"
      icon={<Zap size={24} />}
      collapsible
    >
      <RichTextEditor
        label="Marking Rubric"
        value={markingDescription}
        onChange={onMarkingChange}
        placeholder="Describe the marking criteria, rubric, and expectations..."
      />
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        This rubric helps students understand what's expected for marks
      </div>
    </FormSection>
  );
}