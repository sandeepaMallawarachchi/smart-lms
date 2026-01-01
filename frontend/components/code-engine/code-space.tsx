import Editor from '@monaco-editor/react'
import { Assignment } from '@/types/types'

interface Code {
  code: string
  language: string
  assignment: Assignment
}

const CodeSpace = ({ data }: Code) => {
  return (
    <div className="grid grid-cols-2">
      <Editor height="90vh" defaultLanguage="javascript" defaultValue="// some comment" />

    </div>
  )
}

export default CodeSpace