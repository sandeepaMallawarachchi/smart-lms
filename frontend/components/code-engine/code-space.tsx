// 'use client'

// import React, { useState } from 'react'
// import Editor from '@monaco-editor/react'
// import { Play, FileText, Terminal, Settings, CheckCircle2, XCircle, ArrowLeft, ChartArea, Lock, Send, Info } from 'lucide-react'
// import { useRouter } from 'next/navigation'

// export interface TestCase {
//   id: number
//   input: string
//   expectedOutput: string
//   isHidden?: boolean
// }

// export interface AssignmentData {
//   _id: string
//   question: string 
//   language: string
//   options?: {
//     autoComplete?: boolean
//   }
//   testCases: TestCase[]
// }

// interface TestResult {
//   id: number
//   input: string
//   expected: string
//   actual: string
//   passed: boolean
//   isError: boolean
//   stderr?: string
//   isHidden?: boolean
// }

// const LANGUAGE_CONFIG: Record<string, { p_lang: string, version: string }> = {
//   javascript: { p_lang: 'javascript', version: '18.15.0' },
//   python:     { p_lang: 'python',     version: '3.10.0' },
//   java:       { p_lang: 'java',       version: '15.0.2' },
//   cpp:        { p_lang: 'c++',        version: '10.2.0' },
// }

// interface CodeSpaceProps {
//   defaultCode: string
//   assignment: AssignmentData
// }

// const CodeSpace = ({ defaultCode, assignment }: CodeSpaceProps) => {
//   const router = useRouter()
//   const [code, setCode] = useState(defaultCode)
//   const [isRunning, setIsRunning] = useState(false)
//   const [activeTab, setActiveTab] = useState<'output' | 'problem' | 'analytics'>('problem') 
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
//           stderr: data.run.stderr,
//           isHidden: testCase.isHidden
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

//   const problemTabTestCases = assignment.testCases.filter(tc => tc.isHidden === false);

//   return (
//     <div className="flex flex-col h-[calc(100vh-2rem)] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl m-4">
//       <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 h-14">
//         <div className="flex items-center gap-3">
//           <button 
//             onClick={() => router.back()}
//             className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors"
//           >
//             <ArrowLeft size={18} />
//           </button>
//           <div className="bg-blue-600 text-white p-1.5 rounded-md">
//             <FileText size={18} />
//           </div>
//           <h2 className="text-sm font-semibold text-gray-800 line-clamp-1 max-w-md">
//               Coding Challenge: <span className="capitalize">{assignment.language}</span>
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
//           <button 
//             onClick={() => setActiveTab('analytics')}
//             className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
//           >
//             <Info size={14} />
//             Analyze
//           </button>
//            <button 
//             // onClick={() => setActiveTab('analytics')}
//             className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
//           >
//             <Send size={14} />
//             Submit
//           </button>

//           <div className="h-6 w-px bg-gray-300 mx-1" />
//           <Settings size={16} className="text-gray-400 cursor-pointer hover:text-gray-600" />
//         </div>
//       </div>

//       <div className="flex-1 grid grid-cols-12 overflow-hidden">

//         <div className="col-span-12 lg:col-span-7 border-r border-gray-200 relative bg-[#fffffe]">
//           <Editor
//             height="100%"
//             defaultLanguage={assignment.language.toLowerCase()}
//             value={code}
//             onChange={(val) => setCode(val || '')}
//             options={editorOptions}
//             loading={<div className="p-4 text-sm text-gray-500">Initializing IDE...</div>}
//           />
//         </div>

//         <div className="col-span-12 lg:col-span-5 bg-gray-50 flex flex-col h-full overflow-hidden"> 
//           <div className="flex border-b border-gray-200 bg-white">
//             <button 
//               onClick={() => setActiveTab('problem')}
//               className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
//                 activeTab === 'problem' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
//               }`}
//             >
//               <FileText size={16} /> Problem
//             </button>
//             <button 
//               onClick={() => setActiveTab('output')}
//               className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
//                 activeTab === 'output' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
//               }`}
//             >
//               <Terminal size={16} /> Output & Tests
//             </button>
//             <button 
//               onClick={() => setActiveTab('analytics')}
//               className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
//                 activeTab === 'analytics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
//               }`}
//             >
//               <ChartArea size={16} /> Analytics
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
//                   <div className="flex flex-col items-center justify-center h-40 text-gray-400 space-y-2">
//                     <Play size={32} className="opacity-20" />
//                     <p className="text-sm">Click "Run & Check" to execute your code.</p>
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
//                             {result.isHidden && (
//                               <span className="flex items-center gap-1 text-[10px] bg-gray-800 text-white px-2 py-0.5 rounded-full ml-2">
//                                 <Lock size={10} /> Public
//                               </span>
//                             )}
//                           </div>
//                           <span className="text-xs uppercase tracking-wider opacity-75">
//                             {result.passed ? 'Success' : 'Failed'}
//                           </span>
//                         </div>

//                         <div className="p-3 text-xs font-mono space-y-3">
//                           <div>
//                             <div className="text-gray-400 mb-1">Input</div>
//                             <div className="bg-gray-100 p-2 rounded text-gray-700 whitespace-pre-wrap">
//                               {result.input || "(Empty Input)"}
//                             </div>
//                           </div>

//                           <div className="grid grid-cols-2 gap-2">
//                             <div>
//                               <div className="text-gray-400 mb-1">Expected Output</div>
//                               <div className="bg-emerald-50 border border-emerald-100 p-2 rounded text-emerald-800 whitespace-pre-wrap">
//                                 {result.expected}
//                               </div>
//                             </div>
//                             <div>
//                               <div className="text-gray-400 mb-1">Your Output</div>
//                               <div className={`p-2 rounded border whitespace-pre-wrap ${
//                                 result.passed 
//                                   ? 'bg-gray-100 border-gray-200 text-gray-700' 
//                                   : 'bg-red-50 border-red-100 text-red-800'
//                               }`}>
//                                 {result.isError ? (
//                                   <span className="text-red-600 italic">
//                                     Runtime Error: {result.stderr || "Unknown Error"}
//                                   </span>
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
//                 <h3 className="font-bold text-gray-800 text-lg mb-4">Problem Description</h3>
                
//                 <div 
//                     className="prose prose-sm max-w-none text-gray-600 mb-8"
//                     dangerouslySetInnerHTML={{ __html: assignment.question }}
//                 />
//                 {problemTabTestCases.length > 0 && (
//                   <div className="space-y-4">
//                     <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Test Cases</h4>
                    
//                     {problemTabTestCases.map((testCase, index) => (
//                       <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
//                         <div className="text-xs font-semibold text-gray-500 mb-3">Sample Case {index + 1}</div>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm">
//                           <div>
//                             <div className="text-gray-400 text-xs mb-1.5 uppercase">Input</div>
//                             <div className="bg-white border border-gray-200 p-3 rounded text-gray-700 whitespace-pre-wrap">
//                               {testCase.input}
//                             </div>
//                           </div>
//                           <div>
//                             <div className="text-gray-400 text-xs mb-1.5 uppercase">Expected Output</div>
//                             <div className="bg-white border border-gray-200 p-3 rounded text-gray-700 whitespace-pre-wrap">
//                               {testCase.expectedOutput}
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
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
import { 
  Play, FileText, Terminal, Settings, CheckCircle2, XCircle, 
  ArrowLeft, ChartArea, Lock, Send, Info, Lightbulb, 
  AlertTriangle, Check, BrainCircuit 
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion' // Optional: for smooth tab switching if you have it installed, otherwise standard div is fine

// --- Types ---

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
  stderr?: string
  isHidden?: boolean
}

// New Interface for Analysis Data
interface AnalysisResult {
  score: number
  complexity: {
    time: string
    space: string
  }
  feedback: {
    type: 'success' | 'warning' | 'info'
    message: string
    description: string
  }[]
  suggestions: string[]
}

const LANGUAGE_CONFIG: Record<string, { p_lang: string, version: string }> = {
  javascript: { p_lang: 'javascript', version: '18.15.0' },
  python:     { p_lang: 'python',     version: '3.10.0' },
  java:       { p_lang: 'java',       version: '15.0.2' },
  cpp:        { p_lang: 'c++',        version: '10.2.0' },
}

// --- Helper: Mock Analysis Service ---
// In production, replace this with an API call to OpenAI/Gemini
const analyzeCodeWithAI = async (code: string, language: string): Promise<AnalysisResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simple heuristics for demo purposes
      const hasComments = code.includes('//') || code.includes('#') || code.includes('/*');
      const isShort = code.length < 50;
      const hasLoops = code.includes('for') || code.includes('while');
      
      let score = 85;
      const feedback: AnalysisResult['feedback'] = [];
      const suggestions: string[] = [];

      if (!hasComments) {
        score -= 10;
        feedback.push({
          type: 'warning',
          message: 'Missing Documentation',
          description: 'Good code explains "why", not just "how". Adding comments helps others understand your logic.'
        });
      } else {
        feedback.push({
          type: 'success',
          message: 'Good Documentation',
          description: 'Great job adding comments! This makes your code maintainable.'
        });
      }

      if (isShort) {
        score -= 5;
        feedback.push({
          type: 'info',
          message: 'Code Brevity',
          description: 'Your solution is quite short. While brevity is good, ensure you are handling edge cases.'
        });
      }

      if (hasLoops) {
        feedback.push({
          type: 'info',
          message: 'Loop Detected',
          description: 'You are using loops. Be mindful of nested loops as they increase Time Complexity to O(n²).'
        });
      }

      // Teaching moment based on language
      if (language === 'javascript') {
        suggestions.push('Consider using "const" and "let" instead of "var" to avoid hoisting issues.');
        suggestions.push('Use arrow functions for cleaner syntax where appropriate.');
      } else if (language === 'python') {
        suggestions.push('Ensure you follow PEP 8 style guidelines for indentation and naming.');
        suggestions.push('List comprehensions can often make your code more "Pythonic" and faster.');
      }

      resolve({
        score,
        complexity: {
          time: hasLoops ? 'O(n)' : 'O(1)',
          space: 'O(1)'
        },
        feedback,
        suggestions
      });
    }, 1500); // Simulate API delay
  });
};

interface CodeSpaceProps {
  defaultCode: string
  assignment: AssignmentData
}

const CodeSpace = ({ defaultCode, assignment }: CodeSpaceProps) => {
  const router = useRouter()
  const [code, setCode] = useState(defaultCode)
  const [isRunning, setIsRunning] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false) // New state
  const [activeTab, setActiveTab] = useState<'output' | 'problem' | 'analytics'>('problem') 
  const [testResults, setTestResults] = useState<TestResult[] | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null) // New state
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
          stderr: data.run.stderr,
          isHidden: testCase.isHidden
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

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setActiveTab('analytics');
    setAnalysisResult(null);
    setStatusMessage('Analyzing code structure...');

    try {
      const result = await analyzeCodeWithAI(code, assignment.language.toLowerCase());
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  }

  const problemTabTestCases = assignment.testCases.filter(tc => tc.isHidden === false);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl m-4">
      {/* --- Toolbar --- */}
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
          {/* Run Button */}
          <button 
            onClick={handleRun}
            disabled={isRunning || isAnalyzing}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Play size={14} className={isRunning ? "animate-spin" : ""} />
            {isRunning ? 'Testing...' : 'Run & Check'}
          </button>

          {/* Analyze Button */}
          <button 
            onClick={handleAnalyze}
            disabled={isRunning || isAnalyzing}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {isAnalyzing ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-600"></div> : <BrainCircuit size={14} />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>

          <button 
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Send size={14} />
            Submit
          </button>

          <div className="h-6 w-px bg-gray-300 mx-1" />
          <Settings size={16} className="text-gray-400 cursor-pointer hover:text-gray-600" />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* --- Editor Area --- */}
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

        {/* --- Tabs Area --- */}
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
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'analytics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ChartArea size={16} /> Analytics
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
                            {result.isHidden && (
                              <span className="flex items-center gap-1 text-[10px] bg-gray-800 text-white px-2 py-0.5 rounded-full ml-2">
                                <Lock size={10} /> Public
                              </span>
                            )}
                          </div>
                          <span className="text-xs uppercase tracking-wider opacity-75">
                            {result.passed ? 'Success' : 'Failed'}
                          </span>
                        </div>
                        {/* Details Logic from previous response ... */}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Analytics Tab (NEW) */}
            {activeTab === 'analytics' && (
              <div className="p-6 space-y-6">
                 {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="relative w-16 h-16">
                       <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full animate-ping"></div>
                       <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-700 font-medium">Analyzing Code Quality...</p>
                      <p className="text-xs text-gray-400 mt-1">Checking complexity, style, and best practices.</p>
                    </div>
                  </div>
                )}

                {!isAnalyzing && !analysisResult && (
                   <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-3">
                     <BrainCircuit size={48} className="opacity-20" />
                     <div className="text-center">
                        <p className="text-sm font-medium text-gray-500">No Analysis Available</p>
                        <p className="text-xs max-w-xs mx-auto mt-1">Click the "Analyze" button in the toolbar to generate a code quality report.</p>
                     </div>
                   </div>
                )}

                {!isAnalyzing && analysisResult && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    
                    {/* Score Card */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                            analysisResult.score >= 80 ? 'bg-green-100 text-green-700' : 
                            analysisResult.score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {analysisResult.score}
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Quality Score</div>
                            <div className="text-sm font-medium text-gray-700">
                              {analysisResult.score >= 80 ? 'Excellent' : analysisResult.score >= 50 ? 'Needs Improvement' : 'Poor'}
                            </div>
                          </div>
                       </div>

                       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <ChartArea size={20} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Complexity</div>
                            <div className="text-sm font-medium text-gray-700">
                              Time: <span className="font-mono bg-gray-100 px-1 rounded">{analysisResult.complexity.time}</span>
                            </div>
                          </div>
                       </div>
                    </div>

                    {/* Teacher's Feedback */}
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                        <Info size={16} className="text-blue-500" /> 
                        Code Review Feedback
                      </h4>
                      <div className="space-y-3">
                        {analysisResult.feedback.map((item, i) => (
                          <div key={i} className={`p-3 rounded-lg border text-sm ${
                            item.type === 'success' ? 'bg-green-50 border-green-100' :
                            item.type === 'warning' ? 'bg-orange-50 border-orange-100' :
                            'bg-blue-50 border-blue-100'
                          }`}>
                            <div className="flex items-start gap-3">
                               {item.type === 'success' ? <Check size={16} className="text-green-600 mt-0.5" /> : 
                                item.type === 'warning' ? <AlertTriangle size={16} className="text-orange-600 mt-0.5" /> :
                                <Info size={16} className="text-blue-600 mt-0.5" />}
                                
                                <div>
                                  <div className={`font-semibold mb-1 ${
                                     item.type === 'success' ? 'text-green-800' :
                                     item.type === 'warning' ? 'text-orange-800' :
                                     'text-blue-800'
                                  }`}>{item.message}</div>
                                  <div className="text-gray-600 leading-relaxed">
                                    {item.description}
                                  </div>
                                </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Best Practices / Suggestions */}
                    <div className="bg-gray-900 text-white p-5 rounded-xl shadow-lg">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-yellow-400 mb-4">
                        <Lightbulb size={16} /> 
                        Best Practices & Tips
                      </h4>
                      <ul className="space-y-3">
                        {analysisResult.suggestions.map((tip, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                             <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0"></span>
                             <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* Problem Tab */}
            {activeTab === 'problem' && (
              <div className="p-6">
                <h3 className="font-bold text-gray-800 text-lg mb-4">Problem Description</h3>
                <div 
                    className="prose prose-sm max-w-none text-gray-600 mb-8"
                    dangerouslySetInnerHTML={{ __html: assignment.question }}
                />
                {problemTabTestCases.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Test Cases</h4>
                    {problemTabTestCases.map((testCase, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="text-xs font-semibold text-gray-500 mb-3">Sample Case {index + 1}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm">
                          <div>
                            <div className="text-gray-400 text-xs mb-1.5 uppercase">Input</div>
                            <div className="bg-white border border-gray-200 p-3 rounded text-gray-700 whitespace-pre-wrap">
                              {testCase.input}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs mb-1.5 uppercase">Expected Output</div>
                            <div className="bg-white border border-gray-200 p-3 rounded text-gray-700 whitespace-pre-wrap">
                              {testCase.expectedOutput}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeSpace