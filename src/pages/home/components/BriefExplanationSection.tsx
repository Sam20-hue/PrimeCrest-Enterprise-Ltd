import { useSiteData } from '../../../context/SiteDataContext';

export default function BriefExplanationSection() {
  const { settings } = useSiteData();

  return (
    <section className="py-16 bg-gradient-to-r from-orange-50 to-orange-100">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center">
          <div className="w-16 h-16 flex items-center justify-center bg-orange-600 rounded-full mx-auto mb-6">
            <i className="ri-shield-check-line text-white text-2xl" />
          </div>
          <p className="text-lg font-semibold text-gray-900 leading-relaxed">
            {settings.briefExplanation}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <a
              href="/services"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
            >
              Explore Services
              <i className="ri-arrow-right-line" />
            </a>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-orange-600 text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors cursor-pointer"
            >
              Contact Us
              <i className="ri-phone-line" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
