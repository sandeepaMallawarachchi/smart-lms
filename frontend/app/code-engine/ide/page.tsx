'use client';

import CodeSpace, { AssignmentData } from '@/components/code-engine/code-space';

const demoAssignment: AssignmentData = {
  _id: 'demo-code-engine-assignment',
  question:
    'Write a function that reads a single integer n and prints its square. Use the sample tests to validate your solution.',
  language: 'javascript',
  options: {
    autoComplete: true,
    externalCopyPaste: true,
    internalCopyPaste: true,
    analytics: true,
  },
  testCases: [
    { id: 1, input: '2', expectedOutput: '4' },
    { id: 2, input: '5', expectedOutput: '25' },
    { id: 3, input: '10', expectedOutput: '100', isHidden: true },
  ],
};

const starterCode = `const fs = require('fs');

const input = fs.readFileSync(0, 'utf8').trim();
const n = Number(input);

console.log(n * n);
`;

export default function CodeEngineIdePage() {
  return <CodeSpace defaultCode={starterCode} assignment={demoAssignment} />;
}
