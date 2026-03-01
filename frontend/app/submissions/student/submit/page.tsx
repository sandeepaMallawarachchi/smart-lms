'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Upload,
    FileText,
    AlertCircle,
    CheckCircle2,
    Loader,
    Shield,
    Star,
    GitBranch,
    ArrowLeft,
    Send,
} from 'lucide-react';
import FileUploader from '@/components/submissions/FileUploader';
import { useAssignments, useCreateSubmission, useUploadFiles, useSubmitSubmission } from '@/hooks/useSubmissions';
import { useCheckPlagiarism } from '@/hooks/usePlagiarism';
import { useGenerateFeedback } from '@/hooks/useFeedback';

// ─── Toaster (inline, no external dep) ───────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-xl shadow-xl text-white max-w-sm transition-all
            ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {type === 'success' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────

export default function SubmitAssignmentPage() {
    const router = useRouter();

    // ── State
    const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [comments, setComments] = useState('');
    const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // ── Get student id from localStorage
    const [studentId, setStudentId] = useState<string>('');
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // The auth/verify endpoint returns userId in the token payload
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    setStudentId(payload.userId ?? payload.sub ?? '');
                } catch {
                    // fall back to empty — server will reject unauthorized
                }
            }
        }
    }, []);

    // ── Hooks
    const { data: assignments, loading: assignmentsLoading, error: assignmentsError } = useAssignments({ status: 'OPEN' });
    const { createSubmission, loading: creating } = useCreateSubmission();
    const { uploadFiles, uploading, error: uploadError, progress: uploadProgress } = useUploadFiles();
    const { submitSubmission, loading: submitting } = useSubmitSubmission();
    const {
        loading: plagChecking,
        success: plagDone,
        report: plagReport,
        checkPlagiarism,
        reset: resetPlag,
    } = useCheckPlagiarism();
    const {
        loading: feedbackLoading,
        success: feedbackDone,
        feedback: aiFeedback,
        generateFeedback,
        reset: resetFeedback,
    } = useGenerateFeedback();

    // Convert progress array to map
    const progressMap: Record<string, number> = {};
    uploadProgress.forEach(({ fileName, progress }) => { progressMap[fileName] = progress; });

    const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

    // ── Step 1 — Run pre-check (plagiarism or AI)
    const handleRunPlagiarism = async () => {
        if (!currentSubmissionId) {
            showToast('Please save your submission first before running checks.', 'error');
            return;
        }
        resetPlag();
        await checkPlagiarism({ submissionId: currentSubmissionId, force: true });
    };

    const handleRunAI = async () => {
        if (!currentSubmissionId) {
            showToast('Please save your submission first before running checks.', 'error');
            return;
        }
        resetFeedback();
        await generateFeedback({ submissionId: currentSubmissionId, force: true });
    };

    // ── Step 2 — Save as draft (create + upload)
    const handleSaveDraft = async () => {
        if (!selectedAssignmentId) {
            showToast('Please select an assignment.', 'error');
            return;
        }
        if (files.length === 0) {
            showToast('Please upload at least one file.', 'error');
            return;
        }
        if (!studentId) {
            showToast('Unable to identify your account. Please log out and log back in.', 'error');
            return;
        }

        try {
            // Create submission record
            const submission = await createSubmission({
                studentId,
                assignmentId: selectedAssignmentId,
                comments,
                title: assignments?.find((a) => a.id === selectedAssignmentId)?.title,
            });

            if (!submission) {
                showToast('Failed to create submission. Please try again.', 'error');
                return;
            }

            setCurrentSubmissionId(submission.id);

            // Upload files
            const uploaded = await uploadFiles(submission.id, files);
            if (!uploaded) {
                showToast(uploadError ?? 'File upload failed.', 'error');
                return;
            }

            showToast('Draft saved! You can now run pre-submission checks.', 'success');
        } catch {
            showToast('An unexpected error occurred.', 'error');
        }
    };

    // ── Step 3 — Final submit
    const handleFinalSubmit = async () => {
        if (!currentSubmissionId) {
            showToast('Please save your draft first.', 'error');
            return;
        }

        const result = await submitSubmission(currentSubmissionId);
        if (result) {
            showToast('Submission successful! Redirecting…', 'success');
            setTimeout(() => router.push('/submissions/student/my-submissions'), 1500);
        } else {
            showToast('Failed to submit. Please try again.', 'error');
        }
    };

    const isFormReady = selectedAssignmentId && files.length > 0;
    const isDraftSaved = !!currentSubmissionId;
    const isBusy = creating || uploading || submitting;

    // ── Render assignment options
    const renderAssignmentOptions = () => {
        if (assignmentsLoading) {
            return <option disabled>Loading assignments…</option>;
        }
        if (assignmentsError || !assignments?.length) {
            // Fallback to hardcoded options so the page isn't empty
            return (
                <>
                    <option value="">Choose an assignment…</option>
                    <option value="demo-1">Database Design Assignment – Database Management Systems (Due: 2026-03-15)</option>
                    <option value="demo-2">Software Engineering Essay – Software Engineering (Due: 2026-03-08)</option>
                    <option value="demo-3">Web Development Project – Web Technologies (Due: 2026-03-20)</option>
                </>
            );
        }
        return (
            <>
                <option value="">Choose an assignment…</option>
                {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                        {a.title} – {a.moduleName ?? a.moduleCode} (Due: {new Date(a.dueDate).toLocaleDateString()})
                    </option>
                ))}
            </>
        );
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

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

            {/* Progress steps */}
            <div className="flex items-center gap-3 mb-8">
                {['Select & Upload', 'Pre-Checks', 'Submit'].map((step, i) => {
                    const active = i === 0 ? !isDraftSaved : i === 1 ? isDraftSaved && !submitting : submitting;
                    const done = i === 0 ? isDraftSaved : i === 1 ? false : false;
                    return (
                        <React.Fragment key={step}>
                            <div className={`flex items-center gap-2 text-sm font-medium ${
                                done ? 'text-green-600' : active ? 'text-purple-700' : 'text-gray-400'
                            }`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                    done ? 'bg-green-600 text-white' : active ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {done ? '✓' : i + 1}
                                </div>
                                {step}
                            </div>
                            {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Main Form ── */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Assignment Selection */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="text-purple-600" size={22} />
                            Select Assignment
                        </h2>
                        <select
                            value={selectedAssignmentId}
                            onChange={(e) => setSelectedAssignmentId(e.target.value)}
                            disabled={isDraftSaved || isBusy}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60 disabled:bg-gray-50"
                        >
                            {renderAssignmentOptions()}
                        </select>
                    </div>

                    {/* File Upload */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Upload className="text-purple-600" size={22} />
                            Upload Files
                        </h2>
                        <FileUploader
                            files={files}
                            onFilesChange={setFiles}
                            maxSizeMB={50}
                            disabled={isDraftSaved || isBusy}
                            uploadProgress={progressMap}
                        />
                        {uploadError && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle size={16} />
                                {uploadError}
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Additional Comments{' '}
                            <span className="text-sm font-normal text-gray-500">(Optional)</span>
                        </h2>
                        <textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Add any notes or context about your submission…"
                            rows={4}
                            disabled={isBusy}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:opacity-60"
                        />
                    </div>

                    {/* Save Draft button */}
                    {!isDraftSaved && (
                        <button
                            onClick={handleSaveDraft}
                            disabled={!isFormReady || isBusy}
                            className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2 text-lg shadow-lg"
                        >
                            {(creating || uploading) ? (
                                <>
                                    <Loader className="animate-spin" size={22} />
                                    {creating ? 'Creating submission…' : 'Uploading files…'}
                                </>
                            ) : (
                                <>
                                    <Upload size={22} />
                                    Save Draft & Enable Checks
                                </>
                            )}
                        </button>
                    )}

                    {/* Pre-Submission Checks (shown after draft saved) */}
                    {isDraftSaved && (
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                Pre-Submission Checks
                            </h2>
                            <div className="space-y-4">
                                {/* Plagiarism */}
                                <div className="p-4 border border-gray-200 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <Shield className="text-purple-600" size={24} />
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Plagiarism Check</h3>
                                                <p className="text-sm text-gray-500">
                                                    Powered by JPlag — compares against all submissions
                                                </p>
                                            </div>
                                        </div>
                                        {!plagChecking && !plagDone && (
                                            <button
                                                onClick={handleRunPlagiarism}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                            >
                                                Run Check
                                            </button>
                                        )}
                                    </div>

                                    {plagChecking && (
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Loader className="animate-spin" size={18} />
                                            <span className="text-sm">Checking for plagiarism…</span>
                                        </div>
                                    )}

                                    {plagDone && plagReport && (
                                        <div className={`p-3 rounded-lg border ${
                                            plagReport.overallScore < 20
                                                ? 'bg-green-50 border-green-200'
                                                : plagReport.overallScore < 40
                                                ? 'bg-amber-50 border-amber-200'
                                                : 'bg-red-50 border-red-200'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                {plagReport.overallScore < 20 ? (
                                                    <CheckCircle2 className="text-green-600" size={18} />
                                                ) : (
                                                    <AlertCircle className={plagReport.overallScore < 40 ? 'text-amber-600' : 'text-red-600'} size={18} />
                                                )}
                                                <span className="font-medium text-sm">
                                                    Plagiarism Score: {plagReport.overallScore}%
                                                </span>
                                            </div>
                                            <p className="text-xs mt-1 text-gray-600">
                                                {plagReport.overallScore < 20
                                                    ? 'Your work appears original. '
                                                    : plagReport.overallScore < 40
                                                    ? 'Moderate similarity found. Please review and cite sources. '
                                                    : 'High similarity detected. Please revise before submitting. '}
                                                {plagReport.sourcesChecked.toLocaleString()} sources checked.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* AI Feedback */}
                                <div className="p-4 border border-gray-200 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <Star className="text-purple-600" size={24} />
                                            <div>
                                                <h3 className="font-semibold text-gray-900">AI Quality Check</h3>
                                                <p className="text-sm text-gray-500">
                                                    GPT-4o analysis — get instant improvement tips
                                                </p>
                                            </div>
                                        </div>
                                        {!feedbackLoading && !feedbackDone && (
                                            <button
                                                onClick={handleRunAI}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                            >
                                                Analyze
                                            </button>
                                        )}
                                    </div>

                                    {feedbackLoading && (
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Loader className="animate-spin" size={18} />
                                            <span className="text-sm">AI is analysing your work…</span>
                                        </div>
                                    )}

                                    {feedbackDone && aiFeedback && (
                                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Star className="text-purple-600" size={18} />
                                                <span className="font-medium text-sm text-purple-700">
                                                    AI Score: {aiFeedback.scores?.overall ?? '–'}/100
                                                </span>
                                            </div>
                                            {aiFeedback.overallAssessment && (
                                                <p className="text-sm text-purple-800 line-clamp-3">
                                                    {aiFeedback.overallAssessment}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Final Submit / Cancel */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.back()}
                            disabled={isBusy}
                            className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        {isDraftSaved && (
                            <button
                                onClick={handleFinalSubmit}
                                disabled={submitting}
                                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        Submitting…
                                    </>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Final Submit
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Sidebar ── */}
                <div className="space-y-6">
                    {/* Submission Tips */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertCircle className="text-blue-600" size={20} />
                            Submission Tips
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
                                Run the plagiarism check before final submission
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
                                Use AI feedback to improve your work
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
                                All versions are automatically saved
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
                                You can resubmit before the deadline
                            </li>
                        </ul>
                    </div>

                    {/* File Requirements */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-3">File Requirements</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>• Maximum file size: <span className="font-medium">50 MB</span></li>
                            <li>• Supported: PDF, DOCX, TXT, ZIP, source files</li>
                            <li>• Multiple files allowed</li>
                            <li>• Drag & drop or click to browse</li>
                        </ul>
                    </div>

                    {/* Version Info */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
                        <div className="flex items-center gap-3 mb-3">
                            <GitBranch className="text-purple-600" size={22} />
                            <h3 className="font-bold text-gray-900">Version Control</h3>
                        </div>
                        <p className="text-sm text-gray-700">
                            Each submission creates a new version. You can always view and compare
                            previous versions from your submission history.
                        </p>
                    </div>

                    {/* Draft status indicator */}
                    {isDraftSaved && (
                        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-green-700">
                                <CheckCircle2 size={18} />
                                <span className="font-semibold text-sm">Draft saved</span>
                            </div>
                            <p className="text-xs text-green-600 mt-1">
                                Run pre-checks or click &ldquo;Final Submit&rdquo; when ready.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
