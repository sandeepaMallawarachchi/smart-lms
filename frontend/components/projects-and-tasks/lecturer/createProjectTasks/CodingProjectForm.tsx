'use client'

import React, { useState } from 'react'
import { Plus, Trash2, Loader, AlertCircle, Save, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { TestCase, Assignment, Options } from '@/types/types'
import RichTextEditor from '../RichTextEditor'

interface AssignmentFormState {
  question: { html: string; text: string }
  type: string
  language: string
  deadlineDate: string
  deadlineTime: string
  options: Options
  testCases: TestCase[]
}

interface AssignmentCreationFormProps {
  courseId: string
  lecturerId: string
  onSuccess?: () => void
}

export default function AssignmentCreationForm({
  courseId,
  lecturerId,
  onSuccess,
}: AssignmentCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [newTestCase, setNewTestCase] = useState<{ input: string; output: string; isHidden: boolean }>({
    input: '',
    output: '',
    isHidden: false,
  })

  const [formState, setFormState] = useState<AssignmentFormState>({
    question: { html: '', text: '' },
    type: 'coding',
    language: 'java',
    deadlineDate: '',
    deadlineTime: '23:59',
    options: {
      autoComplete: false,
      externalCopyPaste: false,
      internalCopyPaste: true,
      analytics: true,
    },
    testCases: [],
  })

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formState.question.text.trim()) {
      newErrors.question = 'Question description is required'
    }
    if (!formState.deadlineDate) {
      newErrors.deadlineDate = 'Deadline date is required'
    }
    if (!formState.deadlineTime) {
      newErrors.deadlineTime = 'Deadline time is required'
    }
    if (formState.testCases.length === 0) {
      newErrors.testCases = 'At least one test case is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const addTestCase = () => {
    if (!newTestCase.input.trim() || !newTestCase.output.trim()) {
      toast.error('Both Input and Expected Output are required')
      return
    }

    const testCase: TestCase = {
      id: Date.now(),
      input: newTestCase.input,
      expectedOutput: newTestCase.output,
      isHidden: newTestCase.isHidden,
    }

    setFormState({
      ...formState,
      testCases: [...formState.testCases, testCase],
    })

    setNewTestCase({ input: '', output: '', isHidden: false })
    toast.success('Test case added')
  }

  const removeTestCase = (id: number) => {
    setFormState({
      ...formState,
      testCases: formState.testCases.filter((tc) => tc.id !== id),
    })
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix all errors')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Assignment = {
        courseId,
        lecturerId,
        question: formState.question.html,
        type: formState.type,
        language: formState.language,
        deadlineDate: formState.deadlineDate,
        deadlineTime: formState.deadlineTime,
        options: formState.options,
        testCases: formState.testCases,
      }

      const token = localStorage.getItem('authToken')
      
      const response = await fetch(
        '/api/projects-and-tasks/lecturer/create-projects-and-tasks/code-assignment',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create assignment')
      }

      toast.success('Assignment created successfully!')
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create assignment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-semibold flex items-center gap-2 mb-2">
            <AlertCircle size={20} />
            Please fix the following errors:
          </p>
          <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
            {Object.values(errors).map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Assignment Type
                </label>
                <select
                    value={formState.type}
                    onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white"
                >
                    <option value="coding">Coding Challenge</option>
                    <option value="algorithm">Algorithm Analysis</option>
                    <option value="debugging">Debugging Task</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Programming Language
                </label>
                <select
                    value={formState.language}
                    onChange={(e) => setFormState({ ...formState, language: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white"
                >
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                    <option value="javascript">Node.js</option>
                    <option value="cpp">C++</option>
                </select>
            </div>
        </div>

        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Problem Question/Description <span className="text-red-600">*</span>
        </label>
        <RichTextEditor
          value={formState.question}
          onChange={(content) => setFormState({ ...formState, question: content })}
          placeholder="Describe the coding problem, constraints, and requirements..."
        />
      </div>

      {/* Deadline Configuration - Adjusted to match Assignment Type */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
            Deadline Settings
        </label>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-sm font-medium text-gray-700 block mb-3">Submission Deadline</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                type="date"
                value={formState.deadlineDate}
                onChange={(e) => setFormState({ ...formState, deadlineDate: e.target.value })}
                min={today}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
                />
                <input
                type="time"
                value={formState.deadlineTime}
                onChange={(e) => setFormState({ ...formState, deadlineTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
                />
            </div>
        </div>
      </div>

      {/* Options */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
            Environment Options
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(formState.options).map(([key, value]) => (
                <label key={key} className={`
                    flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                    ${value ? 'bg-blue-50 border-brand-blue' : 'bg-white border-gray-200 hover:bg-gray-50'}
                `}>
                    <span className="text-sm font-medium text-gray-800 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <input
                        type="checkbox"
                        checked={value}
                        onChange={() => setFormState({
                            ...formState,
                            options: { ...formState.options, [key]: !value }
                        })}
                        className="w-4 h-4 text-brand-blue rounded focus:ring-brand-blue"
                    />
                </label>
            ))}
        </div>
      </div>

      {/* Test Cases */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
          Test Cases <span className="text-red-600">*</span>
        </label>

        {formState.testCases.length > 0 && (
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-4 uppercase">
                <div className="col-span-4">Input</div>
                <div className="col-span-4">Expected Output</div>
                <div className="col-span-2 text-center">Visibility</div>
                <div className="col-span-2 text-right">Action</div>
            </div>
            
            {formState.testCases.map((tc) => (
              <div key={tc.id} className="grid grid-cols-12 gap-4 items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="col-span-4 font-mono text-sm truncate" title={tc.input}>
                    {tc.input}
                </div>
                <div className="col-span-4 font-mono text-sm truncate" title={tc.expectedOutput}>
                    {tc.expectedOutput}
                </div>
                <div className="col-span-2 flex justify-center">
                    {tc.isHidden ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                            <EyeOff size={12} /> Hidden
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            <Eye size={12} /> Public
                        </span>
                    )}
                </div>
                <div className="col-span-2 flex justify-end">
                    <button
                        type="button"
                        onClick={() => removeTestCase(tc.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Plus size={16} className="text-brand-blue" /> Add New Test Case
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Standard Input</label>
                    <textarea
                        value={newTestCase.input}
                        onChange={(e) => setNewTestCase({ ...newTestCase, input: e.target.value })}
                        placeholder="e.g., 5 10"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-brand-blue"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Expected Output</label>
                    <textarea
                        value={newTestCase.output}
                        onChange={(e) => setNewTestCase({ ...newTestCase, output: e.target.value })}
                        placeholder="e.g., 15"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-brand-blue"
                    />
                </div>
            </div>
            
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={newTestCase.isHidden}
                        onChange={(e) => setNewTestCase({...newTestCase, isHidden: e.target.checked})}
                        className="w-4 h-4 text-brand-blue rounded focus:ring-brand-blue"
                    />
                    <span className="text-sm text-gray-700">Hidden (Students cannot see this case)</span>
                </label>
                
                <button
                    type="button"
                    onClick={addTestCase}
                    className="px-4 py-2 bg-white border border-brand-blue text-brand-blue hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
                >
                    Add Case
                </button>
            </div>
        </div>
      </div>

      <div className="flex gap-4 sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-lg shadow-lg z-10">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-brand-yellow hover:bg-amber-500 disabled:bg-gray-400 text-white rounded-lg transition-colors font-semibold flex items-center gap-2 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader size={20} className="animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save size={18} />
              Create Assignment
            </>
          )}
        </button>
      </div>
    </form>
  )
}