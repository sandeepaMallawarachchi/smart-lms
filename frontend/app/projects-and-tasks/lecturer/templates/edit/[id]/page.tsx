// /components/projects-and-tasks/lecturer/RichTextEditor.tsx

'use client';

import React, { useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
} from 'lucide-react';

interface RichTextContent {
  html: string;
  text: string;
}

interface RichTextEditorProps {
  label?: string;
  value: RichTextContent;
  onChange: (content: RichTextContent) => void;
  placeholder?: string;
  required?: boolean;
}

export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = 'Enter text...',
  required = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = (command: string, commandValue?: string) => {
    document.execCommand(command, false, commandValue);
    editorRef.current?.focus();
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const text = editorRef.current.innerText;
      onChange({ html, text });
    }
  };

  const insertList = (ordered: boolean) => {
    const command = ordered ? 'insertOrderedList' : 'insertUnorderedList';
    execCommand(command);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertCodeBlock = () => {
    const code = document.createElement('pre');
    code.style.backgroundColor = '#f5f5f5';
    code.style.padding = '10px';
    code.style.borderRadius = '4px';
    code.style.fontFamily = 'monospace';
    code.textContent = 'Code here...';

    if (editorRef.current) {
      editorRef.current.appendChild(code);
      updateContent();
      editorRef.current.focus();
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="bg-gray-100 border-b border-gray-300 p-2 flex flex-wrap gap-1">
          {/* Bold */}
          <button
            onClick={() => execCommand('bold')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Bold (Ctrl+B)"
            type="button"
          >
            <Bold size={18} className="text-gray-700" />
          </button>

          {/* Italic */}
          <button
            onClick={() => execCommand('italic')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Italic (Ctrl+I)"
            type="button"
          >
            <Italic size={18} className="text-gray-700" />
          </button>

          {/* Underline */}
          <button
            onClick={() => execCommand('underline')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Underline (Ctrl+U)"
            type="button"
          >
            <Underline size={18} className="text-gray-700" />
          </button>

          {/* Separator */}
          <div className="w-px bg-gray-300"></div>

          {/* Bullet List */}
          <button
            onClick={() => insertList(false)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Bullet List"
            type="button"
          >
            <List size={18} className="text-gray-700" />
          </button>

          {/* Numbered List */}
          <button
            onClick={() => insertList(true)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Numbered List"
            type="button"
          >
            <ListOrdered size={18} className="text-gray-700" />
          </button>

          {/* Separator */}
          <div className="w-px bg-gray-300"></div>

          {/* Link */}
          <button
            onClick={() => insertLink()}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Insert Link"
            type="button"
          >
            <LinkIcon size={18} className="text-gray-700" />
          </button>

          {/* Code Block */}
          <button
            onClick={() => insertCodeBlock()}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Code Block"
            type="button"
          >
            <Code size={18} className="text-gray-700" />
          </button>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Clear Formatting */}
          <button
            onClick={() => execCommand('removeFormat')}
            className="p-2 hover:bg-gray-200 rounded transition-colors text-sm font-medium text-gray-700"
            title="Clear Formatting"
            type="button"
          >
            Clear
          </button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={updateContent}
          onBlur={updateContent}
          className="w-full min-h-64 p-4 focus:outline-none bg-white text-gray-900 leading-relaxed"
          style={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {value.html ? (
            <div dangerouslySetInnerHTML={{ __html: value.html }} />
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
      </div>

      {/* Character count */}
      <div className="text-xs text-gray-500 mt-1">
        {value.text.length} characters
      </div>
    </div>
  );
}