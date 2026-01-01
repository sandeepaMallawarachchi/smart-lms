"use client"

import Editor from '@monaco-editor/react'
import { Assignment } from '@/types/types'

interface CodeSpaceProps {
  defaultCode: string
  language: string
  assignment: Assignment
}

function handleChange (value?: string) {
  console.log('value', value)
}

const CodeSpace = ({defaultCode, language, assignment}: CodeSpaceProps) => {
  return (
    <div className="grid grid-cols-2">
      <Editor 
        height="90vh" 
        defaultLanguage={language}
        defaultValue={defaultCode}
        onChange={handleChange}
        options = {{
          fontSize: 14
        }}
      />

    </div>
  )
}

export default CodeSpace