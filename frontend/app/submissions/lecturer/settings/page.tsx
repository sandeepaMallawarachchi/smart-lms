'use client';

import React, { useState } from 'react';
import {
    Clock,
    FileText,
    Save,
    Settings,
    Shield,
    Star,
    Upload,
} from 'lucide-react';
import {
    PageHeader,
    SectionCard,
} from '@/components/submissions/lecturer/PageShell';

/* ─── Defaults ─────────────────────────────────────────────── */

const STORAGE_KEY = 'smart-lms:submission-settings';

interface SubmissionSettings {
    plagiarismThreshold: number;
    enableAIFeedback: boolean;
    allowLateSubmissions: boolean;
    latePenaltyPerDay: number;
    maxFileSizeMB: number;
    allowedFileTypes: string;
    defaultDueDays: number;
}

const DEFAULTS: SubmissionSettings = {
    plagiarismThreshold: 20,
    enableAIFeedback: true,
    allowLateSubmissions: true,
    latePenaltyPerDay: 10,
    maxFileSizeMB: 10,
    allowedFileTypes: '.pdf,.docx,.zip,.py,.java,.js,.ts',
    defaultDueDays: 14,
};

function loadSettings(): SubmissionSettings {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
        return DEFAULTS;
    }
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function LecturerSettingsPage() {
    const [settings, setSettings] = useState<SubmissionSettings>(loadSettings);
    const [saved, setSaved] = useState(false);

    const update = <K extends keyof SubmissionSettings>(key: K, value: SubmissionSettings[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleReset = () => {
        setSettings(DEFAULTS);
        localStorage.removeItem(STORAGE_KEY);
        setSaved(false);
    };

    return (
        <div>
            <PageHeader
                title="Settings"
                subtitle="Default preferences for the submission system"
                icon={Settings}
                iconColor="text-gray-600"
            />

            <div className="max-w-3xl space-y-6 mt-2">
                {/* Plagiarism */}
                <SectionCard title="Plagiarism Detection" icon={Shield} iconColor="text-red-600">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Default Flag Threshold (%)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Submissions above this similarity score will be flagged automatically.
                            </p>
                            <input
                                type="number"
                                value={settings.plagiarismThreshold}
                                onChange={(e) => update('plagiarismThreshold', parseInt(e.target.value) || 0)}
                                min={0}
                                max={100}
                                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* AI Feedback */}
                <SectionCard title="AI-Assisted Feedback" icon={Star} iconColor="text-purple-600">
                    <ToggleRow
                        label="Enable AI Feedback"
                        desc="Provide instant feedback to students while they write answers"
                        checked={settings.enableAIFeedback}
                        onChange={(v) => update('enableAIFeedback', v)}
                    />
                </SectionCard>

                {/* Late Submission */}
                <SectionCard title="Late Submission Policy" icon={Clock} iconColor="text-blue-600">
                    <div className="space-y-4">
                        <ToggleRow
                            label="Allow Late Submissions"
                            desc="Students can submit after the deadline with a penalty"
                            checked={settings.allowLateSubmissions}
                            onChange={(v) => update('allowLateSubmissions', v)}
                        />
                        {settings.allowLateSubmissions && (
                            <div className="ml-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Penalty per day (%)</label>
                                <input
                                    type="number"
                                    value={settings.latePenaltyPerDay}
                                    onChange={(e) => update('latePenaltyPerDay', parseInt(e.target.value) || 0)}
                                    min={0}
                                    max={100}
                                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* File Uploads */}
                <SectionCard title="File Upload Defaults" icon={Upload} iconColor="text-green-600">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max File Size (MB)</label>
                            <input
                                type="number"
                                value={settings.maxFileSizeMB}
                                onChange={(e) => update('maxFileSizeMB', parseInt(e.target.value) || 1)}
                                min={1}
                                max={100}
                                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Allowed File Types</label>
                            <p className="text-xs text-gray-500 mb-2">Comma-separated list of extensions</p>
                            <input
                                type="text"
                                value={settings.allowedFileTypes}
                                onChange={(e) => update('allowedFileTypes', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* Assignment Defaults */}
                <SectionCard title="Assignment Defaults" icon={FileText} iconColor="text-blue-600">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Due Period (days)</label>
                        <p className="text-xs text-gray-500 mb-2">When creating a new assignment the due date will default to this many days from today.</p>
                        <input
                            type="number"
                            value={settings.defaultDueDays}
                            onChange={(e) => update('defaultDueDays', parseInt(e.target.value) || 1)}
                            min={1}
                            max={365}
                            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </SectionCard>

                {/* Actions */}
                <div className="flex items-center gap-3 pb-8">
                    <button
                        onClick={handleSave}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm cursor-pointer"
                    >
                        <Save size={16} /> Save Settings
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm cursor-pointer"
                    >
                        Reset to Defaults
                    </button>
                    {saved && (
                        <span className="text-sm text-green-600 font-medium animate-pulse">Saved!</span>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Toggle Row ───────────────────────────────────────────── */

function ToggleRow({ label, desc, checked, onChange }: {
    label: string;
    desc: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
                <p className="font-medium text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
        </div>
    );
}
