import { useState, useRef, useCallback } from 'react';
import { useSiteData, TeamMember } from '../../../context/SiteDataContext';
import { mysqlService } from '../../../services/mysqlService';

const emptyMember = (): TeamMember => ({
  id: Date.now().toString(),
  name: '',
  role: '',
  imageUrl: '',
});

export default function AdminTeam() {
  const { team, setTeam } = useSiteData();
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleEdit = (m: TeamMember) => { setEditing({ ...m }); setShowForm(true); };
  const handleNew = () => { setEditing(emptyMember()); setShowForm(true); };

  const handleTeamImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    const result = await mysqlService.uploadImage(file);
    if (result.ok && result.data?.url) {
      setEditing({ ...editing, imageUrl: result.data.url });
    } else {
      // fallback to local preview if upload fails
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditing({ ...editing, imageUrl: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !editing) return;
    const file = Array.from(files)[0];
    if (!file.type.startsWith('image/')) return;

    const result = await mysqlService.uploadImage(file);
    if (result.ok && result.data?.url) {
      setEditing({ ...editing, imageUrl: result.data.url });
    } else {
      // fallback to local preview if upload fails
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      setEditing({ ...editing, imageUrl: dataUrl });
    }
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

  const handleSave = () => {
    if (!editing) return;
    const updated = team.find((m) => m.id === editing.id)
      ? team.map((m) => (m.id === editing.id ? editing : m))
      : [...team, editing];
    setTeam(updated);
    setShowForm(false);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDelete = (id: string) => {
    setTeam(team.filter((m) => m.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Manage Team</h2>
          <p className="text-sm text-gray-400 mt-1">Add, edit or remove team members shown on the About page.</p>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" /> Add Member
        </button>
      </div>

      {saved && (
        <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium flex items-center gap-2">
          <i className="ri-checkbox-circle-fill text-green-500" /> Team member saved successfully!
        </div>
      )}

      {/* Form Modal */}
      {showForm && editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full mt-12 mb-8 p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">
                {team.find((m) => m.id === editing.id) ? 'Edit Team Member' : 'Add New Team Member'}
              </h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Photo preview */}
              <div className="flex justify-center mb-2">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-orange-100 bg-gray-50 flex items-center justify-center">
                  {editing.imageUrl ? (
                    <img
                      src={editing.imageUrl}
                      alt="preview"
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) parent.innerHTML = '<i class="ri-user-line text-3xl text-gray-300" />';
                      }}
                    />
                  ) : (
                    <i className="ri-user-line text-3xl text-gray-300" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="e.g. John Kamau"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Job Title / Role *</label>
                <input
                  type="text"
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="e.g. Managing Director"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Photo</label>
                <div
                  ref={dropZoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    isDragging
                      ? 'border-orange-500 bg-orange-50 scale-[1.01]'
                      : 'border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50/40'
                  }`}
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-100">
                    <i className={`text-sm ${isDragging ? 'ri-drop-line text-orange-600' : 'ri-image-add-line text-orange-500'}`} />
                  </span>
                  <div className="text-center">
                    <p className="font-semibold text-gray-700 text-sm">
                      {isDragging ? 'Drop photo here!' : 'Drag & Drop Photo Here'}
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
                <p className="text-xs text-gray-400 mt-2">Square portrait recommended for best display.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!editing.name || !editing.role}
                  className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50 hover:bg-orange-700 transition-colors"
                >
                  Save Member
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Grid */}
      {team.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <i className="ri-team-line text-5xl mb-4 block" />
          <p className="font-medium">No team members yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.map((member) => (
            <div key={member.id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-100 flex-shrink-0 bg-gray-50">
                {member.imageUrl ? (
                  <img
                    src={member.imageUrl}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><i class="ri-user-line text-2xl text-gray-300" /></div>';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="ri-user-line text-2xl text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-sm truncate">{member.name}</h4>
                <p className="text-xs text-orange-600 mt-0.5 truncate">{member.role}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEdit(member)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-600 cursor-pointer"
                >
                  <i className="ri-edit-line text-sm" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(member.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 cursor-pointer"
                >
                  <i className="ri-delete-bin-line text-sm" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Remove Team Member?</h3>
            <p className="text-gray-500 text-sm mb-5">This will remove them from the About page. Cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg cursor-pointer">Remove</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-lg cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
