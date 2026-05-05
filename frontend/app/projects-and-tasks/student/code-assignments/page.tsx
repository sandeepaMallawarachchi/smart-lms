'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, BookOpen, CodeXml, Loader } from 'lucide-react'

interface Course {
  _id: string
  courseName: string
  courseCode: string
  academicYear?: string | number
  semester?: string | number
  specialization?: string
}

export default function StudentCodeAssignmentsLandingPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('authToken')

        if (!token) {
          router.push('/projects-and-tasks/login')
          return
        }

        const response = await fetch('/api/student/get-courses', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.status === 401) {
          localStorage.removeItem('authToken')
          localStorage.removeItem('userRole')
          router.push('/projects-and-tasks/login')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to load assigned courses')
        }

        const result = await response.json()
        const fetchedCourses: Course[] = Array.isArray(result.courses) ? result.courses : []

        setCourses(fetchedCourses)

        if (fetchedCourses.length === 1) {
          router.replace(`/projects-and-tasks/student/code-assignments/${fetchedCourses[0]._id}`)
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Unable to load code assignment courses')
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-linear-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Loader className="animate-spin text-white" size={32} />
          </div>
          <p className="text-gray-600 font-semibold">Loading Code Assignment Courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
      <div className="relative w-full px-4 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white shadow-xl shadow-blue-900/10">
              <CodeXml size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Code Assignments</h1>
              <p className="mt-1.5 text-sm text-gray-500">
                Choose a course to view the coding assignments assigned to you.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200">
            <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900">No Courses Available</h3>
            <p className="text-gray-500">No assigned courses were found for code assignments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {courses.map((course, index) => (
              <motion.button
                key={course._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                onClick={() => router.push(`/projects-and-tasks/student/code-assignments/${course._id}`)}
                className="text-left bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all group"
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <BookOpen size={22} />
                  </div>
                  <ArrowRight size={18} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div>
                  <p className="text-xs font-semibold tracking-wide uppercase text-blue-600 mb-2">
                    {course.courseCode}
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900 leading-snug">
                    {course.courseName}
                  </h3>
                  <p className="mt-3 text-sm text-gray-500">
                    Year {course.academicYear ?? '-'} • Semester {course.semester ?? '-'}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
