import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import NewsletterForm from '@/components/NewsletterForm';
import { getSortedPostsData } from '@/lib/posts';
import { format } from 'date-fns';

export const revalidate = 0;

export default async function Home() {
  const posts = await getSortedPostsData();
  const featuredPost = posts[0];
  const trendingPosts = posts.slice(1, 5);
  const latestPosts = posts.slice(5, 11);

  const categories = ['AI', 'Cloud', 'DevOps', 'WebDev'];

  return (
    <div className="space-y-32 pb-24">
      {/* 1. HERO - Clean Editorial Style */}
      {featuredPost && (
        <section className="relative group">
          {/* Mobile Hero: Full-bleed image with title overlay */}
          <Link href={`/blog/${featuredPost.slug}`} className="block lg:hidden">
            <div className="relative aspect-[4/5] sm:aspect-[16/9] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              <SafeImage
                src={featuredPost.image || ''}
                alt={featuredPost.title}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
              {/* Stronger gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider text-white">
                    Featured
                  </span>
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight leading-tight text-white text-balance"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                >
                  {featuredPost.title}
                </h1>
                <p
                  className="text-sm text-slate-200 line-clamp-2 leading-relaxed"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
                >
                  {featuredPost.excerpt}
                </p>
                <span className="text-xs text-slate-400">{format(new Date(featuredPost.date), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </Link>

          {/* Desktop Hero: Side-by-side layout */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="flex items-center space-x-3 text-blue-600 font-bold tracking-tight uppercase text-[10px]">
                <span className="w-8 h-px bg-blue-600"></span>
                <span>Featured Analysis</span>
              </div>
              <h1 className="text-7xl font-heading font-extrabold tracking-tighter leading-[1.05] text-slate-950 text-balance">
                {featuredPost.title}
              </h1>
              <p className="text-xl text-slate-600 max-w-xl leading-relaxed font-medium">
                {featuredPost.excerpt}
              </p>
              <div className="flex items-center space-x-6 pt-4">
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="bg-slate-950 text-white px-10 py-4 rounded-full font-bold hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
                >
                  Read Article
                </Link>
                <span className="text-slate-400 font-mono text-sm">
                  {format(new Date(featuredPost.date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/50">
              <SafeImage
                src={featuredPost.image || ''}
                alt={featuredPost.title}
                fill
                className="object-cover"
                priority
                sizes="50vw"
              />
            </div>
          </div>
        </section>
      )}

      {/* 2. TRENDING - High Contrast Minimalist */}
      <section>
        <div className="flex items-center justify-between mb-12 border-b border-slate-100 pb-6">
          <h2 className="text-2xl font-heading font-bold text-slate-950 tracking-tight">Trending</h2>
          <Link href="/archive" className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors">Archive →</Link>
        </div>
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {trendingPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group space-y-5">
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <SafeImage
                  src={post.image || ''}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{post.category}</span>
                <h3 className="text-xl font-bold leading-tight text-slate-950 group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. RECENT ARTICLES - Clean Magazine Feed */}
      <section>
        <div className="grid lg:grid-cols-3 gap-24">
          <div className="lg:col-span-2 space-y-16">
            <h2 className="text-2xl font-heading font-bold text-slate-950 border-b border-slate-100 pb-6">Recent Articles</h2>
            {latestPosts.slice(0, 5).map((post) => (
              <article key={post.slug} className="group flex flex-col md:flex-row gap-10 items-center border-b border-slate-50 pb-16 last:border-0">
                <div className="relative w-full md:w-64 h-48 flex-shrink-0 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                  <SafeImage src={post.image || ''} alt={post.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 256px" />
                </div>
                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{post.category}</span>
                  <Link href={`/blog/${post.slug}`}>
                    <h3 className="text-3xl font-heading font-bold text-slate-950 group-hover:text-blue-600 transition-colors leading-tight">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-slate-600 leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                  <span className="text-xs text-slate-400">{format(new Date(post.date), 'MMM d')}</span>
                </div>
              </article>
            ))}
          </div>

          {/* SIDEBAR */}
          <div className="space-y-20">
            <div className="space-y-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4">Topics</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <Link
                    key={cat}
                    href={`/category/${cat.toLowerCase()}`}
                    className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-950 hover:text-white transition-all"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-10 border border-slate-100 space-y-6">
              <h3 className="text-2xl font-heading font-bold text-slate-950">Newsletter</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Join 50k+ readers receiving weekly analysis on the next wave of technology.
              </p>
              <NewsletterForm location="home-sidebar" variant="light" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}