import { useState, useRef, useCallback } from 'react';
import RichTextEditor from '../../../components/RichTextEditor';
import { useSiteData, GalleryItem } from '../../../context/SiteDataContext';
import { mysqlService } from '../../../services/mysqlService';

const emptyItem = (): GalleryItem => ({
  id: Date.now().toString(),
  title: '',
  category: '',
  imageUrl: '',
  description: '',
});

export default function AdminGallery() {
  const { gallery, setGallery } = useSiteData();
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleEdit = (item: GalleryItem) => { setEditing({ ...item }); setShowForm(true); };
  const handleNew = () => { setEditing(emptyItem()); setShowForm(true); };

  const handleSave = async () => {
    if (!editing) return;
    try {
      let res;
      if (gallery.find((g) => String(g.id) === String(editing.id))) {
        const serverId = Number(editing.id) || null;
        if (serverId) {
          res = await mysqlService.updateGalleryItem(serverId.toString(), editing);
        }
      } else {
        res = await mysqlService.createGalleryItem(editing);
        if (res && res.ok && res.data && res.data.id) {
          editing.id = res.data.id.toString();
        }
      }
      if (!res || !res.ok) {
        throw new Error(res?.error || 'Failed to save gallery item');
      }
      const refreshed = await mysqlService.getGallery();
      if (refreshed.ok && Array.isArray(refreshed.data) && refreshed.data.length > 0) {
        setGallery(refreshed.data as any);
      } else {
        const nextGallery = gallery.some((g) => String(g.id) === String(editing.id))
          ? gallery.map((g) => String(g.id) === String(editing.id) ? { ...g, ...editing } : g)
          : [{ ...editing }, ...gallery];
        setGallery(nextGallery);
      }
    } catch (err) {
      console.error('[AdminGallery] save failed', err);
      alert('Failed to save gallery item to server. Please try again.');
      return;
    }
    setShowForm(false);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this photo?')) return;
    try {
      const result = await mysqlService.deleteGalleryItem(id);
      if (!result.ok) throw new Error(result.error || 'Delete failed');
      const refreshed = await mysqlService.getGallery();
      if (refreshed.ok && Array.isArray(refreshed.data)) {
        setGallery(refreshed.data as any);
      } else {
        setGallery(gallery.filter((g) => g.id !== id));
      }
    } catch (err) {
      console.error('[AdminGallery] delete failed', err);
      alert('Failed to delete gallery item on server.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

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

      const newItem: GalleryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        category: 'Uncategorized',
        imageUrl,
        description: '',
      };
      setGallery([newItem, ...gallery]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [gallery, setGallery]);

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

  const handleEditImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    let imageUrl = editing.imageUrl;
    const uploadResult = await mysqlService.uploadImage(file);
    if (uploadResult.ok && uploadResult.data?.url) {
      imageUrl = uploadResult.data.url;
    } else {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      imageUrl = dataUrl;
    }

    setEditing({ ...editing, imageUrl });
    e.target.value = '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-gray-900">Manage Gallery</h2>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" /> Add Photo
        </button>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
          Gallery updated successfully!
        </div>
      )}

      {/* ── Drag & Drop Zone ─────────────────────────────────────────────── */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-8 border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
          isDragging
            ? 'border-orange-500 bg-orange-50 scale-[1.01]'
            : 'border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50/40'
        }`}
      >
        <span className="w-14 h-14 flex items-center justify-center rounded-full bg-orange-100">
          <i className={`text-2xl ${isDragging ? 'ri-drop-line text-orange-600' : 'ri-image-add-line text-orange-500'}`} />
        </span>
        <div className="text-center">
          <p className="font-bold text-gray-800 text-base">
            {isDragging ? 'Drop images here!' : 'Drag & Drop Images Here'}
          </p>
          <p className="text-sm text-gray-500 mt-1">or click to browse — JPG, PNG, GIF, WebP supported</p>
          <p className="text-xs text-gray-400 mt-1">You can drop multiple images at once</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Form Modal */}
      {showForm && editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">
                {gallery.find((g) => g.id === editing.id) ? 'Edit Photo' : 'Add New Photo'}
              </h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Photo Title *</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="e.g. Office CCTV Installation"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                <input
                  type="text"
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="e.g. CCTV Installation"
                />
              </div>

              {/* Image upload in edit modal — drag/drop + URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Image *</label>
                {/* Drag drop mini zone */}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all mb-3"
                  onClick={() => document.getElementById('editImgFile')?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (!file || !file.type.startsWith('image/')) return;
                    const r = new FileReader();
                    r.onload = (ev) => setEditing({ ...editing, imageUrl: ev.target?.result as string });
                    r.readAsDataURL(file);
                  }}
                >
                  <span className="w-9 h-9 flex items-center justify-center">
                    <i className="ri-upload-cloud-2-line text-2xl text-orange-500" />
                  </span>
                  <p className="text-xs text-gray-500 text-center">Drag & drop or click to upload image</p>
                  <input
                    id="editImgFile"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditImageFile}
                  />
                </div>
                <p className="text-xs text-gray-400 mb-2 text-center">— or paste an image URL below —</p>
                <input
                  type="url"
                  value={editing.imageUrl.startsWith('data:') ? '' : editing.imageUrl}
                  onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="https://example.com/photo.jpg"
                />
                {editing.imageUrl && (
                  <img src={editing.imageUrl} alt="preview" className="mt-3 h-36 w-full object-cover rounded-xl" />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <RichTextEditor
                  value={editing.description}
                  onChange={(v) => setEditing({ ...editing, description: v })}
                  rows={3}
                  maxLength={300}
                  placeholder="Brief project description..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!editing.title || !editing.imageUrl}
                  className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Save Photo
                </button>
                <button onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-lg cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {gallery.map((item) => (
          <div key={item.id} className="group relative rounded-3xl overflow-hidden aspect-video bg-gray-100 shadow-lg shadow-black/10 border border-white/10">
            <img src={item.imageUrl} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
              <p className="text-white text-xs font-bold text-center line-clamp-2">{item.title}</p>
              <p className="text-orange-300 text-xs">{item.category}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="px-3 py-1.5 bg-white text-gray-800 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-edit-line mr-1" />Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(item.id)}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-delete-bin-line mr-1" />Del
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {gallery.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <i className="ri-image-line text-4xl mb-4 block" />
          <p>No gallery photos yet. Drag & drop images above to add some!</p>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Delete this photo?</h3>
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
