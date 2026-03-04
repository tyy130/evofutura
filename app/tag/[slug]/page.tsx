import Link from 'next/link';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import { getPostsByTagSlug, getTaxonomySnapshot } from '@/lib/posts';
import { titleFromSlug } from '@/lib/taxonomy';

export async function generateStaticParams() {
  const taxonomy = await getTaxonomySnapshot();
  return taxonomy.tags.map(tag => ({ slug: tag.slug }));
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = await getPostsByTagSlug(slug);

  if (posts.length === 0) {
    notFound();
  }

  const tagName = titleFromSlug(slug);

  return (
    <div className="space-y-10">
      <header className="reveal-up rounded-[2rem] border border-[var(--line)] bg-white/88 p-7 sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--c-accent)]">Tag Feed</p>
        <h1 className="mt-2 text-5xl font-bold sm:text-6xl">{tagName}</h1>
        <p className="mt-3 text-[var(--muted)]">{posts.length} posts tagged with {tagName}.</p>
      </header>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map(post => (
          <article key={post.slug} className="editorial-card reveal-up rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              <span>{post.type}</span>
              <span>{format(new Date(post.date), 'MMM d, yyyy')}</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight">
              <Link href={`/blog/${post.slug}`} className="hover:text-[var(--c-accent)]">
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 line-clamp-3 text-sm text-[var(--muted)]">{post.excerpt}</p>
            <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              <Link href={`/category/${post.category.toLowerCase()}`} className="text-[var(--c-accent)] hover:underline">
                {post.category}
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
