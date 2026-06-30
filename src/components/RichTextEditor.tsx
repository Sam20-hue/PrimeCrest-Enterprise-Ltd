import { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  rows?: number;
}

const normalizeEditorValue = (value: string) => {
  if (!value) return '';
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  return value.replace(/\n/g, '<br>');
};

export default function RichTextEditor({ value, onChange, maxLength = 4000, placeholder, rows = 14 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastValueRef = useRef(value);
  const [showFloating, setShowFloating] = useState(false);
  const [floatingPos, setFloatingPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const nextValue = normalizeEditorValue(value);
    const currentValue = editorRef.current.innerHTML;
    if (currentValue !== nextValue && !isFocused) {
      editorRef.current.innerHTML = nextValue;
    }
  }, [value, isFocused]);

  const handleInput = () => {
    if (!editorRef.current) return;

    const nextValue = editorRef.current.innerHTML;
    if (nextValue.length > maxLength) {
      editorRef.current.innerHTML = nextValue.slice(0, maxLength);
    }

    lastValueRef.current = editorRef.current.innerHTML;
    onChange(editorRef.current.innerHTML);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && e.ctrlKey === false && e.shiftKey === false) {
      return;
    }
  };

  const executeCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const applyFormat = (command: string, value?: string) => {
    executeCommand(command, value);
    requestAnimationFrame(() => handleInput());
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const color = event.target.value;
    applyFormat('foreColor', color);
    event.target.value = color;
  };

  const updateFloatingToolbar = () => {
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) {
      setShowFloating(false);
      setFloatingPos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const selectedText = sel.toString();
    if (!selectedText || !editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) {
      setShowFloating(false);
      setFloatingPos(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = editorRef.current.getBoundingClientRect();
    const top = rect.top - containerRect.top - 44; // position above selection
    const left = Math.max(8, rect.left - containerRect.left + rect.width / 2 - 120);
    setFloatingPos({ top, left });
    setShowFloating(true);
  };

  useEffect(() => {
    const onMouseUp = () => setTimeout(updateFloatingToolbar, 10);
    const onKeyUp = () => setTimeout(updateFloatingToolbar, 10);
    const onScroll = () => setShowFloating(false);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!editorRef.current) return;
      const target = e.target as Node | null;
      if (target && !editorRef.current.contains(target)) {
        setShowFloating(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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
        <label
          title="Text Color"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded hover:bg-gray-200 transition-colors"
        >
          <i className="ri-font-color text-gray-700" />
          <input
            type="color"
            defaultValue="#ff6b35"
            onChange={handleColorChange}
            className="absolute h-0 w-0 opacity-0"
          />
        </label>
      </div>
      <div style={{ position: 'relative' }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full px-4 py-3 border rounded-b-lg text-sm focus:outline-none resize-none overflow-y-auto transition-colors ${
            isFocused ? 'border-orange-400 bg-white' : 'border-gray-200 bg-gray-50'
          }`}
          style={{ minHeight: `${rows * 1.5}em`, maxHeight: '640px' }}
        />
        {showFloating && floatingPos && (
          <div
            className="absolute z-50 bg-white shadow-lg rounded-lg border border-gray-200 p-1 flex items-center gap-1"
            style={{ top: floatingPos.top, left: floatingPos.left, width: 240 }}
            role="toolbar"
          >
            <button type="button" onClick={() => applyFormat('bold')} className="p-2 rounded hover:bg-gray-100" title="Bold">
              <i className="ri-bold text-gray-700" />
            </button>
            <button type="button" onClick={() => applyFormat('italic')} className="p-2 rounded hover:bg-gray-100" title="Italic">
              <i className="ri-italic text-gray-700" />
            </button>
            <button type="button" onClick={() => applyFormat('underline')} className="p-2 rounded hover:bg-gray-100" title="Underline">
              <i className="ri-underline text-gray-700" />
            </button>
            <button type="button" onClick={() => applyFormat('insertUnorderedList')} className="p-2 rounded hover:bg-gray-100" title="Bullets">
              <i className="ri-list-unordered text-gray-700" />
            </button>
            <button type="button" onClick={() => applyFormat('insertOrderedList')} className="p-2 rounded hover:bg-gray-100" title="Numbered">
              <i className="ri-list-ordered text-gray-700" />
            </button>
            <div className="flex-1" />
            <label title="Text Color" className="flex items-center justify-center p-1 rounded cursor-pointer">
              <i className="ri-font-color text-gray-700" />
              <input type="color" defaultValue="#ff6b35" onChange={handleColorChange} className="absolute h-0 w-0 opacity-0" />
            </label>
          </div>
        )}
        {!value && !isFocused && (
          <div 
            className="absolute top-3 left-4 text-gray-400 pointer-events-none text-sm"
            style={{ pointerEvents: 'none' }}
          >
            {placeholder}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400">{value.length}/{maxLength}</p>
    </div>
  );
}
