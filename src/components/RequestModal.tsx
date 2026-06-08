import { useState } from 'react';
import { useSiteData } from '../context/SiteDataContext';
import { getContactApiEndpoints } from '../utils/contactApi';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  serviceId?: string;
}

export default function RequestModal({ isOpen, onClose, serviceName, serviceId }: RequestModalProps) {
  const { settings } = useSiteData();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const sendViaEmailClient = () => {
    const recipient = settings.email || 'info@primecrestenterprise.com';
    const subject = `Service Request: ${serviceName}`;
    const body = `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nService: ${serviceName}\n\nMessage:\n${form.message}`;
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in all required fields.');
      return;
    }

    setError('');
    setLoading(true);

    const endpoints = getContactApiEndpoints(settings.mysqlApiUrl);
    let lastError = '';

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone,
            service: serviceName,
            message: form.message,
          }),
        });

        if (!response.ok) {
          lastError = `${response.status} ${response.statusText}`;
          if (endpoints.indexOf(endpoint) < endpoints.length - 1) {
            continue;
          }
          if ([404, 502, 503].includes(response.status)) {
            setLoading(false);
            sendViaEmailClient();
            return;
          }
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            lastError = data.error || lastError;
          } catch {
            lastError = text || lastError;
          }
          setError(lastError || 'Failed to send request.');
          setLoading(false);
          return;
        }

        setLoading(false);
        setSubmitted(true);
        setForm({ name: '', email: '', phone: '', message: '' });
        setTimeout(() => {
          onClose();
          setSubmitted(false);
        }, 2000);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Network error';
        if (endpoints.indexOf(endpoint) < endpoints.length - 1) {
          continue;
        }
        setError(lastError);
        setLoading(false);
        return;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Request Service</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-check-line text-2xl text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Sent!</h3>
            <p className="text-sm text-gray-600">We'll get back to you shortly with more information about {serviceName}.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Service</label>
              <div className="px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm font-medium text-orange-900">
                {serviceName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+254 ..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Message *</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Tell us more about what you need..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
