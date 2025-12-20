'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/it22586766/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/it22586766/ui/Card';
import { Button } from '@/components/it22586766/ui/Button';
import { Input } from '@/components/it22586766/ui/Input';
import { Textarea } from '@/components/it22586766/ui/Textarea';
import { Select } from '@/components/it22586766/ui/Select';
import { submissionService } from '@/lib/it22586766/api/services/submission.service';
import { useAuthStore } from '@/store/it22586766/useAuthStore';
import { SubmissionType } from '@/types/it22586766';
import toast from 'react-hot-toast';

export default function CreateSubmissionPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignmentId: '',
        assignmentTitle: '',
        submissionType: '' as SubmissionType,
        dueDate: '',
        maxGrade: '',
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast.error('You must be logged in');
            return;
        }

        try {
            setLoading(true);
            const response = await submissionService.create({
                ...formData,
                studentId: user.id,
                studentName: user.name,
                maxGrade: formData.maxGrade ? parseFloat(formData.maxGrade) : undefined,
            });

            toast.success('Submission created successfully');
            router.push(`/submissions/${response.data.id}`);
        } catch (error) {
            toast.error('Failed to create submission');
            console.error('Error creating submission:', error);
        } finally {
            setLoading(false);
        }
    };

    const submissionTypeOptions = [
        { value: '', label: 'Select type' },
        { value: 'ASSIGNMENT', label: 'Assignment' },
        { value: 'PROJECT', label: 'Project' },
        { value: 'LAB', label: 'Lab' },
        { value: 'ESSAY', label: 'Essay' },
        { value: 'CODE', label: 'Code' },
        { value: 'PRESENTATION', label: 'Presentation' },
        { value: 'OTHER', label: 'Other' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<ArrowLeft className="h-4 w-4" />}
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    Back
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Create New Submission</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                label="Title *"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                placeholder="Enter submission title"
                            />

                            <Textarea
                                label="Description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Describe your submission"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Assignment ID"
                                    name="assignmentId"
                                    value={formData.assignmentId}
                                    onChange={handleChange}
                                    placeholder="e.g., CS101-A1"
                                />

                                <Input
                                    label="Assignment Title"
                                    name="assignmentTitle"
                                    value={formData.assignmentTitle}
                                    onChange={handleChange}
                                    placeholder="e.g., Data Structures"
                                />
                            </div>

                            <Select
                                label="Submission Type *"
                                name="submissionType"
                                value={formData.submissionType}
                                onChange={handleChange}
                                options={submissionTypeOptions}
                                required
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Due Date"
                                    name="dueDate"
                                    type="datetime-local"
                                    value={formData.dueDate}
                                    onChange={handleChange}
                                />

                                <Input
                                    label="Max Grade"
                                    name="maxGrade"
                                    type="number"
                                    step="0.1"
                                    value={formData.maxGrade}
                                    onChange={handleChange}
                                    placeholder="e.g., 100"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" loading={loading}>
                                    Create Submission
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}