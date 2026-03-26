import { Link } from 'react-router-dom';
import { useSiteData } from '../../../context/SiteDataContext';
import { translations } from '../../../i18n/translations';

export default function HeroSection() {
  const { settings, language } = useSiteData();
  const t = translations[language];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://readdy.ai/api/search-image?query=professional%20security%20operations%20center%20with%20CCTV%20monitors%2C%20dark%20dramatic%20lighting%2C%20multiple%20screens%20showing%20surveillance%20feeds%2C%20security%20technology%20environment%2C%20cinematic%20wide%20angle%20shot%2C%20modern%20corporate%20interior&width=1920&height=1080&seq=hero1&orientation=landscape')`,
        }}
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 w-full">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600/20 border border-orange-500/30 rounded-full text-orange-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            Trusted Security & Technology Partner in Kenya
          </div>

          {/* Title */}
          <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
            {settings.heroTitle}
          </h1>
          <p className="text-lg text-gray-300 mb-10 leading-relaxed">
            {settings.heroSubtitle}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-all cursor-pointer whitespace-nowrap text-base"
            >
              {t.hero.cta_primary}
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-arrow-right-line" />
              </span>
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/40 text-white font-bold rounded-lg hover:border-white hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap text-base"
            >
              {t.hero.cta_secondary}
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-play-circle-line" />
              </span>
            </Link>
          </div>
        </div>

        {/* Stats Floating Card */}
        <div className="absolute bottom-16 right-6 lg:right-20 hidden lg:flex gap-6">
          {[
            { num: '500+', label: t.stats.installations },
            { num: '98%', label: t.stats.satisfaction },
            { num: '24/7', label: t.stats.support },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="text-3xl font-black text-orange-400">{stat.num}</p>
              <p className="text-xs text-gray-300 mt-1 whitespace-nowrap">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50">
        <span className="text-xs">Scroll</span>
        <div className="w-px h-8 bg-white/30 animate-pulse" />
      </div>
    </section>
  );
}