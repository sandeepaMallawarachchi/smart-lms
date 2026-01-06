'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ProjectTaskChatbot from '../projects-and-tasks/student/ProjectTaskChatbot';
import AnalyticsChatbot from '../learning-analytics/student/AnalyticsChatbot';

export default function ChatbotWidget() {
  const pathname = usePathname();
  const [showProjectTask, setShowProjectTask] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    // Check if on projects-and-tasks pages
    if (pathname?.includes('/projects-and-tasks')) {
      setShowProjectTask(true);
      setShowAnalytics(false);
    }
    // Check if on learning-analytics pages
    else if (pathname?.includes('/learning-analytics')) {
      setShowAnalytics(true);
      setShowProjectTask(false);
    }
    // Default: show both or none based on your preference
    else {
      setShowProjectTask(false);
      setShowAnalytics(false);
    }
  }, [pathname]);

  return (
    <>
      {showProjectTask && <ProjectTaskChatbot />}
      {showAnalytics && <AnalyticsChatbot />}
    </>
  );
}