import Link from 'next/link';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import SafeImage from '@/components/SafeImage';
import NewsletterForm from '@/components/NewsletterForm';
import { getPostsByCategory } from '@/lib/posts';
import { CATEGORY_META, titleFromSlug } from '@/lib/taxonomy';
import { getCategoryFallbackImage, getPostImageForDisplay } from '@/lib/images';

const categorySlugs = Object.keys(CATEGORY_META).map(category => category.toLowerCase());

export async function generateStaticParams() {
  return categorySlugs.map(slug => ({ slug }));
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categoryName = Object.keys(CATEGORY_META).find(category => category.toLowerCase() === slug);

  if (!categoryName) {
    notFound();
  }

  const posts = await getPostsByCategory(categoryName);

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--line)] bg-white/85 p-12 text-center">
        <h1 className="text-5xl font-bold">{categoryName}</h1>
        <p className="mt-4 text-[var(--muted)]">No posts are published for this category yet.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-bold uppercase tracking-[0.16em] text-[var(--c-accent)]">
          Back Home
        </Link>
      </div>
    );
  }

  const [featured, ...rest] = posts;

  return (
    <div className="space-y-12">
      <header className="reveal-up rounded-[2rem] border border-[var(--line)] bg-white/88 p-7 sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--c-accent)]">Category Hub</p>
        <h1 className="mt-2 text-5xl font-bold sm:text-6xl">{categoryName}</h1>
        <p className="mt-4 max-w-2xl text-base text-[var(--muted)]">{CATEGORY_META[categoryName].description}</p>
      </header>

      <section className="reveal-up reveal-delay-1 grid gap-8 lg:grid-cols-12">
        <article className="lg:col-span-7">
          <Link href={`/blog/${featured.slug}`} className="block overflow-hidden rounded-3xl border border-[var(--line)] bg-white">
            <div className="relative aspect-[16/10]">
              <SafeImage
                src={getPostImageForDisplay(featured.image, featured.category)}
                alt={featured.title}
                fallbackSrc={getCategoryFallbackImage(featured.category)}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </div>
            <div className="space-y-3 p-6">
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                <span>{featured.type}</span>
                <span>•</span>
                <span>{format(new Date(featured.date), 'MMMM d, yyyy')}</span>
              </div>
              <h2 className="text-4xl font-bold leading-tight">{featured.title}</h2>
              <p className="text-sm text-[var(--muted)]">{featured.excerpt}</p>
            </div>
          </Link>
        </article>

        <aside className="space-y-4 lg:col-span-5">
          {rest.slice(0, 3).map(post => (
            <article key={post.slug} className="editorial-card rounded-2xl p-4">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                <span>{post.type}</span>
                <span>{format(new Date(post.date), 'MMM d')}</span>
              </div>
              <h3 className="text-2xl font-bold leading-tight">
                <Link href={`/blog/${post.slug}`} className="hover:text-[var(--c-accent)]">
                  {post.title}
                </Link>
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{post.excerpt}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.slice(0, 2).map(tag => (
                  <Link key={tag} href={`/tag/${tag}`} className="chip rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                    {titleFromSlug(tag)}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </aside>
      </section>

      <section className="reveal-up reveal-delay-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rest.slice(3).map(post => (
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
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{post.type}</div>
              <h3 className="text-2xl font-bold leading-tight">
                <Link href={`/blog/${post.slug}`} className="hover:text-[var(--c-accent)]">
                  {post.title}
                </Link>
              </h3>
              <p className="line-clamp-2 text-sm text-[var(--muted)]">{post.excerpt}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] border border-[#0a314f] bg-[#071b2d] p-8 text-white sm:p-10">
        <h3 className="text-3xl font-bold text-white">{categoryName} Briefing</h3>
        <p className="mt-2 max-w-xl text-sm text-slate-300">
          Get curated {categoryName} analysis in your inbox with practical architecture signals and implementation takeaways.
        </p>
        <div className="mt-5 max-w-lg">
          <NewsletterForm location={`category-${categoryName.toLowerCase()}`} variant="dark" />
        </div>
      </section>
    </div>
  );
}
