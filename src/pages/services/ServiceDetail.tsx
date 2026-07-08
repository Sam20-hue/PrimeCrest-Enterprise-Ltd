import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSiteData } from '../../context/SiteDataContext';
import RequestModal from '../../components/RequestModal';
import { useMetaTags } from '../../utils/useMetaTags';
import { slugify } from '../../utils/slugify';

const buildServicesUrl = () => {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const basePath = typeof window !== 'undefined' ? import.meta.env.BASE_URL || '/' : '/';
  return `${base}${basePath.replace(/\/$/, '')}/services`;
};

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const { services, settings } = useSiteData();
  const [showRequestModal, setShowRequestModal] = useState(false);
  
  // Find service by slug (matching the URL-safe slug of the service title)
  const service = services.find((serviceItem) => slugify(serviceItem.title) === slug);

  // Set meta tags for service detail page
  useMetaTags({
    title: service?.title,
    description: service?.description || service?.title,
    image: service?.image,
    type: 'website',
  });

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

  const galleryImages = Array.isArray(service.images) && service.images.length > 0 ? service.images : [(service.image || service.imageUrl)].filter(Boolean);
  const features = Array.isArray(service.features) ? service.features : [];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Small header with logo only */}
      <header className="w-full py-6 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 flex items-center">
          <img src={settings.logoUrl} alt={settings.logoAltText} className="h-10 object-contain" />
        </div>
      </header>

      <section className="relative w-full">
        <div className="w-full h-[60vh] sm:h-[50vh] relative overflow-hidden bg-white">
          <img
            src={service.image || service.imageUrl || ''}
            alt={service.title}
            className="absolute inset-0 h-full w-full object-cover opacity-100"
          />
          <div className="absolute inset-0 bg-white/60" />
          <div className="relative mx-auto max-w-6xl px-6 py-10">
            <div className="max-w-3xl bg-white p-6 rounded-xl shadow-md">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{service.title}</h1>
              <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: service.description || '' }} />
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={returnToServices} className="px-4 py-2 border rounded text-sm">Back to services</button>
                <button type="button" onClick={() => setShowRequestModal(true)} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors">Request this service</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr] items-start">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">What you get with this service</h2>
            <div className="text-gray-700 text-base leading-7" dangerouslySetInnerHTML={{ __html: service.details || service.description || '' }} />

            <div className="grid gap-6 sm:grid-cols-2">
              {galleryImages.map((imageUrl, index) => (
                <figure key={index} className="overflow-hidden rounded-lg border">
                  <img src={imageUrl} alt={`${service.title} image ${index + 1}`} className="w-full object-cover" style={{height: 320}} />
                  {(service.imagesCaptions && service.imagesCaptions[index]) && (
                    <figcaption className="p-3 text-sm text-gray-600">{service.imagesCaptions[index]}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>

          <aside>
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-bold text-gray-900">Why choose this service?</h3>
              <p className="text-sm text-gray-600">A clear set of benefits and proven features you can trust.</p>
              <ul className="mt-4 space-y-3">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-600">✓</span>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <RequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        serviceName={service.title}
        serviceId={service.id}
      />
    </main>
  );
}
