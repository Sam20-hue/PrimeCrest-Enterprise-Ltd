import { useSiteData } from '../../../context/SiteDataContext';
import { translations } from '../../../i18n/translations';

export default function ProcessSection() {
  const { language } = useSiteData();
  const t = translations[language].process;

  const icons = [
    'ri-discuss-line',
    'ri-search-eye-line',
    'ri-file-list-3-line',
    'ri-tools-line',
    'ri-customer-service-line',
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-orange-600 font-semibold text-sm tracking-widest uppercase">How We Work</span>
          <h2 className="text-4xl font-black text-gray-900 mt-3 mb-4">{t.title}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[10%] right-[10%] h-px bg-orange-200 z-0" />

          {t.steps.map((step, idx) => (
            <div key={idx} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 w-14 h-14 flex items-center justify-center bg-orange-600 rounded-full text-white font-black text-lg mb-6">
                {idx + 1}
              </div>
              <div className="bg-white rounded-xl p-5 w-full border border-gray-100">
                <div className="w-10 h-10 flex items-center justify-center bg-orange-50 rounded-lg mx-auto mb-3">
                  <i className={`${icons[idx]} text-orange-600 text-xl`} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">{step.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}