import Link from 'next/link';
import { format } from 'date-fns';
import { getPostsByTypeSlug, getTypeStaticParams } from '@/lib/posts';

export async function generateStaticParams() {
  return getTypeStaticParams();
}

export default async function TypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPostsByTypeSlug(slug);

  if (data.posts.length === 0) {
    return (
      <div className="space-y-10">
        <header className="reveal-up rounded-[2rem] border border-[var(--line)] bg-white/88 p-7 sm:p-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--c-accent)]">Format Archive</p>
          <h1 className="mt-2 text-5xl font-bold sm:text-6xl">{data.type}</h1>
          <p className="mt-3 text-[var(--muted)]">No published posts in this format yet.</p>
        </header>
        <section className="editorial-card rounded-2xl p-6">
          <p className="text-sm text-[var(--muted)]">
            We are curating the first pieces in this format now. Check back shortly for fresh analysis.
          </p>
          <Link href="/" className="mt-4 inline-block text-xs font-bold uppercase tracking-[0.16em] text-[var(--c-accent)] hover:underline">
            Return Home
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="reveal-up rounded-[2rem] border border-[var(--line)] bg-white/88 p-7 sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--c-accent)]">Format Archive</p>
        <h1 className="mt-2 text-5xl font-bold sm:text-6xl">{data.type}</h1>
        <p className="mt-3 text-[var(--muted)]">{data.posts.length} published pieces in this format.</p>
      </header>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.posts.map(post => (
          <article key={post.slug} className="editorial-card reveal-up rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              <Link href={`/category/${post.category.toLowerCase()}`} className="text-[var(--c-accent)] hover:underline">
                {post.category}
              </Link>
              <span>{format(new Date(post.date), 'MMM d, yyyy')}</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight">
              <Link href={`/blog/${post.slug}`} className="hover:text-[var(--c-accent)]">
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 line-clamp-3 text-sm text-[var(--muted)]">{post.excerpt}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
