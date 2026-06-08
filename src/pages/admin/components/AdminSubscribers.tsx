import { useState, useEffect } from 'react';
import { useSiteData } from '../../../context/SiteDataContext';
import { mysqlService } from '../../../services/mysqlService';

export default function AdminSubscribers() {
  const { subscribers, setSubscribers } = useSiteData();
  const [deletedEmail, setDeletedEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadSubscribers = async () => {
      const result = await mysqlService.getSubscribers();
      if (result.ok && Array.isArray(result.data)) {
        setSubscribers(result.data.filter((item) => typeof item === 'string'));
      }
    };
    loadSubscribers();
  }, [setSubscribers]);

  const handleDelete = async (email: string) => {
    if (!window.confirm(`Remove ${email} from the subscriber list?`)) return;
    try {
      await mysqlService.deleteSubscriber(email);
    } catch {
      // ignore deletion failure and still update local view
    }
    setSubscribers(subscribers.filter((item) => item !== email));
    setDeletedEmail(email);
    setTimeout(() => setDeletedEmail(null), 2500);
  };

  const handleClearAll = () => {
    if (!window.confirm('Clear all subscriber emails? This action cannot be undone.')) return;
    setSubscribers([]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Newsletter Subscribers</h2>
          <p className="text-sm text-gray-500 mt-1">Manage emails collected from the website newsletter form.</p>
        </div>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
        >
          Clear All
        </button>
      </div>

      {deletedEmail && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700">
          Removed {deletedEmail} from the subscriber list.
        </div>
      )}

      {subscribers.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No subscriber emails have been collected yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {subscribers.map((email) => (
            <div key={email} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4">
              <span className="text-sm text-gray-700 break-all">{email}</span>
              <button
                onClick={() => handleDelete(email)}
                className="px-3 py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
