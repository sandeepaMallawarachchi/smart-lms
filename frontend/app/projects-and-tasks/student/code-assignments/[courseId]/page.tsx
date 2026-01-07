'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import {
  CodeXml,
  ChevronDown,
  Calendar,
  Clock,
  FileText,
  Loader,
  AlertCircle,
  ExternalLink,
  Terminal,
  Cpu,
  CheckSquare
} from 'lucide-react'
import { TestCase, Options as AssignmentOptions, Assignment as CodeAssignment, ApiResponse } from '@/types/types'

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const getLanguageColor = (lang: string) => {
  const l = lang.toLowerCase()
  if (l.includes('java') && !l.includes('script')) return 'text-orange-600 bg-orange-50 border-orange-200'
  if (l.includes('script')) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  if (l.includes('python')) return 'text-blue-600 bg-blue-50 border-blue-200'
  if (l.includes('c++') || l.includes('c#')) return 'text-purple-600 bg-purple-50 border-purple-200'
  return 'text-gray-600 bg-gray-50 border-gray-200'
}

export default function StudentCodeAssignmentsPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<CodeAssignment[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return

      try {
        setLoading(true)
        const token = localStorage.getItem('authToken')
        
        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch(
          `/api/projects-and-tasks/lecturer/create-projects-and-tasks/code-assignment?courseId=${courseId}`, 
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch assignments')
        }

        const result: ApiResponse = await response.json()
        
        if (result.data && Array.isArray(result.data.assignments)) {
          setAssignments(result.data.assignments)
        } else {
          setAssignments([])
        }

      } catch (err: any) {
        console.error(err)
        setError(err.message || 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [courseId, router])

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-linear-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Loader className="animate-spin text-white" size={32} />
            </div>
            <p className="text-gray-600 font-semibold">Loading Assignments...</p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-10 right-20 w-96 h-96 bg-linear-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-linear-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl"
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-12">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white shadow-xl shadow-blue-900/10">
              <CodeXml size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Course Assignments
              </h1>
              <div className="flex items-center gap-3 mt-1.5 text-gray-500 text-sm font-medium">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">Code Challenges</span>
                <span>•</span>
                <span>{assignments.length} Available</span>
              </div>
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
          >
            <AlertCircle size={20} />
            {error}
          </motion.div>
        )}

        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200">
              <CodeXml className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900">No Assignments Found</h3>
              <p className="text-gray-500">There are no code assignments listed for this course ID.</p>
            </div>
          ) : (
            assignments.map((assignment, index) => (
              <motion.div
                key={assignment._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  bg-white rounded-xl border transition-all duration-300 overflow-hidden
                  ${expandedId === assignment._id 
                    ? 'shadow-lg border-blue-200 ring-1 ring-blue-100' 
                    : 'shadow-sm border-gray-200 hover:border-blue-200 hover:shadow-md'}
                `}
              >
                <div 
                  onClick={() => toggleExpand(assignment._id || "")}
                  className="p-5 flex items-center gap-4 cursor-pointer group"
                >
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors border
                    ${getLanguageColor(assignment.language)}
                  `}>
                    <Terminal size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {assignment.language.charAt(0).toUpperCase() + assignment.language.slice(1)} Assignment {index + 1}
                      </h3>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-100">
                        {assignment.projectType}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span>Due {formatDate(assignment.deadlineDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Cpu size={12} />
                        <span>{assignment.testCases?.length || 0} Test Cases</span>
                      </div>
                    </div>
                  </div>

                  <ChevronDown 
                    className={`text-gray-400 transition-transform duration-300 ${expandedId === assignment._id ? 'rotate-180 text-blue-500' : ''}`} 
                    size={20} 
                  />
                </div>

                <AnimatePresence>
                  {expandedId === assignment._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-6 pt-0 border-t border-gray-100">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                          <div className="lg:col-span-2 space-y-5">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <FileText size={16} className="text-blue-500"/> Problem Statement
                              </h4>
                              <div 
                                className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none bg-gray-50/50 p-4 rounded-lg border border-gray-100"
                                dangerouslySetInnerHTML={{ __html: assignment.question }} 
                              />
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg text-orange-800 text-sm">
                              <Clock size={16} className="mt-0.5 shrink-0" />
                              <div>
                                <span className="font-semibold">Submission Deadline: </span> 
                                {formatDate(assignment.deadlineDate)} at {assignment.deadlineTime}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Allowed Features</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <CheckSquare size={16} className={assignment.options?.autoComplete ? "text-green-500" : "text-gray-300"} />
                                  <span>Auto Complete</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <CheckSquare size={16} className={assignment.options?.externalCopyPaste ? "text-green-500" : "text-gray-300"} />
                                  <span>Ext. Copy/Paste</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <CheckSquare size={16} className={assignment.options?.analytics ? "text-green-500" : "text-gray-300"} />
                                  <span>Analytics</span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/projects-and-tasks/student/code-assignments/${courseId}/${assignment._id}`)
                                }}
                                className="w-full group flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white py-3 rounded-lg text-sm font-medium transition-all shadow-lg shadow-gray-200 hover:shadow-gray-300"
                              >
                                Open Code Editor
                                <ExternalLink size={16} className="group-hover:translate-x-0.5 transition-transform"/>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}