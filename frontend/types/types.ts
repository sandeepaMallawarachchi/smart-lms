export type TestCase = {
  id: number
  input: string
  expectedOutput: string
  isHidden?: boolean
}

export type Options = {
  autoComplete: boolean
  externalCopyPaste: boolean
  internalCopyPaste: boolean
  analytics: boolean
}

export type Assignment = {
  _id?: string
  courseId: string
  lecturerId: string
  question: string
  projectType?: string
  language: string
  deadlineDate: string
  deadlineTime: string
  options?: Options
  testCases?: TestCase[]
}

interface ApiResponse {
  message: string
  data: {
    assignments: Assignment[]
  }
}

// sudaraka731_db_user
// LI0l8VvDDA3pXVkM
