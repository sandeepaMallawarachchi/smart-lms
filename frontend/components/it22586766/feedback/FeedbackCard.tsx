'use client';

import React from 'react';
import { Feedback } from '@/types/it22586766';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/it22586766/ui/Card';
import { Badge } from '@/components/it22586766/ui/Badge';
import { Brain, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/it22586766/utils';

interface FeedbackCardProps {
    feedback: Feedback;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback }) => {
    const getStatusVariant = (status: string) => {
        const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
            PENDING: 'default',
            GENERATING: 'info',
            COMPLETED: 'success',
            FAILED: 'danger',
            REVIEWED: 'success',
            PUBLISHED: 'success',
        };
        return variants[status] || 'default';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <CardTitle>AI Feedback</CardTitle>
                    <div className="flex items-center gap-2">
                        {feedback.isAiGenerated && (
                            <Badge variant="info" size="sm">
                                <Brain className="h-3 w-3 mr-1" />
                                AI Generated
                            </Badge>
                        )}
                        {feedback.cacheHit && (
                            <Badge variant="success" size="sm">Cached</Badge>
                        )}
                        <Badge variant={getStatusVariant(feedback.status)}>
                            {feedback.status}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatRelativeTime(feedback.createdAt)}
                    </div>
                    {feedback.generationTimeMs && (
                        <div>Generated in {(feedback.generationTimeMs / 1000).toFixed(2)}s</div>
                    )}
                    {feedback.modelUsed && (
                        <div>Model: {feedback.modelUsed}</div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {feedback.overallScore !== undefined && feedback.maxScore && (
                    <div className="mb-4 p-4 bg-primary-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Overall Score</span>
                            <span className="text-2xl font-bold text-primary-600">
                {feedback.overallScore.toFixed(1)} / {feedback.maxScore}
              </span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary-600 rounded-full"
                                style={{
                                    width: `${(feedback.overallScore / feedback.maxScore) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                )}

                {feedback.overallFeedback && (
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Overall Feedback
                        </h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {feedback.overallFeedback}
                        </p>
                    </div>
                )}

                {feedback.criterionFeedbacks.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900">
                            Criterion-by-Criterion Feedback
                        </h4>
                        {feedback.criterionFeedbacks.map((criterion) => (
                            <div
                                key={criterion.id}
                                className="border border-gray-200 rounded-lg p-4"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h5 className="font-medium text-gray-900">
                                            {criterion.criterionName}
                                        </h5>
                                        {criterion.criterionDescription && (
                                            <p className="text-xs text-gray-600 mt-1">
                                                {criterion.criterionDescription}
                                            </p>
                                        )}
                                    </div>
                                    {criterion.score !== undefined && criterion.maxScore && (
                                        <div className="text-right">
                      <span className="text-lg font-semibold text-gray-900">
                        {criterion.score.toFixed(1)}
                      </span>
                                            <span className="text-sm text-gray-600">
                        /{criterion.maxScore}
                      </span>
                                        </div>
                                    )}
                                </div>

                                {criterion.feedbackText && (
                                    <p className="text-sm text-gray-700 mb-3">
                                        {criterion.feedbackText}
                                    </p>
                                )}

                                {criterion.strengths && (
                                    <div className="mb-2">
                                        <div className="flex items-start">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs font-medium text-green-900">Strengths</p>
                                                <p className="text-sm text-gray-700">{criterion.strengths}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {criterion.improvements && (
                                    <div className="mb-2">
                                        <div className="flex items-start">
                                            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs font-medium text-orange-900">Areas for Improvement</p>
                                                <p className="text-sm text-gray-700">{criterion.improvements}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {criterion.suggestions && (
                                    <div>
                                        <div className="flex items-start">
                                            <Brain className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs font-medium text-blue-900">Suggestions</p>
                                                <p className="text-sm text-gray-700">{criterion.suggestions}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};