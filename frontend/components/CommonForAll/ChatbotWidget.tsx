'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ProjectTaskChatbot from '../projects-and-tasks/student/ProjectTaskChatbot';
import AnalyticsChatbot from '../learning-analytics/student/AnalyticsChatbot';

export default function ChatbotWidget() {
  const pathname = usePathname();
  const [showProjectTask, setShowProjectTask] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isStudent, setIsStudent] = useState(false);

  // Check role from localStorage (set during auth verification)
  useEffect(() => {
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
    setIsStudent(role === 'student');
  }, []);

  useEffect(() => {
    // Only show on learning-analytics and projects-and-tasks pages
    if (pathname?.includes('/projects-and-tasks')) {
      setShowProjectTask(true);
      setShowAnalytics(false);
    } else if (pathname?.includes('/learning-analytics')) {
      setShowAnalytics(true);
      setShowProjectTask(false);
    } else {
      setShowProjectTask(false);
      setShowAnalytics(false);
    }
  }, [pathname]);

  // Only render for students
  if (!isStudent) return null;

  return (
    <>
      {showProjectTask && <ProjectTaskChatbot />}
      {showAnalytics && <AnalyticsChatbot />}
    </>
  );
}