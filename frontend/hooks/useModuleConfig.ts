'use client'

import { useState, useEffect, useMemo } from 'react'
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

  const baseConfig = useMemo(() => {
    if (userRole === 'superadmin') return null

    if (currentModule === 'projects-tasks') {
      return projectsTasksConfig[userRole]
    } else if (currentModule === 'learning-analytics') {
      return learningAnalyticsConfig[userRole]
    } else if (currentModule === 'submissions') {
      return submissionsConfig[userRole]
    }
    return null
  }, [userRole, currentModule])

  const [config, setConfig] = useState(baseConfig)

  useEffect(() => {
    setConfig(baseConfig)
  }, [baseConfig])

  useEffect(() => {

    if (currentModule === 'submissions' && userRole !== 'superadmin') {
      let isMounted = true

      const SUBMISSION_API = process.env.NEXT_PUBLIC_SUBMISSION_API_URL ?? 'http://localhost:8081'
      const PLAGIARISM_API = process.env.NEXT_PUBLIC_PLAGIARISM_API_URL ?? 'http://localhost:8084'
      const token = localStorage.getItem('authToken')
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

      const fetchBadges = async () => {
        if (!baseConfig) return

        try {
          if (userRole === 'student') {
            // Decode userId from JWT
            let userId = ''
            if (token) {
              try {
                const payload = JSON.parse(atob(token.split('.')[1]))
                userId = String(payload.userId ?? payload.sub ?? '')
              } catch { /* ignore */ }
            }

            let assignmentCount = 0
            let submissionCount = 0
            let dueSoonCount = 0

            // Fetch assignments from P&T student endpoints (projects + tasks)
            try {
              const [projRes, taskRes] = await Promise.all([
                fetch('/api/projects-and-tasks/student/projects', { headers }),
                fetch('/api/projects-and-tasks/student/tasks', { headers }),
              ])
              const projects = projRes.ok ? ((await projRes.json())?.data?.projects ?? []) : []
              const tasks    = taskRes.ok ? ((await taskRes.json())?.data?.tasks    ?? []) : []
              const items: Array<{ deadline?: string }> = [...projects, ...tasks]
              assignmentCount = items.length
              dueSoonCount = items.filter(a => {
                if (!a.deadline) return true
                return new Date(a.deadline).getTime() > Date.now()
              }).length
            } catch { /* silent */ }

            // Fetch student submissions from own API
            if (userId) {
              try {
                const res = await fetch(
                  `${SUBMISSION_API}/api/submissions?studentId=${encodeURIComponent(userId)}`,
                  { headers }
                )
                if (res.ok) {
                  const data = await res.json()
                  const items: Array<{ status?: string }> = Array.isArray(data) ? data : (data?.data ?? data?.content ?? [])
                  submissionCount = items.filter(s => s.status !== 'DRAFT').length
                }
              } catch { /* silent */ }
            }

            if (isMounted) {
              setConfig({
                ...baseConfig,
                sidebar: {
                  ...baseConfig.sidebar,
                  stats: { total: submissionCount, dueSoon: dueSoonCount },
                  navItems: baseConfig.sidebar.navItems.map(
                    (item) =>
                      item.id === 'my-assignments'
                        ? { ...item, badge: assignmentCount > 0 ? assignmentCount : undefined }
                        : item
                  ),
                },
              })
            }
          } else if (userRole === 'lecture') {
            let totalCount = 0
            let pendingCount = 0
            let flaggedCount = 0

            // Fetch all submissions
            try {
              const res = await fetch(`${SUBMISSION_API}/api/submissions`, { headers })
              if (res.ok) {
                const data = await res.json()
                const items: Array<{ status?: string }> = Array.isArray(data)
                  ? data
                  : (data?.content ?? data?.data ?? [])
                const nonDraft = items.filter(s => s.status !== 'DRAFT')
                totalCount = nonDraft.length
                pendingCount = nonDraft.filter(
                  s => s.status === 'SUBMITTED' || s.status === 'PENDING_REVIEW'
                ).length
              }
            } catch { /* silent */ }

            // Fetch flagged plagiarism reports (score >= 40)
            try {
              const res = await fetch(`${PLAGIARISM_API}/api/plagiarism?minScore=40`, { headers })
              if (res.ok) {
                const data = await res.json()
                const items = Array.isArray(data) ? data : (data?.data ?? [])
                flaggedCount = items.length
              }
            } catch { /* silent */ }

            if (isMounted) {
              setConfig({
                ...baseConfig,
                sidebar: {
                  ...baseConfig.sidebar,
                  navItems: baseConfig.sidebar.navItems.map(
                    (item) => {
                      if (item.id === 'submissions')
                        return { ...item, badge: totalCount > 0 ? totalCount : undefined }
                      if (item.id === 'grading')
                        return { ...item, badge: pendingCount > 0 ? pendingCount : undefined }
                      if (item.id === 'plagiarism')
                        return { ...item, badge: flaggedCount > 0 ? flaggedCount : undefined }
                      return item
                    }
                  ),
                },
              })
            }
          }
        } catch (error) {
          console.error('Failed to fetch submissions sidebar badges:', error)
        }
      }

      fetchBadges()

      return () => {
        isMounted = false
      }
    }

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
  }, [pathname, userRole, currentModule, baseConfig])

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