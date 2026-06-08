import { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  rows?: number;
}

export default function RichTextEditor({ value, onChange, maxLength = 2000, placeholder, rows = 14 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== value) {
      editorRef.current.innerHTML = value.replace(/\n/g, '<br>');
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      let text = editorRef.current.innerText;
      if (text.length > maxLength) {
        text = text.substring(0, maxLength);
      }
      onChange(text);
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const applyFormat = (command: string, value?: string) => {
    executeCommand(command, value);
    handleInput();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border border-gray-200 rounded-t-lg">
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          title="Bold"
          className="p-2 rounded hover:bg-gray-200 transition-colors"
        >
          <i className="ri-bold text-gray-700" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('italic')}
          title="Italic"
          className="p-2 rounded hover:bg-gray-200 transition-colors"
        >
          <i className="ri-italic text-gray-700" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('underline')}
          title="Underline"
          className="p-2 rounded hover:bg-gray-200 transition-colors"
        >
          <i className="ri-underline text-gray-700" />
        </button>
        <div className="border-l border-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => applyFormat('insertUnorderedList')}
          title="Bullet List"
          className="p-2 rounded hover:bg-gray-200 transition-colors"
        >
          <i className="ri-list-unordered text-gray-700" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('insertOrderedList')}
          title="Numbered List"
          className="p-2 rounded hover:bg-gray-200 transition-colors"
        >
          <i className="ri-list-ordered text-gray-700" />
        </button>
        <div className="border-l border-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => applyFormat('formatBlock', '<h1>')}
          title="Heading 1"
          className="p-2 rounded hover:bg-gray-200 transition-colors text-sm font-semibold"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => applyFormat('formatBlock', '<h2>')}
          title="Heading 2"
          className="p-2 rounded hover:bg-gray-200 transition-colors text-sm font-semibold"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => applyFormat('formatBlock', '<p>')}
          title="Paragraph"
          className="p-2 rounded hover:bg-gray-200 transition-colors text-xs"
        >
          P
        </button>
        <div className="border-l border-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => {
            const color = prompt('Enter color (hex or name):', '#ff6b35');
            if (color) applyFormat('foreColor', color);
          }}
          title="Text Color"
          className="p-2 rounded hover:bg-gray-200 transition-colors"
        >
          <i className="ri-font-color text-gray-700" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full px-4 py-3 border rounded-b-lg text-sm focus:outline-none resize-none overflow-y-auto transition-colors ${
          isFocused ? 'border-orange-400 bg-white' : 'border-gray-200 bg-gray-50'
        }`}
        style={{ minHeight: `${rows * 1.5}em` }}
        suppressContentEditableWarning
      >
        {placeholder && !value && <span className="text-gray-400">{placeholder}</span>}
      </div>
      <p className="text-xs text-gray-400">{value.length}/{maxLength}</p>
    </div>
  );
}
