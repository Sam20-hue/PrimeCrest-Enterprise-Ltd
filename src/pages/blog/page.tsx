import { useState } from 'react';
import { useSiteData } from '../../context/SiteDataContext';
import { translations } from '../../i18n/translations';

export default function BlogPage() {
  const { blogPosts, language } = useSiteData();
  const t = translations[language].blog;
  const [activeCategory, setActiveCategory] = useState('All');
  const [selected, setSelected] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(blogPosts.map((p) => p.category)))];
  const filtered = activeCategory === 'All' ? blogPosts : blogPosts.filter((p) => p.category === activeCategory);
  const openPost = blogPosts.find((p) => p.id === selected);

  return (
    <main className="pt-24 min-h-screen pb-20">
      {/* Header */}
      <section className="py-20 bg-gray-900 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{
            backgroundImage: `url('https://readdy.ai/api/search-image?query=security%20technology%20blog%20concept%2C%20person%20reading%20on%20tablet%20security%20news%2C%20professional%20environment%2C%20modern%20workspace%20Kenya&width=1920&height=400&seq=bloghdr&orientation=landscape')`,
          }}
        />
        <div className="absolute inset-0 bg-gray-900/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <span className="text-orange-400 font-semibold text-sm tracking-widest uppercase">Knowledge Hub</span>
          <h1 className="text-5xl font-black text-white mt-3 mb-4">{t.title}</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">{t.subtitle}</p>
        </div>
      </section>

      {/* Filter */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-3">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filtered.map((post) => (
            <article key={post.id} className="bg-white rounded-xl overflow-hidden border border-gray-100 group hover:border-orange-200 transition-all">
              <div className="h-48 overflow-hidden relative">
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-3 py-1 bg-orange-600 text-white text-xs font-semibold rounded-full">
                  {post.category}
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1"><i className="ri-calendar-line" />{post.date}</span>
                  <span className="flex items-center gap-1"><i className="ri-user-line" />{post.author}</span>
                </div>
                <h2 className="font-bold text-gray-900 text-base leading-snug mb-3 line-clamp-2">{post.title}</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-5 line-clamp-3">{post.excerpt}</p>
                <button
                  onClick={() => setSelected(post.id)}
                  className="inline-flex items-center gap-1 text-orange-600 text-sm font-semibold hover:gap-2 transition-all cursor-pointer"
                >
                  {t.read_more}
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-arrow-right-line" />
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <i className="ri-article-line text-4xl mb-4 block" />
            <p>No posts in this category yet.</p>
          </div>
        )}
      </section>

      {/* Post Modal */}
      {openPost && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full mt-10 mb-10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-64 relative">
              <img src={openPost.imageUrl} alt={openPost.title} className="w-full h-full object-cover object-top" />
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-white/90 rounded-full cursor-pointer hover:bg-white"
              >
                <i className="ri-close-line text-gray-700" />
              </button>
              <span className="absolute top-4 left-4 px-3 py-1 bg-orange-600 text-white text-xs font-semibold rounded-full">
                {openPost.category}
              </span>
            </div>
            <div className="p-8">
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                <span><i className="ri-calendar-line mr-1" />{openPost.date}</span>
                <span><i className="ri-user-line mr-1" />{openPost.author}</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-6">{openPost.title}</h2>
              <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{openPost.content}</div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}