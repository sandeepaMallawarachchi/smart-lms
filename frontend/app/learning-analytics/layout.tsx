import ChatbotWidget from '@/components/CommonForAll/ChatbotWidget';
import FloatingNavMenu from '@/components/CommonForAll/FloatingNavMenu';
import ModuleLayout from '@/components/CommonForAll/ModuleLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smart LMS - Learning Analytics',
  description: 'Learning Analytics & Predictions Module',
};

export default function LearningAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleLayout>
      {children}
      <FloatingNavMenu />
      <ChatbotWidget />
    </ModuleLayout>
  )
}