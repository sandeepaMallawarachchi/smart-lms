'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    Send,
    Star,
    Edit,
    Check,
    X,
    Sparkles,
    User,
    FileText,
    GitBranch,
    Shield,
    Award,
    Clock,
    Calendar,
    Eye,
    RefreshCw,
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
    aiFeedback: string;
    aiScore: number;
    lecturerFeedback: string;
    lecturerScore?: number;
    maxMarks: number;
}

export default function LecturerGradingInterfacePage({ params }: { params: Promise<{ submissionId: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();

    const [answers, setAnswers] = useState<Record<string, Answer>>({});
    const [editingFeedback, setEditingFeedback] = useState<string | null>(null);
    const [tempFeedback, setTempFeedback] = useState('');
    const [tempScore, setTempScore] = useState<number | undefined>();
    const [overallComment, setOverallComment] = useState('');
    const [finalGrade, setFinalGrade] = useState<number | undefined>();
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showAnswers, setShowAnswers] = useState(true);

    // Hardcoded submission data
    const submission = {
        id: resolvedParams.submissionId,
        student: {
            id: 's1',
            name: 'Alice Johnson',
            studentId: 'STU001',
            email: 'alice.johnson@university.edu',
        },
        assignment: {
            id: 'a1',
            title: 'Database Design and Normalization',
            module: { code: 'CS3001', name: 'Database Management Systems' },
            totalMarks: 100,
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
                            text: 'Convert your ER diagram to relational schema in 3NF.',
                            marks: 15,
                        },
                    ],
                },
                {
                    id: 'q3',
                    number: 3,
                    text: 'Compare and contrast different types of database keys.',
                    marks: 25,
                },
                {
                    id: 'q4',
                    number: 4,
                    text: 'Write SQL queries for the given scenarios.',
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
                            text: 'Find the top 5 best-selling products.',
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
            ] as Question[],
        },
        version: 4,
        submittedAt: '2025-01-08 20:45',
        dueDate: '2025-01-15 23:59',
        plagiarismScore: 5,
        overallAIScore: 88,
    };

    // Initialize answers with AI feedback
    React.useEffect(() => {
        const initialAnswers: Record<string, Answer> = {
            'q1': {
                questionId: 'q1',
                text: 'A Binary Search Tree (BST) is a fundamental hierarchical data structure that maintains an ordered collection of elements. Each node stores a value and references to at most two children: left and right. The defining BST property ensures that all values in the left subtree are strictly less than the parent, while all values in the right subtree are strictly greater.',
                wordCount: 300,
                aiFeedback: 'Excellent explanation of database normalization! The student demonstrates a strong understanding of the concept and its importance. The answer covers all normal forms comprehensively. However, could benefit from more real-world examples of denormalization scenarios.',
                aiScore: 90,
                lecturerFeedback: '',
                maxMarks: 20,
            },
            'q2-q2a': {
                questionId: 'q2',
                subQuestionId: 'q2a',
                text: '[ER Diagram description provided by student showing entities: Customer, Product, Order, OrderItem with appropriate relationships]',
                wordCount: 320,
                aiFeedback: 'Very good ER diagram design. All major entities are identified and relationships are correctly established. The cardinality notations are appropriate. Consider adding more attributes like timestamps and status fields.',
                aiScore: 85,
                lecturerFeedback: '',
                maxMarks: 15,
            },
            'q2-q2b': {
                questionId: 'q2',
                subQuestionId: 'q2b',
                text: '[Student provided normalization steps from 1NF to 3NF with proper functional dependencies]',
                wordCount: 280,
                aiFeedback: 'Solid understanding of normalization process. The conversion from ER to relational schema is well done. All tables are properly normalized to 3NF. Good identification of functional dependencies.',
                aiScore: 88,
                lecturerFeedback: '',
                maxMarks: 15,
            },
            'q3': {
                questionId: 'q3',
                text: 'Database keys are essential for maintaining data integrity... Primary keys uniquely identify records, foreign keys establish relationships, candidate keys are potential primary keys, and composite keys combine multiple columns...',
                wordCount: 230,
                aiFeedback: 'Good comparison of different key types. The student understands the purpose of each key type. Would benefit from more examples showing how composite keys are used in practice.',
                aiScore: 82,
                lecturerFeedback: '',
                maxMarks: 25,
            },
            'q4-q4a': {
                questionId: 'q4',
                subQuestionId: 'q4a',
                text: 'SELECT DISTINCT c.* FROM customers c JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);',
                wordCount: 25,
                aiFeedback: 'Correct SQL query! The use of DATE_SUB and JOIN is appropriate. Good understanding of date functions.',
                aiScore: 95,
                lecturerFeedback: '',
                maxMarks: 8,
            },
            'q4-q4b': {
                questionId: 'q4',
                subQuestionId: 'q4b',
                text: 'SELECT p.product_id, p.product_name, SUM(oi.quantity * oi.price) as total_revenue FROM products p JOIN order_items oi ON p.product_id = oi.product_id GROUP BY p.product_id ORDER BY total_revenue DESC LIMIT 5;',
                wordCount: 35,
                aiFeedback: 'Excellent query! Proper use of JOIN, GROUP BY, and ORDER BY. The revenue calculation is correct.',
                aiScore: 98,
                lecturerFeedback: '',
                maxMarks: 9,
            },
            'q4-q4c': {
                questionId: 'q4',
                subQuestionId: 'q4c',
                text: 'SELECT c.* FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_id IS NULL;',
                wordCount: 20,
                aiFeedback: 'Perfect! Correct use of LEFT JOIN to find customers with no orders.',
                aiScore: 100,
                lecturerFeedback: '',
                maxMarks: 8,
            },
        };
        setAnswers(initialAnswers);
    }, []);

    const handleEditFeedback = (key: string) => {
        setEditingFeedback(key);
        setTempFeedback(answers[key]?.lecturerFeedback || answers[key]?.aiFeedback || '');
        setTempScore(answers[key]?.lecturerScore || answers[key]?.aiScore);
    };

    const handleSaveFeedback = (key: string) => {
        setAnswers(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                lecturerFeedback: tempFeedback,
                lecturerScore: tempScore,
            },
        }));
        setEditingFeedback(null);
        setTempFeedback('');
        setTempScore(undefined);
    };

    const handleCancelEdit = () => {
        setEditingFeedback(null);
        setTempFeedback('');
        setTempScore(undefined);
    };

    const handleRegenerateAI = async (key: string) => {
        setIsGeneratingAI(true);
        // Simulate AI generation
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newFeedback = 'Regenerated AI feedback with enhanced analysis...';
        setAnswers(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                aiFeedback: newFeedback,
            },
        }));
        setIsGeneratingAI(false);
    };

    const calculateTotalGrade = () => {
        let total = 0;
        let maxTotal = 0;

        Object.values(answers).forEach(answer => {
            const score = answer.lecturerScore ?? answer.aiScore;
            const percentage = score / 100;
            total += answer.maxMarks * percentage;
            maxTotal += answer.maxMarks;
        });

        return {
            scored: Math.round(total * 10) / 10,
            total: maxTotal,
            percentage: Math.round((total / maxTotal) * 100),
        };
    };

    const handleSubmitGrade = async () => {
        if (!confirm('Are you sure you want to submit this grade? This will notify the student.')) {
            return;
        }

        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        alert('Grade submitted successfully! Student has been notified.');
        router.push('/submissions/lecturer/submissions');
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        alert('Grade saved as draft.');
        setIsSaving(false);
    };

    const grade = calculateTotalGrade();

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Submissions
                </button>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="text-blue-600" size={32} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{submission.student.name}</h1>
                                <p className="text-gray-600">{submission.student.studentId} • {submission.student.email}</p>
                                <p className="text-sm text-gray-500 mt-1">{submission.assignment.title}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{grade.percentage}%</div>
                            <div className="text-sm text-gray-600">{grade.scored}/{grade.total} marks</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="text-blue-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Submitted</div>
                                <div className="font-medium text-sm">
                                    {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <GitBranch className="text-purple-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Version</div>
                                <div className="font-medium text-sm">{submission.version}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Shield className="text-green-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">Plagiarism</div>
                                <div className="font-medium text-sm">{submission.plagiarismScore}%</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Star className="text-amber-600" size={20} />
                            <div>
                                <div className="text-xs text-gray-500">AI Score</div>
                                <div className="font-medium text-sm">{submission.overallAIScore}/100</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toggle Answers Visibility */}
            <div className="mb-4 flex justify-end">
                <button
                    onClick={() => setShowAnswers(!showAnswers)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                    <Eye size={18} />
                    {showAnswers ? 'Hide' : 'Show'} Answers
                </button>
            </div>

            {/* Questions and Grading */}
            <div className="space-y-6">
                {submission.assignment.questions.map((question) => {
                    if (!question.subQuestions) {
                        const key = question.id;
                        const answer = answers[key];
                        const isEditing = editingFeedback === key;
                        const displayFeedback = answer?.lecturerFeedback || answer?.aiFeedback || '';
                        const displayScore = answer?.lecturerScore ?? answer?.aiScore;
                        const isModified = !!answer?.lecturerFeedback;

                        return (
                            <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                {/* Question Header */}
                                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                                            Question {question.number}
                                        </h3>
                                        <p className="text-gray-700">{question.text}</p>
                                    </div>
                                    <div className="ml-4">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {question.marks} marks
                    </span>
                                    </div>
                                </div>

                                {/* Student Answer */}
                                {showAnswers && answer && (
                                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Student&#39;s Answer:</p>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer.text}</p>
                                        <p className="text-xs text-gray-500 mt-2">{answer.wordCount} words</p>
                                    </div>
                                )}

                                {/* Grading Section */}
                                <div className="space-y-4">
                                    {!isEditing ? (
                                        <div>
                                            {/* AI/Lecturer Feedback Display */}
                                            <div className={`p-4 rounded-lg border-l-4 ${
                                                isModified
                                                    ? 'bg-blue-50 border-blue-500'
                                                    : 'bg-purple-50 border-purple-500'
                                            }`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {isModified ? (
                                                            <Edit className="text-blue-600" size={20} />
                                                        ) : (
                                                            <Sparkles className="text-purple-600" size={20} />
                                                        )}
                                                        <span className="font-medium text-sm">
                              {isModified ? 'Your Feedback' : 'AI-Generated Feedback'}
                            </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-900">
                              {displayScore}/100
                            </span>
                                                        <span className="text-sm text-gray-600">
                              ({Math.round((displayScore / 100) * question.marks)}/{question.marks})
                            </span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-700">{displayFeedback}</p>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => handleEditFeedback(key)}
                                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                                                >
                                                    <Edit size={16} />
                                                    {isModified ? 'Edit Feedback' : 'Modify AI Feedback'}
                                                </button>
                                                {!isModified && (
                                                    <button
                                                        onClick={() => handleRegenerateAI(key)}
                                                        disabled={isGeneratingAI}
                                                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        <RefreshCw size={16} className={isGeneratingAI ? 'animate-spin' : ''} />
                                                        Regenerate AI
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Edit Mode */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Your Feedback:
                                                </label>
                                                <textarea
                                                    value={tempFeedback}
                                                    onChange={(e) => setTempFeedback(e.target.value)}
                                                    rows={4}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Enter your feedback..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Score (out of 100):
                                                </label>
                                                <input
                                                    type="number"
                                                    value={tempScore}
                                                    onChange={(e) => setTempScore(Number(e.target.value))}
                                                    min={0}
                                                    max={100}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    This equals {tempScore ? Math.round((tempScore / 100) * question.marks) : 0}/{question.marks} marks
                                                </p>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveFeedback(key)}
                                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                                                >
                                                    <Check size={16} />
                                                    Save
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2"
                                                >
                                                    <X size={16} />
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    // Handle sub-questions
                    return (
                        <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                                        Question {question.number}
                                    </h3>
                                    <p className="text-gray-700">{question.text}</p>
                                </div>
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {question.marks} marks
                </span>
                            </div>

                            <div className="space-y-6">
                                {question.subQuestions?.map((subQ) => {
                                    const key = `${question.id}-${subQ.id}`;
                                    const answer = answers[key];
                                    const isEditing = editingFeedback === key;
                                    const displayFeedback = answer?.lecturerFeedback || answer?.aiFeedback || '';
                                    const displayScore = answer?.lecturerScore ?? answer?.aiScore;
                                    const isModified = !!answer?.lecturerFeedback;

                                    return (
                                        <div key={subQ.id} className="pl-6 border-l-2 border-gray-200">
                                            <div className="flex items-start justify-between mb-3">
                                                <h4 className="font-semibold text-gray-900">
                                                    ({subQ.letter}) {subQ.text}
                                                </h4>
                                                <span className="ml-4 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium whitespace-nowrap">
                          {subQ.marks} marks
                        </span>
                                            </div>

                                            {showAnswers && answer && (
                                                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer.text}</p>
                                                </div>
                                            )}

                                            {!isEditing ? (
                                                <div>
                                                    <div className={`p-3 rounded border-l-4 ${
                                                        isModified
                                                            ? 'bg-blue-50 border-blue-500'
                                                            : 'bg-purple-50 border-purple-500'
                                                    }`}>
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                {isModified ? (
                                                                    <Edit className="text-blue-600" size={18} />
                                                                ) : (
                                                                    <Sparkles className="text-purple-600" size={18} />
                                                                )}
                                                                <span className="font-medium text-xs">
                                  {isModified ? 'Your Feedback' : 'AI Feedback'}
                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                <span className="text-lg font-bold text-gray-900">
                                  {displayScore}/100
                                </span>
                                                                <span className="text-xs text-gray-600">
                                  ({Math.round((displayScore / 100) * subQ.marks)}/{subQ.marks})
                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-700">{displayFeedback}</p>
                                                    </div>

                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={() => handleEditFeedback(key)}
                                                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                                        >
                                                            <Edit size={14} />
                                                            {isModified ? 'Edit' : 'Modify'}
                                                        </button>
                                                        {!isModified && (
                                                            <button
                                                                onClick={() => handleRegenerateAI(key)}
                                                                className="px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors text-sm font-medium flex items-center gap-2"
                                                            >
                                                                <RefreshCw size={14} />
                                                                Regenerate
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                          <textarea
                              value={tempFeedback}
                              onChange={(e) => setTempFeedback(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                                                    <input
                                                        type="number"
                                                        value={tempScore}
                                                        onChange={(e) => setTempScore(Number(e.target.value))}
                                                        min={0}
                                                        max={100}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleSaveFeedback(key)}
                                                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                                        >
                                                            <Check size={14} />
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                                        >
                                                            <X size={14} />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Overall Comment */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Overall Comment</h3>
                    <textarea
                        value={overallComment}
                        onChange={(e) => setOverallComment(e.target.value)}
                        rows={4}
                        placeholder="Add an overall comment for the student..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Final Grade Summary */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold mb-2">Final Grade</h3>
                            <p className="text-blue-100">
                                {grade.scored} out of {grade.total} marks
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-5xl font-bold">{grade.percentage}%</div>
                            <p className="text-blue-100 mt-1">
                                {grade.percentage >= 90 ? 'A+' :
                                    grade.percentage >= 80 ? 'A' :
                                        grade.percentage >= 70 ? 'B' :
                                            grade.percentage >= 60 ? 'C' :
                                                grade.percentage >= 50 ? 'D' : 'F'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 mt-8 shadow-lg rounded-t-lg">
                <div className="flex gap-4 max-w-7xl mx-auto">
                    <button
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        Save as Draft
                    </button>
                    <button
                        onClick={handleSubmitGrade}
                        disabled={isSaving}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Send size={18} />
                        Submit Grade & Notify Student
                    </button>
                </div>
            </div>
        </div>
    );
}