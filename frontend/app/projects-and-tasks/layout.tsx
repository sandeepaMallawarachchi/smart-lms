import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smart LMS - Projects & Tasks',
  description: 'Project & Task Management Module',
};

export default function ProjectsAndTasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}