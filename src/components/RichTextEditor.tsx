import { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  rows?: number;
}

const FONT_FAMILIES = [
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { name: 'Courier New', value: '"Courier New", monospace' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { name: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { name: 'Impact', value: 'Impact, fantasy' },
  { name: 'Palatino', value: '"Palatino Linotype", serif' },
  { name: 'Lucida Console', value: '"Lucida Console", monospace' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { name: 'Segoe UI', value: '"Segoe UI", sans-serif' },
];

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
    // Allow normal key handling
    if (e.key === 'Enter' && e.shiftKey === false && !e.ctrlKey) {
      // Allow normal enter for line breaks
    }
  };

  const executeCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value || undefined);
    handleInput();
  };

  const applyFormat = (command: string, value?: string) => {
    executeCommand(command, value);
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const color = event.target.value;
    editorRef.current?.focus();
    
    // Enable CSS-based styling instead of deprecated font tags
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    
    handleInput();
    // Reset input so same color can be selected again
    event.target.value = '#000000';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Try to get HTML content first, fallback to plain text
    const htmlText = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');
    
    if (htmlText) {
      // Paste as HTML to preserve formatting (colors, fonts, bold, etc.)
      document.execCommand('insertHTML', false, htmlText);
    } else if (plainText) {
      // Fallback to plain text if HTML not available
      document.execCommand('insertText', false, plainText);
    }
    
    handleInput();
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
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border border-gray-200 rounded-t-lg items-center">
        <select
          onChange={(e) => {
            if (e.target.value) {
              document.execCommand('fontName', false, e.target.value);
              handleInput();
            }
            e.target.value = '';
          }}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none hover:bg-gray-100"
          title="Font"
        >
          <option value="">Font</option>
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.name}
            </option>
          ))}
        </select>
        <div className="border-l border-gray-300 mx-1 h-6" />
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
          onClick={() => {
            editorRef.current?.focus();
            document.execCommand('insertUnorderedList', false);
            handleInput();
          }}
          title="Bullet List"
          className="p-2 rounded hover:bg-gray-200 transition-colors"
        >
          <i className="ri-list-unordered text-gray-700" />
        </button>
        <button
          type="button"
          onClick={() => {
            editorRef.current?.focus();
            document.execCommand('insertOrderedList', false);
            handleInput();
          }}
          title="Numbered List"
          className="p-2 rounded hover:bg-gray-200 transition-colors"
        >
          <i className="ri-list-ordered text-gray-700" />
        </button>
        <div className="border-l border-gray-300 mx-1 h-6" />
        <select
          onChange={(e) => {
            if (e.target.value) {
              document.execCommand('formatBlock', false, e.target.value);
              handleInput();
            }
            e.target.value = '';
          }}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none hover:bg-gray-100"
          title="Block Format"
        >
          <option value="">Format</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="p">Paragraph</option>
        </select>
        <div className="border-l border-gray-300 mx-1 h-6" />
        <label
          title="Text Color"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded hover:bg-gray-200 transition-colors relative group"
        >
          <i className="ri-font-color text-gray-700" />
          <input
            type="color"
            defaultValue="#000000"
            onChange={handleColorChange}
            className="absolute opacity-0 w-0 h-0 cursor-pointer"
            title="Pick text color"
          />
          <span className="absolute bottom-full mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Text Color
          </span>
        </label>
      </div>
      <div style={{ position: 'relative' }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full px-4 py-3 border rounded-b-lg text-sm focus:outline-none resize-none overflow-y-auto transition-colors ${
            isFocused ? 'border-orange-400 bg-white' : 'border-gray-200 bg-gray-50'
          }`}
          style={{
            minHeight: `${rows * 1.5}em`,
            maxHeight: '640px',
            fontFamily: 'inherit',
            lineHeight: '1.6',
          }}
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
            <button type="button" onClick={() => {
              editorRef.current?.focus();
              document.execCommand('insertUnorderedList', false);
              handleInput();
            }} className="p-2 rounded hover:bg-gray-100" title="Bullets">
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
