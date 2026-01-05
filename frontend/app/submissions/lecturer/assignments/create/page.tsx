'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft, Award, Clock, Plus, Save, Send, Shield, Star, Trash2,} from 'lucide-react';

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

export default function CreateAssignmentPage() {
    const router = useRouter();

    // Form state
    const [title, setTitle] = useState('');
    const [module, setModule] = useState('');
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
        {
            id: '1',
            number: 1,
            text: '',
            marks: 0,
            hasSubQuestions: false,
            subQuestions: [],
        },
    ]);

    // Calculate total marks
    const totalMarks = questions.reduce((sum, q) => {
        if (q.hasSubQuestions) {
            return sum + q.subQuestions.reduce((subSum, sq) => subSum + sq.marks, 0);
        }
        return sum + q.marks;
    }, 0);

    // Add question
    const addQuestion = () => {
        const newQuestion: Question = {
            id: Date.now().toString(),
            number: questions.length + 1,
            text: '',
            marks: 0,
            hasSubQuestions: false,
            subQuestions: [],
        };
        setQuestions([...questions, newQuestion]);
    };

    // Remove question
    const removeQuestion = (id: string) => {
        const filtered = questions.filter(q => q.id !== id);
        // Renumber questions
        const renumbered = filtered.map((q, index) => ({...q, number: index + 1}));
        setQuestions(renumbered);
    };

    // Update question
    const updateQuestion = (id: string, field: string, value: unknown) => {
        setQuestions(questions.map(q => {
            if (q.id === id) {
                if (field === 'hasSubQuestions' && value === true) {
                    return {
                        ...q,
                        [field]: value,
                        marks: 0,
                        subQuestions: [
                            {id: Date.now().toString(), letter: 'a', text: '', marks: 0},
                        ],
                    };
                }
                if (field === 'hasSubQuestions' && value === false) {
                    return {
                        ...q,
                        [field]: value,
                        subQuestions: [],
                    };
                }
                return {...q, [field]: value};
            }
            return q;
        }));
    };

    // Add sub-question
    const addSubQuestion = (questionId: string) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId) {
                const letters = 'abcdefghijklmnopqrstuvwxyz';
                const newSubQuestion: SubQuestion = {
                    id: Date.now().toString(),
                    letter: letters[q.subQuestions.length],
                    text: '',
                    marks: 0,
                };
                return {
                    ...q,
                    subQuestions: [...q.subQuestions, newSubQuestion],
                };
            }
            return q;
        }));
    };

    // Remove sub-question
    const removeSubQuestion = (questionId: string, subQuestionId: string) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId) {
                const filtered = q.subQuestions.filter(sq => sq.id !== subQuestionId);
                // Reletter sub-questions
                const letters = 'abcdefghijklmnopqrstuvwxyz';
                const relettered = filtered.map((sq, index) => ({...sq, letter: letters[index]}));
                return {...q, subQuestions: relettered};
            }
            return q;
        }));
    };

    // Update sub-question
    const updateSubQuestion = (questionId: string, subQuestionId: string, field: string, value: unknown) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId) {
                return {
                    ...q,
                    subQuestions: q.subQuestions.map(sq =>
                        sq.id === subQuestionId ? {...sq, [field]: value} : sq
                    ),
                };
            }
            return q;
        }));
    };

    // Save draft
    const handleSaveDraft = () => {
        alert('Assignment saved as draft!');
    };

    // Publish assignment
    const handlePublish = () => {
        if (!title || !module || !dueDate || !dueTime) {
            alert('Please fill in all required fields');
            return;
        }
        if (totalMarks === 0) {
            alert('Please allocate marks to questions');
            return;
        }
        alert('Assignment published successfully!');
        router.push('/submissions/lecturer/assignments');
    };

    // Modules list (hardcoded)
    const modules = [
        {code: 'CS1001', name: 'Programming Fundamentals'},
        {code: 'CS2002', name: 'Data Structures & Algorithms'},
        {code: 'CS3001', name: 'Database Management Systems'},
        {code: 'SE2001', name: 'Software Engineering'},
        {code: 'WT3001', name: 'Web Technologies'},
    ];

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20}/>
                    Back to Assignments
                </button>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Assignment</h1>
                <p className="text-gray-600">Set up a new assignment for your students</p>
            </div>

            {/* Form */}
            <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Assignment Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Database Design and Normalization"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Module <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={module}
                                onChange={(e) => setModule(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a module</option>
                                {modules.map((m) => (
                                    <option key={m.code} value={m.code}>
                                        {m.code} - {m.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of the assignment..."
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Instructions
                            </label>
                            <textarea
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="Detailed instructions for students..."
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Due Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Due Time <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="time"
                                    value={dueTime}
                                    onChange={(e) => setDueTime(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submission Settings */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Submission Settings</h2>

                    <div className="space-y-4">
                        <div
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Clock className="text-blue-600" size={20}/>
                                <div>
                                    <p className="font-medium text-gray-900">Allow Late
                                        Submissions</p>
                                    <p className="text-sm text-gray-600">Students can submit after
                                        the deadline with penalty</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={allowLateSubmission}
                                    onChange={(e) => setAllowLateSubmission(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div
                                    className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {allowLateSubmission && (
                            <div className="ml-10">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Late Penalty (% per day)
                                </label>
                                <input
                                    type="number"
                                    value={latePenalty}
                                    onChange={(e) => setLatePenalty(parseInt(e.target.value))}
                                    min="0"
                                    max="100"
                                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Questions */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Questions</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Total Marks: <span
                                className="font-bold text-blue-600">{totalMarks}</span>
                            </p>
                        </div>
                        <button
                            onClick={addQuestion}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={18}/>
                            Add Question
                        </button>
                    </div>

                    <div className="space-y-6">
                        {questions.map((question, qIndex) => (
                            <div key={question.id}
                                 className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-start gap-4">
                                    <div
                                        className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span
                                            className="font-bold text-blue-600">{question.number}</span>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        {/* Question Text */}
                                        <div>
                                            <label
                                                className="block text-sm font-medium text-gray-700 mb-2">
                                                Question Text
                                            </label>
                                            <textarea
                                                value={question.text}
                                                onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                                                placeholder="Enter your question..."
                                                rows={2}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            />
                                        </div>

                                        {/* Sub-questions toggle */}
                                        <div className="flex items-center gap-3">
                                            <label
                                                className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={question.hasSubQuestions}
                                                    onChange={(e) => updateQuestion(question.id, 'hasSubQuestions', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div
                                                    className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                            <span className="text-sm font-medium text-gray-700">Has sub-questions</span>
                                        </div>

                                        {/* Single Question Marks */}
                                        {!question.hasSubQuestions && (
                                            <div className="flex items-center gap-3">
                                                <Award className="text-purple-600" size={20}/>
                                                <label
                                                    className="text-sm font-medium text-gray-700">Marks:</label>
                                                <input
                                                    type="number"
                                                    value={question.marks}
                                                    onChange={(e) => updateQuestion(question.id, 'marks', parseInt(e.target.value) || 0)}
                                                    min="0"
                                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        )}

                                        {/* Sub-questions */}
                                        {question.hasSubQuestions && (
                                            <div
                                                className="space-y-4 pl-6 border-l-2 border-blue-200">
                                                {question.subQuestions.map((subQ, sqIndex) => (
                                                    <div key={subQ.id}
                                                         className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                                                        <div
                                                            className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <span
                                                                className="font-bold text-purple-600 text-sm">({subQ.letter})</span>
                                                        </div>
                                                        <div className="flex-1 space-y-3">
                              <textarea
                                  value={subQ.text}
                                  onChange={(e) => updateSubQuestion(question.id, subQ.id, 'text', e.target.value)}
                                  placeholder="Sub-question text..."
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                              />
                                                            <div
                                                                className="flex items-center gap-3">
                                                                <Award className="text-purple-600"
                                                                       size={18}/>
                                                                <label
                                                                    className="text-sm font-medium text-gray-700">Marks:</label>
                                                                <input
                                                                    type="number"
                                                                    value={subQ.marks}
                                                                    onChange={(e) => updateSubQuestion(question.id, subQ.id, 'marks', parseInt(e.target.value) || 0)}
                                                                    min="0"
                                                                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeSubQuestion(question.id, subQ.id)}
                                                            className="text-red-600 hover:text-red-700 p-2"
                                                            disabled={question.subQuestions.length === 1}
                                                        >
                                                            <Trash2 size={18}/>
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => addSubQuestion(question.id)}
                                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                                                >
                                                    <Plus size={16}/>
                                                    Add Sub-question
                                                </button>
                                                <div className="pt-2 border-t border-gray-200">
                                                    <p className="text-sm font-medium text-gray-700">
                                                        Question {question.number} Total:
                                                        <span
                                                            className="ml-2 text-purple-600 font-bold">
                              {question.subQuestions.reduce((sum, sq) => sum + sq.marks, 0)} marks
                            </span>
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => removeQuestion(question.id)}
                                        className="text-red-600 hover:text-red-700 p-2"
                                        disabled={questions.length === 1}
                                    >
                                        <Trash2 size={20}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Plagiarism Settings */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Plagiarism Detection</h2>

                    <div className="space-y-4">
                        <div
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Shield className="text-red-600" size={20}/>
                                <div>
                                    <p className="font-medium text-gray-900">Enable Plagiarism
                                        Check</p>
                                    <p className="text-sm text-gray-600">Automatically check
                                        submissions for similarity</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enablePlagiarismCheck}
                                    onChange={(e) => setEnablePlagiarismCheck(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div
                                    className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {enablePlagiarismCheck && (
                            <div className="ml-10">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Flag Threshold (%)
                                </label>
                                <input
                                    type="number"
                                    value={plagiarismThreshold}
                                    onChange={(e) => setPlagiarismThreshold(parseInt(e.target.value))}
                                    min="0"
                                    max="100"
                                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Submissions above this threshold will be flagged for review
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Feedback Settings */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">AI Feedback</h2>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Star className="text-purple-600" size={20}/>
                            <div>
                                <p className="font-medium text-gray-900">Enable AI-Assisted
                                    Feedback</p>
                                <p className="text-sm text-gray-600">Provide instant feedback to
                                    students as they write</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enableAIFeedback}
                                onChange={(e) => setEnableAIFeedback(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div
                                className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                {/* Action Buttons */}
                <div
                    className="sticky bottom-0 bg-white border-t border-gray-200 p-6 shadow-lg rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Total Marks: <span
                            className="font-bold text-blue-600 text-lg">{totalMarks}</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveDraft}
                                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                            >
                                <Save size={18}/>
                                Save as Draft
                            </button>
                            <button
                                onClick={handlePublish}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                            >
                                <Send size={18}/>
                                Publish Assignment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
