'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter } from 'lucide-react';
import { Navbar } from '@/components/it22586766/layout/Navbar';
import { SubmissionCard } from '@/components/it22586766/submissions/SubmissionCard';
import { Button } from '@/components/it22586766/ui/Button';
import { Input } from '@/components/it22586766/ui/Input';
import { Select } from '@/components/it22586766/ui/Select';
import { LoadingSpinner } from '@/components/it22586766/ui/LoadingSpinner';
import { submissionService } from '@/lib/it22586766/api/services/submission.service';
import { useAuthStore } from '@/store/it22586766/useAuthStore';
import { Submission, SubmissionStatus } from '@/types/it22586766';
import toast from 'react-hot-toast';

export default function SubmissionsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadSubmissions();
    }, []);

    useEffect(() => {
        filterSubmissions();
    }, [submissions, searchTerm, statusFilter]);

    const loadSubmissions = async () => {
        try {
            setLoading(true);
            const response = await submissionService.getAll({
                studentId: user?.id,
            });
            setSubmissions(response.data);
        } catch (error) {
            toast.error('Failed to load submissions');
            console.error('Error loading submissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterSubmissions = () => {
        let filtered = submissions;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(
                (s) =>
                    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.assignmentTitle?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter) {
            filtered = filtered.filter((s) => s.status === statusFilter);
        }

        setFilteredSubmissions(filtered);
    };

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        { value: 'DRAFT', label: 'Draft' },
        { value: 'SUBMITTED', label: 'Submitted' },
        { value: 'UNDER_REVIEW', label: 'Under Review' },
        { value: 'GRADED', label: 'Graded' },
        { value: 'RETURNED', label: 'Returned' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Submissions</h1>
                        <p className="mt-2 text-gray-600">
                            Manage and track all your submissions
                        </p>
                    </div>
                    <Button
                        icon={<Plus className="h-5 w-5" />}
                        onClick={() => router.push('/submissions/create')}
                    >
                        New Submission
                    </Button>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search submissions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div className="sm:w-64">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={statusOptions}
                        />
                    </div>
                </div>

                {/* Submissions List */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <LoadingSpinner size="lg" text="Loading submissions..." />
                    </div>
                ) : filteredSubmissions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSubmissions.map((submission) => (
                            <SubmissionCard key={submission.id} submission={submission} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-gray-500 mb-4">
                            {searchTerm || statusFilter
                                ? 'No submissions match your filters'
                                : 'No submissions yet'}
                        </p>
                        <Button
                            onClick={() => router.push('/submissions/create')}
                            icon={<Plus className="h-5 w-5" />}
                        >
                            Create Your First Submission
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}