import { prisma } from './prisma';
import OpenAI from 'openai';
import { ARCHITECT_PERSONA, generateTopicPrompt, CATEGORY_TONES } from './prompts';
import { discoverTopic, DiscoveredTopic } from './discovery';
import { researchTopic, formatResearchForPrompt, ResearchResult } from './research';
import pillarsData from '../config/pillars.json';

const pillars = pillarsData as Record<string, string[]>;

export type PipelineMode = 'discovery' | 'legacy';

interface PipelineResult {
  post: {
    id: string | number;
    title: string;
    slug: string;
    category: string;
  };
  mode: PipelineMode;
  discoveredTopic?: DiscoveredTopic;
  research?: ResearchResult;
}

/**
 * v2 Content Pipeline: Discovery → Research → Write → Publish
 */
export async function runContentPipeline(): Promise<PipelineResult> {
  console.log('[Pipeline] Starting v2 content generation...');

  // ============================================
  // PHASE 1: TOPIC DISCOVERY
  // ============================================
  let topic: string = '';
  let category: string = '';
  let discoveredTopic: DiscoveredTopic | null = null;
  let research: ResearchResult | null = null;
  let researchPrompt = '';
  let mode: PipelineMode = 'legacy';

  try {
    discoveredTopic = await discoverTopic();

    if (discoveredTopic) {
      topic = discoveredTopic.topic;
      category = discoveredTopic.category;
      mode = 'discovery';
      console.log(`[Pipeline] Using discovered topic: "${topic}" (${category})`);

      // ============================================
      // PHASE 2: RESEARCH
      // ============================================
      const sourceUrls = discoveredTopic.sources.map(s => s.url);
      research = await researchTopic(topic, sourceUrls);

      if (research.sufficient) {
        researchPrompt = formatResearchForPrompt(research);
        console.log(`[Pipeline] Research complete: ${research.claims.length} claims from ${research.primary_sources.length} sources`);
      } else {
        console.log(`[Pipeline] Insufficient sources (${research.primary_sources.length}), proceeding without research`);
      }
    }
  } catch (err) {
    console.warn(`[Pipeline] Discovery failed, falling back to legacy mode: ${err}`);
  }

  // Fallback to legacy random topic selection
  if (!discoveredTopic) {
    console.log('[Pipeline] Falling back to legacy random topic selection');
    const categories = Object.keys(pillars);
    category = categories[Math.floor(Math.random() * categories.length)];
    topic = pillars[category][Math.floor(Math.random() * pillars[category].length)];
    mode = 'legacy';
  }

  // ============================================
  // CONTEXT: Duplicate Detection
  // ============================================
  const pastArticles = await prisma.post.findMany({
    select: { title: true, slug: true, category: true },
    orderBy: { date: 'desc' },
    take: 50
  });

  const duplicate = pastArticles.find(p =>
    p.title.toLowerCase().includes(topic.toLowerCase().slice(0, 30))
  );

  let contextPrompt = '';

  if (duplicate) {
    console.log(`[Pipeline] Found similar article: "${duplicate.title}". Adding context.`);
    contextPrompt = `
CONTEXT AWARENESS:
We previously wrote about "${duplicate.title}". 
Focus on NEW developments or a different angle. Do not repeat that content.
`;
  } else {
    const related = pastArticles.filter(p => p.category === category).slice(0, 2);
    if (related.length > 0) {
      contextPrompt = `
INTERNAL LINKING:
Relevant existing articles: ${related.map(p => `"${p.title}"`).join(', ')}
Reference these where appropriate.
`;
    }
  }

  // ============================================
  // PHASE 3: ARTICLE WRITING
  // ============================================
  let title = topic;
  let content = '';
  let excerpt = '';

  const apiKey = process.env.OPENAI_API_KEY;
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });

      const userPrompt = `
${generateTopicPrompt(category, topic)}

CATEGORY GUIDANCE: ${CATEGORY_TONES[category] || ''}

${researchPrompt}

${contextPrompt}

${discoveredTopic ? `
WHY NOW: ${discoveredTopic.why_now}
ANGLE: ${discoveredTopic.angle}
` : ''}
      `.trim();

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: ARCHITECT_PERSONA(currentDate) },
          { role: 'user', content: userPrompt }
        ],
      });

      const rawOutput = completion.choices[0].message.content || '';
      const lines = rawOutput.split('\n').filter(l => l.trim() !== '');

      // Extract excerpt (first line)
      const rawExcerpt = lines[0];
      excerpt = rawExcerpt
        .replace(/^(\*\*|__)?Excerpt:?\s*(\*\*|__)?\s*/i, '')
        .replace(/^\**|\**$/g, '')
        .trim()
        .substring(0, 250);

      content = lines.slice(1).join('\n');

      // Clean title
      title = topic
        .replace(/^["']|["']$/g, '')
        .substring(0, 200);

    } catch (e) {
      console.error('[Pipeline] Generation failed:', e instanceof Error ? e.message : 'Unknown error');
      excerpt = `Analysis of ${topic} in the context of modern ${category}.`;
      content = `# ${topic}\n\nTechnical analysis pending.\n\n## Key Patterns\n- Resilience\n- Scalability`;
    }
  } else {
    excerpt = `[No API Key] ${topic} analysis.`;
    content = `# ${topic}\n\n[SIMULATION MODE - No OpenAI API key configured]`;
  }

  // Generate slug
  const slug = `${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}-${Math.floor(Math.random() * 1000)}`;

  // ============================================
  // PHASE 4: IMAGE SOURCING
  // ============================================
  let selectedImage = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200';

  if (process.env.UNSPLASH_ACCESS_KEY) {
    try {
      const query = encodeURIComponent(`${category} technology abstract`);
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&orientation=landscape&per_page=1`,
        { headers: { 'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          selectedImage = data.results[0].urls.regular;
        }
      }
    } catch (e) {
      console.error('[Pipeline] Image fetch failed:', e);
    }
  }

  // ============================================
  // PHASE 5: PUBLISH
  // ============================================
  const published = await prisma.post.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      category,
      author: 'EvoBot',
      image: selectedImage,
      published: true,
      date: new Date()
    }
  });

  console.log(`[Pipeline] Published: "${title}" (${slug})`);

  return {
    post: {
      id: published.id,
      title: published.title,
      slug: published.slug,
      category: published.category,
    },
    mode,
    discoveredTopic: discoveredTopic || undefined,
    research: research || undefined,
  };
}

// Re-export for backwards compatibility
export { discoverTopic, discoverMultipleTopics } from './discovery';
export { researchTopic } from './research';