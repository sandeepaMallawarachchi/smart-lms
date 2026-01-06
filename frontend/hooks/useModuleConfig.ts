import { usePathname } from 'next/navigation';
import { projectsTasksConfig } from '@/components/CommonForAll/configs/projectsTasksConfig';
import { learningAnalyticsConfig } from '@/components/CommonForAll/configs/learningAnalyticsConfig';
import {submissionsConfig} from "@/components/CommonForAll/configs/submissionsConfig";

type UserRole = 'student' | 'lecture' | 'superadmin';

export function useModuleConfig(userRole: UserRole) {
  const pathname = usePathname();
  
  // Return null for superadmin (they use unified config)
  if (userRole === 'superadmin') {
    return {
      currentModule: null,
      headerConfig: null,
      sidebarConfig: null,
    };
  }

  // Determine which module we're in based on the pathname
  const currentModule = pathname.includes('/projects-and-tasks') 
    ? 'projects-tasks' 
    : pathname.includes('/learning-analytics')
    ? 'learning-analytics'
          : pathname.includes('/submissions')
  ? 'submissions'
    : null;

  // Get the appropriate config
  const getConfig = () => {
    if (currentModule === 'projects-tasks') {
      return projectsTasksConfig[userRole];
    } else if (currentModule === 'learning-analytics') {
      return learningAnalyticsConfig[userRole];
    }else if (currentModule === 'submissions') {
      return submissionsConfig[userRole];
    }
    return null;
  };

  const config = getConfig();

  return {
    currentModule,
    headerConfig: config?.header || null,
    sidebarConfig: config?.sidebar || null,
  };
}