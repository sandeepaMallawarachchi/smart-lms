'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { useAssignments } from '@/hooks/useSubmissions';

export default function SubmitAssignmentPage() {
    const router = useRouter();
    const [selectedAssignmentId, setSelectedAssignmentId] = useState('');

    const { data: assignments, loading, error } = useAssignments({ status: 'OPEN' });

    const handleContinue = () => {
        if (selectedAssignmentId) {
            router.push(`/submissions/student/answer/${selectedAssignmentId}`);
        }
    };

    const renderOptions = () => {
        if (loading) return <option disabled>Loading assignments…</option>;
        if (error || !assignments?.length) return <option value="">No open assignments available</option>;
        return (
            <>
                <option value="">Choose an assignment…</option>
                {assignments.map((a) => {
                    const prefix = a.assignmentType === 'project' ? '[Project] ' : a.assignmentType === 'task' ? '[Task] ' : '';
                    return (
                        <option key={a.id} value={a.id}>
                            {prefix}{a.title} – {a.moduleName ?? a.moduleCode}
                            {a.dueDate ? ` (Due: ${new Date(a.dueDate).toLocaleDateString()})` : ''}
                        </option>
                    );
                })}
            </>
        );
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
            >
                <ArrowLeft size={20} />
                Back
            </button>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">Start Assignment</h1>
            <p className="text-gray-500 mb-8">Select an assignment to begin typing your answers.</p>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FileText size={16} className="text-purple-600" />
                        Assignment
                    </label>
                    <select
                        value={selectedAssignmentId}
                        onChange={(e) => setSelectedAssignmentId(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        {renderOptions()}
                    </select>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <button
                    onClick={handleContinue}
                    disabled={!selectedAssignmentId}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold cursor-pointer"
                >
                    Continue to Answer
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
}
