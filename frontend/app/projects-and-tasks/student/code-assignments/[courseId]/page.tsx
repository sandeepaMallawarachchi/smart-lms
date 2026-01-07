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
    Download
} from 'lucide-react'

interface Course {
    _id: string
    courseName: string
    courseCode: string
    credits: number
}

interface Document {
    url: string
    name: string
    fileSize: number
}

interface CodeAssignment {
    _id: string
    title: string
    description: { html: string; text: string }
    language: string
    deadlineDate: string
    deadlineTime: string
    status: 'todo' | 'inprogress' | 'submitted' | 'graded'
    maxScore?: number
    templateFiles?: Document[]
    instructions?: Document[]
    createdAt: string
}

interface ApiResponse {
    success: boolean
    data: {
        course: Course
        assignments: CodeAssignment[]
    }
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'submitted': return 'bg-green-100 text-green-700 border-green-200'
        case 'graded': return 'bg-purple-100 text-purple-700 border-purple-200'
        case 'inprogress': return 'bg-blue-100 text-brand-blue border-blue-200'
        default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}


export default function StudentCodeAssignmentsPage() {
    const params = useParams()
    const router = useRouter()
    const courseId = params.courseId as string

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [course, setCourse] = useState<Course | null>(null)
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
                
                if (result.success) {
                    setCourse(result.data.course)
                    setAssignments(result.data.assignments)
                } else {
                    setError('Failed to load data structure')
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
            {/* Background Decor */}
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
                
                {/* Header */}
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
                                {course?.courseName || 'Code Assignments'}
                            </h1>
                            <div className="flex items-center gap-3 mt-1.5 text-gray-500 text-sm font-medium">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">{course?.courseCode}</span>
                                <span>•</span>
                                <span>{assignments.length} Assignments</span>
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

                {/* Assignments List */}
                <div className="space-y-4">
                    {assignments.length === 0 ? (
                        <div className="text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200">
                            <CodeXml className="mx-auto text-gray-300 mb-4" size={48} />
                            <h3 className="text-lg font-semibold text-gray-900">No Assignments Yet</h3>
                            <p className="text-gray-500">Check back later for new coding tasks.</p>
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
                                {/* Card Header / Summary Row */}
                                <div 
                                    onClick={() => toggleExpand(assignment._id)}
                                    className="p-5 flex items-center gap-4 cursor-pointer group"
                                >
                                    {/* Status Icon Indicator */}
                                    <div className={`
                                        w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                                        ${expandedId === assignment._id ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600'}
                                    `}>
                                        <Terminal size={20} />
                                    </div>

                                    {/* Title & Metadata */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                {assignment.title}
                                            </h3>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(assignment.status)}`}>
                                                {assignment.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={12} />
                                                <span>Due {formatDate(assignment.deadlineDate)}</span>
                                            </div>
                                            {assignment.language && (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    <span>{assignment.language}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expand Arrow */}
                                    <ChevronDown 
                                        className={`text-gray-400 transition-transform duration-300 ${expandedId === assignment._id ? 'rotate-180 text-blue-500' : ''}`} 
                                        size={20} 
                                    />
                                </div>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {expandedId === assignment._id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        >
                                            <div className="px-5 pb-6 pt-0 border-t border-gray-100">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                                                    
                                                    {/* Left Col: Description */}
                                                    <div className="md:col-span-2 space-y-4">
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                                                <FileText size={16} className="text-blue-500"/> Description
                                                            </h4>
                                                            <div 
                                                                className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg border border-gray-100"
                                                                dangerouslySetInnerHTML={{ __html: assignment.description.html }} 
                                                            />
                                                        </div>

                                                        {/* Deadline Alert if near */}
                                                        <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg text-orange-800 text-sm">
                                                            <Clock size={16} className="mt-0.5 shrink-0" />
                                                            <div>
                                                                <span className="font-semibold">Deadline: </span> 
                                                                {formatDate(assignment.deadlineDate)} at {assignment.deadlineTime}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right Col: Actions & Meta */}
                                                    <div className="space-y-6">
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Resources</h4>
                                                            {assignment.templateFiles && assignment.templateFiles.length > 0 ? (
                                                                <ul className="space-y-2">
                                                                    {assignment.templateFiles.map((file, i) => (
                                                                        <li key={i}>
                                                                            <a 
                                                                                href={file.url} 
                                                                                className="flex items-center gap-2 text-xs p-2 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors bg-white group"
                                                                            >
                                                                                <Download size={14} className="text-gray-400 group-hover:text-blue-500"/>
                                                                                <span className="truncate">{file.name}</span>
                                                                            </a>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="text-xs text-gray-400 italic">No resource files attached.</p>
                                                            )}
                                                        </div>

                                                        <div className="pt-4 border-t border-gray-100">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    router.push(`/projects-and-tasks/student/code-assignments/${courseId}/${assignment._id}`)
                                                                }}
                                                                className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-gray-200"
                                                            >
                                                                Open IDE
                                                                <ExternalLink size={16} />
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