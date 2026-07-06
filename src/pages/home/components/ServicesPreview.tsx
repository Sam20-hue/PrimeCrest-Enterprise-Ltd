import { Link } from 'react-router-dom';
import { useSiteData } from '../../../context/SiteDataContext';
import { translations } from '../../../i18n/translations';

export default function ServicesPreview() {
  const { services, language } = useSiteData();
  const t = translations[language].services;
  const preview = services.slice(0, 6);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-orange-600 font-semibold text-sm tracking-widest uppercase">What We Do</span>
          <h2 className="text-4xl font-black text-gray-900 mt-3 mb-4">{t.title}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {preview.map((service, idx) => (
            <div
              key={service.id}
              className="group bg-gray-50 rounded-xl overflow-hidden hover:bg-white transition-all duration-300 border border-transparent hover:border-orange-100 hover:-translate-y-1"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="h-44 overflow-hidden bg-gray-100 flex items-center justify-center">
                <img
                  src={service.image}
                  alt={service.title}
                  className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-orange-100 rounded-lg">
                    <i className={`${service.icon} text-orange-600 text-xl`} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{service.title}</h3>
                </div>
                <div className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3" dangerouslySetInnerHTML={{ __html: service.description || '' }} />
                <Link
                  to="/services"
                  className="inline-flex items-center gap-1 text-orange-600 text-sm font-semibold hover:gap-2 transition-all cursor-pointer"
                >
                  {t.learn_more}
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-arrow-right-line" />
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}