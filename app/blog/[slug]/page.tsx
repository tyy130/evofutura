import { getPostData, getSortedPostsData, getRelatedPosts } from '@/lib/posts';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import { AdSlot } from '@/components/Monetization';
import SafeImage from '@/components/SafeImage';
import NewsletterForm from '@/components/NewsletterForm';
import Link from 'next/link';

export const revalidate = 0;

export async function generateStaticParams() {
  const posts = await getSortedPostsData();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const postData = await getPostData(slug);

  if (!postData) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(postData.category, slug);

  // Logic: Clean up AI-generated content artifacts
  let cleanContent = postData.content;

  // Remove frontmatter that may have leaked into content (both YAML blocks and inline)
  cleanContent = cleanContent.replace(/^---[\s\S]*?---\s*/m, ''); // YAML frontmatter block
  cleanContent = cleanContent.replace(/^title:\s*["'].*?["']\s*/gm, ''); // title: "..."
  cleanContent = cleanContent.replace(/^date:\s*["'].*?["']\s*/gm, ''); // date: "..."
  cleanContent = cleanContent.replace(/^category:\s*["'].*?["']\s*/gm, ''); // category: "..."
  cleanContent = cleanContent.replace(/^author:\s*["'].*?["']\s*/gm, ''); // author: "..."

  // Remove the first image if it matches the featured image
  cleanContent = cleanContent.replace(/!\[Header\]\(.*?\)/, '');

  // Fix double/triple quotes in blockquotes
  cleanContent = cleanContent.replace(/"""+/g, '"');
  cleanContent = cleanContent.replace(/"\s*-\s*(\w+)"/g, '" - $1');

  return (
    <article className="max-w-4xl mx-auto pb-32">
      <header className="mb-16 space-y-12">
        <div className="space-y-6 text-center">
          <div className="flex items-center justify-center space-x-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">
            <Link href={`/category/${postData.category.toLowerCase()}`} className="text-blue-600 hover:underline transition-colors">
              {postData.category}
            </Link>
            <span>•</span>
            <time dateTime={postData.date}>
              {format(new Date(postData.date), 'MMMM d, yyyy')}
            </time>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-extrabold text-slate-950 leading-[1.05] tracking-tighter text-balance">
            {postData.title}
          </h1>
        </div>

        {postData.image && (
          <div className="relative aspect-[21/10] rounded-3xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/50">
            <SafeImage
              src={postData.image}
              alt={postData.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
            />
          </div>
        )}
      </header>

      <div className="max-w-3xl mx-auto">
        <AdSlot spot="article-top" />

        <div className="prose prose-slate prose-lg max-w-none 
          prose-headings:font-heading prose-headings:font-extrabold prose-headings:text-slate-950 prose-headings:tracking-tighter
          prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-8
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-slate-900
          prose-code:text-blue-700 prose-code:bg-slate-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded border-slate-100
          prose-pre:bg-slate-950 prose-pre:text-slate-100 prose-pre:rounded-2xl prose-pre:shadow-xl
          prose-blockquote:border-l-blue-600 prose-blockquote:bg-blue-50 prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
        ">
          <MDXRemote source={cleanContent} />
        </div>

        {/* RELATED ARTICLES SECTION */}
        {relatedPosts.length > 0 && (
          <section className="mt-24 pt-16 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">Related Insights</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {relatedPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group space-y-4">
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
                    <SafeImage src={post.image || ''} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                  </div>
                  <h4 className="font-heading font-bold text-slate-950 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                </Link>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-32 pt-16 border-t border-slate-100">
          <div className="bg-[#020617] rounded-[2.5rem] p-12 md:p-20 text-center space-y-8 shadow-2xl">
            <div className="space-y-4">
              <h3 className="text-3xl md:text-5xl font-heading font-extrabold !text-white tracking-tight leading-tight">
                Subscribe to the Insight Loop
              </h3>
              <p className="text-slate-400 max-w-lg mx-auto leading-relaxed text-lg">
                Join 50,000+ technology leaders receiving high-signal analysis every Tuesday.
              </p>
            </div>

            <div className="max-w-md mx-auto pt-4">
              <NewsletterForm location="article-footer" variant="dark" placeholder="Work email" />
            </div>

            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
              Zero Spam • One Click Unsubscribe
            </p>
          </div>
        </footer>
      </div>
    </article>
  );
}
