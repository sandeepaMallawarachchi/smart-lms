import ModuleLayout from '@/components/CommonForAll/ModuleLayout';
import type { Metadata } from 'next';
import React, {ReactNode} from "react";

export const metadata: Metadata = {
    title: 'Smart LMS - Submission System',
    description: 'Smart Submission System with AI Feedback & Plagiarism Detection',
};

export default function SubmissionsLayout({
                                              children,
                                          }: {
    children: ReactNode;
}) {
    return <ModuleLayout>{children}</ModuleLayout>;
}