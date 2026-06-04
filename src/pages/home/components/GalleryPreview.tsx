import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSiteData } from '../../../context/SiteDataContext';
import { translations } from '../../../i18n/translations';

export default function GalleryPreview() {
  const { gallery, language } = useSiteData();
  const t = translations[language].gallery;
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(gallery.map((g) => g.category)))];
  const filtered = activeCategory === 'All' ? gallery.slice(0, 6) : gallery.filter((g) => g.category === activeCategory).slice(0, 6);

  return (
    <section className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-orange-400 font-semibold text-sm tracking-widest uppercase">Our Work</span>
          <h2 className="text-4xl font-black text-white mt-3 mb-4">{t.title}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">{t.subtitle}</p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-sm rounded-full font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-[28px] aspect-video cursor-pointer bg-gray-950 shadow-[0_18px_45px_-25px_rgba(0,0,0,0.9)] border border-white/10">
              <img
                src={item.imageUrl}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  {item.category}
                </span>
                <h3 className="text-white font-bold text-base">{item.title}</h3>
                <p className="text-gray-300 text-xs mt-1 line-clamp-2">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 px-8 py-3 border-2 border-orange-500 text-orange-400 font-bold rounded-lg hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all cursor-pointer whitespace-nowrap"
          >
            {t.view}
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-arrow-right-line" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}