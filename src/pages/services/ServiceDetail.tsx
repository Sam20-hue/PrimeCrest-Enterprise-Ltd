import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSiteData } from '../../context/SiteDataContext';

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { services } = useSiteData();
  const service = services.find((serviceItem) => serviceItem.id === id);

  if (!service) {
    return (
      <main className="pt-24 min-h-screen bg-gray-50">
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-4">Service not found</h1>
          <p className="text-gray-600 mb-8">The service you are looking for does not exist, or it may have been removed.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors"
            >
              Go back
            </button>
            <Link
              to="/services"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              View all services
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pt-24 min-h-screen bg-white">
      <section className="relative overflow-hidden">
        <div className="h-[420px] w-full relative bg-gray-900">
          <img
            src={service.image}
            alt={service.title}
            className="w-full h-full object-cover object-center opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60" />
          <div className="absolute inset-0 flex items-end p-6 md:p-10">
            <div className="max-w-3xl bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
              <span className="inline-flex items-center gap-2 uppercase tracking-[0.3em] text-xs font-semibold text-orange-700 bg-orange-100 rounded-full px-3 py-1 mb-4">
                <i className={`${service.icon} text-base`} />
                Service Details
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">{service.title}</h1>
              <p className="mt-5 text-gray-600 text-lg leading-relaxed">{service.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/services"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Back to services
                </Link>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition"
                >
                  Request this service
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <div className="grid gap-10 lg:grid-cols-[2.2fr_1fr] items-start">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-gray-100 bg-gray-50 p-8 shadow-sm">
              <h2 className="text-3xl font-black text-gray-900 mb-4">What you get with this service</h2>
              <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">{service.details || service.description}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {(service.images || []).map((imageUrl, index) => (
                <div key={index} className="overflow-hidden rounded-[2rem] border border-gray-100 shadow-sm bg-white">
                  <img src={imageUrl} alt={`${service.title} ${index + 1}`} className="w-full h-64 object-cover" />
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6 rounded-[2rem] border border-gray-100 bg-gray-50 p-8 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-3">Why choose this service?</h3>
              <ul className="space-y-3 text-gray-700">
                {service.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                      <i className="ri-check-line" />
                    </span>
                    <span className="text-sm leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-orange-600 p-6 text-white">
              <p className="text-sm uppercase tracking-[0.25em] font-bold text-orange-100">Highlighted benefit</p>
              <p className="mt-4 text-lg font-black leading-snug">A tailored security solution built for your business needs, not a one-size-fits-all package.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
