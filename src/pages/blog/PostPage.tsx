import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSiteData } from '../../context/SiteDataContext';
import { translations } from '../../i18n/translations';

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function BlogPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { blogPosts, authors, language } = useSiteData();
  const t = translations[language].blog;

  const post = blogPosts.find((item) => item.id === id && item.published);
  const author = post && post.authorId ? authors.find((a) => a.id === post.authorId) : null;

  if (!post) {
    return (
      <main className="pt-24 min-h-screen pb-20 bg-gray-50">
        <section className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h1 className="text-3xl font-black text-gray-900 mb-4">Post not found</h1>
          <p className="text-gray-500 mb-8">The article may not exist or is not published yet.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Back
            </button>
            <Link to="/blog" className="px-5 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700">
              View Blog
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pt-24 min-h-screen pb-20 bg-white">
      <section className="relative overflow-hidden">
        <div className="h-[420px] w-full relative">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-end p-6 md:p-10">
            <div className="max-w-3xl bg-white/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700 bg-orange-100 px-3 py-1 rounded-full inline-block mb-3">
                {post.category}
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">{post.title}</h1>
              <p className="text-sm text-gray-500 mt-4">
                {formatDate(post.date)} · {author?.name || post.author || 'Unknown author'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 space-y-10">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6 text-gray-700 leading-relaxed text-base">
            <div className="prose prose-lg prose-orange max-w-none whitespace-pre-line">{post.content}</div>
          </div>

          <aside className="space-y-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">More about this article</h2>
              <p className="text-sm text-gray-500">This article can be managed from the admin panel, including the cover image, body content, publication status, and extra image gallery.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
                <div className="p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Category</p>
                  <p className="mt-2 text-base font-semibold text-gray-900">{post.category}</p>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
                <div className="p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Author</p>
                  <div className="flex items-center gap-3 mt-2">
                {author?.imageUrl && (
                  <img
                    src={author.imageUrl}
                    alt={author.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-200"
                  />
                )}
                <p className="text-base font-semibold text-gray-900">{author?.name || post.author || 'Unknown author'}</p>
              </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {post.images && post.images.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900">Image Gallery</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {post.images.map((image, index) => (
                <div key={index} className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50 shadow-sm">
                  <img src={image} alt={`${post.title} image ${index + 1}`} className="w-full h-64 object-cover object-center" />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-between items-center pt-6 border-t border-gray-100">
          <Link to="/blog" className="text-sm text-orange-600 font-semibold hover:text-orange-700">Back to blog</Link>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Return
          </button>
        </div>
      </section>
    </main>
  );
}
