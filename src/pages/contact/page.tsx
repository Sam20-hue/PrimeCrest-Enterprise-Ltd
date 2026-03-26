import { useState } from 'react';
import { useSiteData } from '../../context/SiteDataContext';
import { translations } from '../../i18n/translations';
import { mysqlService } from '../../services/mysqlService';

export default function ContactPage() {
  const { settings, services, language } = useSiteData();
  const t = translations[language].contact;

  const [form, setForm] = useState({ name: '', email: '', phone: '', service: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          service: form.service,
          message: form.message,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = 'Failed to send message. Please try again.';
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch {
          errorMsg = text || errorMsg;
        }
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setLoading(false);
      setSubmitted(true);
      setForm({ name: '', email: '', phone: '', service: '', message: '' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error. Please check your connection.';

      // Attempt a fallback to default local backend URL if the first attempt fails.
      if (typeof window !== 'undefined') {
        const defaultUrl = `${window.location.protocol}//${window.location.hostname}:3002`;
        if (apiUrl && !apiUrl.includes(':3002')) {
          try {
            const fallbackResponse = await fetch(`${defaultUrl}/api/contact`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: form.name,
                email: form.email,
                phone: form.phone,
                service: form.service,
                message: form.message,
              }),
            });

            if (fallbackResponse.ok) {
              setLoading(false);
              setSubmitted(true);
              setForm({ name: '', email: '', phone: '', service: '', message: '' });
              return;
            }
            const text = await fallbackResponse.text();
            setError(text || errorMsg);
            setLoading(false);
            return;
          } catch {
            // fallback also failed, use primary error message.
          }
        }
      }

      setError(`Request to ${apiUrl || 'unknown'} failed: ${errorMsg}`);
      setLoading(false);
    }
  };

  return (
    <main className="pt-24 min-h-screen pb-20">
      {/* Header */}
      <section className="py-20 bg-gray-900 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{
            backgroundImage: `url('https://readdy.ai/api/search-image?query=modern%20office%20reception%20area%20with%20corporate%20branding%2C%20professional%20business%20environment%2C%20Nairobi%20Kenya%2C%20clean%20contemporary%20interior&width=1920&height=400&seq=conhdr&orientation=landscape')`,
          }}
        />
        <div className="absolute inset-0 bg-gray-900/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <span className="text-orange-400 font-semibold text-sm tracking-widest uppercase">Reach Out</span>
          <h1 className="text-5xl font-black text-white mt-3 mb-4">{t.title}</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">{t.subtitle}</p>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            {[
              { icon: 'ri-phone-fill', title: t.phone_title, value: settings.phone, href: `tel:${settings.phone}` },
              { icon: 'ri-mail-fill', title: t.email_title, value: settings.email, href: `mailto:${settings.email}` },
              { icon: 'ri-map-pin-fill', title: t.address_title, value: settings.address, href: '#' },
              { icon: 'ri-time-fill', title: t.hours_title, value: t.hours, href: '#' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-100">
                <div className="w-12 h-12 flex items-center justify-center bg-orange-100 rounded-xl flex-shrink-0">
                  <i className={`${item.icon} text-orange-600 text-xl`} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h4>
                  <a href={item.href} className="text-gray-600 text-sm whitespace-pre-line hover:text-orange-600 cursor-pointer">
                    {item.value}
                  </a>
                </div>
              </div>
            ))}

            <div className="p-5 bg-orange-600 rounded-xl text-white">
              <h4 className="font-bold mb-2">Emergency Support</h4>
              <p className="text-orange-100 text-sm mb-3">For urgent security matters, our emergency line is available 24/7.</p>
              <a href="tel:+254700000000" className="inline-flex items-center gap-2 text-sm font-bold text-white cursor-pointer">
                <i className="ri-phone-fill" /> +254 700 000 000
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 flex items-center justify-center bg-green-100 rounded-full mx-auto mb-4">
                  <i className="ri-checkbox-circle-fill text-green-500 text-3xl" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Message Sent Successfully!</h3>
                <p className="text-gray-600 mb-2">{t.success}</p>
                <p className="text-sm text-gray-500 mb-6">We've sent a confirmation email and our team will respond shortly.</p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', service: '', message: '' }); }}
                  className="mt-6 px-6 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-semibold cursor-pointer hover:bg-orange-700 transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 border border-gray-100 space-y-5">
                <h3 className="text-2xl font-black text-gray-900 mb-2">Send Us a Message</h3>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm font-semibold flex items-center gap-2">
                      <i className="ri-alert-fill" />
                      {error}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t.name} *</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t.phone}</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                      placeholder="+254 7XX XXX XXX"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.email} *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.service}</label>
                  <select
                    name="service"
                    value={form.service}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 bg-white"
                  >
                    <option value="">Select a service...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.title}>{s.title}</option>
                    ))}
                    <option value="General Inquiry">General Inquiry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.message} *</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    maxLength={500}
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                    placeholder="Describe your security needs..."
                  />
                  <p className="text-xs text-gray-400 mt-1">{form.message.length}/500</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <><i className="ri-loader-4-line animate-spin" /> Sending...</>
                  ) : (
                    <><i className="ri-send-plane-fill" /> {t.send}</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}