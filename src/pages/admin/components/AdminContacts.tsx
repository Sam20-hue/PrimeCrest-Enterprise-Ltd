import { useEffect, useState } from 'react';
import { useSiteData, Contact } from '../../../context/SiteDataContext';
import { mysqlService } from '../../../services/mysqlService';

export default function AdminContacts() {
  const { contacts, setContacts } = useSiteData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | number | null>(null);

  useEffect(() => {
    // Only load contacts if we don't have any yet (they should be preloaded by admin page)
    if (contacts.length === 0) {
      const loadContacts = async () => {
        const result = await mysqlService.getContacts();
        if (result.ok && result.data) {
          setContacts(result.data as Contact[]);
        } else {
          setError(result.error || 'Failed to load contacts');
        }
        setLoading(false);
      };
      loadContacts();
    } else {
      setLoading(false);
    }
  }, [contacts.length, setContacts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <i className="ri-loader-4-line animate-spin text-2xl text-orange-600" />
        <span className="ml-2 text-gray-600">Loading contacts...</span>
      </div>
    );
  }

  const handleDelete = async (id: string | number) => {
    const confirmed = window.confirm('Delete this contact message? This cannot be undone.');
    if (!confirmed) return;

    setDeleting(id);
    const result = await mysqlService.deleteContact(id);
    setDeleting(null);

    if (!result.ok) {
      setError(result.error || 'Failed to delete contact.');
      return;
    }

    setContacts(contacts.filter((contact) => String(contact.id) !== String(id)));
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-8">Contact Messages</h2>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <i className="ri-loader-4-line animate-spin text-2xl text-orange-600" />
          <span className="ml-2 text-gray-600">Loading contacts...</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12">
          <i className="ri-mail-line text-4xl text-gray-300 mb-4" />
          <p className="text-gray-500">No contact messages yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-gray-900">{contact.name}</h3>
                  <p className="text-sm text-gray-600">{contact.email}</p>
                  {contact.phone && <p className="text-sm text-gray-600">{contact.phone}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-400">
                    {contact.created_at ? new Date(contact.created_at.replace(' ', 'T')).toLocaleString() : 'Unknown date'}
                  </p>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    disabled={deleting === contact.id}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-60"
                  >
                    {deleting === contact.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              {contact.service && (
                <div className="mb-3">
                  <span className="text-sm font-semibold text-gray-700">Service:</span>
                  <span className="text-sm text-gray-600 ml-2">{contact.service}</span>
                </div>
              )}

              <div>
                <span className="text-sm font-semibold text-gray-700">Message:</span>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{contact.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}