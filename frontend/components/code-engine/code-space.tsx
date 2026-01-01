import Editor from '@monaco-editor/react'
import { Assignment } from '@/types/types'

interface Code {
  code: string
  language: string
  assignment: Assignment
}

function handleChange (value?: string) {
  console.log('value', value)
}

const CodeSpace = () => {
  return (
    <div className="grid grid-cols-2">
      <Editor 
        height="90vh" 
        defaultLanguage="javascript" 
        defaultValue="// some comment" 
        onChange={handleChange}  
      />

    </div>
  )
}

export default CodeSpace