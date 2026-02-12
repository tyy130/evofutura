import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import { getSortedPostsData } from '@/lib/posts';
import { format } from 'date-fns';

export const metadata = {
  title: 'Archive | EvoFutura',
  description: 'The complete library of autonomous tech intelligence.',
};

export default async function ArchivePage() {
  const posts = await getSortedPostsData();

  // Group by year for a better archive experience
  const postsByYear = posts.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(post);
    return acc;
  }, {} as Record<string, typeof posts>);

  const years = Object.keys(postsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-20">
      <header className="border-b border-slate-100 pb-12">
        <h1 className="text-5xl md:text-7xl font-heading font-extrabold text-slate-950 tracking-tighter mb-6">
          Intelligence Archive
        </h1>
        <p className="text-xl text-slate-500 font-medium max-w-2xl">
          The complete repository of {posts.length} architectural deep dives and engineering reports.
        </p>
      </header>

      <div className="space-y-24">
        {years.map((year) => (
          <section key={year} className="space-y-10">
            <h2 className="text-8xl font-heading font-black text-slate-100 select-none -ml-1">
              {year}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
              {postsByYear[year].map((post) => (
                <article key={post.slug} className="group space-y-5">
                  <div className="relative aspect-[3/2] rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm">
                    <SafeImage
                      src={post.image || ''}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-blue-600">{post.category}</span>
                      <span className="text-slate-400">{format(new Date(post.date), 'MMM d')}</span>
                    </div>
                    <h3 className="text-xl font-heading font-bold text-slate-950 leading-tight group-hover:text-blue-600 transition-colors">
                      <Link href={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
