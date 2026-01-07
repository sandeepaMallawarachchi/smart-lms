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
  courseId: string
  lecturerId: string
  question: string
  type: string
  language: string
  deadlineDate: string
  deadlineTime: string
  options?: Options
  testCases?: TestCase[]
}
