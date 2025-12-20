'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Download,
    Trash2,
    Send,
    Edit,
    Clock,
    FileText,
    GitBranch,
    Brain,
    Shield
} from 'lucide-react';
import { Navbar } from '@/components/it22586766/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/it22586766/ui/Card';
import { Button } from '@/components/it22586766/ui/Button';
import { Badge } from '@/components/it22586766/ui/Badge';
import { LoadingSpinner } from '@/components/it22586766/ui/LoadingSpinner';
import { Modal } from '@/components/it22586766/ui/Modal';
import { FileUpload } from '@/components/it22586766/submissions/FileUpload';
import { VersionTimeline } from '@/components/it22586766/versions/VersionTimeline';
import { FeedbackCard } from '@/components/it22586766/feedback/FeedbackCard';
import { PlagiarismReport } from '@/components/it22586766/integrity/PlagiarismReport';
import { submissionService } from '@/lib/it22586766/api/services/submission.service';
import { versionService } from '@/lib/it22586766/api/services/version.service';
import { feedbackService } from '@/lib/it22586766/api/services/feedback.service';
import { integrityService } from '@/lib/it22586766/api/services/integrity.service';
import { Submission, Version, Feedback, PlagiarismCheck } from '@/types/it22586766';
import { formatDate, formatFileSize, downloadBlob, getFileIcon } from '@/lib/it22586766/utils';
import toast from 'react-hot-toast';

export default function SubmissionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const submissionId = parseInt(params.id as string);

    const [submission, setSubmission] = useState<Submission | null>(null);
    const [versions, setVersions] = useState<Version[]>([]);
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [plagiarismCheck, setPlagiarismCheck] = useState<PlagiarismCheck | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'files' | 'versions' | 'feedback' | 'integrity'>('files');

    useEffect(() => {
        loadSubmissionData();
    }, [submissionId]);

    const loadSubmissionData = async () => {
        try {
            setLoading(true);

            // Load submission
            const submissionResponse = await submissionService.getById(submissionId);
            setSubmission(submissionResponse.data);

            // Load versions
            const versionsResponse = await versionService.getBySubmissionId(submissionId);
            setVersions(versionsResponse.data);

            // Load feedback
            const feedbackResponse = await feedbackService.getBySubmissionId(submissionId);
            setFeedback(feedbackResponse.data);

            // Load plagiarism check
            const checksResponse = await integrityService.getBySubmissionId(submissionId);
            if (checksResponse.data.length > 0) {
                setPlagiarismCheck(checksResponse.data[0]);
            }
        } catch (error) {
            toast.error('Failed to load submission data');
            console.error('Error loading submission:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadFiles = async (files: File[]) => {
        try {
            for (const file of files) {
                await submissionService.uploadFile(submissionId, file);
            }
            toast.success('Files uploaded successfully');
            loadSubmissionData();
            setUploadModalOpen(false);
        } catch (error) {
            toast.error('Failed to upload files');
            throw error;
        }
    };

    const handleDownloadFile = async (fileId: number, fileName: string) => {
        try {
            const blob = await submissionService.downloadFile(submissionId, fileId);
            downloadBlob(blob, fileName);
            toast.success('File downloaded');
        } catch (error) {
            toast.error('Failed to download file');
        }
    };

    const handleDeleteFile = async (fileId: number) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            await submissionService.deleteFile(submissionId, fileId);
            toast.success('File deleted');
            loadSubmissionData();
        } catch (error) {
            toast.error('Failed to delete file');
        }
    };

    const handleSubmit = async () => {
        if (!confirm('Are you sure you want to submit? You cannot edit after submission.')) return;

        try {
            await submissionService.submit(submissionId);
            toast.success('Submission submitted successfully');
            loadSubmissionData();
        } catch (error) {
            toast.error('Failed to submit');
        }
    };

    const handleGenerateFeedback = async () => {
        try {
            toast.loading('Generating AI feedback...', { duration: 2000 });
            router.push(`/feedback/generate?submissionId=${submissionId}`);
        } catch (error) {
            toast.error('Failed to generate feedback');
        }
    };

    const handleRunPlagiarismCheck = async () => {
        try {
            toast.loading('Running plagiarism check...', { duration: 2000 });
            router.push(`/integrity/check?submissionId=${submissionId}`);
        } catch (error) {
            toast.error('Failed to run plagiarism check');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                    <LoadingSpinner size="lg" text="Loading submission..." />
                </div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">Submission not found</h2>
                        <Button className="mt-4" onClick={() => router.push('/submissions')}>
                            Back to Submissions
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'files', label: 'Files', icon: FileText, count: submission.fileCount },
        { id: 'versions', label: 'Versions', icon: GitBranch, count: versions.length },
        { id: 'feedback', label: 'Feedback', icon: Brain, count: feedback.length },
        { id: 'integrity', label: 'Integrity', icon: Shield, count: plagiarismCheck ? 1 : 0 },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<ArrowLeft className="h-4 w-4" />}
                        onClick={() => router.back()}
                        className="mb-4"
                    >
                        Back
                    </Button>

                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900">{submission.title}</h1>
                            {submission.description && (
                                <p className="mt-2 text-gray-600">{submission.description}</p>
                            )}
                            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    Created {formatDate(submission.createdAt)}
                                </div>
                                {submission.dueDate && (
                                    <div className="flex items-center">
                                        Due {formatDate(submission.dueDate)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge>{submission.status.replace('_', ' ')}</Badge>
                            {submission.isLate && <Badge variant="danger">Late</Badge>}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mb-6 flex flex-wrap gap-2">
                    {submission.status === 'DRAFT' && (
                        <>
                            <Button
                                icon={<Send className="h-4 w-4" />}
                                onClick={handleSubmit}
                            >
                                Submit
                            </Button>
                            <Button
                                variant="outline"
                                icon={<Edit className="h-4 w-4" />}
                                onClick={() => router.push(`/submissions/${submissionId}/edit`)}
                            >
                                Edit
                            </Button>
                        </>
                    )}
                    <Button
                        variant="outline"
                        icon={<Brain className="h-4 w-4" />}
                        onClick={handleGenerateFeedback}
                    >
                        Generate Feedback
                    </Button>
                    <Button
                        variant="outline"
                        icon={<Shield className="h-4 w-4" />}
                        onClick={handleRunPlagiarismCheck}
                    >
                        Check Plagiarism
                    </Button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as never)}
                                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                                        activeTab === tab.id
                                            ? 'border-primary-500 text-primary-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon className="h-5 w-5 mr-2" />
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === 'files' && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Files ({submission.fileCount})</CardTitle>
                                    {submission.status === 'DRAFT' && (
                                        <Button size="sm" onClick={() => setUploadModalOpen(true)}>
                                            Upload Files
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {submission.files.length > 0 ? (
                                    <div className="space-y-2">
                                        {submission.files.map((file) => (
                                            <div
                                                key={file.id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex items-center space-x-3">
                          <span className="text-2xl">
                            {getFileIcon(file.fileExtension)}
                          </span>
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {file.originalFilename}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            {formatFileSize(file.fileSize)} • {formatDate(file.uploadedAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        icon={<Download className="h-4 w-4" />}
                                                        onClick={() => handleDownloadFile(file.id, file.originalFilename)}
                                                    >
                                                        Download
                                                    </Button>
                                                    {submission.status === 'DRAFT' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            icon={<Trash2 className="h-4 w-4" />}
                                                            onClick={() => handleDeleteFile(file.id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <p>No files uploaded yet</p>
                                        {submission.status === 'DRAFT' && (
                                            <Button
                                                size="sm"
                                                className="mt-4"
                                                onClick={() => setUploadModalOpen(true)}
                                            >
                                                Upload Files
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'versions' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Version History ({versions.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {versions.length > 0 ? (
                                    <VersionTimeline
                                        versions={versions}
                                        onVersionClick={(version) =>
                                            router.push(`/versions/${version.id}`)
                                        }
                                    />
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <GitBranch className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <p>No versions available</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'feedback' && (
                        <div className="space-y-6">
                            {feedback.length > 0 ? (
                                feedback.map((fb) => <FeedbackCard key={fb.id} feedback={fb} />)
                            ) : (
                                <Card>
                                    <CardContent className="py-12">
                                        <div className="text-center text-gray-500">
                                            <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                            <p>No feedback available yet</p>
                                            <Button
                                                size="sm"
                                                className="mt-4"
                                                onClick={handleGenerateFeedback}
                                            >
                                                Generate Feedback
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeTab === 'integrity' && (
                        <div>
                            {plagiarismCheck ? (
                                <PlagiarismReport check={plagiarismCheck} />
                            ) : (
                                <Card>
                                    <CardContent className="py-12">
                                        <div className="text-center text-gray-500">
                                            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                            <p>No plagiarism check performed yet</p>
                                            <Button
                                                size="sm"
                                                className="mt-4"
                                                onClick={handleRunPlagiarismCheck}
                                            >
                                                Run Plagiarism Check
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Upload Modal */}
            <Modal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                title="Upload Files"
                size="lg"
            >
                <div className="p-6">
                    <FileUpload onUpload={handleUploadFiles} />
                </div>
            </Modal>
        </div>
    );
}