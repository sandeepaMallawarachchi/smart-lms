// "use client"

// import React, { useState } from 'react'
// import Editor from '@monaco-editor/react'
// import { Play, Send, FileText, Terminal, Settings, ChevronRight } from 'lucide-react'
// import { Assignment } from '@/types/types'

// interface CodeSpaceProps {
//   defaultCode: string
//   assignment: Assignment
// }

// const CodeSpace = ({ defaultCode, assignment }: CodeSpaceProps) => {
//   const [code, setCode] = useState(defaultCode)
//   const [isRunning, setIsRunning] = useState(false)
//   const [activeTab, setActiveTab] = useState<'output' | 'problem'>('output')

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
//     readOnly: false,
//   }

//   const handleRun = () => {
//     setIsRunning(true)
//     setActiveTab('output')
//     setTimeout(() => setIsRunning(false), 1500)
//   }

//   return (
//     <div className="flex flex-col h-screen bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
//       <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 h-14">
//         <div className="flex items-center gap-3">
//           <div className="bg-blue-600 text-white p-1.5 rounded-md">
//             <FileText size={18} />
//           </div>
//           <div>
//             <h2 className="text-sm font-semibold text-gray-800">
//               {assignment.question.length > 40 ? assignment.question.slice(0, 40) + '...' : assignment.question}
//             </h2>
//             <div className="flex items-center gap-2 text-xs text-gray-500">
//               <span className="uppercase font-medium tracking-wider">{assignment.language}</span>
//               <span>•</span>
//               <span className="capitalize">{assignment.type} Assignment</span>
//             </div>
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           {assignment.type === 'code' && (
//             <>
//               <button 
//                 onClick={handleRun}
//                 disabled={isRunning}
//                 className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
//               >
//                 <Play size={14} className={isRunning ? "animate-spin" : "fill-gray-700"} />
//                 {isRunning ? 'Running...' : 'Run Code'}
//               </button>
//               <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm">
//                 <Send size={14} />
//                 Submit
//               </button>
//             </>
//           )}
//           <div className="h-6 w-px bg-gray-300 mx-1" />
//           <button className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors">
//             <Settings size={16} />
//           </button>
//         </div>
//       </div>

//       <div className="flex-1 grid grid-cols-12 overflow-hidden">
//         <div className={`col-span-12 ${assignment.type === 'code' ? 'lg:col-span-7' : 'lg:col-span-12'} border-r border-gray-200 flex flex-col`}>
//           <div className="flex-1 relative group">
//             <Editor
//               height="100%"
//               defaultLanguage={assignment.language}
//               value={code}
//               onChange={(val) => setCode(val || '')}
//               options={editorOptions}
//               theme="light"
//               loading={<div className="text-sm text-gray-500 p-4">Loading Editor...</div>}
//             />
//             <div className="absolute bottom-4 right-6 text-xs text-gray-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
//               Ln {code.split('\n').length}, Col 1
//             </div>
//           </div>
//         </div>

//         {assignment.type === 'code' && (
//           <div className="col-span-12 lg:col-span-5 bg-gray-50 flex flex-col h-full overflow-hidden"> 
//             <div className="flex border-b border-gray-200 bg-white">
//               <button 
//                 onClick={() => setActiveTab('output')}
//                 className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
//                   activeTab === 'output' 
//                     ? 'border-blue-600 text-blue-600' 
//                     : 'border-transparent text-gray-500 hover:text-gray-700'
//                 }`}
//               >
//                 <Terminal size={16} />
//                 Console
//               </button>
//               <button 
//                 onClick={() => setActiveTab('problem')}
//                 className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
//                   activeTab === 'problem' 
//                     ? 'border-blue-600 text-blue-600' 
//                     : 'border-transparent text-gray-500 hover:text-gray-700'
//                 }`}
//               >
//                 <FileText size={16} />
//                 Problem
//               </button>
//             </div>

//             <div className="flex-1 overflow-auto p-0">
//               {activeTab === 'output' && (
//                 <div className="flex flex-col h-full">
//                   <div className="flex-1 bg-gray-950 p-4 font-mono text-sm overflow-auto custom-scrollbar">
//                     {isRunning ? (
//                       <div className="space-y-2 animate-pulse">
//                         <div className="h-4 w-1/3 bg-gray-800 rounded"></div>
//                         <div className="h-4 w-1/2 bg-gray-800 rounded"></div>
//                       </div>
//                     ) : (
//                       <>
//                         <div className="text-emerald-400 mb-2 flex items-center gap-2">
//                            <ChevronRight size={14} /> Build Successful
//                         </div>
//                         <div className="text-gray-300 leading-relaxed">
//                           {">"} Running tests...<br/>
//                           {">"} Test Case 1: <span className="text-green-400">PASSED</span> (0.04s)<br/>
//                           {">"} Test Case 2: <span className="text-green-400">PASSED</span> (0.12s)<br/>
//                           <br/>
//                           <span className="text-gray-500">Process exited with code 0</span>
//                         </div>
//                       </>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {activeTab === 'problem' && (
//                 <div className="p-6 bg-white h-full overflow-auto">
//                   <h3 className="font-bold text-lg text-gray-800 mb-2">Problem Statement</h3>
//                   <p className="text-gray-600 leading-relaxed text-sm">
//                     {assignment.question}
//                   </p>
                  
//                   <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
//                     <h4 className="text-blue-800 font-medium text-sm mb-2">Example Input</h4>
//                     <code className="bg-white px-2 py-1 rounded border border-blue-100 text-xs font-mono block w-fit">
//                       const x = [1, 2, 3];
//                     </code>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {assignment.type === 'document' && (
//            <div className="hidden lg:flex flex-col items-center justify-center p-12 text-gray-400 w-full h-full bg-gray-50/50">
//              <FileText size={48} className="mb-4 text-gray-300" />
//              <p className="text-sm font-medium">Document Mode Active</p>
//              <p className="text-xs mt-1">Changes are saved automatically</p>
//            </div>
//         )}
//       </div>
//     </div>
//   )
// }

// export default CodeSpace

"use client"

import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Play, Send, FileText, Terminal, Settings, ChevronRight, AlertCircle, Clock, Cpu } from 'lucide-react'
import { Assignment } from '@/types/types'

// 1. Piston needs the specific version for each language.
// You can find these at https://emkc.org/api/v2/piston/runtimes
const LANGUAGE_CONFIG: Record<string, { p_lang: string, version: string }> = {
  javascript: { p_lang: 'javascript', version: '18.15.0' },
  typescript: { p_lang: 'typescript', version: '5.0.3' },
  python:     { p_lang: 'python',     version: '3.10.0' },
  java:       { p_lang: 'java',       version: '15.0.2' },
  c:          { p_lang: 'c',          version: '10.2.0' },
  cpp:        { p_lang: 'c++',        version: '10.2.0' },
  go:         { p_lang: 'go',         version: '1.16.2' },
  rust:       { p_lang: 'rust',       version: '1.68.2' },
  php:        { p_lang: 'php',        version: '8.2.3' },
}

interface CodeSpaceProps {
  defaultCode: string
  assignment: Assignment
}

interface ExecutionResult {
  output: string
  isError: boolean
  status: string
}

const CodeSpace = ({ defaultCode, assignment }: CodeSpaceProps) => {
  const [code, setCode] = useState(defaultCode)
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'output' | 'problem'>('output')
  const [outputDetails, setOutputDetails] = useState<ExecutionResult | null>(null)

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
    readOnly: false,
  }

  const handleRun = async () => {
    const langConfig = LANGUAGE_CONFIG[assignment.language.toLowerCase()]
    
    if (!langConfig) {
      alert(`Language ${assignment.language} is not supported by the demo map.`)
      return
    }

    setIsRunning(true)
    setActiveTab('output')
    setOutputDetails(null)

    try {
      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: langConfig.p_lang,
          version: langConfig.version,
          files: [
            {
              content: code,
            },
          ],
        }),
      })

      const data = await response.json()

      // Piston returns { run: { stdout, stderr, code, signal, ... } }
      if (data.run) {
        setOutputDetails({
          output: data.run.output, // Piston combines stdout/stderr here usually, or you can split them
          isError: data.run.stderr.length > 0 || data.run.code !== 0,
          status: data.run.code === 0 ? 'Success' : 'Error',
        })
      } else {
        throw new Error('Invalid response from Piston API')
      }

    } catch (err) {
      console.error(err)
      setOutputDetails({
        output: 'Failed to execute code. The Piston API might be down.',
        isError: true,
        status: 'Network Error'
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 h-14">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-1.5 rounded-md">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              {assignment.question.length > 40 ? assignment.question.slice(0, 40) + '...' : assignment.question}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="uppercase font-medium tracking-wider">{assignment.language}</span>
              <span>•</span>
              <span className="capitalize">{assignment.type} Assignment</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {assignment.type === 'code' && (
            <>
              <button 
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Play size={14} className={isRunning ? "animate-spin" : "fill-gray-700"} />
                {isRunning ? 'Running...' : 'Run Code'}
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm">
                <Send size={14} />
                Submit
              </button>
            </>
          )}
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <button className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors">
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        <div className={`col-span-12 ${assignment.type === 'code' ? 'lg:col-span-7' : 'lg:col-span-12'} border-r border-gray-200 flex flex-col`}>
          <div className="flex-1 relative group">
            <Editor
              height="100%"
              defaultLanguage={assignment.language}
              value={code}
              onChange={(val) => setCode(val || '')}
              options={editorOptions}
              theme="light"
              loading={<div className="text-sm text-gray-500 p-4">Loading Editor...</div>}
            />
            <div className="absolute bottom-4 right-6 text-xs text-gray-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              Ln {code.split('\n').length}, Col 1
            </div>
          </div>
        </div>

        {assignment.type === 'code' && (
          <div className="col-span-12 lg:col-span-5 bg-gray-50 flex flex-col h-full overflow-hidden"> 
            <div className="flex border-b border-gray-200 bg-white">
              <button 
                onClick={() => setActiveTab('output')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'output' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Terminal size={16} />
                Console
              </button>
              <button 
                onClick={() => setActiveTab('problem')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'problem' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText size={16} />
                Problem
              </button>
            </div>

            <div className="flex-1 overflow-auto p-0">
              {activeTab === 'output' && (
                <div className="flex flex-col h-full bg-gray-950 font-mono text-sm">
                  
                  {/* Status Bar inside Console */}
                  <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
                    <span>TERMINAL</span>
                    {outputDetails && !isRunning && (
                       <span className={outputDetails.isError ? "text-red-400" : "text-emerald-400"}>
                         {outputDetails.status}
                       </span>
                    )}
                  </div>

                  <div className="flex-1 p-4 overflow-auto custom-scrollbar">
                    {/* LOADING STATE */}
                    {isRunning && (
                      <div className="space-y-3 animate-pulse">
                        <div className="flex items-center gap-2 text-yellow-500">
                          <Play size={14} className="animate-spin" />
                          <span>Executing code on remote server...</span>
                        </div>
                      </div>
                    )}

                    {/* RESULTS STATE */}
                    {!isRunning && outputDetails && (
                      <div className="space-y-4">
                        
                        <div className={`flex items-center gap-2 font-bold ${
                          outputDetails.isError ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {outputDetails.isError ? <AlertCircle size={16} /> : <ChevronRight size={16} />}
                          {outputDetails.isError ? 'Execution Failed' : 'Execution Successful'}
                        </div>

                        {/* Raw Output */}
                        <div>
                          <pre className={`${
                            outputDetails.isError ? 'text-red-200' : 'text-gray-300'
                          } whitespace-pre-wrap font-mono`}>{outputDetails.output}</pre>
                        </div>
                      </div>
                    )}

                    {/* EMPTY STATE */}
                    {!isRunning && !outputDetails && (
                       <div className="text-gray-600 italic">Run code to see output...</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'problem' && (
                <div className="p-6 bg-white h-full overflow-auto">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">Problem Statement</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {assignment.question}
                  </p>
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h4 className="text-blue-800 font-medium text-sm mb-2">Example Input</h4>
                    <code className="bg-white px-2 py-1 rounded border border-blue-100 text-xs font-mono block w-fit">
                      const x = [1, 2, 3];
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {assignment.type === 'document' && (
           <div className="hidden lg:flex flex-col items-center justify-center p-12 text-gray-400 w-full h-full bg-gray-50/50">
             <FileText size={48} className="mb-4 text-gray-300" />
             <p className="text-sm font-medium">Document Mode Active</p>
             <p className="text-xs mt-1">Changes are saved automatically</p>
           </div>
        )}
      </div>
    </div>
  )
}

export default CodeSpace