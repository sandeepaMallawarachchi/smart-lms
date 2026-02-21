// /components/projects-and-tasks/lecturer/RichTextEditor.tsx

'use client';

import React, { useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Code,
} from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import PlaceholderExtension from '@tiptap/extension-placeholder';

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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: {
            style:
              'background:#f5f5f5;padding:10px;border-radius:4px;font-family:monospace;',
          },
        },
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
      }),
      PlaceholderExtension.configure({
        placeholder,
      }),
    ],
    content: value.html || '',
    editorProps: {
      attributes: {
        class:
          'tiptap-editor w-full min-h-64 p-4 focus:outline-none bg-white text-gray-900 leading-relaxed whitespace-pre-wrap text-left',
        dir: 'ltr',
      },
    },
    onUpdate({ editor }) {
      const text = editor.getText().trim();
      const html = text.length === 0 ? '' : editor.getHTML();
      onChange({ html, text });
    },
  });

  useEffect(() => {
    if (!editor) return;

    const incomingHtml = value.html || '';
    const currentHtml = editor.getHTML();

    // Avoid cursor jumps by only syncing external updates when content actually differs.
    if (incomingHtml !== currentHtml) {
      editor.commands.setContent(incomingHtml, { emitUpdate: false });
    }
  }, [editor, value.html]);

  const insertLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = prompt('Enter URL:', previousUrl || '')?.trim();

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
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
        <div className="bg-gray-100 border-b border-gray-300 p-2 flex flex-wrap gap-1">
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Bold (Ctrl+B)"
            type="button"
            disabled={!editor}
          >
            <Bold size={18} className="text-gray-700" />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Italic (Ctrl+I)"
            type="button"
            disabled={!editor}
          >
            <Italic size={18} className="text-gray-700" />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Underline (Ctrl+U)"
            type="button"
            disabled={!editor}
          >
            <Underline size={18} className="text-gray-700" />
          </button>

          <div className="w-px bg-gray-300"></div>

          <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Bullet List"
            type="button"
            disabled={!editor}
          >
            <List size={18} className="text-gray-700" />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Numbered List"
            type="button"
            disabled={!editor}
          >
            <ListOrdered size={18} className="text-gray-700" />
          </button>

          <div className="w-px bg-gray-300"></div>

          <button
            onClick={insertLink}
            className="p-2 hover:bg-gray-200 rounded transition-colors text-sm font-medium"
            title="Link"
            type="button"
            disabled={!editor}
          >
            Link
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Code Block"
            type="button"
            disabled={!editor}
          >
            <Code size={18} className="text-gray-700" />
          </button>

          <div className="flex-1"></div>

          <button
            onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
            className="p-2 hover:bg-gray-200 rounded transition-colors text-sm font-medium text-gray-700"
            title="Clear Formatting"
            type="button"
            disabled={!editor}
          >
            Clear
          </button>
        </div>

        <EditorContent editor={editor} />
      </div>

      <div className="text-xs text-gray-500 mt-1">{value.text.length} characters</div>
    </div>
  );
}
