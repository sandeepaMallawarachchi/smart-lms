import ChatbotWidget from '@/components/CommonForAll/ChatbotWidget';
import ModuleLayout from '@/components/CommonForAll/ModuleLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smart LMS - Projects & Tasks',
  description: 'Project & Task Management Module',
};

export default function ProjectsTasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleLayout>
      {children}
      <ChatbotWidget />
    </ModuleLayout>
  )
}