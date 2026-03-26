import { useState } from 'react';
import { useSiteData } from '../../../context/SiteDataContext';
import { translations } from '../../../i18n/translations';

export default function TestimonialsSection() {
  const { testimonials, language } = useSiteData();
  const t = translations[language].testimonials;
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1));

  if (!testimonials.length) return null;

  const active = testimonials[current];

  return (
    <section className="py-24 bg-orange-950/5 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <span className="text-orange-600 font-semibold text-sm tracking-widest uppercase">Testimonials</span>
        <h2 className="text-4xl font-black text-gray-900 mt-3 mb-16">{t.title}</h2>

        <div className="bg-white rounded-2xl p-10 border border-gray-100 relative">
          <div className="text-orange-300 text-8xl font-serif absolute top-6 left-8 leading-none select-none">&ldquo;</div>
          <div className="flex justify-center mb-4">
            {Array.from({ length: active.rating }).map((_, i) => (
              <span key={i} className="w-5 h-5 flex items-center justify-center text-orange-400">
                <i className="ri-star-fill" />
              </span>
            ))}
          </div>
          <p className="text-gray-700 text-lg leading-relaxed mb-8 relative z-10">{active.text}</p>
          <div className="flex items-center justify-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center bg-orange-100 rounded-full text-orange-600 font-black text-xl">
              {active.name.charAt(0)}
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-base">{active.name}</p>
              <p className="text-sm text-gray-500">{active.company}</p>
            </div>
            <span className="ml-2 px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
              {active.industry}
            </span>
          </div>
        </div>

        {/* Nav */}
        {testimonials.length > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="w-11 h-11 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-orange-400 text-gray-500 hover:text-orange-600 transition-all cursor-pointer"
            >
              <i className="ri-arrow-left-line" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    i === current ? 'w-8 bg-orange-600' : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-all cursor-pointer"
            >
              <i className="ri-arrow-right-line" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}