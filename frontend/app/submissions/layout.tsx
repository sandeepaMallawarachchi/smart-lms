import ModuleLayout from '@/components/CommonForAll/ModuleLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Smart LMS - Submission System',
    description: 'Smart Submission System with AI Feedback & Plagiarism Detection',
};

export default function SubmissionsLayout({
                                              children,
                                          }: {
    children: React.ReactNode;
}) {
    return <ModuleLayout>{children}</ModuleLayout>;
}