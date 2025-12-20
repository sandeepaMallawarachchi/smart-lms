'use client';

import React from 'react';
import { FileDiff, DiffLine } from '@/types/it22586766';
import { Plus, Minus, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/it22586766/ui/Card';

interface DiffViewerProps {
    fileDiffs: FileDiff[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ fileDiffs }) => {
    const getDiffLineClass = (type: string) => {
        switch (type) {
            case 'ADDED':
                return 'bg-green-50 text-green-900';
            case 'DELETED':
                return 'bg-red-50 text-red-900';
            case 'UNCHANGED':
            case 'CONTEXT':
                return 'bg-white text-gray-700';
            default:
                return 'bg-white text-gray-700';
        }
    };

    const getDiffIcon = (type: string) => {
        switch (type) {
            case 'ADDED':
                return <Plus className="h-4 w-4 text-green-600" />;
            case 'DELETED':
                return <Minus className="h-4 w-4 text-red-600" />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {fileDiffs.map((fileDiff, index) => (
                <Card key={index}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-gray-400" />
                                <CardTitle className="text-base">{fileDiff.filePath}</CardTitle>
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                                <span className="text-green-600">+{fileDiff.linesAdded}</span>
                                <span className="text-red-600">-{fileDiff.linesDeleted}</span>
                                {fileDiff.linesModified > 0 && (
                                    <span className="text-blue-600">~{fileDiff.linesModified}</span>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm font-mono">
                                <tbody>
                                {fileDiff.diffLines.map((line, lineIndex) => (
                                    <tr
                                        key={lineIndex}
                                        className={getDiffLineClass(line.type)}
                                    >
                                        <td className="w-12 px-2 py-1 text-right text-gray-500 select-none border-r border-gray-200">
                                            {line.lineNumber}
                                        </td>
                                        <td className="w-8 px-2 py-1 text-center">
                                            {getDiffIcon(line.type)}
                                        </td>
                                        <td className="px-2 py-1">
                                            <pre className="whitespace-pre-wrap">{line.content}</pre>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};