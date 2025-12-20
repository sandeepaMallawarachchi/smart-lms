'use client';

import React from 'react';
import { PlagiarismCheck } from '@/types/it22586766';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/it22586766/ui/Card';
import { Badge } from '@/components/it22586766/ui/Badge';
import { AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { formatRelativeTime, getSimilarityColor } from '@/lib/it22586766/utils';

interface PlagiarismReportProps {
    check: PlagiarismCheck;
}

export const PlagiarismReport: React.FC<PlagiarismReportProps> = ({ check }) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <CardTitle>Plagiarism Check Report</CardTitle>
                    <div className="flex items-center gap-2">
                        {check.flagged ? (
                            <Badge variant="danger">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Flagged
                            </Badge>
                        ) : (
                            <Badge variant="success">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Clear
                            </Badge>
                        )}
                        <Badge variant="info">{check.checkType.replace('_', ' ')}</Badge>
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatRelativeTime(check.createdAt)}
                    </div>
                    {check.checkDurationMs && (
                        <div>Completed in {(check.checkDurationMs / 1000).toFixed(2)}s</div>
                    )}
                    <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        {check.filesChecked} file(s) checked
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Similarity Score Overview */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Overall Similarity</p>
                        <p
                            className={`text-3xl font-bold ${getSimilarityColor(
                                check.overallSimilarityScore || 0
                            )}`}
                        >
                            {((check.overallSimilarityScore || 0) * 100).toFixed(1)}%
                        </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Max Similarity</p>
                        <p
                            className={`text-3xl font-bold ${getSimilarityColor(
                                check.maxSimilarityScore || 0
                            )}`}
                        >
                            {((check.maxSimilarityScore || 0) * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>

                {/* Summary */}
                {check.summary && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900">{check.summary}</p>
                    </div>
                )}

                {/* Similarity Matches */}
                {check.matches.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900">
                            Similarity Matches ({check.matchesFound})
                        </h4>
                        {check.matches.map((match) => (
                            <div
                                key={match.id}
                                className="border border-gray-200 rounded-lg p-4"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {match.matchedStudentId || `Submission ${match.matchedSubmissionId}`}
                                        </p>
                                        {match.fileName && (
                                            <p className="text-xs text-gray-600">
                                                File: {match.fileName}
                                                {match.matchedFileName && ` ↔ ${match.matchedFileName}`}
                                            </p>
                                        )}
                                    </div>
                                    <span
                                        className={`text-lg font-bold ${getSimilarityColor(
                                            match.similarityScore
                                        )}`}
                                    >
                    {(match.similarityScore * 100).toFixed(1)}%
                  </span>
                                </div>

                                {match.matchingLines && match.totalLines && (
                                    <div className="text-sm text-gray-600 mb-2">
                                        {match.matchingLines} / {match.totalLines} lines matched
                                    </div>
                                )}

                                {match.tokensMatched && (
                                    <div className="text-sm text-gray-600 mb-2">
                                        {match.tokensMatched} tokens matched
                                    </div>
                                )}

                                {match.details && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                                        {match.details}
                                    </div>
                                )}

                                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${
                                            match.similarityScore >= 0.8
                                                ? 'bg-red-600'
                                                : match.similarityScore >= 0.6
                                                    ? 'bg-orange-600'
                                                    : match.similarityScore >= 0.4
                                                        ? 'bg-yellow-600'
                                                        : 'bg-green-600'
                                        }`}
                                        style={{
                                            width: `${match.similarityScore * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {check.matches.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p>No significant similarities detected</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};