import { useState, useRef, useCallback } from 'react';
import { useSiteData, BlogPost } from '../../../context/SiteDataContext';
import { mysqlService } from '../../../services/mysqlService';
import RichTextEditor from '../../../components/RichTextEditor';

const emptyPost = (): BlogPost => ({
  id: Date.now().toString(),
  title: '',
  excerpt: '',
  content: '',
  date: new Date().toISOString().split('T')[0],
  category: '',
  imageUrl: '',
  images: [],
  author: '',
  authorId: '',
  published: false,
});

export default function AdminBlog() {
  const { blogPosts, setBlogPosts, subscribers, authors } = useSiteData();
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isImagesDragging, setIsImagesDragging] = useState(false);
  const [notifySubscribers, setNotifySubscribers] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesFileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const imagesDropZoneRef = useRef<HTMLDivElement>(null);

  const handleEdit = (p: BlogPost) => { setEditing({ ...p }); setShowForm(true); setNotifySubscribers(false); };
  const handleNew = () => { setEditing(emptyPost()); setShowForm(true); setNotifySubscribers(false); };

  const handleSave = async () => {
    if (!editing) return;

    // Ensure we preserve/resolve authorId when possible: if the editor has
    // a matching saved author name but no authorId, attach the author's id.
    const finalEditing = { ...editing };
    if (!finalEditing.authorId && finalEditing.author) {
      const match = authors.find((a) => a.name?.toLowerCase() === finalEditing.author?.toLowerCase());
      if (match) finalEditing.authorId = match.id;
    }

    const isNewPost = !blogPosts.find((p) => p.id === finalEditing.id);
    const wasPublished = blogPosts.find((p) => p.id === finalEditing.id)?.published;
    const isNowPublished = finalEditing.published;

    const updated = blogPosts.find((p) => p.id === finalEditing.id)
      ? blogPosts.map((p) => (p.id === finalEditing.id ? finalEditing : p))
      : [finalEditing, ...blogPosts];
    setBlogPosts(updated);
    
    // Send notification emails if publishing a new post or just published a draft
    if ((isNewPost || !wasPublished) && isNowPublished && notifySubscribers && subscribers.length > 0) {
      setSending(true);
      try {
        const postUrl = `${window.location.origin}/blog/${editing.id}`;
        const response = await fetch('/api/blog/notify-subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editing.title,
            excerpt: editing.excerpt,
            date: editing.date,
            category: editing.category,
            postUrl,
            subscribers: subscribers,
          }),
        });
        
        if (!response.ok) {
          console.warn('Failed to send notifications');
        }
      } catch (err) {
        console.error('Error sending subscriber notifications:', err);
      } finally {
        setSending(false);
      }
    }
    
    setShowForm(false);
    setEditing(null);
    setNotifySubscribers(false);
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

  const processAdditionalImages = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !editing) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const uploadedImages: Array<{ url: string; description?: string }> = [];
    for (const file of imageFiles) {
      let imageUrl = '';
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
      uploadedImages.push({ url: imageUrl, description: '' });
    }

    const updatedImages = [...(editing.images || []), ...uploadedImages];
    setEditing({ ...editing, images: updatedImages });
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

  const handleImagesDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsImagesDragging(true);
  };

  const handleImagesDragLeave = (e: React.DragEvent) => {
    if (!imagesDropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsImagesDragging(false);
    }
  };

  const handleImagesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsImagesDragging(false);
    processAdditionalImages(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleImagesFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processAdditionalImages(e.target.files);
    e.target.value = '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-gray-900">Manage Blog</h2>
        <button
          type="button"
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full mt-8 mb-8 p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">
                {blogPosts.find((p) => p.id === editing.id) ? 'Edit Post' : 'New Blog Post'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer">
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
                  onChange={(e) => setEditing({ ...editing, author: e.target.value, authorId: '' })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="Author name"
                />
                {authors.length > 0 && (
                  <div className="mt-3 space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">Or select a saved author</label>
                    <select
                      value={editing.authorId || ''}
                      onChange={(e) => {
                        const authorId = e.target.value;
                        const selectedAuthor = authors.find((a) => a.id === authorId);
                        setEditing({
                          ...editing,
                          authorId,
                          author: selectedAuthor?.name || '',
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                    >
                      <option value="">-- Select a saved author --</option>
                      {authors.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.name}
                        </option>
                      ))}
                    </select>
                    {editing.authorId && (
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 border border-gray-200 overflow-hidden">
                          {authors.find((a) => a.id === editing.authorId)?.imageUrl ? (
                            <img
                              src={authors.find((a) => a.id === editing.authorId)?.imageUrl}
                              alt="Author avatar"
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                          {!authors.find((a) => a.id === editing.authorId)?.imageUrl && (
                            <span className="text-xs font-bold text-gray-600">
                              {authors.find((a) => a.id === editing.authorId)?.name?.[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{authors.find((a) => a.id === editing.authorId)?.name}</p>
                          <p className="text-xs text-gray-500">Selected saved author</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Publish Status</label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editing.published}
                      onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                      className="h-4 w-4 text-orange-600 border-gray-300 rounded"
                    />
                    Published
                  </label>
                  {editing.published && subscribers.length > 0 && (
                    <label className="block text-sm text-gray-600 mt-2">
                      <input
                        type="checkbox"
                        checked={notifySubscribers}
                        onChange={(e) => setNotifySubscribers(e.target.checked)}
                        className="h-4 w-4 text-orange-600 border-gray-300 rounded mr-2"
                      />
                      Notify {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''} about this post
                    </label>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Additional Image URLs</label>
                  <div
                    ref={imagesDropZoneRef}
                    onDragOver={handleImagesDragOver}
                    onDragLeave={handleImagesDragLeave}
                    onDrop={handleImagesDrop}
                    onClick={() => imagesFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      isImagesDragging
                        ? 'border-orange-500 bg-orange-50 scale-[1.01]'
                        : 'border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50/40'
                    }`}
                  >
                    <span className="text-xs text-gray-600">
                      {isImagesDragging ? '📷 Drop images here!' : '📁 Drag & Drop images here or paste URLs below'}
                    </span>
                    <input
                      ref={imagesFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImagesFileInput}
                    />
                  </div>
                  <textarea
                    value={(editing.images || []).map(img => typeof img === 'string' ? img : img.url).join('\n')}
                    onChange={(e) => {
                      const urls = e.target.value.split('\n').filter(Boolean);
                      setEditing({ ...editing, images: urls.map(url => ({ url, description: '' })) });
                    }}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                    placeholder="One image URL per line (or drag & drop above)"
                  />
                  {editing.images && editing.images.length > 0 && (
                    <div className="space-y-3">
                      {editing.images.map((img, idx) => {
                        const imgUrl = typeof img === 'string' ? img : img.url;
                        const imgDesc = typeof img === 'string' ? '' : (img.description || '');
                        return (
                          <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-start gap-3">
                              <img src={imgUrl} alt={`Additional ${idx}`} className="w-16 h-16 object-cover rounded flex-shrink-0" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              <div className="flex-1 min-w-0 space-y-2">
                                <textarea
                                  value={imgDesc}
                                  onChange={(e) => {
                                    const newImages = [...(editing.images || [])];
                                    const image = newImages[idx];
                                    if (typeof image !== 'string') {
                                      image.description = e.target.value;
                                    }
                                    setEditing({ ...editing, images: newImages });
                                  }}
                                  rows={3}
                                  maxLength={3000}
                                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-400 resize-none"
                                  placeholder="Image title and description (max 3000 words)..."
                                />
                                <div className="text-xs text-gray-500">
                                  {imgDesc.split(/\s+/).length} words
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditing({ ...editing, images: editing.images?.filter((_, i) => i !== idx) || [] })}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 flex-shrink-0"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Content * (Max 6500 words)</label>
                <RichTextEditor
                  value={editing.content}
                  onChange={(value) => setEditing({ ...editing, content: value })}
                  maxLength={6500}
                  placeholder="Full blog post content... Write as much detail as needed for the article."
                  rows={14}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!editing.title || !editing.excerpt || sending}
                  className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending && <i className="ri-loader-4-line animate-spin" />}
                  {sending ? 'Sending...' : 'Save Post'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-lg cursor-pointer">
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
                <span className={`text-xs px-2 py-0.5 rounded-full ${post.published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {post.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{post.title}</h4>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button type="button" onClick={() => handleEdit(post)} className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:border-orange-400 hover:text-orange-600 cursor-pointer whitespace-nowrap">
                <i className="ri-edit-line mr-1" />Edit
              </button>
              <button type="button" onClick={() => setDeleteConfirm(post.id)} className="px-4 py-2 border border-red-100 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 cursor-pointer whitespace-nowrap">
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
              <button type="button" onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg cursor-pointer">Delete</button>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-lg cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}