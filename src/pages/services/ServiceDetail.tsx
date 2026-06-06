import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSiteData } from '../../context/SiteDataContext';

const buildServicesUrl = () => {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const basePath = typeof window !== 'undefined' ? import.meta.env.BASE_URL || '/' : '/';
  return `${base}${basePath.replace(/\/$/, '')}/services`;
};

export default function ServiceDetailPage() {
  const { id } = useParams();
  const { services } = useSiteData();
  const service = services.find((serviceItem) => serviceItem.id === id);

  const returnToServices = useCallback(() => {
    const servicesUrl = buildServicesUrl();

    if (typeof window === 'undefined') {
      return;
    }

    // If the page was opened from the main services listing, update the opener
    // to point back to the services list and close this detail tab.
    if (window.opener && !window.opener.closed) {
      window.opener.location.href = servicesUrl;
      window.opener.focus();
      window.close();
      return;
    }

    // If there is an opener but it is closed, open a fresh services tab and
    // then close this tab so the user returns to a services listing.
    if (window.opener && window.opener.closed) {
      window.open(servicesUrl, '_blank');
      window.close();
      return;
    }

    // Fallback: navigate in the current tab.
    window.location.href = servicesUrl;
  }, []);

  if (!service) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 mb-6">
            <i className="ri-error-warning-line" /> Service unavailable
          </div>
          <h1 className="text-4xl font-black mb-4">Service not found</h1>
          <p className="text-gray-600 mb-10">The requested service does not exist or may have been removed. Return to the services list to continue.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              type="button"
              onClick={returnToServices}
              className="inline-flex items-center justify-center rounded-full bg-orange-600 px-6 py-3 text-white font-semibold hover:bg-orange-700 transition"
            >
              Back to services
            </button>
          </div>
        </section>
      </main>
    );
  }

  const galleryImages = service.images && service.images.length > 0 ? service.images : [service.image].filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden">
        <div className="h-[450px] w-full bg-slate-900">
          <img
            src={service.image}
            alt={service.title}
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/30 to-slate-950" />
          <div className="relative mx-auto max-w-6xl px-6 py-16">
            <div className="max-w-3xl rounded-[2rem] border border-white/10 bg-white/10 p-8 backdrop-blur-xl shadow-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-100/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-orange-200 mb-4">
                <i className={`${service.icon} text-base`} /> Service Details
              </span>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">{service.title}</h1>
              <p className="text-slate-200 text-lg leading-8 max-w-3xl">{service.description}</p>
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={returnToServices}
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Back to services
                </button>
                <a
                  href={`mailto:info@primecrestenterprise.com?subject=${encodeURIComponent(`Request for ${service.title}`)}`}
                  className="inline-flex items-center justify-center rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
                >
                  Request this service
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.7fr_1fr] items-start">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.35)]">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 mb-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2">{service.icon && <i className={`${service.icon} text-orange-400`} />} {service.title}</span>
                <span className="rounded-full bg-slate-800/90 px-3 py-2">Professional service overview</span>
              </div>
              <h2 className="text-3xl font-black text-white mb-4">What you get with this service</h2>
              <div className="space-y-4 text-slate-300 leading-8 whitespace-pre-line">{service.details || service.description}</div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {galleryImages.map((imageUrl, index) => (
                <div key={index} className="overflow-hidden rounded-[2rem] border border-white/10 shadow-xl bg-slate-950">
                  <img src={imageUrl} alt={`${service.title} image ${index + 1}`} className="h-64 w-full object-cover transition duration-500 hover:scale-105" />
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-900/95 p-8 shadow-[0_25px_50px_rgba(15,23,42,0.35)]">
            <div className="space-y-3">
              <h3 className="text-xl font-black text-white">Why choose this service?</h3>
              <p className="text-slate-400">A clear set of benefits and proven features you can trust.</p>
            </div>
            <ul className="space-y-4">
              {service.features.map((feature, index) => (
                <li key={index} className="flex gap-3 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
                    <i className="ri-check-line" />
                  </span>
                  <span className="text-sm leading-6 text-slate-200">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-[1.75rem] bg-orange-600 p-6 text-white shadow-[0_20px_50px_rgba(249,115,22,0.25)]">
              <p className="text-xs uppercase tracking-[0.3em] font-bold text-orange-100">Highlighted benefit</p>
              <p className="mt-4 text-lg font-black leading-snug">A tailored security solution built for your business needs, not a one-size-fits-all package.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
