import { useState } from 'react';
import { useSiteData } from '../../context/SiteDataContext';
import { translations } from '../../i18n/translations';

export default function GalleryPage() {
  const { gallery, language } = useSiteData();
  const t = translations[language].gallery;
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(gallery.map((g) => g.category)))];
  const filtered = activeCategory === 'All' ? gallery : gallery.filter((g) => g.category === activeCategory);

  return (
    <main className="pt-24 pb-20 min-h-screen">
      {/* Header */}
      <section className="py-20 bg-gray-900 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{
            backgroundImage: `url('https://readdy.ai/api/search-image?query=collage%20of%20security%20installations%20CCTV%20cameras%20vault%20doors%20biometric%20scanners%20professional%20photography%20dark%20background&width=1920&height=400&seq=galhdr&orientation=landscape')`,
          }}
        />
        <div className="absolute inset-0 bg-gray-900/60" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <span className="text-orange-400 font-semibold text-sm tracking-widest uppercase">Our Projects</span>
          <h1 className="text-5xl font-black text-white mt-3 mb-4">{t.title}</h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">{t.subtitle}</p>
        </div>
      </section>

      {/* Filter */}
      <section className="py-10 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 text-sm rounded-full font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-xl aspect-video cursor-pointer"
              onClick={() => setLightbox(item.imageUrl)}
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  {item.category}
                </span>
                <h3 className="text-white font-bold text-sm">{item.title}</h3>
                <p className="text-gray-300 text-xs mt-1 line-clamp-2">{item.description}</p>
              </div>
              <div className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="ri-zoom-in-line text-white text-sm" />
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <i className="ri-image-line text-4xl mb-4 block" />
            <p>No projects in this category yet.</p>
          </div>
        )}
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/20 rounded-full text-white cursor-pointer hover:bg-white/30"
            onClick={() => setLightbox(null)}
          >
            <i className="ri-close-line text-xl" />
          </button>
          <img
            src={lightbox}
            alt="Gallery"
            className="max-w-4xl max-h-[90vh] w-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}