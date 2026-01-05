'use client';

import React, {use, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Eye,
    GitBranch,
    Info,
    Loader,
    Save,
    Send,
    Shield,
    Star,
} from 'lucide-react';

interface Question {
    id: string;
    number: number;
    text: string;
    marks: number;
    subQuestions?: {
        id: string;
        letter: string;
        text: string;
        marks: number;
    }[];
}

interface Answer {
    questionId: string;
    subQuestionId?: string;
    text: string;
    wordCount: number;
    plagiarismScore: number;
    aiScore: number;
    aiFeedback: string;
    savedAt: string;
}

interface Version {
    version: number;
    answers: Answer[];
    createdAt: string;
    plagiarismScore: number;
    aiScore: number;
    wordCount: number;
}

interface Assignment {
    id: string;
    title: string;
    module: {
        code: string;
        name: string;
    };
    totalMarks: number;
    dueDate: string;
    instructions: string;
    timeLimit: number | null;
    allowLateSubmission: boolean;
    questions: Question[];
}

interface Feedback {
    wordCount: number;
    plagiarismScore: number;
    aiScore: number;
    feedback: string;
    analyzedAt: string;
}

export default function SubmitAssignmentPage({params}: {
    params: Promise<{ assignmentId: string }>
}) {
    const resolvedParams = use(params);
    const router = useRouter();

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [versions, setVersions] = useState<Version[]>([]);
    const [currentVersion, setCurrentVersion] = useState(1);
    const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});
    const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCopyAlert, setShowCopyAlert] = useState(false);
    const [copyAttempts, setCopyAttempts] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [activeQuestion, setActiveQuestion] = useState<string>('');

    const textAreaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

    // Hardcoded assignment data
    const assignmentData: Assignment = {
        id: resolvedParams.assignmentId,
        title: 'Database Design and Normalization',
        module: {code: 'CS3001', name: 'Database Management Systems'},
        totalMarks: 100,
        dueDate: '2025-01-15 23:59',
        instructions: 'Answer all questions. Show all your work. Plagiarism will result in automatic failure.',
        timeLimit: null, // minutes, null = no limit
        allowLateSubmission: true,
        questions: [
            {
                id: 'q1',
                number: 1,
                text: 'Explain the concept of database normalization and its importance in database design.',
                marks: 20,
            },
            {
                id: 'q2',
                number: 2,
                text: 'Design a normalized database for an e-commerce system.',
                marks: 30,
                subQuestions: [
                    {
                        id: 'q2a',
                        letter: 'a',
                        text: 'Create an Entity-Relationship (ER) diagram showing all entities, attributes, and relationships.',
                        marks: 15,
                    },
                    {
                        id: 'q2b',
                        letter: 'b',
                        text: 'Convert your ER diagram to relational schema in 3NF. Show your normalization steps.',
                        marks: 15,
                    },
                ],
            },
            {
                id: 'q3',
                number: 3,
                text: 'Compare and contrast different types of database keys (Primary, Foreign, Candidate, Composite).',
                marks: 25,
            },
            {
                id: 'q4',
                number: 4,
                text: 'Write SQL queries for the following scenarios:',
                marks: 25,
                subQuestions: [
                    {
                        id: 'q4a',
                        letter: 'a',
                        text: 'Retrieve all customers who have made purchases in the last 30 days.',
                        marks: 8,
                    },
                    {
                        id: 'q4b',
                        letter: 'b',
                        text: 'Find the top 5 best-selling products with their total revenue.',
                        marks: 9,
                    },
                    {
                        id: 'q4c',
                        letter: 'c',
                        text: 'List customers who have never made a purchase.',
                        marks: 8,
                    },
                ],
            },
        ],
    };

    useEffect(() => {
        setAssignment(assignmentData);
        // eslint-disable-next-line react-hooks/immutability
        loadSavedProgress();

        // Calculate time remaining
        const interval = setInterval(() => {
            // eslint-disable-next-line react-hooks/purity
            const now = new Date();
            // eslint-disable-next-line react-hooks/purity
            const due = new Date(assignmentData.dueDate);
            const diff = due.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining('Overdue');
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const loadSavedProgress = () => {
        // Simulate loading saved progress
        const savedAnswers = {
            'q1': 'Database normalization is a systematic approach...',
        };
        setAnswers(savedAnswers);

        // Load versions
        const savedVersions: Version[] = [
            {
                version: 1,
                answers: [],
                createdAt: new Date().toISOString(),
                plagiarismScore: 5,
                aiScore: 75,
                wordCount: 150,
            },
        ];
        setVersions(savedVersions);
    };

    // Prevent copy-paste
    const handleCopyPaste = (e: React.ClipboardEvent, questionId: string) => {
        e.preventDefault();
        setShowCopyAlert(true);
        setCopyAttempts(prev => prev + 1);

        setTimeout(() => setShowCopyAlert(false), 3000);

        // Log the attempt
        console.warn(`Copy/Paste attempt detected for question ${questionId}`);
    };

    // Handle answer change with debouncing
    const handleAnswerChange = (questionId: string, text: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: text,
        }));
        setHasUnsavedChanges(true);

        // Clear existing timer
        if (debounceTimers.current[questionId]) {
            clearTimeout(debounceTimers.current[questionId]);
        }

        // Set new timer for real-time analysis
        debounceTimers.current[questionId] = setTimeout(() => {
            analyzeAnswer(questionId, text);
        }, 2000); // Wait 2 seconds after user stops typing
    };

    // Analyze answer for plagiarism and AI feedback
    const analyzeAnswer = async (questionId: string, text: string) => {
        if (!text || text.length < 50) return; // Don't analyze very short answers

        setIsAnalyzing(prev => ({
            ...prev,
            [questionId]: true,
        }));

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate plagiarism check and AI feedback
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        // eslint-disable-next-line react-hooks/purity
        const plagiarismScore = Math.floor(Math.random() * 15) + 3; // 3-18%
        // eslint-disable-next-line react-hooks/purity
        const aiScore = Math.floor(Math.random() * 20) + 75; // 75-95

        const feedbackTemplates = [
            {
                score: 90,
                feedback: 'Excellent answer! Your explanation is clear and comprehensive. You\'ve demonstrated a strong understanding of the concept. Consider adding more specific examples to strengthen your response.',
            },
            {
                score: 85,
                feedback: 'Very good response. You\'ve covered the main points effectively. To improve, try to elaborate more on the practical applications and provide concrete examples.',
            },
            {
                score: 80,
                feedback: 'Good effort. Your answer shows understanding, but could be more detailed. Consider expanding on key concepts and providing more depth in your explanation.',
            },
            {
                score: 75,
                feedback: 'Satisfactory answer. You\'ve touched on important points, but your explanation needs more depth. Try to provide more specific details and examples.',
            },
        ];

        const selectedFeedback = feedbackTemplates.find(f => aiScore >= f.score) || feedbackTemplates[feedbackTemplates.length - 1];

        setFeedback(prev => ({
            ...prev,
            [questionId]: {
                wordCount,
                plagiarismScore,
                aiScore,
                feedback: selectedFeedback.feedback,
                analyzedAt: new Date().toISOString(),
            },
        }));

        setIsAnalyzing(prev => ({
            ...prev,
            [questionId]: false,
        }));
    };

    // Auto-save function
    const autoSave = async () => {
        if (!hasUnsavedChanges) return;

        setIsSaving(true);

        // Simulate save delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create new version
        const newVersion: Version = {
            version: currentVersion + 1,
            answers: Object.entries(answers).map(([qId, text]) => ({
                questionId: qId,
                text,
                wordCount: text.split(/\s+/).filter(Boolean).length,
                plagiarismScore: feedback[qId]?.plagiarismScore || 0,
                aiScore: feedback[qId]?.aiScore || 0,
                aiFeedback: feedback[qId]?.feedback || '',
                savedAt: new Date().toISOString(),
            })),
            createdAt: new Date().toISOString(),
            plagiarismScore: Math.round(
                Object.values(feedback).reduce((sum: number, f: Feedback) => sum + (f?.plagiarismScore || 0), 0) /
                Object.keys(feedback).length || 0
            ),
            aiScore: Math.round(
                Object.values(feedback).reduce((sum: number, f: Feedback) => sum + (f?.aiScore || 0), 0) /
                Object.keys(feedback).length || 0
            ),
            wordCount: Object.values(answers).reduce((sum, text) =>
                sum + text.split(/\s+/).filter(Boolean).length, 0
            ),
        };

        setVersions(prev => [...prev, newVersion]);
        setCurrentVersion(prev => prev + 1);
        setHasUnsavedChanges(false);
        setIsSaving(false);
    };

    // Manual save
    const handleSave = () => {
        autoSave();
    };

    // Submit assignment
    const handleSubmit = async () => {
        if (Object.keys(answers).length === 0) {
            alert('Please answer at least one question before submitting.');
            return;
        }

        if (!confirm('Are you sure you want to submit this assignment? You can still modify it before the deadline.')) {
            return;
        }

        setIsSubmitting(true);

        // Save final version
        await autoSave();

        // Simulate submission delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsSubmitting(false);
        alert('Assignment submitted successfully!');
        router.push('/submissions/student/my-submissions');
    };

    // Get question key (including sub-questions)
    const getQuestionKey = (questionId: string, subQuestionId?: string) => {
        return subQuestionId ? `${questionId}-${subQuestionId}` : questionId;
    };

    if (!assignment) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader className="animate-spin text-purple-600" size={48}/>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Copy Alert */}
            {showCopyAlert && (
                <div
                    className="fixed top-20 right-8 z-50 bg-red-100 border-2 border-red-500 rounded-lg p-4 shadow-lg animate-bounce">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-red-600" size={24}/>
                        <div>
                            <p className="font-bold text-red-900">Copy/Paste Disabled!</p>
                            <p className="text-sm text-red-700">Type your answers manually. Attempt
                                #{copyAttempts} logged.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20}/>
                    Back to Assignments
                </button>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{assignment.title}</h1>
                    <p className="text-gray-600 mb-4">{assignment.module.code} • {assignment.module.name}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="text-blue-600" size={20}/>
                            <span className="text-sm">
                <span className="font-medium">Time Remaining:</span> {timeRemaining}
              </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <GitBranch className="text-purple-600" size={20}/>
                            <span className="text-sm">
                <span className="font-medium">Version:</span> {currentVersion}
              </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Star className="text-amber-600" size={20}/>
                            <span className="text-sm">
                <span className="font-medium">Total Marks:</span> {assignment.totalMarks}
              </span>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <div className="flex items-start gap-3">
                            <Info className="text-blue-600 mt-0.5" size={20}/>
                            <div>
                                <p className="font-medium text-blue-900 mb-1">Instructions:</p>
                                <p className="text-sm text-blue-800">{assignment.instructions}</p>
                                <p className="text-sm text-blue-800 mt-2 font-medium">⚠️ Copy-paste
                                    is disabled. All answers must be typed manually.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Questions */}
            <div className="space-y-6">
                {assignment.questions.map((question: Question) => (
                    <div key={question.id}
                         className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        {/* Question Header */}
                        <div className="mb-4 pb-4 border-b border-gray-200">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                                        Question {question.number}
                                    </h3>
                                    <p className="text-gray-700">{question.text}</p>
                                </div>
                                <div className="ml-4">
                  <span
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {question.marks} marks
                  </span>
                                </div>
                            </div>
                        </div>

                        {/* Main Question Answer (if no sub-questions) */}
                        {!question.subQuestions && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Your Answer:
                                </label>
                                <textarea
                                    ref={(el) => {
                                        textAreaRefs.current[question.id] = el;
                                    }}
                                    value={answers[question.id] || ''}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                    onCopy={(e) => handleCopyPaste(e, question.id)}
                                    onPaste={(e) => handleCopyPaste(e, question.id)}
                                    onCut={(e) => handleCopyPaste(e, question.id)}
                                    onFocus={() => setActiveQuestion(question.id)}
                                    placeholder="Type your answer here... (Copy-paste disabled)"
                                    rows={8}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                />

                                {/* Real-time Feedback */}
                                {isAnalyzing[question.id] && (
                                    <div className="mt-3 flex items-center gap-2 text-blue-600">
                                        <Loader className="animate-spin" size={16}/>
                                        <span className="text-sm">Analyzing your answer...</span>
                                    </div>
                                )}

                                {feedback[question.id] && !isAnalyzing[question.id] && (
                                    <div className="mt-4 space-y-3">
                                        {/* Stats */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div
                                                className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="text-xs text-gray-600">Word Count
                                                </div>
                                                <div
                                                    className="text-lg font-bold text-gray-900">{feedback[question.id].wordCount}</div>
                                            </div>
                                            <div className={`p-3 rounded-lg border ${
                                                feedback[question.id].plagiarismScore < 20
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-red-50 border-red-200'
                                            }`}>
                                                <div className="text-xs text-gray-600">Plagiarism
                                                </div>
                                                <div className={`text-lg font-bold ${
                                                    feedback[question.id].plagiarismScore < 20
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                }`}>
                                                    {feedback[question.id].plagiarismScore}%
                                                </div>
                                            </div>
                                            <div
                                                className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                <div className="text-xs text-gray-600">AI Score
                                                </div>
                                                <div
                                                    className="text-lg font-bold text-purple-600">{feedback[question.id].aiScore}/100
                                                </div>
                                            </div>
                                        </div>

                                        {/* AI Feedback */}
                                        <div
                                            className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                                            <div className="flex items-start gap-3">
                                                <Star className="text-purple-600 mt-0.5" size={20}/>
                                                <div>
                                                    <p className="font-medium text-purple-900 mb-1">AI
                                                        Feedback:</p>
                                                    <p className="text-sm text-purple-800">{feedback[question.id].feedback}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Plagiarism Warning */}
                                        {feedback[question.id].plagiarismScore >= 20 && (
                                            <div
                                                className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                                                <div className="flex items-start gap-3">
                                                    <Shield className="text-red-600 mt-0.5"
                                                            size={20}/>
                                                    <div>
                                                        <p className="font-medium text-red-900 mb-1">Plagiarism
                                                            Alert:</p>
                                                        <p className="text-sm text-red-800">
                                                            High similarity detected. Please ensure
                                                            your answer is original and properly
                                                            cited.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sub-questions */}
                        {question.subQuestions && (
                            <div className="space-y-6">
                                {question.subQuestions.map((subQ) => {
                                    const key = getQuestionKey(question.id, subQ.id);
                                    return (
                                        <div key={subQ.id}
                                             className="pl-6 border-l-2 border-gray-200">
                                            <div className="mb-3">
                                                <div
                                                    className="flex items-start justify-between mb-2">
                                                    <h4 className="font-semibold text-gray-900">
                                                        ({subQ.letter}) {subQ.text}
                                                    </h4>
                                                    <span
                                                        className="ml-4 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium whitespace-nowrap">
                            {subQ.marks} marks
                          </span>
                                                </div>
                                            </div>

                                            <textarea
                                                ref={(el) => {
                                                    textAreaRefs.current[key] = el;
                                                }}
                                                value={answers[key] || ''}
                                                onChange={(e) => handleAnswerChange(key, e.target.value)}
                                                onCopy={(e) => handleCopyPaste(e, key)}
                                                onPaste={(e) => handleCopyPaste(e, key)}
                                                onCut={(e) => handleCopyPaste(e, key)}
                                                onFocus={() => setActiveQuestion(key)}
                                                placeholder="Type your answer here... (Copy-paste disabled)"
                                                rows={6}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                            />

                                            {/* Real-time Feedback for sub-question */}
                                            {isAnalyzing[key] && (
                                                <div
                                                    className="mt-3 flex items-center gap-2 text-blue-600">
                                                    <Loader className="animate-spin" size={16}/>
                                                    <span className="text-sm">Analyzing your answer...</span>
                                                </div>
                                            )}

                                            {feedback[key] && !isAnalyzing[key] && (
                                                <div className="mt-4 space-y-3">
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div
                                                            className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                            <div
                                                                className="text-xs text-gray-600">Words
                                                            </div>
                                                            <div
                                                                className="text-lg font-bold text-gray-900">{feedback[key].wordCount}</div>
                                                        </div>
                                                        <div className={`p-3 rounded-lg border ${
                                                            feedback[key].plagiarismScore < 20
                                                                ? 'bg-green-50 border-green-200'
                                                                : 'bg-red-50 border-red-200'
                                                        }`}>
                                                            <div
                                                                className="text-xs text-gray-600">Plagiarism
                                                            </div>
                                                            <div className={`text-lg font-bold ${
                                                                feedback[key].plagiarismScore < 20
                                                                    ? 'text-green-600'
                                                                    : 'text-red-600'
                                                            }`}>
                                                                {feedback[key].plagiarismScore}%
                                                            </div>
                                                        </div>
                                                        <div
                                                            className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                            <div
                                                                className="text-xs text-gray-600">AI
                                                                Score
                                                            </div>
                                                            <div
                                                                className="text-lg font-bold text-purple-600">{feedback[key].aiScore}/100
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div
                                                        className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                                                        <div className="flex items-start gap-3">
                                                            <Star className="text-purple-600 mt-0.5"
                                                                  size={20}/>
                                                            <div>
                                                                <p className="font-medium text-purple-900 mb-1">AI
                                                                    Feedback:</p>
                                                                <p className="text-sm text-purple-800">{feedback[key].feedback}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div
                className="sticky bottom-0 bg-white border-t border-gray-200 p-6 mt-8 shadow-lg rounded-t-lg">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <div className="flex items-center gap-4">
                        {hasUnsavedChanges && (
                            <div className="flex items-center gap-2 text-amber-600">
                                <Clock size={16}/>
                                <span className="text-sm font-medium">Unsaved changes</span>
                            </div>
                        )}
                        {isSaving && (
                            <div className="flex items-center gap-2 text-blue-600">
                                <Loader className="animate-spin" size={16}/>
                                <span className="text-sm">Saving...</span>
                            </div>
                        )}
                        {!hasUnsavedChanges && !isSaving && versions.length > 0 && (
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 size={16}/>
                                <span
                                    className="text-sm">All changes saved (Version {currentVersion})</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push(`/submissions/student/versions/${assignment.id}`)}
                            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                        >
                            <Eye size={18}/>
                            View Versions ({versions.length})
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges || isSaving}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Save size={18}/>
                            Save Progress
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || Object.keys(answers).length === 0}
                            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader className="animate-spin" size={18}/>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send size={18}/>
                                    Submit Assignment
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}