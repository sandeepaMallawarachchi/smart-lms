export type TestCase = {
  id: number
  input: string
  expectedOutput: string
  isHidden?: boolean
}

type Options = {
  autoComplete: boolean
  externalCopyPaste: boolean
  internalCopyPaste: boolean
  analytics: boolean
}

export type Assignment = {
  question: string
  type: string
  language: string
  startDateTime: string
  endDateTime: string
  options?: Options
  testCases?: TestCase[]
}
