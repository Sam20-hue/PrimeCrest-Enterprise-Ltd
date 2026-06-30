import { useState, useRef, useCallback } from 'react';
import RichTextEditor from '../../../components/RichTextEditor';
import { useSiteData, Author } from '../../../context/SiteDataContext';
import { mysqlService } from '../../../services/mysqlService';

export default function AdminAuthors() {
  const { authors, setAuthors } = useSiteData();
  const [editing, setEditing] = useState<Author | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const emptyAuthor = (): Author => ({
    id: Date.now().toString(),
    name: '',
    imageUrl: '',
    bio: '',
  });

  const handleEdit = (a: Author) => {
    setEditing({ ...a });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditing(emptyAuthor());
    setShowForm(true);
  };

  const handleSave = () => {
    if (!editing || !editing.name) return;
    const updated = authors.find((a) => a.id === editing.id)
      ? authors.map((a) => (a.id === editing.id ? editing : a))
      : [editing, ...authors];
    setAuthors(updated);
    setShowForm(false);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = (id: string) => {
    setAuthors(authors.filter((a) => a.id !== id));
  };

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !editing) return;
    const file = Array.from(files)[0];
    if (!file.type.startsWith('image/')) return;

    let imageUrl = editing.imageUrl;
    const uploadResult = await mysqlService.uploadImage(file);
    if (uploadResult.ok && uploadResult.data?.url) {
      imageUrl = uploadResult.data.url;
    } else {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      imageUrl = dataUrl;
    }

    setEditing({ ...editing, imageUrl });
  }, [editing]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-gray-900">Manage Authors</h2>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" /> Add Author
        </button>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
          Author saved!
        </div>
      )}

      {/* Form Modal */}
      {showForm && editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full mt-8 mb-8 p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">
                {authors.find((a) => a.id === editing.id) ? 'Edit Author' : 'New Author'}
              </h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Author Name *</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g., John Smith"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Author Image</label>
                <div
                  ref={dropZoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    isDragging
                      ? 'border-orange-500 bg-orange-50 scale-[1.01]'
                      : 'border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50/40'
                  }`}
                >
                  <span className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100">
                    <i className={`text-lg ${isDragging ? 'ri-drop-line text-orange-600' : 'ri-image-add-line text-orange-500'}`} />
                  </span>
                  <div className="text-center">
                    <p className="font-semibold text-gray-700 text-sm">
                      {isDragging ? 'Drop image here!' : 'Drag & Drop Image Here'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">or click to browse — JPG, PNG, GIF, WebP supported</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
                {editing.imageUrl && (
                  <img src={editing.imageUrl} alt="preview" className="mt-2 h-24 w-24 object-cover rounded-lg" />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
                <RichTextEditor
                  value={editing.bio || ''}
                  onChange={(v) => setEditing({ ...editing, bio: v })}
                  rows={3}
                  maxLength={300}
                  placeholder="Short bio about the author..."
                />
                <p className="text-xs text-gray-400 mt-1">{(editing.bio || '').length}/300</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!editing.name}
                  className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Save Author
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Authors List */}
      {authors.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No authors have been created yet. Start by adding an author.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {authors.map((author) => (
            <div key={author.id} className="rounded-xl border border-gray-100 bg-white p-6">
              <div className="flex items-start gap-4 mb-4">
                {author.imageUrl ? (
                  <img src={author.imageUrl} alt={author.name} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <i className="ri-user-line text-2xl text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{author.name}</h3>
                  {author.bio && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{author.bio}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(author)}
                  className="flex-1 px-3 py-2 rounded-lg border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors text-xs font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete author "${author.name}"?`)) {
                      handleDelete(author.id);
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors text-xs font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
