import { useState, useRef, useCallback } from 'react';
import { useSiteData, BlogPost } from '../../../context/SiteDataContext';
import { mysqlService } from '../../../services/mysqlService';

const emptyPost = (): BlogPost => ({
  id: Date.now().toString(),
  title: '',
  excerpt: '',
  content: '',
  date: new Date().toISOString().split('T')[0],
  category: '',
  imageUrl: '',
  author: 'PRIMECREST Team',
});

export default function AdminBlog() {
  const { blogPosts, setBlogPosts } = useSiteData();
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleEdit = (p: BlogPost) => { setEditing({ ...p }); setShowForm(true); };
  const handleNew = () => { setEditing(emptyPost()); setShowForm(true); };

  const handleSave = () => {
    if (!editing) return;
    const updated = blogPosts.find((p) => p.id === editing.id)
      ? blogPosts.map((p) => (p.id === editing.id ? editing : p))
      : [editing, ...blogPosts];
    setBlogPosts(updated);
    setShowForm(false);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = (id: string) => {
    setBlogPosts(blogPosts.filter((p) => p.id !== id));
    setDeleteConfirm(null);
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
        <h2 className="text-2xl font-black text-gray-900">Manage Blog</h2>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" /> Add Post
        </button>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
          Blog post saved!
        </div>
      )}

      {/* Form Modal */}
      {showForm && editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full mt-8 mb-8 p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">
                {blogPosts.find((p) => p.id === editing.id) ? 'Edit Post' : 'New Blog Post'}
              </h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Post Title *</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                  <input
                    type="text"
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                    placeholder="e.g. CCTV"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={editing.date}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Author</label>
                <input
                  type="text"
                  value={editing.author}
                  onChange={(e) => setEditing({ ...editing, author: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cover Image</label>
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
                  <img src={editing.imageUrl} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg" />
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Excerpt *</label>
                <textarea
                  value={editing.excerpt}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                  rows={2}
                  maxLength={300}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  placeholder="Short summary of the post..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Content *</label>
                <textarea
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  rows={14}
                  maxLength={2000}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  placeholder="Full blog post content... Write as much detail as needed for the article."
                />
                <p className="text-xs text-gray-400 mt-1">{editing.content.length}/2000</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!editing.title || !editing.excerpt}
                  className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Save Post
                </button>
                <button onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-lg cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {blogPosts.map((post) => (
          <div key={post.id} className="bg-white rounded-xl p-5 border border-gray-100 flex items-center gap-5">
            <div className="w-20 h-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <i className="ri-article-line text-2xl" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{post.category}</span>
                <span className="text-xs text-gray-400">{post.date}</span>
              </div>
              <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{post.title}</h4>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => handleEdit(post)} className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:border-orange-400 hover:text-orange-600 cursor-pointer whitespace-nowrap">
                <i className="ri-edit-line mr-1" />Edit
              </button>
              <button onClick={() => setDeleteConfirm(post.id)} className="px-4 py-2 border border-red-100 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 cursor-pointer whitespace-nowrap">
                <i className="ri-delete-bin-line mr-1" />Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Delete Post?</h3>
            <p className="text-gray-500 text-sm mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg cursor-pointer">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-lg cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}