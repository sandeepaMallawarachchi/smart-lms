'use client';

import React from 'react';
import { Version } from '@/types/it22586766';
import { formatRelativeTime } from '@/lib/it22586766/utils';
import { GitBranch, User, Clock } from 'lucide-react';

interface VersionTimelineProps {
    versions: Version[];
    currentVersionId?: number;
    onVersionClick: (version: Version) => void;
}

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
                                                                    versions,
                                                                    currentVersionId,
                                                                    onVersionClick,
                                                                }) => {
    return (
        <div className="space-y-4">
            {versions.map((version, index) => (
                <div
                    key={version.id}
                    className={`relative pl-8 pb-8 ${
                        index === versions.length - 1 ? 'pb-0' : ''
                    }`}
                >
                    {/* Timeline line */}
                    {index < versions.length - 1 && (
                        <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-200" />
                    )}

                    {/* Timeline dot */}
                    <div
                        className={`absolute left-0 top-1 h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                            version.id === currentVersionId
                                ? 'bg-primary-600 border-primary-600'
                                : version.isSnapshot
                                    ? 'bg-yellow-400 border-yellow-400'
                                    : 'bg-white border-gray-300'
                        }`}
                    >
                        {version.isSnapshot && (
                            <GitBranch className="h-3 w-3 text-white" />
                        )}
                    </div>

                    {/* Version card */}
                    <div
                        onClick={() => onVersionClick(version)}
                        className={`ml-4 p-4 bg-white border rounded-lg cursor-pointer transition-shadow hover:shadow-md ${
                            version.id === currentVersionId
                                ? 'border-primary-500 shadow-sm'
                                : 'border-gray-200'
                        }`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h4 className="font-semibold text-gray-900">
                                    Version {version.versionNumber}
                                    {version.isSnapshot && (
                                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Snapshot
                    </span>
                                    )}
                                </h4>
                                {version.commitMessage && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {version.commitMessage}
                                    </p>
                                )}
                            </div>
                            <span className="text-xs text-gray-500 uppercase px-2 py-1 bg-gray-100 rounded">
                {version.triggerType.replace('_', ' ')}
              </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                <span>{formatRelativeTime(version.createdAt)}</span>
                            </div>
                            {version.createdBy && (
                                <div className="flex items-center">
                                    <User className="h-4 w-4 mr-2" />
                                    <span>{version.createdBy}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 text-xs text-gray-500">
                            {version.totalFiles} file(s) • {version.changesSummary || 'No changes summary'}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};