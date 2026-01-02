import CodeSpace from "@/components/code-engine/code-space"
import { Assignment } from "@/types/types"

const data: Assignment = {
  question: "Write a program that prints Hello World",
  type: "code", 
  language: "javascript",
  startDateTime: "2024-01-01T09:00:00Z",
  endDateTime: "2024-01-01T12:00:00Z",
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