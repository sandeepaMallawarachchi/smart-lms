'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Upload,
    FileText,
    X,
    AlertCircle,
    CheckCircle2,
    Loader,
    Shield,
    Star,
    GitBranch,
    Clock,
    ArrowLeft,
} from 'lucide-react';

export default function SubmitAssignmentPage() {
    const router = useRouter();
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Simulated checks
    const [plagiarismCheck, setPlagiarismCheck] = useState<{
        status: 'pending' | 'checking' | 'complete';
        score?: number;
    }>({ status: 'pending' });

    const [aiCheck, setAiCheck] = useState<{
        status: 'pending' | 'analyzing' | 'complete';
        score?: number;
        feedback?: string;
    }>({ status: 'pending' });

    // Hardcoded assignments
    const assignments = [
        { id: 1, title: 'Database Design Assignment', course: 'Database Management Systems', dueDate: '2025-01-10' },
        { id: 2, title: 'Software Engineering Essay', course: 'Software Engineering', dueDate: '2025-01-08' },
        { id: 4, title: 'Web Development Project', course: 'Web Technologies', dueDate: '2025-01-15' },
    ];

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles([...selectedFiles, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const runPlagiarismCheck = () => {
        setPlagiarismCheck({ status: 'checking' });

        setTimeout(() => {
            const score = Math.floor(Math.random() * 15) + 3; // Random score between 3-18
            setPlagiarismCheck({ status: 'complete', score });
        }, 3000);
    };

    const runAiCheck = () => {
        setAiCheck({ status: 'analyzing' });

        setTimeout(() => {
            const score = Math.floor(Math.random() * 15) + 80; // Random score between 80-95
            const feedbacks = [
                'Great structure and clear arguments. Consider adding more examples to support your claims.',
                'Excellent work! Your code is well-organized and follows best practices.',
                'Good effort. Try to improve code documentation and add more edge case handling.',
                'Well-written content. Consider expanding the conclusion section.',
            ];
            const feedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];

            setAiCheck({ status: 'complete', score, feedback });
        }, 4000);
    };

    const handleSubmit = async () => {
        if (!selectedAssignment || selectedFiles.length === 0) {
            alert('Please select an assignment and upload at least one file');
            return;
        }

        setIsSubmitting(true);

        // Simulate submission
        setTimeout(() => {
            setIsSubmitting(false);
            alert('Submission successful!');
            router.push('/submissions/student');
        }, 2000);
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Submissions
                </button>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Submit Assignment</h1>
                <p className="text-gray-600">Upload your work and get instant AI feedback</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Assignment Selection */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Select Assignment</h2>
                        <select
                            value={selectedAssignment}
                            onChange={(e) => setSelectedAssignment(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Choose an assignment...</option>
                            {assignments.map((assignment) => (
                                <option key={assignment.id} value={assignment.id}>
                                    {assignment.title} - {assignment.course} (Due: {assignment.dueDate})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* File Upload */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Files</h2>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                            <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                            <p className="text-gray-600 mb-2">Drag and drop files here, or click to browse</p>
                            <p className="text-sm text-gray-500 mb-4">Supported formats: PDF, DOCX, TXT, ZIP, JPG, PNG</p>
                            <input
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                                accept=".pdf,.docx,.txt,.zip,.jpg,.png"
                            />
                            <label
                                htmlFor="file-upload"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
                            >
                                <Upload size={20} />
                                Choose Files
                            </label>
                        </div>

                        {/* Selected Files */}
                        {selectedFiles.length > 0 && (
                            <div className="mt-6 space-y-3">
                                <h3 className="font-semibold text-gray-900">Selected Files ({selectedFiles.length})</h3>
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex items-center gap-3">
                                            <FileText className="text-purple-600" size={24} />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="text-red-600 hover:text-red-700 p-1"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Comments (Optional)</h2>
                        <textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Add any notes or comments about your submission..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Pre-submission Checks */}
                    {selectedFiles.length > 0 && (
                        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Pre-Submission Checks</h2>

                            <div className="space-y-4">
                                {/* Plagiarism Check */}
                                <div className="p-4 border border-gray-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <Shield className="text-purple-600" size={24} />
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Plagiarism Check</h3>
                                                <p className="text-sm text-gray-600">Check for copied content</p>
                                            </div>
                                        </div>
                                        {plagiarismCheck.status === 'pending' && (
                                            <button
                                                onClick={runPlagiarismCheck}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                            >
                                                Run Check
                                            </button>
                                        )}
                                    </div>

                                    {plagiarismCheck.status === 'checking' && (
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Loader className="animate-spin" size={20} />
                                            <span className="text-sm">Checking for plagiarism...</span>
                                        </div>
                                    )}

                                    {plagiarismCheck.status === 'complete' && (
                                        <div className={`p-3 rounded-lg ${
                                            plagiarismCheck.score! < 20 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                {plagiarismCheck.score! < 20 ? (
                                                    <CheckCircle2 className="text-green-600" size={20} />
                                                ) : (
                                                    <AlertCircle className="text-red-600" size={20} />
                                                )}
                                                <span className={`text-sm font-medium ${
                                                    plagiarismCheck.score! < 20 ? 'text-green-700' : 'text-red-700'
                                                }`}>
                          Plagiarism Score: {plagiarismCheck.score}%
                        </span>
                                            </div>
                                            <p className={`text-xs mt-1 ${
                                                plagiarismCheck.score! < 20 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {plagiarismCheck.score! < 20
                                                    ? 'Your work appears to be original. Good job!'
                                                    : 'High similarity detected. Please review and cite sources properly.'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* AI Feedback */}
                                <div className="p-4 border border-gray-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <Star className="text-purple-600" size={24} />
                                            <div>
                                                <h3 className="font-semibold text-gray-900">AI Quality Check</h3>
                                                <p className="text-sm text-gray-600">Get instant feedback</p>
                                            </div>
                                        </div>
                                        {aiCheck.status === 'pending' && (
                                            <button
                                                onClick={runAiCheck}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                            >
                                                Analyze
                                            </button>
                                        )}
                                    </div>

                                    {aiCheck.status === 'analyzing' && (
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Loader className="animate-spin" size={20} />
                                            <span className="text-sm">AI is analyzing your work...</span>
                                        </div>
                                    )}

                                    {aiCheck.status === 'complete' && (
                                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Star className="text-purple-600" size={20} />
                                                <span className="text-sm font-medium text-purple-700">
                          AI Score: {aiCheck.score}/100
                        </span>
                                            </div>
                                            <p className="text-sm text-purple-600">{aiCheck.feedback}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.back()}
                            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedAssignment || selectedFiles.length === 0 || isSubmitting}
                            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader className="animate-spin" size={20} />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Upload size={20} />
                                    Submit Assignment
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Submission Tips */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertCircle className="text-blue-600" size={20} />
                            Submission Tips
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">✓</span>
                                <span>Run plagiarism check before submitting</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">✓</span>
                                <span>Get AI feedback to improve your work</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">✓</span>
                                <span>All versions are automatically saved</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">✓</span>
                                <span>You can resubmit before the deadline</span>
                            </li>
                        </ul>
                    </div>

                    {/* File Requirements */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-3">File Requirements</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>• Maximum file size: 25 MB</li>
                            <li>• Supported formats: PDF, DOCX, TXT, ZIP</li>
                            <li>• Multiple files allowed</li>
                            <li>• Images: JPG, PNG (max 10 MB)</li>
                        </ul>
                    </div>

                    {/* Version Info */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200">
                        <div className="flex items-center gap-3 mb-3">
                            <GitBranch className="text-purple-600" size={24} />
                            <h3 className="font-bold text-gray-900">Version Control</h3>
                        </div>
                        <p className="text-sm text-gray-700">
                            This submission will be saved as a new version. You can always view and compare previous versions.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}