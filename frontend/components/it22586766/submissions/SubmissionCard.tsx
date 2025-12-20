'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, FileText, AlertCircle } from 'lucide-react';
import { Submission } from '@/types/it22586766';
import { Card, CardContent } from '@/components/it22586766/ui/Card';
import { Badge } from '@/components/it22586766/ui/Badge';
import { Button } from '@/components/it22586766/ui/Button';
import { formatRelativeTime, getStatusColor } from '@/lib/it22586766/utils';

interface SubmissionCardProps {
    submission: Submission;
}

export const SubmissionCard: React.FC<SubmissionCardProps> = ({ submission }) => {
    const router = useRouter();

    const getStatusVariant = (status: string) => {
        const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
            DRAFT: 'default',
            SUBMITTED: 'info',
            UNDER_REVIEW: 'warning',
            GRADED: 'success',
            RETURNED: 'warning',
            RESUBMITTED: 'info',
        };
        return variants[status] || 'default';
    };

    return (
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {submission.title}
                        </h3>
                        {submission.assignmentTitle && (
                            <p className="text-sm text-gray-600 mb-2">
                                Assignment: {submission.assignmentTitle}
                            </p>
                        )}
                        {submission.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                                {submission.description}
                            </p>
                        )}
                    </div>
                    <Badge variant={getStatusVariant(submission.status)}>
                        {submission.status.replace('_', ' ')}
                    </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                        <FileText className="h-4 w-4 mr-2" />
                        <span>{submission.fileCount} file(s)</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>v{submission.versionNumber}</span>
                    </div>
                    {submission.dueDate && (
                        <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Due {formatRelativeTime(submission.dueDate)}</span>
                        </div>
                    )}
                    {submission.grade !== undefined && submission.grade !== null && (
                        <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">
                Grade: {submission.grade}/{submission.maxGrade}
              </span>
                        </div>
                    )}
                </div>

                {submission.isLate && (
                    <div className="flex items-center text-sm text-red-600 mb-4">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span>Submitted late</span>
                    </div>
                )}

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={() => router.push(`/submissions/${submission.id}`)}
                    >
                        View Details
                    </Button>
                    {submission.status === 'DRAFT' && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/submissions/${submission.id}/edit`);
                            }}
                        >
                            Edit
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};