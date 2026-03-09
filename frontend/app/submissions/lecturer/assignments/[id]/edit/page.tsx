'use client';

import React, { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Award,
    Clock,
    Plus,
    Save,
    Send,
    Shield,
    Star,
    Trash2,
} from 'lucide-react';
import { submissionService } from '@/lib/api/submission-services';
import {
    PageHeader,
    Skeleton,
    ErrorBanner,
} from '@/components/submissions/lecturer/PageShell';
import type { Assignment } from '@/types/submission.types';

/* ─── Local Interfaces ─────────────────────────────────────── */

interface SubQuestion {
    id: string;
    letter: string;
    text: string;
    marks: number;
}

interface Question {
    id: string;
    number: number;
    text: string;
    marks: number;
    hasSubQuestions: boolean;
    subQuestions: SubQuestion[];
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    /* fetch state */
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    /* form state */
    const [title, setTitle] = useState('');
    const [moduleCode, setModuleCode] = useState('');
    const [description, setDescription] = useState('');
    const [instructions, setInstructions] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [allowLateSubmission, setAllowLateSubmission] = useState(true);
    const [latePenalty, setLatePenalty] = useState(10);
    const [enablePlagiarismCheck, setEnablePlagiarismCheck] = useState(true);
    const [plagiarismThreshold, setPlagiarismThreshold] = useState(20);
    const [enableAIFeedback, setEnableAIFeedback] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([
        { id: '1', number: 1, text: '', marks: 0, hasSubQuestions: false, subQuestions: [] },
    ]);

    /* ─── Fetch assignment and pre-fill form ───────────────────── */

    const fetchAssignment = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const a: Assignment = await submissionService.getAssignment(id);
            setTitle(a.title);
            setModuleCode(a.moduleCode);
            setDescription(a.description ?? '');
            if (a.dueDate) {
                const dt = new Date(a.dueDate);
                setDueDate(dt.toISOString().split('T')[0]);
                setDueTime(dt.toTimeString().slice(0, 5));
            }
            // Assignment type doesn't expose all settings—use sane defaults for what we don't get
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Failed to load assignment');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchAssignment(); }, [fetchAssignment]);

    /* ─── Computed ──────────────────────────────────────────── */

    const totalMarks = questions.reduce((sum, q) => {
        if (q.hasSubQuestions) {
            return sum + q.subQuestions.reduce((sub, sq) => sub + sq.marks, 0);
        }
        return sum + q.marks;
    }, 0);

    /* ─── Question helpers ──────────────────────────────────── */

    const addQuestion = () => {
        setQuestions((prev) => [
            ...prev,
            { id: Date.now().toString(), number: prev.length + 1, text: '', marks: 0, hasSubQuestions: false, subQuestions: [] },
        ]);
    };

    const removeQuestion = (qId: string) => {
        setQuestions((prev) => prev.filter((q) => q.id !== qId).map((q, i) => ({ ...q, number: i + 1 })));
    };

    const updateQuestion = (qId: string, field: string, value: unknown) => {
        setQuestions((prev) =>
            prev.map((q) => {
                if (q.id !== qId) return q;
                if (field === 'hasSubQuestions' && value === true) {
                    return { ...q, hasSubQuestions: true, marks: 0, subQuestions: [{ id: Date.now().toString(), letter: 'a', text: '', marks: 0 }] };
                }
                if (field === 'hasSubQuestions' && value === false) {
                    return { ...q, hasSubQuestions: false, subQuestions: [] };
                }
                return { ...q, [field]: value };
            }),
        );
    };

    const addSubQuestion = (qId: string) => {
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === qId
                    ? { ...q, subQuestions: [...q.subQuestions, { id: Date.now().toString(), letter: letters[q.subQuestions.length], text: '', marks: 0 }] }
                    : q,
            ),
        );
    };

    const removeSubQuestion = (qId: string, sqId: string) => {
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === qId
                    ? { ...q, subQuestions: q.subQuestions.filter((sq) => sq.id !== sqId).map((sq, i) => ({ ...sq, letter: letters[i] })) }
                    : q,
            ),
        );
    };

    const updateSubQuestion = (qId: string, sqId: string, field: string, value: unknown) => {
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === qId ? { ...q, subQuestions: q.subQuestions.map((sq) => (sq.id === sqId ? { ...sq, [field]: value } : sq)) } : q,
            ),
        );
    };

    /* ─── Save handlers ─────────────────────────────────────── */

    const handleSave = async (publish: boolean) => {
        if (!title || !moduleCode || !dueDate || !dueTime) {
            alert('Please fill in all required fields');
            return;
        }
        if (publish && totalMarks === 0) {
            alert('Please allocate marks to questions');
            return;
        }
        setSaving(true);
        try {
            const dueDateISO = new Date(`${dueDate}T${dueTime}`).toISOString();
            await submissionService.updateAssignment(id, {
                title,
                moduleCode,
                description: description || undefined,
                dueDate: dueDateISO,
                totalMarks,
                status: publish ? 'OPEN' : 'DRAFT',
            });
            router.push(`/submissions/lecturer/assignments/${id}`);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    /* ─── Modules ───────────────────────────────────────────── */

    const modules = [
        { code: 'CS1001', name: 'Programming Fundamentals' },
        { code: 'CS2002', name: 'Data Structures & Algorithms' },
        { code: 'CS3001', name: 'Database Management Systems' },
        { code: 'SE2001', name: 'Software Engineering' },
        { code: 'WT3001', name: 'Web Technologies' },
    ];

    /* ─── Render ────────────────────────────────────────────── */

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-60" />
                <Skeleton className="h-40" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="max-w-5xl mx-auto">
                <button onClick={() => router.push('/submissions/lecturer/assignments')} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm mb-4 transition-colors cursor-pointer">
                    <ArrowLeft size={16} /> Back to Assignments
                </button>
                <ErrorBanner message={loadError} onRetry={fetchAssignment} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer">
                <ArrowLeft size={20} /> Back
            </button>

            <PageHeader title="Edit Assignment" subtitle={title || 'Untitled'} icon={undefined} loading={false} />

            <div className="space-y-6 mt-2">
                {/* Basic Info */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Database Design" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Module <span className="text-red-500">*</span></label>
                            <select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select module</option>
                                {modules.map((m) => <option key={m.code} value={m.code}>{m.code} — {m.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief description…" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} placeholder="Detailed instructions…" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date <span className="text-red-500">*</span></label>
                                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Time <span className="text-red-500">*</span></label>
                                <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submission Settings */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Submission Settings</h2>
                    <div className="space-y-4">
                        <ToggleRow icon={Clock} label="Allow Late Submissions" desc="Students can submit after deadline with penalty" checked={allowLateSubmission} onChange={setAllowLateSubmission} />
                        {allowLateSubmission && (
                            <div className="ml-10">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Late Penalty (% per day)</label>
                                <input type="number" value={latePenalty} onChange={(e) => setLatePenalty(parseInt(e.target.value) || 0)} min={0} max={100} className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Questions */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Questions</h2>
                            <p className="text-sm text-gray-600 mt-0.5">Total Marks: <span className="font-bold text-blue-600">{totalMarks}</span></p>
                        </div>
                        <button onClick={addQuestion} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer">
                            <Plus size={16} /> Add Question
                        </button>
                    </div>

                    <div className="space-y-5">
                        {questions.map((q) => (
                            <div key={q.id} className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-start gap-4">
                                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                        <span className="font-bold text-blue-600 text-sm">{q.number}</span>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <textarea value={q.text} onChange={(e) => updateQuestion(q.id, 'text', e.target.value)} rows={2} placeholder="Question text…" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
                                        <div className="flex items-center gap-3">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={q.hasSubQuestions} onChange={(e) => updateQuestion(q.id, 'hasSubQuestions', e.target.checked)} className="sr-only peer" />
                                                <div className="w-10 h-5 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                                            </label>
                                            <span className="text-xs font-medium text-gray-700">Sub-questions</span>
                                        </div>
                                        {!q.hasSubQuestions && (
                                            <div className="flex items-center gap-2">
                                                <Award className="text-purple-600" size={16} />
                                                <span className="text-sm text-gray-700">Marks:</span>
                                                <input type="number" value={q.marks} onChange={(e) => updateQuestion(q.id, 'marks', parseInt(e.target.value) || 0)} min={0} className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                            </div>
                                        )}
                                        {q.hasSubQuestions && (
                                            <div className="space-y-3 pl-5 border-l-2 border-blue-200">
                                                {q.subQuestions.map((sq) => (
                                                    <div key={sq.id} className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                                                        <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                                                            <span className="font-bold text-purple-600 text-xs">({sq.letter})</span>
                                                        </div>
                                                        <div className="flex-1 space-y-2">
                                                            <textarea value={sq.text} onChange={(e) => updateSubQuestion(q.id, sq.id, 'text', e.target.value)} rows={2} placeholder="Sub-question…" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
                                                            <div className="flex items-center gap-2">
                                                                <Award className="text-purple-600" size={14} />
                                                                <span className="text-xs text-gray-700">Marks:</span>
                                                                <input type="number" value={sq.marks} onChange={(e) => updateSubQuestion(q.id, sq.id, 'marks', parseInt(e.target.value) || 0)} min={0} className="w-16 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                                            </div>
                                                        </div>
                                                        <button onClick={() => removeSubQuestion(q.id, sq.id)} disabled={q.subQuestions.length === 1} className="text-red-500 hover:text-red-700 p-1 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button onClick={() => addSubQuestion(q.id)} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-medium cursor-pointer">
                                                    <Plus size={14} /> Add Sub-question
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => removeQuestion(q.id)} disabled={questions.length === 1} className="text-red-500 hover:text-red-700 p-1.5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Plagiarism / AI Feedback */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Plagiarism &amp; AI Settings</h2>
                    <div className="space-y-4">
                        <ToggleRow icon={Shield} label="Plagiarism Check" desc="Automatically check for similarity" checked={enablePlagiarismCheck} onChange={setEnablePlagiarismCheck} />
                        {enablePlagiarismCheck && (
                            <div className="ml-10">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Flag Threshold (%)</label>
                                <input type="number" value={plagiarismThreshold} onChange={(e) => setPlagiarismThreshold(parseInt(e.target.value) || 0)} min={0} max={100} className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        )}
                        <ToggleRow icon={Star} label="AI-Assisted Feedback" desc="Instant feedback as students write" checked={enableAIFeedback} onChange={setEnableAIFeedback} />
                    </div>
                </div>

                {/* Action Bar */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-5 shadow-lg rounded-t-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Marks: <span className="font-bold text-blue-600 text-lg">{totalMarks}</span></span>
                        <div className="flex gap-3">
                            <button onClick={() => handleSave(false)} disabled={saving} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                                <Save size={16} /> Save Draft
                            </button>
                            <button onClick={() => handleSave(true)} disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                                <Send size={16} /> Publish
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Reusable Toggle Row ──────────────────────────────────── */

function ToggleRow({ icon: Icon, label, desc, checked, onChange }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    desc: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
                <Icon size={20} className="text-gray-500" />
                <div>
                    <p className="font-medium text-gray-900 text-sm">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
        </div>
    );
}
