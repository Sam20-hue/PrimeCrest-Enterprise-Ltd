import { useState, useRef, useCallback } from 'react';
import { useSiteData, Service } from '../../../context/SiteDataContext';
import { mysqlService } from '../../../services/mysqlService';

const emptyService = (): Service => ({
  id: Date.now().toString(),
  title: '',
  description: '',
  details: '',
  icon: 'ri-tools-line',
  image: '',
  images: [],
  features: ['', '', ''],
});

export default function AdminServices() {
  const { services, setServices } = useSiteData();
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleEdit = (s: Service) => { setEditing({ ...s }); setShowForm(true); };
  const serviceTitleOptions = services.map((service) => service.title).filter(Boolean);

  const handleNew = () => { setEditing(emptyService()); setShowForm(true); };

  const handleSave = () => {
    if (!editing) return;
    const updated = services.find((s) => s.id === editing.id)
      ? services.map((s) => (s.id === editing.id ? editing : s))
      : [editing, ...services];
    setServices(updated);
    setShowForm(false);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
    setDeleteConfirm(null);
  };

  const updateFeature = (idx: number, val: string) => {
    if (!editing) return;
    const features = [...editing.features];
    features[idx] = val;
    setEditing({ ...editing, features });
  };

  const addFeature = () => {
    if (!editing) return;
    setEditing({ ...editing, features: [...editing.features, ''] });
  };

  const removeFeature = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, features: editing.features.filter((_, i) => i !== idx) });
  };

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !editing) return;
    const file = Array.from(files)[0];
    if (!file.type.startsWith('image/')) return;

    let imageUrl = editing.image;
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

    setEditing({ ...editing, image: imageUrl });
  }, [editing]);

  const processGalleryFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !editing) return;

    const urls = await Promise.all(
      Array.from(files)
        .filter((file) => file.type.startsWith('image/'))
        .map(async (file) => {
          const uploadResult = await mysqlService.uploadImage(file);
          if (uploadResult.ok && uploadResult.data?.url) {
            return uploadResult.data.url;
          }
          const reader = new FileReader();
          return new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        })
    );

    setEditing({ ...editing, images: [...(editing.images || []), ...urls.filter(Boolean)] });
  }, [editing]);

  const removeGalleryImage = (index: number) => {
    if (!editing) return;
    setEditing({ ...editing, images: editing.images?.filter((_, i) => i !== index) || [] });
  };

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

  const handleGalleryFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processGalleryFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-gray-900">Manage Services</h2>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" /> Add Service
        </button>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
          Service saved successfully!
        </div>
      )}

      {/* Form Modal */}
      {showForm && editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full mt-8 mb-8 p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">
                {services.find((s) => s.id === editing.id) ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              {serviceTitleOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Choose or type a service title</label>
                  <div className="flex gap-3 flex-col sm:flex-row">
                    <select
                      value={editing.title}
                      onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                      className="w-full sm:w-1/2 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                    >
                      <option value="">Select existing title</option>
                      {serviceTitleOptions.map((title) => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editing.title}
                      onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                      placeholder="Or enter a new service title"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Service Title *</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="e.g. CCTV Installation"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  placeholder="Describe this service..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Service Details</label>
                <textarea
                  value={editing.details}
                  onChange={(e) => setEditing({ ...editing, details: e.target.value })}
                  rows={8}
                  maxLength={3000}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  placeholder="Add longer service details, benefits, process steps, and other content to appear on the detail page."
                />
                <p className="text-xs text-gray-400 mt-2">Use new paragraphs and line breaks to separate sections.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Service Image</label>
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
                {editing.image && (
                  <img src={editing.image} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg" />
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Gallery Images</label>
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <button
                    type="button"
                    onClick={() => galleryFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <i className="ri-upload-2-line" /> Upload Images
                  </button>
                  <span className="text-xs text-gray-500">You can upload multiple images for the detail page gallery.</span>
                </div>
                <input
                  ref={galleryFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleGalleryFileInput}
                />
                <textarea
                  value={(editing.images || []).join('\n')}
                  onChange={(e) => setEditing({ ...editing, images: e.target.value.split('\n').filter(Boolean) })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  placeholder="Enter one image URL per line"
                />
                <p className="text-xs text-gray-400 mt-2">These images appear in the service detail gallery. You can also upload new images above.</p>
                {editing.images && editing.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {editing.images.map((imageUrl, index) => (
                      <div key={index} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                        <img src={imageUrl} alt={`Gallery ${index + 1}`} className="h-28 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(index)}
                          className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          <i className="ri-close-line" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Icon Class</label>
                <input
                  type="text"
                  value={editing.icon}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="ri-camera-line"
                />
                <p className="text-xs text-gray-400 mt-1">Use Remix Icon class names, e.g. ri-camera-line, ri-safe-line</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Features</label>
                  <button onClick={addFeature} className="text-xs text-orange-600 font-semibold cursor-pointer">+ Add Feature</button>
                </div>
                <div className="space-y-2">
                  {editing.features.map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={f}
                        onChange={(e) => updateFeature(i, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                        placeholder={`Feature ${i + 1}`}
                      />
                      <button onClick={() => removeFeature(i)} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer">
                        <i className="ri-delete-bin-line" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!editing.title || !editing.description}
                  className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 cursor-pointer disabled:opacity-50"
                >
                  Save Service
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-xl p-5 border border-gray-100 flex items-center gap-5">
            <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
              {service.image ? (
                <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className={`${service.icon} text-orange-500 text-2xl`} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-sm">{service.title}</h4>
              <p className="text-gray-500 text-xs line-clamp-2 mt-1">{service.description}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleEdit(service)}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:border-orange-400 hover:text-orange-600 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-edit-line mr-1" />Edit
              </button>
              <button
                onClick={() => setDeleteConfirm(service.id)}
                className="px-4 py-2 border border-red-100 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-delete-bin-line mr-1" />Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Delete Service?</h3>
            <p className="text-gray-500 text-sm mb-5">This action cannot be undone.</p>
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