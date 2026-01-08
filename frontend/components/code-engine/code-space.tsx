'use client'

import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { 
  Play, FileText, Terminal, Settings, CheckCircle2, XCircle, 
  ArrowLeft, ChartArea, Lock, Send, Info, Lightbulb, 
  AlertTriangle, Check, BrainCircuit, Gauge, Zap, Box
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion' 

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

const ScoreRing = ({ score }: { score: number }) => {
  const radius = 30
  const stroke = 4
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  const getColor = (s: number) => {
    if (s >= 80) return "text-emerald-500"
    if (s >= 50) return "text-amber-500"
    return "text-rose-500"
  }

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} className="text-gray-100" />
        <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: "stroke-dashoffset 1s ease-out" }} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius} className={getColor(score)} />
      </svg>
      <span className={`absolute text-xl font-bold ${getColor(score)}`}>{score}</span>
    </div>
  )
}

const analyzeCodeWithAI = async (code: string, language: string): Promise<AnalysisResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let score = 100
      const feedback: AnalysisResult['feedback'] = []
      const suggestions: string[] = []
      const codeLower = code.toLowerCase()
      const lines = code.split('\n')

      if (code.length < 50) {
        score = 20
        feedback.push({ type: 'warning', message: 'Incomplete Solution', description: 'The solution seems too short to be functional. Make sure you cover all edge cases.' })
      }

      const hasComments = code.includes('//') || code.includes('#') || code.includes('/*')
      if (!hasComments && code.length > 100) {
        score -= 10
        feedback.push({ type: 'info', message: 'Missing Documentation', description: 'Your code works, but it lacks comments. Explaining "why" you did something is as important as "how".' })
      }

      const loops = (code.match(/for\s*\(/g) || []).length + (code.match(/while\s*\(/g) || []).length
      if (loops >= 2 && code.includes('for') && code.split('for').length > 2) {
        feedback.push({ type: 'warning', message: 'High Time Complexity', description: 'Nested loops detected. This likely results in O(n²) time complexity. Can you optimize this using a Hash Map or Two Pointers?' })
        score -= 15
      }

      if (code.includes('console.log') || code.includes('System.out.println') || (language === 'python' && code.includes('print('))) {
        suggestions.push('Remove debug print statements before final submission to keep the output clean.')
      }

      if (language === 'javascript') {
        if (code.includes('var ')) {
          score -= 10;
          feedback.push({ type: 'warning', message: 'Deprecated Syntax', description: 'Avoid using `var`. It has function scope and can lead to hoisting bugs. Use `let` or `const` instead.' })
        }
        if (code.includes('==') && !code.includes('===')) {
          suggestions.push('Use `===` instead of `==` to prevent unexpected type coercion errors.')
        }
        if (code.includes('function') && !code.includes('=>')) {
          suggestions.push('Consider using Arrow Functions `() => {}` for cleaner syntax in callbacks.')
        }
      }

      if (language === 'python') {
        if (/[A-Z]/.test(code.split('=')[0] || '') && !code.includes('class ')) {
          suggestions.push('Python conventions (PEP 8) recommend `snake_case` for variable names, not `CamelCase`.')
        }
        if (code.includes('for i in range(len(')) {
          feedback.push({ type: 'info', message: 'Non-Pythonic Loop', description: 'Using `range(len(arr))` is often unnecessary. You can iterate directly: `for item in arr:` or use `enumerate`.' })
        }
        if (code.includes(';')) {
          score -= 5;
          feedback.push({ type: 'warning', message: 'Syntax Error', description: 'Python does not use semicolons `;` at the end of lines.' })
        }
      }

      if (language === 'java') {
        if (codeLower.includes('system.out.print') && loops > 0) {
          feedback.push({ type: 'warning', message: 'Performance Risk', description: 'Printing inside loops is an expensive I/O operation. It might cause Time Limit Exceeded (TLE) on large test cases.' })
        }
        if (code.includes('==') && code.includes('"')) {
          suggestions.push('Remember to use `.equals()` for String comparison in Java, not `==`.')
        }
      }

      if (score === 100) {
        feedback.push({ type: 'success', message: 'Excellent Code', description: 'Your code follows industry standards, is well-documented, and efficient. Great job!' })
      }
      
      if (suggestions.length === 0) {
        suggestions.push('Review edge cases: What happens if the input is null or empty?')
        suggestions.push('Variable Naming: Ensure variable names describe their purpose (e.g., `userIndex` vs `i`).')
      }

      resolve({
        score: Math.max(0, score),
        complexity: {
          time: loops > 1 ? 'O(n²)' : loops === 1 ? 'O(n)' : 'O(1)',
          space: code.includes('new ') || code.includes('[]') ? 'O(n)' : 'O(1)'
        },
        feedback,
        suggestions
      })
    }, 1500)
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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<'output' | 'problem' | 'analytics'>('problem') 
  const [testResults, setTestResults] = useState<TestResult[] | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
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
    if (!langConfig) { alert(`Language ${assignment.language} is not supported.`); return; }
    setIsRunning(true); setActiveTab('output'); setTestResults(null); setStatusMessage('Preparing test cases...');
    try {
      const promises = assignment.testCases.map(async (testCase) => {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: langConfig.p_lang, version: langConfig.version, files: [{ content: code }], stdin: testCase.input, }),
        });
        const data = await response.json();
        const rawOutput = data.run ? data.run.stdout : '';
        const cleanActual = rawOutput.trim(); const cleanExpected = testCase.expectedOutput.trim();
        return { id: testCase.id, input: testCase.input, expected: testCase.expectedOutput, actual: rawOutput, passed: cleanActual === cleanExpected && data.run.code === 0, isError: data.run.code !== 0, stderr: data.run.stderr, isHidden: testCase.isHidden };
      });
      setStatusMessage('Executing code against test cases...');
      const results = await Promise.all(promises);
      setTestResults(results);
    } catch (err) { console.error(err); setStatusMessage('Network Error: Could not reach execution engine.');
    } finally { setIsRunning(false); setStatusMessage(''); }
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
  const compileError = testResults?.find(r => r.isError && r.stderr);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl m-4">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 h-14">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors">
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
          <button onClick={handleRun} disabled={isRunning || isAnalyzing} className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50">
            <Play size={14} className={isRunning ? "animate-spin" : ""} /> {isRunning ? 'Testing...' : 'Run & Check'}
          </button>
          <button onClick={handleAnalyze} disabled={isRunning || isAnalyzing} className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">
            {isAnalyzing ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-600"></div> : <BrainCircuit size={14} />} {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
            <Send size={14} /> Submit
          </button>
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <Settings size={16} className="text-gray-400 cursor-pointer hover:text-gray-600" />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        <div className="col-span-12 lg:col-span-7 border-r border-gray-200 relative bg-[#fffffe]">
          <Editor height="100%" defaultLanguage={assignment.language.toLowerCase()} value={code} onChange={(val) => setCode(val || '')} options={editorOptions} loading={<div className="p-4 text-sm text-gray-500">Initializing IDE...</div>} />
        </div>

        <div className="col-span-12 lg:col-span-5 bg-gray-50 flex flex-col h-full overflow-hidden"> 
          <div className="flex border-b border-gray-200 bg-white">
            <button onClick={() => setActiveTab('problem')} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'problem' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <FileText size={16} /> Problem
            </button>
            <button onClick={() => setActiveTab('output')} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'output' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Terminal size={16} /> Output & Tests
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <ChartArea size={16} /> Analytics
            </button>
          </div>

          <div className="flex-1 overflow-auto p-0 bg-gray-50">
            {activeTab === 'analytics' && (
              <div className="p-6 min-h-full">
                 {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center h-80 space-y-6">
                    <div className="relative w-20 h-20">
                       <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full animate-ping opacity-75"></div>
                       <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                       <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-900 font-semibold text-lg">Analyzing Code Quality</p>
                      <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">Evaluating time complexity, style guidelines, and potential optimizations.</p>
                    </div>
                  </div>
                )}

                {!isAnalyzing && !analysisResult && (
                   <div className="flex flex-col items-center justify-center h-80 text-gray-400 space-y-4">
                     <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center rotate-3">
                        <ChartArea size={32} className="text-gray-400" />
                     </div>
                     <div className="text-center">
                        <p className="text-base font-semibold text-gray-700">No Analytics Yet</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-62.5 mx-auto">Click the "Analyze" button in the toolbar to get AI-powered feedback on your code.</p>
                     </div>
                     <button onClick={handleAnalyze} className="mt-2 text-xs font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">
                        Start Analysis
                     </button>
                   </div>
                )}

                {!isAnalyzing && analysisResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-br from-gray-50 to-gray-100 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                          <div className="z-10">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Quality Score</h4>
                            <div className="text-3xl font-bold text-gray-800">
                                {analysisResult.score >= 80 ? 'Excellent' : analysisResult.score >= 50 ? 'Good' : 'Fair'}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Based on best practices</p>
                          </div>
                          <div className="z-10">
                             <ScoreRing score={analysisResult.score} />
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                             <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <Zap size={18} />
                             </div>
                             <div>
                                <div className="text-xs text-gray-400 font-medium">Time Complexity</div>
                                <div className="text-sm font-bold font-mono text-gray-800">{analysisResult.complexity.time}</div>
                             </div>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                             <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                <Box size={18} />
                             </div>
                             <div>
                                <div className="text-xs text-gray-400 font-medium">Space Complexity</div>
                                <div className="text-sm font-bold font-mono text-gray-800">{analysisResult.complexity.space}</div>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4 px-1">
                        <Gauge size={16} className="text-gray-500" /> 
                        Code Review
                      </h4>
                      <div className="space-y-3">
                        {analysisResult.feedback.map((item, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all hover:shadow-md ${
                              item.type === 'success' ? 'bg-emerald-50/50 border-emerald-100' :
                              item.type === 'warning' ? 'bg-amber-50/50 border-amber-100' :
                              'bg-blue-50/50 border-blue-100'
                            }`}
                          >
                            <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                               item.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                               item.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                               'bg-blue-100 text-blue-600'
                            }`}>
                               {item.type === 'success' ? <Check size={14} /> : 
                                item.type === 'warning' ? <AlertTriangle size={14} /> :
                                <Info size={14} />}
                            </div>
                            <div>
                              <h5 className={`text-sm font-bold mb-1 ${
                                 item.type === 'success' ? 'text-emerald-900' :
                                 item.type === 'warning' ? 'text-amber-900' :
                                 'text-blue-900'
                              }`}>{item.message}</h5>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="relative overflow-hidden bg-gray-900 rounded-xl shadow-lg p-6">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500 rounded-full blur-3xl opacity-10 -mr-10 -mt-10"></div>
                      <h4 className="relative flex items-center gap-2 text-sm font-bold text-yellow-400 mb-4">
                        <Lightbulb size={16} /> 
                        Teacher's Tips
                      </h4>
                      <ul className="relative space-y-3">
                        {analysisResult.suggestions.map((tip, i) => (
                          <motion.li 
                            key={i} 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 + (i * 0.1) }}
                            className="flex items-start gap-3 text-sm text-gray-300 group"
                          >
                             <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-2 group-hover:bg-yellow-400 transition-colors shrink-0"></div>
                             <span className="group-hover:text-gray-100 transition-colors">{tip}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {activeTab === 'output' && (
              <div className="p-4">
                {isRunning && <div className="flex flex-col items-center justify-center h-40 space-y-3 text-gray-500"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="text-xs">{statusMessage}</p></div>}
                
                {!isRunning && !testResults && <div className="flex flex-col items-center justify-center h-40 text-gray-400 space-y-2"><Play size={32} className="opacity-20" /><p className="text-sm">Click "Run & Check" to execute your code.</p></div>}
                
                {!isRunning && testResults && (
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                           <Terminal size={14} /> Compilation Status
                        </h4>
                        
                        {compileError ? (
                           <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-sm">
                              <div className="flex items-center gap-2 font-bold mb-2 text-red-700">
                                 <XCircle size={16} /> Compilation Error
                              </div>
                              {compileError.stderr}
                           </div>
                        ) : (
                           <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-sm flex items-center gap-2 shadow-sm">
                              <CheckCircle2 size={18} className="text-emerald-600" />
                              <span className="font-medium">Compilation Successful</span>
                           </div>
                        )}
                     </div>
                     
                     <div className="border-t border-gray-100"></div>

                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                              <CheckCircle2 size={14} /> Test Case Results
                            </h4>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${testResults.every(r => r.passed) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                               {testResults.filter(r => r.passed).length} / {testResults.length} Passing
                            </span>
                        </div>
                        
                        {testResults.map((result, index) => (
                          <div key={index} className={`rounded-lg border overflow-hidden bg-white shadow-sm ${result.passed ? 'border-green-200' : 'border-red-200'}`}>
                            <div className={`px-4 py-2 flex items-center justify-between text-sm font-medium ${result.passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                              <div className="flex items-center gap-2">
                                {result.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />} Test Case {index + 1}
                                {result.isHidden && <span className="flex items-center gap-1 text-[10px] bg-gray-800 text-white px-2 py-0.5 rounded-full ml-2"><Lock size={10} /> Public</span>}
                              </div>
                              <span className="text-xs uppercase tracking-wider opacity-75">{result.passed ? 'Success' : 'Failed'}</span>
                            </div>
                            {!result.isHidden && (
                              <div className="p-3 text-xs font-mono space-y-3">
                                <div><div className="text-gray-400 mb-1">Input</div><div className="bg-gray-100 p-2 rounded text-gray-700 whitespace-pre-wrap">{result.input || "(Empty Input)"}</div></div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div><div className="text-gray-400 mb-1">Expected Output</div><div className="bg-emerald-50 border border-emerald-100 p-2 rounded text-emerald-800 whitespace-pre-wrap">{result.expected}</div></div>
                                  <div><div className="text-gray-400 mb-1">Your Output</div><div className={`p-2 rounded border whitespace-pre-wrap ${result.passed ? 'bg-gray-100 border-gray-200 text-gray-700' : 'bg-red-50 border-red-100 text-red-800'}`}>{result.isError ? <span className="text-red-600 italic">Check Compilation Error Above</span> : result.actual || <span className="text-gray-400 italic">(No Output)</span>}</div></div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                     </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'problem' && (
              <div className="p-6">
                <h3 className="font-bold text-gray-800 text-lg mb-4">Problem Description</h3>
                <div className="prose prose-sm max-w-none text-gray-600 mb-8" dangerouslySetInnerHTML={{ __html: assignment.question }} />
                {problemTabTestCases.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Test Cases</h4>
                    {problemTabTestCases.map((testCase, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="text-xs font-semibold text-gray-500 mb-3">Sample Case {index + 1}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm">
                          <div><div className="text-gray-400 text-xs mb-1.5 uppercase">Input</div><div className="bg-white border border-gray-200 p-3 rounded text-gray-700 whitespace-pre-wrap">{testCase.input}</div></div>
                          <div><div className="text-gray-400 text-xs mb-1.5 uppercase">Expected Output</div><div className="bg-white border border-gray-200 p-3 rounded text-gray-700 whitespace-pre-wrap">{testCase.expectedOutput}</div></div>
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