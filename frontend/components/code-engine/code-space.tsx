// "use client"

// import React, { useState } from 'react'
// import Editor from '@monaco-editor/react'
// import { Play, FileText, Terminal, Settings, CheckCircle2, XCircle } from 'lucide-react'
// import { Assignment } from '@/types/types'

// interface TestCase {
//   id: number
//   input: string
//   expectedOutput: string
//   isHidden?: boolean
// }

// interface ExtendedAssignment extends Assignment {
//   testCases: TestCase[]
// }

// interface TestResult {
//   id: number
//   input: string
//   expected: string
//   actual: string
//   passed: boolean
//   isError: boolean
// }

// const LANGUAGE_CONFIG: Record<string, { p_lang: string, version: string }> = {
//   javascript: { p_lang: 'javascript', version: '18.15.0' },
//   python:     { p_lang: 'python',     version: '3.10.0' },
//   java:       { p_lang: 'java',       version: '15.0.2' },
//   cpp:        { p_lang: 'c++',        version: '10.2.0' },
// }

// interface CodeSpaceProps {
//   defaultCode: string
//   assignment: ExtendedAssignment
// }

// const CodeSpace = ({ defaultCode, assignment }: CodeSpaceProps) => {
//   const [code, setCode] = useState(defaultCode)
//   const [isRunning, setIsRunning] = useState(false)
//   const [activeTab, setActiveTab] = useState<'output' | 'problem'>('output')
//   const [testResults, setTestResults] = useState<TestResult[] | null>(null)
//   const [statusMessage, setStatusMessage] = useState('')

//   const editorOptions = {
//     fontSize: 14,
//     fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
//     fontLigatures: true,
//     minimap: { enabled: false },
//     scrollBeyondLastLine: false,
//     lineNumbers: 'on' as const,
//     roundedSelection: false,
//     padding: { top: 16, bottom: 16 },
//     cursorBlinking: 'smooth' as const,
//     smoothScrolling: true,
//     contextmenu: true,
//     quickSuggestions: assignment.options?.autoComplete ?? true,
//   }

//   const handleRun = async () => {
//     const langConfig = LANGUAGE_CONFIG[assignment.language.toLowerCase()]
    
//     if (!langConfig) {
//       alert(`Language ${assignment.language} is not supported.`)
//       return
//     }

//     setIsRunning(true)
//     setActiveTab('output')
//     setTestResults(null)
//     setStatusMessage('Preparing test cases...')

//     try {
//       const promises = assignment.testCases.map(async (testCase) => {
        
//         const response = await fetch('https://emkc.org/api/v2/piston/execute', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             language: langConfig.p_lang,
//             version: langConfig.version,
//             files: [{ content: code }],
//             stdin: testCase.input,
//           }),
//         })

//         const data = await response.json()
//         const rawOutput = data.run ? data.run.stdout : ''
//         const cleanActual = rawOutput.trim()
//         const cleanExpected = testCase.expectedOutput.trim()
        
//         return {
//           id: testCase.id,
//           input: testCase.input,
//           expected: testCase.expectedOutput,
//           actual: rawOutput, 
//           passed: cleanActual === cleanExpected && data.run.code === 0,
//           isError: data.run.code !== 0,
//           stderr: data.run.stderr
//         }
//       })

//       setStatusMessage('Executing code against test cases...')
      
//       const results = await Promise.all(promises)
//       setTestResults(results)

//     } catch (err) {
//       console.error(err)
//       setStatusMessage('Network Error: Could not reach execution engine.')
//     } finally {
//       setIsRunning(false)
//       setStatusMessage('')
//     }
//   }

//   return (
//     <div className="flex flex-col h-screen bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
//       <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 h-14">
//         <div className="flex items-center gap-3">
//           <div className="bg-blue-600 text-white p-1.5 rounded-md">
//             <FileText size={18} />
//           </div>
//           <h2 className="text-sm font-semibold text-gray-800">
//              {assignment.question.slice(0, 40)}...
//           </h2>
//         </div>

//         <div className="flex items-center gap-2">
//           <button 
//             onClick={handleRun}
//             disabled={isRunning}
//             className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
//           >
//             <Play size={14} className={isRunning ? "animate-spin" : ""} />
//             {isRunning ? 'Testing...' : 'Run & Check'}
//           </button>
//           <div className="h-6 w-px bg-gray-300 mx-1" />
//           <Settings size={16} className="text-gray-400" />
//         </div>
//       </div>

//       <div className="flex-1 grid grid-cols-12 overflow-hidden">
//         <div className="col-span-12 lg:col-span-7 border-r border-gray-200 relative">
//           <Editor
//             height="100%"
//             defaultLanguage={assignment.language}
//             value={code}
//             onChange={(val) => setCode(val || '')}
//             options={editorOptions}
//             loading="Loading Editor..."
//           />
//         </div>

//         <div className="col-span-12 lg:col-span-5 bg-gray-50 flex flex-col h-full overflow-hidden"> 
//           <div className="flex border-b border-gray-200 bg-white">
//             <button 
//               onClick={() => setActiveTab('output')}
//               className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
//                 activeTab === 'output' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
//               }`}
//             >
//               <Terminal size={16} /> Test Results
//             </button>
//             <button 
//               onClick={() => setActiveTab('problem')}
//               className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
//                 activeTab === 'problem' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
//               }`}
//             >
//               <FileText size={16} /> Problem
//             </button>
//           </div>

//           <div className="flex-1 overflow-auto p-0 bg-gray-50">
//             {activeTab === 'output' && (
//               <div className="p-4">
//                 {isRunning && (
//                   <div className="flex flex-col items-center justify-center h-40 space-y-3 text-gray-500">
//                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//                     <p className="text-xs">{statusMessage}</p>
//                   </div>
//                 )}

//                 {!isRunning && !testResults && (
//                   <div className="text-center text-gray-400 mt-10 text-sm">
//                     Click "Run & Check" to validate your code.
//                   </div>
//                 )}

//                 {!isRunning && testResults && (
//                   <div className="space-y-4">
//                     <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
//                       <span className="text-sm font-medium text-gray-600">Total Score</span>
//                       <span className={`text-sm font-bold ${
//                         testResults.every(r => r.passed) ? 'text-green-600' : 'text-red-500'
//                       }`}>
//                         {testResults.filter(r => r.passed).length} / {testResults.length} Passed
//                       </span>
//                     </div>

//                     {testResults.map((result, index) => (
//                       <div key={index} className={`rounded-lg border overflow-hidden bg-white shadow-sm ${
//                         result.passed ? 'border-green-200' : 'border-red-200'
//                       }`}>
//                         <div className={`px-4 py-2 flex items-center justify-between text-sm font-medium ${
//                           result.passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
//                         }`}>
//                           <div className="flex items-center gap-2">
//                             {result.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
//                             Test Case {index + 1}
//                           </div>
//                           <span className="text-xs uppercase tracking-wider opacity-75">
//                             {result.passed ? 'Success' : 'Failed'}
//                           </span>
//                         </div>

//                         <div className="p-3 text-xs font-mono space-y-3">
//                           <div>
//                             <div className="text-gray-400 mb-1">Input</div>
//                             <div className="bg-gray-100 p-2 rounded text-gray-700">
//                               {result.input || "(Empty Input)"}
//                             </div>
//                           </div>

//                           <div className="grid grid-cols-2 gap-2">
//                             <div>
//                               <div className="text-gray-400 mb-1">Expected Output</div>
//                               <div className="bg-emerald-50 border border-emerald-100 p-2 rounded text-emerald-800">
//                                 {result.expected}
//                               </div>
//                             </div>
//                             <div>
//                               <div className="text-gray-400 mb-1">Your Output</div>
//                               <div className={`p-2 rounded border ${
//                                 result.passed 
//                                   ? 'bg-gray-100 border-gray-200 text-gray-700' 
//                                   : 'bg-red-50 border-red-100 text-red-800'
//                               }`}>
//                                 {result.isError ? (
//                                   <span className="text-red-600 italic">Runtime Error</span>
//                                 ) : (
//                                   result.actual || <span className="text-gray-400 italic">(No Output)</span>
//                                 )}
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             )}
            
//             {activeTab === 'problem' && (
//               <div className="p-6">
//                 <h3 className="font-bold text-gray-800">Problem Description</h3>
//                 <p className="text-sm text-gray-600 mt-2">{assignment.question}</p>
//                 <div className="mt-4">
//                   <h4 className="text-xs font-bold text-gray-500 uppercase">Input Format</h4>
//                   <p className="text-xs text-gray-500 mt-1">Read from standard input (stdin).</p>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default CodeSpace

'use client'

import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Play, FileText, Terminal, Settings, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface TestCase {
  id: number
  input: string
  expectedOutput: string
  isHidden?: boolean
}

export interface AssignmentData {
  _id: string
  question: string 
  language: string
  options?: {
    autoComplete?: boolean
  }
  testCases: TestCase[]
}

interface TestResult {
  id: number
  input: string
  expected: string
  actual: string
  passed: boolean
  isError: boolean
}

const LANGUAGE_CONFIG: Record<string, { p_lang: string, version: string }> = {
  javascript: { p_lang: 'javascript', version: '18.15.0' },
  python:     { p_lang: 'python',     version: '3.10.0' },
  java:       { p_lang: 'java',       version: '15.0.2' },
  cpp:        { p_lang: 'c++',        version: '10.2.0' },
}

interface CodeSpaceProps {
  defaultCode: string
  assignment: AssignmentData
}

const CodeSpace = ({ defaultCode, assignment }: CodeSpaceProps) => {
  const router = useRouter()
  const [code, setCode] = useState(defaultCode)
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'output' | 'problem'>('problem') // Default to problem so they read it first
  const [testResults, setTestResults] = useState<TestResult[] | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  const editorOptions = {
    fontSize: 14,
    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    fontLigatures: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineNumbers: 'on' as const,
    roundedSelection: false,
    padding: { top: 16, bottom: 16 },
    cursorBlinking: 'smooth' as const,
    smoothScrolling: true,
    contextmenu: true,
    quickSuggestions: assignment.options?.autoComplete ?? true,
  }

  const handleRun = async () => {
    const langConfig = LANGUAGE_CONFIG[assignment.language.toLowerCase()]
    
    if (!langConfig) {
      alert(`Language ${assignment.language} is not supported.`)
      return
    }

    setIsRunning(true)
    setActiveTab('output')
    setTestResults(null)
    setStatusMessage('Preparing test cases...')

    try {
      const promises = assignment.testCases.map(async (testCase) => {
        
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: langConfig.p_lang,
            version: langConfig.version,
            files: [{ content: code }],
            stdin: testCase.input,
          }),
        })

        const data = await response.json()
        const rawOutput = data.run ? data.run.stdout : ''
        const cleanActual = rawOutput.trim()
        const cleanExpected = testCase.expectedOutput.trim()
        
        return {
          id: testCase.id,
          input: testCase.input,
          expected: testCase.expectedOutput,
          actual: rawOutput, 
          passed: cleanActual === cleanExpected && data.run.code === 0,
          isError: data.run.code !== 0,
          stderr: data.run.stderr
        }
      })

      setStatusMessage('Executing code against test cases...')
      
      const results = await Promise.all(promises)
      setTestResults(results)

    } catch (err) {
      console.error(err)
      setStatusMessage('Network Error: Could not reach execution engine.')
    } finally {
      setIsRunning(false)
      setStatusMessage('')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl m-4">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 h-14">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="bg-blue-600 text-white p-1.5 rounded-md">
            <FileText size={18} />
          </div>
          <h2 className="text-sm font-semibold text-gray-800 line-clamp-1 max-w-md">
             Coding Challenge: <span className="capitalize">{assignment.language}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Play size={14} className={isRunning ? "animate-spin" : ""} />
            {isRunning ? 'Testing...' : 'Run & Check'}
          </button>
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <Settings size={16} className="text-gray-400 cursor-pointer hover:text-gray-600" />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 overflow-hidden">

        <div className="col-span-12 lg:col-span-7 border-r border-gray-200 relative bg-[#fffffe]">
          <Editor
            height="100%"
            defaultLanguage={assignment.language.toLowerCase()}
            value={code}
            onChange={(val) => setCode(val || '')}
            options={editorOptions}
            loading={<div className="p-4 text-sm text-gray-500">Initializing IDE...</div>}
          />
        </div>

        <div className="col-span-12 lg:col-span-5 bg-gray-50 flex flex-col h-full overflow-hidden"> 
          <div className="flex border-b border-gray-200 bg-white">
            <button 
              onClick={() => setActiveTab('problem')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'problem' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText size={16} /> Problem
            </button>
            <button 
              onClick={() => setActiveTab('output')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'output' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Terminal size={16} /> Output & Tests
            </button>
          </div>

          <div className="flex-1 overflow-auto p-0 bg-gray-50">
            
            {/* Output Tab */}
            {activeTab === 'output' && (
              <div className="p-4">
                {isRunning && (
                  <div className="flex flex-col items-center justify-center h-40 space-y-3 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-xs">{statusMessage}</p>
                  </div>
                )}

                {!isRunning && !testResults && (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400 space-y-2">
                    <Play size={32} className="opacity-20" />
                    <p className="text-sm">Click "Run & Check" to execute your code.</p>
                  </div>
                )}

                {!isRunning && testResults && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <span className="text-sm font-medium text-gray-600">Total Score</span>
                      <span className={`text-sm font-bold ${
                        testResults.every(r => r.passed) ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {testResults.filter(r => r.passed).length} / {testResults.length} Passed
                      </span>
                    </div>

                    {testResults.map((result, index) => (
                      <div key={index} className={`rounded-lg border overflow-hidden bg-white shadow-sm ${
                        result.passed ? 'border-green-200' : 'border-red-200'
                      }`}>
                        <div className={`px-4 py-2 flex items-center justify-between text-sm font-medium ${
                          result.passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            {result.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            Test Case {index + 1}
                          </div>
                          <span className="text-xs uppercase tracking-wider opacity-75">
                            {result.passed ? 'Success' : 'Failed'}
                          </span>
                        </div>

                        <div className="p-3 text-xs font-mono space-y-3">
                          <div>
                            <div className="text-gray-400 mb-1">Input</div>
                            <div className="bg-gray-100 p-2 rounded text-gray-700 whitespace-pre-wrap">
                              {result.input || "(Empty Input)"}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-gray-400 mb-1">Expected Output</div>
                              <div className="bg-emerald-50 border border-emerald-100 p-2 rounded text-emerald-800 whitespace-pre-wrap">
                                {result.expected}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-400 mb-1">Your Output</div>
                              <div className={`p-2 rounded border whitespace-pre-wrap ${
                                result.passed 
                                  ? 'bg-gray-100 border-gray-200 text-gray-700' 
                                  : 'bg-red-50 border-red-100 text-red-800'
                              }`}>
                                {result.isError ? (
                                  <span className="text-red-600 italic">
                                    Runtime Error: {result.stderr || "Unknown Error"}
                                  </span>
                                ) : (
                                  result.actual || <span className="text-gray-400 italic">(No Output)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'problem' && (
              <div className="p-6">
                <h3 className="font-bold text-gray-800 text-lg mb-4">Problem Description</h3>
                
                <div 
                    className="prose prose-sm max-w-none text-gray-600"
                    dangerouslySetInnerHTML={{ __html: assignment.question }}
                />

                <div className="mt-8 border-t border-gray-200 pt-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Input Format</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Your program should read from standard input (stdin) if required, 
                    and print the result to standard output (stdout).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeSpace