import { useState } from 'react';
import { useSiteData } from '../../context/SiteDataContext';
import { translations } from '../../i18n/translations';

export default function ServicesPage() {
  const { services, settings, language } = useSiteData();
  const t = translations[language].services;
  const [selected, setSelected] = useState<string | null>(null);
  const [modalService, setModalService] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let apiUrl = '';
    const resolveApiUrl = () => {
      if (typeof window === 'undefined') return 'http://localhost:3002';
      const host = window.location.hostname || 'localhost';
      const protocol = window.location.protocol || 'http:';
      const baseDefault = host === 'localhost' || host === '127.0.0.1'
        ? `${protocol}//${host}:3002`
        : `${protocol}//${host}:${window.location.port || '3002'}`;

      const configured = settings.mysqlApiUrl?.trim().replace(/\/$/, '');
      if (!configured) return baseDefault;
      if (/^https?:\/\//i.test(configured)) return configured;
      return `${protocol}//${configured}`;
    };

    try {
      apiUrl = resolveApiUrl();
      const response = await fetch(`${apiUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          service: modalService?.title || '',
          message: form.message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send message. Please try again.');
        setLoading(false);
        return;
      }

      setLoading(false);
      setSubmitted(true);
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error. Please check your connection.';

      // Try fallback to default local backend port 3002 if not already.
      if (typeof window !== 'undefined' && apiUrl && !apiUrl.includes(':3002')) {
        try {
          const fallbackResponse = await fetch(`${window.location.protocol}//${window.location.hostname}:3002/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: form.name,
              email: form.email,
              phone: form.phone,
              service: modalService?.title || '',
              message: form.message,
            }),
          });

          if (fallbackResponse.ok) {
            setLoading(false);
            setSubmitted(true);
            setForm({ name: '', email: '', phone: '', message: '' });
            return;
          }
          const text = await fallbackResponse.text();
          setError(text || errorMsg);
          setLoading(false);
          return;
        } catch {
          // fallback also failed
        }
      }

      setError(`Request to ${apiUrl || 'unknown'} failed: ${errorMsg}`);
      setLoading(false);
    }
  };

  const openModal = (service: any) => {
    setModalService(service);
    setForm({ name: '', email: '', phone: '', message: '' });
    setSubmitted(false);
    setError('');
  };

  const closeModal = () => {
    setModalService(null);
  };

  return (
    <main className="pt-24 pb-20 min-h-screen">
      {/* Header */}
      <section className="relative py-20 bg-gray-900 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: `url('https://readdy.ai/api/search-image?query=professional%20security%20technology%20background%20with%20CCTV%20cameras%20biometric%20devices%20alarm%20systems%20arranged%20aesthetically%2C%20dark%20moody%20background%2C%20professional%20commercial%20photography&width=1920&height=600&seq=svchdr&orientation=landscape')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 to-gray-900" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <span className="text-orange-400 font-semibold text-sm tracking-widest uppercase">What We Offer</span>
          <h1 className="text-5xl font-black text-white mt-3 mb-4">{t.title}</h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">{t.subtitle}</p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service) => (
            <div key={service.id} className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-orange-200 transition-all group">
              <div className="h-56 overflow-hidden relative">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-orange-600 rounded-xl text-white text-2xl">
                    <i className={service.icon} />
                  </div>
                </div>
              </div>
              <div className="p-7">
                <h2 className="text-xl font-black text-gray-900 mb-3">{service.title}</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">{service.description}</p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {service.features.slice(0, 6).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-4 h-4 flex items-center justify-center text-orange-500 flex-shrink-0">
                        <i className="ri-checkbox-circle-fill text-sm" />
                      </span>
                      {f}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSelected(selected === service.id ? null : service.id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Request This Service
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-arrow-right-line" />
                  </span>
                </button>
              </div>

              {/* Expanded Contact Prompt */}
              {selected === service.id && (
                <div className="mx-7 mb-7 p-5 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-sm text-gray-700 mb-3">
                    <strong>Interested in {service.title}?</strong> Contact us today to discuss your requirements or book a site visit.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <a
                      href="tel:+254700000000"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-phone-line" /> Call Now
                    </a>
                    <button
                      onClick={() => openModal(service)}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 text-sm rounded-lg cursor-pointer whitespace-nowrap hover:bg-orange-50 transition-colors"
                    >
                      <i className="ri-mail-line" /> Send Email
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Email Modal */}
      {modalService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">Request {modalService.title}</h3>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-xl" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">Fill out the form below and we'll get back to you soon.</p>
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 flex items-center justify-center bg-green-100 rounded-full mx-auto mb-4">
                    <i className="ri-checkbox-circle-fill text-green-500 text-3xl" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Message Sent!</h4>
                  <p className="text-gray-600 text-sm mb-4">We've received your request for {modalService.title}. Our team will contact you within 24-48 hours.</p>
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold cursor-pointer hover:bg-orange-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendEmail} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700 text-sm font-semibold flex items-center gap-2">
                        <i className="ri-alert-fill" />
                        {error}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                      placeholder="+254 7XX XXX XXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleFormChange}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                      placeholder={`Tell us more about your ${modalService.title} requirements...`}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg text-sm font-semibold cursor-pointer hover:bg-orange-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <i className="ri-loader-4-line animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="ri-send-plane-line" />
                          Send Request
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}