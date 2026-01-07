import CodeSpace from "@/components/code-engine/code-space"
import { Assignment } from "@/types/types"

const data = {
  courseId: "6959ebb9aecdd635139e33ee",
  lecturerId: "695692c5370550efdf14b004",
  question: "Write a program that prints Hello World",
  projectType: "code", 
  language: "javascript",
  deadlineDate: "2024-01-01",
  deadlineTime: "12:00:00Z",
  options: {
    autoComplete: true,
    externalCopyPaste: false,
    internalCopyPaste: true,
    analytics: true
  },
  testCases: [
    {
      id: 1,
      input: "", 
      expectedOutput: "Hello World"
    }
  ]
}

const CodeEngine = () => {
  return (
    <CodeSpace 
      defaultCode="// ITXXXXXXXX Thennakoon A G N S"
      assignment={data}
    />
  )
}

export default CodeEngine