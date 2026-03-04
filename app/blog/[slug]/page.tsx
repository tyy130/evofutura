import type { Metadata } from 'next';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import SafeImage from '@/components/SafeImage';
import NewsletterForm from '@/components/NewsletterForm';
import PostViewTracker from '@/components/PostViewTracker';
import CommentsSection from '@/components/CommentsSection';
import { getPostData, getRelatedPosts, getSortedPostsData } from '@/lib/posts';
import { titleFromSlug } from '@/lib/taxonomy';
import { getCategoryFallbackImage, getPostImageForDisplay } from '@/lib/images';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  const posts = await getSortedPostsData();
  return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostData(slug);

  if (!post) {
    return {
      title: 'Article | EvoFutura',
      description: 'Technology analysis from EvoFutura.',
    };
  }

  const fallbackImage = getPostImageForDisplay(post.image, post.category);

  return {
    title: `${post.title} | EvoFutura`,
    description: post.excerpt,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      section: post.category,
      tags: post.tags,
      images: [
        {
          url: fallbackImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [fallbackImage],
    },
  };
}

function sanitizeGeneratedContent(content: string) {
  let clean = content;

  clean = clean.replace(/^---[\s\S]*?---\s*/m, '');
  clean = clean.replace(/^title:\s*["'].*?["']\s*/gim, '');
  clean = clean.replace(/^date:\s*["'].*?["']\s*/gim, '');
  clean = clean.replace(/^category:\s*["'].*?["']\s*/gim, '');
  clean = clean.replace(/^author:\s*["'].*?["']\s*/gim, '');
  clean = clean.replace(/!\[Header\]\(.*?\)/, '');

  return clean;
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostData(slug);

  if (!post) {
    notFound();
  }

  const related = await getRelatedPosts(post.category, slug);
  const cleanContent = sanitizeGeneratedContent(post.content);

  return (
    <article className="mx-auto max-w-5xl space-y-10 pb-16">
      <PostViewTracker slug={slug} />

      <header className="reveal-up rounded-[2rem] border border-[var(--line)] bg-white/88 p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          <Link href={`/category/${post.category.toLowerCase()}`} className="text-[var(--c-accent)] hover:underline">
            {post.category}
          </Link>
          <span>•</span>
          <Link href={`/type/${post.type.toLowerCase().replace(/\s+/g, '-')}`} className="text-[var(--c-ink)] hover:underline">
            {post.type}
          </Link>
          <span>•</span>
          <time dateTime={post.date}>{format(new Date(post.date), 'MMMM d, yyyy')}</time>
        </div>

        <h1 className="mt-4 text-4xl font-bold leading-[1.06] sm:text-6xl">{post.title}</h1>
        <p className="mt-4 max-w-3xl text-lg text-[var(--muted)]">{post.excerpt}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map(tag => (
            <Link
              key={tag}
              href={`/tag/${tag}`}
              className="chip rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
            >
              {titleFromSlug(tag)}
            </Link>
          ))}
        </div>
      </header>

      {post.image && (
        <div className="reveal-up reveal-delay-1 relative aspect-[16/8] overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white">
          <SafeImage
            src={getPostImageForDisplay(post.image, post.category)}
            alt={post.title}
            fallbackSrc={getCategoryFallbackImage(post.category)}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 1100px"
          />
        </div>
      )}

      <section className="reveal-up reveal-delay-2 rounded-[2rem] border border-[var(--line)] bg-white/92 p-6 sm:p-10">
        <div
          className="article-prose prose prose-slate max-w-none prose-a:text-[var(--c-accent)] prose-headings:font-heading prose-headings:font-bold prose-h2:text-4xl prose-h3:text-3xl"
        >
          <MDXRemote source={cleanContent} />
        </div>
      </section>

      <CommentsSection slug={post.slug} />

      {related.length > 0 && (
        <section className="reveal-up reveal-delay-3 rounded-[2rem] border border-[var(--line)] bg-white/85 p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between border-b border-[var(--line)] pb-4">
            <h2 className="text-3xl font-bold">Related Reads</h2>
            <Link href={`/category/${post.category.toLowerCase()}`} className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--c-accent)]">
              More {post.category}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map(item => (
              <article key={item.slug} className="editorial-card rounded-2xl p-4">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{item.type}</div>
                <h3 className="text-2xl font-bold leading-tight">
                  <Link href={`/blog/${item.slug}`} className="hover:text-[var(--c-accent)]">
                    {item.title}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{item.excerpt}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-[#0a314f] bg-[#071b2d] p-8 text-white sm:p-10">
        <h3 className="text-3xl font-bold text-white">Stay Ahead of the Curve</h3>
        <p className="mt-2 max-w-xl text-sm text-slate-300">
          Subscribe for weekly technical briefings and practical insights across AI, cloud, security, and future systems.
        </p>
        <div className="mt-5 max-w-lg">
          <NewsletterForm location="article-footer" variant="dark" placeholder="work@company.com" />
        </div>
      </section>
    </article>
  );
}
