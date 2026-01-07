'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader, AlertCircle, ArrowLeft } from 'lucide-react'
import { Assignment, ApiResponse } from '@/types/types'

import CodeEngine from '@/components/code-engine/code-engine'

export default function AssignmentEditorPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const assignmentId = params.assignmentId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)

  useEffect(() => {
    const fetchAssignment = async () => {
      if (!courseId || !assignmentId) return

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
          throw new Error('Failed to fetch assignment details')
        }

        const result: ApiResponse = await response.json()
        
        if (result.data && Array.isArray(result.data.assignments)) {
          const foundAssignment = result.data.assignments.find(
            (a: Assignment) => a._id === assignmentId
          )

          if (foundAssignment) {
            setAssignment(foundAssignment)
          } else {
            setError('Assignment not found')
          }
        } else {
          setError('No data found')
        }

      } catch (err: any) {
        console.error(err)
        setError(err.message || 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAssignment()
  }, [courseId, assignmentId, router])

  if (loading) {
    return (
      <div className="h-screen w-full bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader className="animate-spin text-blue-600" size={32} />
        <p className="text-gray-600 font-medium">Loading Editor Environment...</p>
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="h-screen w-full bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500" size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Assignment</h2>
          <p className="text-gray-500 mb-6">{error || "The requested assignment could not be found."}</p>
          <button 
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-white">
      <CodeEngine 
        defaultCode="// ITXXXXXXXX Thennakoon A G N S"
        assignment={assignment} 
      />
    </div>
  )
}