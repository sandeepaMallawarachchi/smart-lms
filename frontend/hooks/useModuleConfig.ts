'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { 
  projectsTasksConfig, 
  updateConfigWithCourses, 
  CoursesApiResponse 
} from '@/components/CommonForAll/configs/projectsTasksConfig'
import { learningAnalyticsConfig } from '@/components/CommonForAll/configs/learningAnalyticsConfig'
import { submissionsConfig } from '@/components/CommonForAll/configs/submissionsConfig'

type UserRole = 'student' | 'lecture' | 'superadmin'

export function useModuleConfig(userRole: UserRole) {
  const pathname = usePathname()
  const currentModule = pathname.includes('/projects-and-tasks')
    ? 'projects-tasks'
    : pathname.includes('/learning-analytics')
    ? 'learning-analytics'
    : pathname.includes('/submissions')
    ? 'submissions'
    : null

  const getBaseConfig = () => {
    if (userRole === 'superadmin') return null

    if (currentModule === 'projects-tasks') {
      return projectsTasksConfig[userRole]
    } else if (currentModule === 'learning-analytics') {
      return learningAnalyticsConfig[userRole]
    } else if (currentModule === 'submissions') {
      return submissionsConfig[userRole]
    }
    return null
  }

  const [config, setConfig] = useState(getBaseConfig())

  useEffect(() => {
    const base = getBaseConfig()
    setConfig(base)

    if (currentModule === 'projects-tasks' && userRole === 'student') {
      let isMounted = true

      const fetchCourses = async () => {
        try {
          const token = localStorage.getItem('authToken')

          if (!token) {
              window.location.href = '/login'
              return
          }

          const response = await fetch('/api/student/get-courses', {
             headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
          })

          console.log("response courses", response)

          if (!response.ok) return

          const result: CoursesApiResponse = await response.json()

          if (isMounted && result.success && result.data.courses) {
            const updatedFullConfig = updateConfigWithCourses(projectsTasksConfig, result.data.courses)
            setConfig(updatedFullConfig.student)
          }
        } catch (error) {
          console.error('Failed to fetch sidebar courses:', error)
        }
      }

      fetchCourses()

      return () => {
        isMounted = false
      }
    }
  }, [pathname, userRole, currentModule])

  if (userRole === 'superadmin') {
    return {
      currentModule: null,
      headerConfig: null,
      sidebarConfig: null,
    }
  }

  return {
    currentModule,
    headerConfig: config?.header || null,
    sidebarConfig: config?.sidebar || null,
  }
}