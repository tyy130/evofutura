import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import NewsletterForm from '@/components/NewsletterForm';
import { getPostsByCategory } from '@/lib/posts';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';

// Architecture: Map URL slugs to Database Categories
const categoryMap: Record<string, string> = {
  'ai': 'AI',
  'ml': 'ML',
  'cloud': 'Cloud',
  'devops': 'DevOps',
  'webdev': 'WebDev',
  'security': 'Security',
  'data': 'Data',
  'mobile': 'Mobile'
};

const categoryDescriptions: Record<string, string> = {
  'AI': 'Artificial Intelligence, Neural Networks, and the rise of Autonomous Agents.',
  'ML': 'Machine Learning pipelines, data engineering, and predictive modeling.',
  'Cloud': 'Serverless architecture, distributed systems, and edge computing.',
  'DevOps': 'CI/CD, Infrastructure as Code, and Site Reliability Engineering.',
  'WebDev': 'Modern frontend frameworks, WASM, and the future of the browser.',
  'Security': 'Zero-trust architecture, threat detection, and supply chain security.',
  'Data': 'Data mesh, vector databases, real-time analytics, and data governance.',
  'Mobile': 'Cross-platform development, edge ML on devices, and offline-first patterns.'
};

export async function generateStaticParams() {
  const categories = Object.keys(categoryMap);
  return categories.map((slug) => ({
    slug: slug,
  }));
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dbCategory = categoryMap[slug.toLowerCase()];

  if (!dbCategory) {
    notFound();
  }

  const posts = await getPostsByCategory(dbCategory);

  if (posts.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
        <h1 className="text-4xl font-heading font-bold text-slate-950">{dbCategory}</h1>
        <p className="text-slate-500">Intelligence gathering in progress. No data streams available yet.</p>
        <Link href="/" className="text-blue-600 font-bold hover:underline">Return to Command</Link>
      </div>
    );
  }

  const featured = posts[0];
  const grid = posts.slice(1);

  return (
    <div className="space-y-24 pb-20">
      {/* 1. TOPIC HEADER */}
      <header className="space-y-8 border-b border-slate-100 pb-12">
        <div className="flex items-center space-x-3 text-xs font-bold text-blue-600 uppercase tracking-widest">
          <Link href="/" className="hover:text-slate-950 transition-colors">Home</Link>
          <span className="text-slate-300">/</span>
          <span>Topic Hub</span>
        </div>
        <div className="max-w-3xl">
          <h1 className="text-6xl md:text-8xl font-heading font-extrabold text-slate-950 tracking-tighter mb-6">
            {dbCategory}
          </h1>
          <p className="text-xl text-slate-500 font-medium leading-relaxed">
            {categoryDescriptions[dbCategory] || `Deep dive analysis into ${dbCategory}.`}
          </p>
        </div>
      </header>

      {/* 2. FEATURED IN CATEGORY */}
      {featured && (
        <section className="group grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8 relative aspect-[16/9] rounded-3xl overflow-hidden border border-slate-200 shadow-2xl">
            <SafeImage
              src={featured.image || ''}
              alt={featured.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <span className="inline-block px-3 py-1 rounded bg-slate-100 text-slate-950 text-xs font-bold uppercase tracking-widest">
              Top Story
            </span>
            <h2 className="text-3xl font-heading font-bold text-slate-950 leading-tight group-hover:text-blue-600 transition-colors">
              <Link href={`/blog/${featured.slug}`}>
                {featured.title}
              </Link>
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {featured.excerpt}
            </p>
            <span className="text-xs text-slate-400 pt-2">{format(new Date(featured.date), 'MMM d')}</span>
          </div>
        </section>
      )}

      {/* 3. ARCHIVE GRID */}
      {grid.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-6 mb-12">
            Recent Analysis
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
            {grid.map((post) => (
              <article key={post.slug} className="group space-y-5">
                <div className="relative aspect-[3/2] rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                  <SafeImage
                    src={post.image || ''}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-heading font-bold text-slate-950 leading-snug group-hover:text-blue-600 transition-colors">
                    <Link href={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block pt-2">
                    {format(new Date(post.date), 'MMMM d, yyyy')}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 4. NEWSLETTER CTA */}
      <section className="bg-slate-950 rounded-3xl p-16 text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"></div>
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-heading font-bold text-white">
            Master the {dbCategory} Stack
          </h2>
          <p className="text-slate-400 leading-relaxed">
            Get weekly architectural patterns and engineering deep dives specific to {dbCategory} delivered to your inbox.
          </p>
          <div className="max-w-lg mx-auto">
            <NewsletterForm location={`category-${dbCategory}`} variant="dark" />
          </div>
        </div>
      </section>
    </div>
  );
}
