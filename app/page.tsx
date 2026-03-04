import Link from 'next/link';
import { format } from 'date-fns';
import SafeImage from '@/components/SafeImage';
import NewsletterForm from '@/components/NewsletterForm';
import { getSortedPostsData, getTaxonomySnapshot, type PostMetadata } from '@/lib/posts';
import { CATEGORY_META, titleFromSlug } from '@/lib/taxonomy';
import { getCategoryFallbackImage, getPostImageForDisplay, hasDisplayImage } from '@/lib/images';

export const dynamic = 'force-static';

type LatestTile =
  | { kind: 'image'; post: PostMetadata }
  | { kind: 'stack'; posts: PostMetadata[] };

function createLatestTiles(posts: PostMetadata[]): LatestTile[] {
  const imagePosts = posts.filter(post => hasDisplayImage(post.image));
  const textPosts = posts.filter(post => !hasDisplayImage(post.image));

  const stacks: LatestTile[] = [];
  for (let i = 0; i < textPosts.length; i += 3) {
    stacks.push({ kind: 'stack', posts: textPosts.slice(i, i + 3) });
  }

  const tiles: LatestTile[] = [];
  let imageCursor = 0;
  let stackCursor = 0;

  while (imageCursor < imagePosts.length || stackCursor < stacks.length) {
    for (let i = 0; i < 2 && imageCursor < imagePosts.length; i += 1) {
      tiles.push({ kind: 'image', post: imagePosts[imageCursor] });
      imageCursor += 1;
    }

    if (stackCursor < stacks.length) {
      tiles.push(stacks[stackCursor]);
      stackCursor += 1;
    }

    if (imageCursor >= imagePosts.length && stackCursor < stacks.length) {
      tiles.push(stacks[stackCursor]);
      stackCursor += 1;
    }
  }

  return tiles;
}

export default async function Home() {
  const [posts, taxonomy] = await Promise.all([getSortedPostsData(), getTaxonomySnapshot()]);

  const featured = posts[0];
  const highlights = posts.slice(1, 4);
  const latest = posts.slice(4, 12);
  const latestTiles = createLatestTiles(latest);

  return (
    <div className="space-y-16 pb-12">
      {featured && (
        <section className="reveal-up overflow-hidden rounded-[2.2rem] border border-[var(--line)] bg-white/88 p-5 shadow-[0_20px_60px_rgba(7,47,74,0.12)] backdrop-blur-sm sm:p-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
            <div className="space-y-6 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                <span className="rounded-full bg-[var(--c-ink)] px-3 py-1 text-white">Featured</span>
                <span>{featured.type}</span>
                <span>•</span>
                <time dateTime={featured.date}>{format(new Date(featured.date), 'MMMM d, yyyy')}</time>
              </div>

              <h1 className="text-4xl font-bold leading-[1.04] sm:text-5xl lg:text-6xl">{featured.title}</h1>
              <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted)]">{featured.excerpt}</p>

              <div className="flex flex-wrap items-center gap-3">
                {featured.tags.slice(0, 4).map(tag => (
                  <Link
                    key={tag}
                    href={`/tag/${tag}`}
                    className="chip rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                  >
                    {titleFromSlug(tag)}
                  </Link>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href={`/blog/${featured.slug}`}
                  className="rounded-full bg-[var(--c-ink)] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[var(--c-accent)]"
                >
                  Read Analysis
                </Link>
                <Link
                  href={`/category/${featured.category.toLowerCase()}`}
                  className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--c-accent)] hover:underline"
                >
                  More in {featured.category}
                </Link>
              </div>
            </div>

            <div className="relative min-h-[300px] overflow-hidden rounded-[1.6rem] border border-[var(--line)] lg:col-span-5">
              <SafeImage
                src={getPostImageForDisplay(featured.image, featured.category)}
                alt={featured.title}
                fallbackSrc={getCategoryFallbackImage(featured.category)}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 42vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#041422]/70 via-transparent to-transparent" />
            </div>
          </div>
        </section>
      )}

      <section className="reveal-up reveal-delay-1 grid gap-5 md:grid-cols-3">
        {highlights.map((post, index) => (
          <article key={post.slug} className="editorial-card rounded-3xl p-5 transition-transform duration-200 hover:-translate-y-1">
            <div className="mb-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              <span>{post.type}</span>
              <span>{format(new Date(post.date), 'MMM d')}</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight">
              <Link href={`/blog/${post.slug}`} className="hover:text-[var(--c-accent)]">
                {post.title}
              </Link>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] line-clamp-3">{post.excerpt}</p>
            <div className="mt-5 flex items-center justify-between">
              <Link
                href={`/category/${post.category.toLowerCase()}`}
                className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--c-accent)]"
              >
                {post.category}
              </Link>
              <span className="text-xs text-slate-400">#{index + 1}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="reveal-up reveal-delay-2 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-4">
            <h3 className="text-3xl font-bold">Latest Dispatches</h3>
            <Link href="/archive" className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--c-accent)] hover:underline">
              Open Archive
            </Link>
          </div>

          <div className="grid items-start gap-5 sm:grid-cols-2">
            {latestTiles.map((tile, index) =>
              tile.kind === 'image' ? (
                <article key={tile.post.slug} className="editorial-card self-start rounded-3xl p-4">
                  <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]">
                    <SafeImage
                      src={tile.post.image!}
                      alt={tile.post.title}
                      fallbackSrc={getCategoryFallbackImage(tile.post.category)}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 48vw"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                      <span>{tile.post.type}</span>
                      <span>{format(new Date(tile.post.date), 'MMM d')}</span>
                    </div>
                    <h4 className="text-2xl font-bold leading-tight">
                      <Link href={`/blog/${tile.post.slug}`} className="hover:text-[var(--c-accent)]">
                        {tile.post.title}
                      </Link>
                    </h4>
                    <p className="line-clamp-2 text-sm text-[var(--muted)]">{tile.post.excerpt}</p>
                  </div>
                </article>
              ) : (
                <article key={`stack-${index}`} className="editorial-card self-start rounded-3xl p-4">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Brief Stack
                  </div>
                  <div className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-white/80">
                    {tile.posts.map(post => (
                      <div key={post.slug} className="space-y-2 p-4">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                          <span>{post.type}</span>
                          <span>{format(new Date(post.date), 'MMM d')}</span>
                        </div>
                        <h4 className="text-xl font-bold leading-tight">
                          <Link href={`/blog/${post.slug}`} className="hover:text-[var(--c-accent)]">
                            {post.title}
                          </Link>
                        </h4>
                        <p className="line-clamp-2 text-sm text-[var(--muted)]">{post.excerpt}</p>
                      </div>
                    ))}
                  </div>
                </article>
              )
            )}
          </div>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <div className="editorial-card rounded-3xl p-5">
            <h4 className="text-xl font-bold">Browse by Format</h4>
            <div className="mt-4 space-y-3">
              {taxonomy.types.map(type => (
                <Link
                  key={type.slug}
                  href={`/type/${type.slug}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--line)] px-4 py-3 transition-colors hover:border-[var(--c-accent)]"
                >
                  <span className="text-sm font-semibold">{type.name}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{type.count}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="editorial-card rounded-3xl p-5">
            <h4 className="text-xl font-bold">Tag Radar</h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {taxonomy.tags.slice(0, 18).map(tag => (
                <Link
                  key={tag.slug}
                  href={`/tag/${tag.slug}`}
                  className="chip rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                >
                  {titleFromSlug(tag.slug)}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="reveal-up reveal-delay-3 rounded-[2rem] border border-[var(--line)] bg-white/85 p-6 sm:p-8">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <h3 className="text-3xl font-bold">Category Matrix</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Coverage map across AI, infrastructure, and future systems.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {taxonomy.categories.map(category => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="rounded-2xl border border-[var(--line)] bg-white p-4 transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="mb-3 h-1.5 w-14 rounded-full" style={{ background: category.accent }} />
              <p className="text-lg font-bold">{category.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                {CATEGORY_META[category.name]?.description || 'Technical analysis and editorial perspective.'}
              </p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{category.count} posts</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="reveal-up rounded-[2rem] border border-[#0a314f] bg-[#071b2d] p-8 text-white sm:p-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Newsletter</p>
            <h3 className="text-4xl font-bold text-white">Weekly Tech Intelligence</h3>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300">
              Get one high-signal brief every week across AI, platform engineering, and frontier technology.
            </p>
          </div>
          <div>
            <NewsletterForm location="home-hero-newsletter" variant="dark" placeholder="name@company.com" />
          </div>
        </div>
      </section>
    </div>
  );
}
