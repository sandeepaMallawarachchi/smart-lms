'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    GitBranch,
    TrendingUp,
    TrendingDown,
    Shield,
    Star,
    FileText,
    Clock,
    Minus,
} from 'lucide-react';

interface Version {
    version: number;
    createdAt: string;
    wordCount: number;
    plagiarismScore: number;
    aiScore: number;
    aiFeedback: string;
    answers: {
        questionId: string;
        text: string;
        wordCount: number;
    }[];
}

export default function VersionComparisonPage({ params }: { params: Promise<{ submissionId: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();

    const [version1, setVersion1] = useState(1);
    const [version2, setVersion2] = useState(4);
    const [compareMode, setCompareMode] = useState<'stats' | 'content'>('stats');

    // Hardcoded versions data
    const versions: Version[] = [
        {
            version: 1,
            createdAt: '2025-01-06 14:30',
            wordCount: 450,
            plagiarismScore: 8,
            aiScore: 72,
            aiFeedback: 'Good start, but needs more detail on implementation.',
            answers: [
                {
                    questionId: 'q1',
                    text: 'A Binary Search Tree is a data structure where each node has at most two children. The left child is smaller and the right child is larger than the parent node.',
                    wordCount: 150,
                },
                {
                    questionId: 'q2',
                    text: 'AVL trees maintain balance through rotation operations when the tree becomes unbalanced after insertion or deletion.',
                    wordCount: 180,
                },
                {
                    questionId: 'q3',
                    text: 'Hash tables use hash functions to map keys to array indices for fast lookup.',
                    wordCount: 120,
                },
            ],
        },
        {
            version: 2,
            createdAt: '2025-01-07 10:15',
            wordCount: 620,
            plagiarismScore: 7,
            aiScore: 80,
            aiFeedback: 'Much improved! Good use of examples and explanations.',
            answers: [
                {
                    questionId: 'q1',
                    text: 'A Binary Search Tree (BST) is a hierarchical data structure where each node has at most two children. The left subtree contains only nodes with values less than the parent node, while the right subtree contains nodes with values greater than the parent. This property enables efficient searching, insertion, and deletion operations with O(log n) average time complexity.',
                    wordCount: 220,
                },
                {
                    questionId: 'q2',
                    text: 'AVL trees are self-balancing BSTs that maintain a balance factor for each node, defined as the height difference between left and right subtrees. When this factor exceeds 1 or -1, the tree performs rotation operations (single or double rotations) to restore balance, ensuring O(log n) worst-case time complexity for all operations.',
                    wordCount: 240,
                },
                {
                    questionId: 'q3',
                    text: 'Hash tables provide O(1) average case lookup through hash functions that map keys to array indices. Collision resolution techniques like chaining (using linked lists) or open addressing (probing for next available slot) handle cases where multiple keys hash to the same index.',
                    wordCount: 160,
                },
            ],
        },
        {
            version: 3,
            createdAt: '2025-01-08 16:20',
            wordCount: 780,
            plagiarismScore: 6,
            aiScore: 85,
            aiFeedback: 'Excellent work! Very comprehensive coverage.',
            answers: [
                {
                    questionId: 'q1',
                    text: 'A Binary Search Tree (BST) is a fundamental data structure in computer science that organizes data hierarchically. Each node contains a value and references to at most two children. The BST property states that all values in the left subtree are less than the parent, and all values in the right subtree are greater. This ordering enables efficient operations: searching runs in O(log n) average time by eliminating half the tree at each step, similar to binary search on sorted arrays.',
                    wordCount: 280,
                },
                {
                    questionId: 'q2',
                    text: 'AVL trees, named after inventors Adelson-Velsky and Landis, are self-balancing BSTs that guarantee O(log n) worst-case performance. Each node maintains a balance factor (height of right subtree minus height of left subtree). After insertions or deletions, if any node has a balance factor outside [-1, 1], the tree performs rotations to restore balance. Four rotation types exist: left-left (single right rotation), right-right (single left rotation), left-right (double rotation), and right-left (double rotation).',
                    wordCount: 290,
                },
                {
                    questionId: 'q3',
                    text: 'Hash tables are one of the most efficient data structures for key-value storage, providing O(1) average case complexity for insertions, deletions, and lookups. A hash function converts keys into array indices deterministically. Collision handling is crucial: separate chaining uses linked lists at each index, while open addressing probes for the next available slot using linear probing, quadratic probing, or double hashing.',
                    wordCount: 210,
                },
            ],
        },
        {
            version: 4,
            createdAt: '2025-01-08 20:45',
            wordCount: 850,
            plagiarismScore: 5,
            aiScore: 88,
            aiFeedback: 'Outstanding submission! Comprehensive and well-structured.',
            answers: [
                {
                    questionId: 'q1',
                    text: 'A Binary Search Tree (BST) is a fundamental hierarchical data structure that maintains an ordered collection of elements. Each node stores a value and references to at most two children: left and right. The defining BST property ensures that all values in the left subtree are strictly less than the parent, while all values in the right subtree are strictly greater. This ordering enables efficient searching with O(log n) average time complexity by eliminating half the search space at each comparison, similar to binary search on sorted arrays. Real-world applications include implementing dictionaries, priority queues, and database indexing systems.',
                    wordCount: 300,
                },
                {
                    questionId: 'q2',
                    text: 'AVL trees represent a crucial advancement in self-balancing binary search trees, named after inventors Georgy Adelson-Velsky and Evgenii Landis. They guarantee O(log n) worst-case performance for all operations by maintaining strict balance. Each node stores a balance factor calculated as the height difference between right and left subtrees. When this factor becomes ±2 after an insertion or deletion, the tree performs rotation operations to restore balance. Four rotation scenarios exist: LL case requires single right rotation, RR case needs single left rotation, LR case demands left-then-right double rotation, and RL case requires right-then-left double rotation. This balancing overhead is worthwhile for applications requiring predictable performance.',
                    wordCount: 320,
                },
                {
                    questionId: 'q3',
                    text: 'Hash tables provide one of the most efficient solutions for key-value storage, achieving O(1) average case time complexity for insertions, deletions, and lookups. A hash function deterministically maps keys to array indices, ideally distributing entries uniformly across the table. Collision resolution is essential when multiple keys hash to the same index. Separate chaining maintains a linked list at each array position, making insertion simple but potentially degrading to O(n) for lookups if many collisions occur. Open addressing stores all entries in the array itself, probing for the next available slot using strategies like linear probing (checking sequential indices), quadratic probing (checking indices at quadratic intervals), or double hashing (using a second hash function for the probe sequence).',
                    wordCount: 230,
                },
            ],
        },
    ];

    const v1 = versions.find(v => v.version === version1) || versions[0];
    const v2 = versions.find(v => v.version === version2) || versions[versions.length - 1];

    const getDifference = (val1: number, val2: number) => {
        const diff = val2 - val1;
        return {
            value: Math.abs(diff),
            isPositive: diff > 0,
            isNegative: diff < 0,
            isNeutral: diff === 0,
        };
    };

    const wordCountDiff = getDifference(v1.wordCount, v2.wordCount);
    const plagiarismDiff = getDifference(v1.plagiarismScore, v2.plagiarismScore);
    const aiScoreDiff = getDifference(v1.aiScore, v2.aiScore);

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Submission
                </button>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                        <GitBranch className="text-purple-600" size={32} />
                        Version Comparison
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700">Compare:</label>
                            <select
                                value={version1}
                                onChange={(e) => setVersion1(Number(e.target.value))}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                            >
                                {versions.map(v => (
                                    <option key={v.version} value={v.version}>Version {v.version}</option>
                                ))}
                            </select>
                        </div>

                        <span className="text-gray-400 font-medium">vs</span>

                        <div className="flex items-center gap-3">
                            <select
                                value={version2}
                                onChange={(e) => setVersion2(Number(e.target.value))}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                            >
                                {versions.map(v => (
                                    <option key={v.version} value={v.version}>Version {v.version}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparison Mode Toggle */}
            <div className="mb-6 flex gap-2">
                <button
                    onClick={() => setCompareMode('stats')}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        compareMode === 'stats'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    Statistics Comparison
                </button>
                <button
                    onClick={() => setCompareMode('content')}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        compareMode === 'content'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    Content Comparison
                </button>
            </div>

            {compareMode === 'stats' ? (
                <div className="space-y-6">
                    {/* Overall Stats Comparison */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Overall Statistics</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Word Count */}
                            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between mb-4">
                                    <FileText className="text-blue-600" size={24} />
                                    <div className={`flex items-center gap-1 text-sm font-medium ${
                                        wordCountDiff.isPositive ? 'text-green-600' :
                                            wordCountDiff.isNegative ? 'text-red-600' :
                                                'text-gray-600'
                                    }`}>
                                        {wordCountDiff.isPositive && <TrendingUp size={16} />}
                                        {wordCountDiff.isNegative && <TrendingDown size={16} />}
                                        {wordCountDiff.isNeutral && <Minus size={16} />}
                                        {wordCountDiff.value}
                                    </div>
                                </div>
                                <p className="text-sm text-blue-700 mb-2">Word Count</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-blue-900">{v2.wordCount}</span>
                                    <span className="text-sm text-blue-600">from {v1.wordCount}</span>
                                </div>
                            </div>

                            {/* AI Score */}
                            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                                <div className="flex items-center justify-between mb-4">
                                    <Star className="text-purple-600" size={24} />
                                    <div className={`flex items-center gap-1 text-sm font-medium ${
                                        aiScoreDiff.isPositive ? 'text-green-600' :
                                            aiScoreDiff.isNegative ? 'text-red-600' :
                                                'text-gray-600'
                                    }`}>
                                        {aiScoreDiff.isPositive && <TrendingUp size={16} />}
                                        {aiScoreDiff.isNegative && <TrendingDown size={16} />}
                                        {aiScoreDiff.isNeutral && <Minus size={16} />}
                                        {aiScoreDiff.value}
                                    </div>
                                </div>
                                <p className="text-sm text-purple-700 mb-2">AI Score</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-purple-900">{v2.aiScore}</span>
                                    <span className="text-sm text-purple-600">from {v1.aiScore}</span>
                                </div>
                            </div>

                            {/* Plagiarism */}
                            <div className={`p-6 bg-gradient-to-br rounded-lg border ${
                                plagiarismDiff.isNegative || plagiarismDiff.isNeutral
                                    ? 'from-green-50 to-green-100 border-green-200'
                                    : 'from-red-50 to-red-100 border-red-200'
                            }`}>
                                <div className="flex items-center justify-between mb-4">
                                    <Shield className={plagiarismDiff.isNegative || plagiarismDiff.isNeutral ? 'text-green-600' : 'text-red-600'} size={24} />
                                    <div className={`flex items-center gap-1 text-sm font-medium ${
                                        plagiarismDiff.isNegative ? 'text-green-600' :
                                            plagiarismDiff.isPositive ? 'text-red-600' :
                                                'text-gray-600'
                                    }`}>
                                        {plagiarismDiff.isNegative && <TrendingDown size={16} />}
                                        {plagiarismDiff.isPositive && <TrendingUp size={16} />}
                                        {plagiarismDiff.isNeutral && <Minus size={16} />}
                                        {plagiarismDiff.value}%
                                    </div>
                                </div>
                                <p className={`text-sm mb-2 ${plagiarismDiff.isNegative || plagiarismDiff.isNeutral ? 'text-green-700' : 'text-red-700'}`}>
                                    Plagiarism Score
                                </p>
                                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${plagiarismDiff.isNegative || plagiarismDiff.isNeutral ? 'text-green-900' : 'text-red-900'}`}>
                    {v2.plagiarismScore}%
                  </span>
                                    <span className={`text-sm ${plagiarismDiff.isNegative || plagiarismDiff.isNeutral ? 'text-green-600' : 'text-red-600'}`}>
                    from {v1.plagiarismScore}%
                  </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline View */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Version Timeline</h2>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <div className="p-4 bg-purple-50 border-2 border-purple-500 rounded-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-purple-900">Version {v1.version}</h3>
                                        <Clock className="text-purple-600" size={20} />
                                    </div>
                                    <p className="text-sm text-purple-700 mb-4">
                                        {new Date(v1.createdAt).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Word Count:</span>
                                            <span className="font-bold text-gray-900">{v1.wordCount}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">AI Score:</span>
                                            <span className="font-bold text-gray-900">{v1.aiScore}/100</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Plagiarism:</span>
                                            <span className="font-bold text-gray-900">{v1.plagiarismScore}%</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 p-3 bg-purple-100 rounded">
                                        <p className="text-xs text-purple-800">{v1.aiFeedback}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-green-900">Version {v2.version}</h3>
                                        <Clock className="text-green-600" size={20} />
                                    </div>
                                    <p className="text-sm text-green-700 mb-4">
                                        {new Date(v2.createdAt).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Word Count:</span>
                                            <span className="font-bold text-gray-900">{v2.wordCount}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">AI Score:</span>
                                            <span className="font-bold text-gray-900">{v2.aiScore}/100</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Plagiarism:</span>
                                            <span className="font-bold text-gray-900">{v2.plagiarismScore}%</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 p-3 bg-green-100 rounded">
                                        <p className="text-xs text-green-800">{v2.aiFeedback}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Improvement Summary */}
                    <div className={`p-6 rounded-lg border-2 ${
                        aiScoreDiff.isPositive
                            ? 'bg-green-50 border-green-500'
                            : aiScoreDiff.isNegative
                                ? 'bg-red-50 border-red-500'
                                : 'bg-gray-50 border-gray-300'
                    }`}>
                        <div className="flex items-start gap-4">
                            {aiScoreDiff.isPositive && <TrendingUp className="text-green-600" size={32} />}
                            {aiScoreDiff.isNegative && <TrendingDown className="text-red-600" size={32} />}
                            {aiScoreDiff.isNeutral && <Minus className="text-gray-600" size={32} />}
                            <div>
                                <h3 className={`text-xl font-bold mb-2 ${
                                    aiScoreDiff.isPositive ? 'text-green-900' :
                                        aiScoreDiff.isNegative ? 'text-red-900' :
                                            'text-gray-900'
                                }`}>
                                    {aiScoreDiff.isPositive && 'Great Improvement!'}
                                    {aiScoreDiff.isNegative && 'Quality Decreased'}
                                    {aiScoreDiff.isNeutral && 'No Change in Quality'}
                                </h3>
                                <p className={`text-sm ${
                                    aiScoreDiff.isPositive ? 'text-green-700' :
                                        aiScoreDiff.isNegative ? 'text-red-700' :
                                            'text-gray-700'
                                }`}>
                                    {aiScoreDiff.isPositive && `Your work has improved by ${aiScoreDiff.value} points. Keep up the excellent work!`}
                                    {aiScoreDiff.isNegative && `Quality decreased by ${aiScoreDiff.value} points. Review the feedback and try again.`}
                                    {aiScoreDiff.isNeutral && 'The quality remains the same between these versions.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Content Comparison */
                <div className="space-y-6">
                    {v1.answers.map((answer1, index) => {
                        const answer2 = v2.answers[index];
                        return (
                            <div key={answer1.questionId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Question {index + 1}</h3>

                                <div className="grid grid-cols-2 gap-6">
                                    {/* Version 1 */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-medium text-purple-600">Version {v1.version}</span>
                                            <span className="text-xs text-gray-500">{answer1.wordCount} words</span>
                                        </div>
                                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer1.text}</p>
                                        </div>
                                    </div>

                                    {/* Version 2 */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-medium text-green-600">Version {v2.version}</span>
                                            <span className="text-xs text-gray-500">{answer2.wordCount} words</span>
                                        </div>
                                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer2.text}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Word Count Change */}
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-center gap-2">
                                    {answer2.wordCount > answer1.wordCount ? (
                                        <>
                                            <TrendingUp className="text-green-600" size={16} />
                                            <span className="text-sm font-medium text-green-700">
                        Added {answer2.wordCount - answer1.wordCount} words
                      </span>
                                        </>
                                    ) : answer2.wordCount < answer1.wordCount ? (
                                        <>
                                            <TrendingDown className="text-red-600" size={16} />
                                            <span className="text-sm font-medium text-red-700">
                        Removed {answer1.wordCount - answer2.wordCount} words
                      </span>
                                        </>
                                    ) : (
                                        <>
                                            <Minus className="text-gray-600" size={16} />
                                            <span className="text-sm font-medium text-gray-700">No change in word count</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
