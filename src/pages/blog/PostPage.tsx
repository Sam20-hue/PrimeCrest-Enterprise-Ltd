import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSiteData } from '../../context/SiteDataContext';
import { translations } from '../../i18n/translations';
import { useMetaTags } from '../../utils/useMetaTags';

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

  // Set meta tags for SEO
  useMetaTags({
    title: post?.title,
    description: post?.excerpt || post?.title,
    image: post?.imageUrl,
    type: 'article',
  });

  // Use authors from context, fallback to mockAuthors if empty
  const authorsList = authors;
  
  const author = post
    ? authorsList.find((a) => a.id === post.authorId) ||
      authorsList.find((a) => a.name?.toLowerCase() === post.author?.toLowerCase()) ||
      null
    : null;

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
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="h-[500px] w-full relative flex items-center justify-center">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-contain object-center"
          />
          <div className="absolute inset-0 bg-black/30" />
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
            <article
              className="prose prose-lg prose-orange max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content || '<p>No content available.</p>' }}
            />
          </div>

          <aside className="space-y-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">More about this article</h2>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
                <div className="p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Category</p>
                  <p className="mt-2 text-base font-semibold text-gray-900">{post.category}</p>
                </div>
              </div>
              {author && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-slate-500 to-slate-600 rounded-t-2xl p-4">
                    <h3 className="text-white font-semibold text-lg">About the Author</h3>
                  </div>
                  <div className="p-6 bg-white rounded-b-2xl border border-gray-200 text-center space-y-4">
                    {/* Author Avatar */}
                    <div className="flex justify-center -mt-12 mb-3">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-3xl overflow-hidden border-4 border-white shadow-lg">
                        {author.imageUrl ? (
                          <img
                            src={author.imageUrl}
                            alt={author.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{author.name?.[0]?.toUpperCase() || 'A'}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Author Name */}
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{author.name}</h4>
                      {author.subtitle && (
                        <p className="text-sm text-gray-600 mt-1">{author.subtitle}</p>
                      )}
                    </div>
                    
                    {/* Metadata */}
                    <div className="space-y-2 text-sm text-gray-600 border-y border-gray-200 py-3">
                      {author.joinDate && (
                        <p><i className="ri-calendar-line text-orange-600 mr-2"></i>Member since {author.joinDate}</p>
                      )}
                      {author.lastActive && (
                        <p><i className="ri-time-line text-orange-600 mr-2"></i>Last active: {author.lastActive}</p>
                      )}
                    </div>
                    
                    {/* Author Bio */}
                    {author.bio && (
                      <p className="text-sm text-gray-700 leading-relaxed text-left">
                        {author.bio}
                      </p>
                    )}
                    
                    {/* Social Media Links */}
                    {(author.linkedIn || author.upwork) && (
                      <div className="flex justify-center gap-3 pt-2">
                        {author.linkedIn && (
                          <a
                            href={author.linkedIn}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                            title="LinkedIn"
                          >
                            <i className="ri-linkedin-fill text-lg"></i>
                          </a>
                        )}
                        {author.upwork && (
                          <a
                            href={author.upwork}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors"
                            title="Upwork"
                          >
                            <i className="ri-briefcase-fill text-lg"></i>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {post.images && post.images.length > 0 && (
          <section className="space-y-8 border-t border-gray-100 pt-12">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-gray-900">Image Gallery</h2>
              <p className="text-sm text-gray-500">{post.images.length} image{post.images.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="space-y-12">
              {post.images.map((imageData, index) => {
                const imgUrl = typeof imageData === 'string' ? imageData : imageData.url;
                const imgDesc = typeof imageData === 'string' ? '' : (imageData.description || '');
                return (
                  <div key={index} className="space-y-4">
                    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50 shadow-lg hover:shadow-xl transition-shadow">
                      <img
                        src={imgUrl}
                        alt={imgDesc || `${post.title} image ${index + 1}`}
                        className="w-full h-96 object-cover object-center"
                        loading="lazy"
                      />
                    </div>
                    {imgDesc && (
                      <div className="max-w-3xl">
                        <div
                          className="prose prose-lg prose-orange max-w-none text-gray-700 text-base leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: imgDesc }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
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
