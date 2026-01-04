// /components/projects-and-tasks/lecturer/templates/SpecialNotesForm.tsx

import React from 'react';
import { AlertCircle } from 'lucide-react';
import RichTextEditor from '@/components/projects-and-tasks/lecturer/RichTextEditor';
import FormSection from './FormSection';

interface SpecialNotesFormProps {
  notes: { html: string; text: string };
  onNotesChange: (notes: { html: string; text: string }) => void;
}

export default function SpecialNotesForm({
  notes,
  onNotesChange,
}: SpecialNotesFormProps) {
  return (
    <FormSection
      title="Special Notes"
      description="Add important notes and instructions"
      icon={<AlertCircle size={24} />}
      collapsible
    >
      <RichTextEditor
        label="Special Notes"
        value={notes}
        onChange={onNotesChange}
        placeholder="Add any special notes, instructions, or important information..."
      />
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        These notes will be visible to all students working on this template.
      </div>
    </FormSection>
  );
}