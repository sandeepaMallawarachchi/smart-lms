import FloatingNavMenu from '@/components/CommonForAll/FloatingNavMenu';
import ModuleLayout from '@/components/CommonForAll/ModuleLayout';
import SubmissionNotificationBell from '@/components/submissions/SubmissionNotificationBell';
import type { Metadata } from 'next';
import React, { ReactNode } from "react";

export const metadata: Metadata = {
    title: 'Smart LMS - Submission System',
    description: 'Smart Submission System with AI Feedback & Plagiarism Detection',
};

export default function SubmissionsLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <ModuleLayout>
            {/* Notification bell in top-right */}
            <div className="fixed top-4 right-6 z-50">
                <SubmissionNotificationBell />
            </div>
            {children}
            <FloatingNavMenu />
        </ModuleLayout>
    );
}