import Link from 'next/link';
import { format } from 'date-fns';
import SafeImage from '@/components/SafeImage';
import { getSortedPostsData } from '@/lib/posts';
import { getCategoryFallbackImage, getPostImageForDisplay } from '@/lib/images';

export const metadata = {
  title: 'Archive | EvoFutura',
  description: 'Complete archive of EvoFutura coverage.',
};

export default async function ArchivePage() {
  const posts = await getSortedPostsData();

  const postsByYear = posts.reduce<Record<string, typeof posts>>((acc, post) => {
    const year = new Date(post.date).getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(post);
    return acc;
  }, {});

  const years = Object.keys(postsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-12 pb-12">
      <header className="reveal-up rounded-[2rem] border border-[var(--line)] bg-white/88 p-7 sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--c-accent)]">Archive</p>
        <h1 className="mt-2 text-5xl font-bold sm:text-6xl">Intelligence Library</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          {posts.length} published entries across AI, cloud, security, and future engineering systems.
        </p>
      </header>

      {years.map(year => (
        <section key={year} className="reveal-up reveal-delay-1 space-y-5">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <h2 className="text-4xl font-bold">{year}</h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              {postsByYear[year].length} posts
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {postsByYear[year].map(post => (
              <article key={post.slug} className="editorial-card rounded-2xl p-4">
                <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]">
                  <SafeImage
                    src={getPostImageForDisplay(post.image, post.category)}
                    alt={post.title}
                    fallbackSrc={getCategoryFallbackImage(post.category)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 48vw, 32vw"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                    <span>{post.type}</span>
                    <span>{format(new Date(post.date), 'MMM d')}</span>
                  </div>
                  <h3 className="text-2xl font-bold leading-tight">
                    <Link href={`/blog/${post.slug}`} className="hover:text-[var(--c-accent)]">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="line-clamp-2 text-sm text-[var(--muted)]">{post.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
