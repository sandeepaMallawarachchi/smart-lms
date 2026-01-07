import CodeSpace from "@/components/code-engine/code-space"
import { Assignment } from "@/types/types"

interface CodeEngineProps {
  defaultCode: string
  assignment: Assignment
}

const CodeEngine = ({defaultCode, assignment}: CodeEngineProps) => {
  return (
    <CodeSpace 
      defaultCode="// ITXXXXXXXX Thennakoon A G N S"
      assignment={assignment}
    />
  )
}

export default CodeEngine