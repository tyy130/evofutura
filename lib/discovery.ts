import Parser from 'rss-parser';

const parser = new Parser();

// RSS feeds for tech news discovery
const FEEDS = {
    hackernews: 'https://hnrss.org/frontpage?points=100',
    techcrunch_ai: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    verge_tech: 'https://www.theverge.com/rss/tech/index.xml',
    ars_tech: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    github_trending: 'https://rsshub.app/github/trending/daily/all',
    openai_blog: 'https://openai.com/blog/rss.xml',
    google_ai: 'https://blog.google/technology/ai/rss/',
};

// EvoFutura category mapping keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    AI: ['ai', 'artificial intelligence', 'llm', 'gpt', 'claude', 'gemini', 'openai', 'anthropic', 'agent', 'neural'],
    ML: ['machine learning', 'ml', 'training', 'model', 'pytorch', 'tensorflow', 'transformer', 'fine-tuning'],
    Cloud: ['cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'serverless', 'lambda', 'container', 'docker'],
    DevOps: ['devops', 'ci/cd', 'pipeline', 'terraform', 'ansible', 'deployment', 'infrastructure'],
    WebDev: ['react', 'next.js', 'typescript', 'javascript', 'frontend', 'web', 'browser', 'css'],
    Security: ['security', 'vulnerability', 'breach', 'zero-day', 'encryption', 'auth', 'hack', 'ransomware'],
    Data: ['database', 'data', 'sql', 'postgres', 'vector', 'analytics', 'warehouse', 'etl'],
    Mobile: ['mobile', 'ios', 'android', 'swift', 'kotlin', 'flutter', 'react native', 'app'],
};

export interface DiscoveredTopic {
    topic: string;
    angle: string;
    why_now: string;
    category: string;
    sources: { title: string; url: string; published: Date }[];
    score: number;
}

interface FeedItem {
    title: string;
    link: string;
    pubDate?: string;
    contentSnippet?: string;
    source: string;
}

/**
 * Fetch all RSS feeds and aggregate items
 */
async function fetchAllFeeds(): Promise<FeedItem[]> {
    const items: FeedItem[] = [];

    const feedPromises = Object.entries(FEEDS).map(async ([name, url]) => {
        try {
            const feed = await parser.parseURL(url);
            return feed.items.map(item => ({
                title: item.title || '',
                link: item.link || '',
                pubDate: item.pubDate,
                contentSnippet: item.contentSnippet,
                source: name,
            }));
        } catch (err) {
            console.warn(`[Discovery] Failed to fetch ${name}: ${err}`);
            return [];
        }
    });

    const results = await Promise.all(feedPromises);
    results.forEach(feedItems => items.push(...feedItems));

    return items;
}

/**
 * Categorize an item based on keywords
 */
function categorizeItem(item: FeedItem): string | null {
    const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => text.includes(kw))) {
            return category;
        }
    }
    return null;
}

/**
 * Score a topic based on recency, frequency, and source authority
 */
function scoreItem(item: FeedItem, frequency: number): number {
    let score = 0;

    // Recency: higher score for newer items
    if (item.pubDate) {
        const hoursAgo = (Date.now() - new Date(item.pubDate).getTime()) / (1000 * 60 * 60);
        score += Math.max(0, 100 - hoursAgo * 2); // Decay over ~50 hours
    }

    // Frequency: bonus for topics mentioned multiple times
    score += frequency * 10;

    // Source authority: official blogs > aggregators
    const authorityBonus: Record<string, number> = {
        openai_blog: 30,
        google_ai: 30,
        hackernews: 20, // High-signal community
        techcrunch_ai: 15,
        ars_tech: 15,
        verge_tech: 10,
        github_trending: 10,
    };
    score += authorityBonus[item.source] || 0;

    return score;
}

/**
 * Extract a compelling angle from the topic
 */
function generateAngle(topic: string, category: string): string {
    const angles: Record<string, string> = {
        AI: 'Architectural implications for enterprise adoption',
        ML: 'Training pipeline optimizations and cost analysis',
        Cloud: 'Multi-cloud strategy and vendor lock-in considerations',
        DevOps: 'CI/CD pipeline integration patterns',
        WebDev: 'Performance impact and developer experience',
        Security: 'Threat model analysis and mitigation strategies',
        Data: 'Scalability patterns and query optimization',
        Mobile: 'Cross-platform trade-offs and native performance',
    };
    return angles[category] || 'Technical deep-dive and industry impact';
}

/**
 * Deduplicate similar topics using simple string matching
 */
function deduplicateTopics(items: FeedItem[]): Map<string, FeedItem[]> {
    const groups = new Map<string, FeedItem[]>();

    for (const item of items) {
        // Create a simplified key for grouping
        const key = item.title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(' ')
            .filter(w => w.length > 4)
            .slice(0, 3)
            .join('_');

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(item);
    }

    return groups;
}

/**
 * Main discovery function: finds the best topic to write about
 */
export async function discoverTopic(): Promise<DiscoveredTopic | null> {
    console.log('[Discovery] Fetching RSS feeds...');
    const allItems = await fetchAllFeeds();
    console.log(`[Discovery] Fetched ${allItems.length} items from ${Object.keys(FEEDS).length} feeds`);

    // Filter to items with EvoFutura-relevant categories
    const categorizedItems = allItems
        .map(item => ({ ...item, category: categorizeItem(item) }))
        .filter(item => item.category !== null);

    console.log(`[Discovery] ${categorizedItems.length} items match EvoFutura categories`);

    if (categorizedItems.length === 0) {
        console.log('[Discovery] No relevant items found');
        return null;
    }

    // Group similar topics
    const groups = deduplicateTopics(categorizedItems);

    // Score each group
    const scoredTopics: Array<{ items: FeedItem[]; score: number; category: string }> = [];

    for (const [, items] of groups) {
        const primaryItem = items[0];
        const category = categorizeItem(primaryItem);
        if (!category) continue;

        const score = scoreItem(primaryItem, items.length);
        scoredTopics.push({ items, score, category });
    }

    // Sort by score and pick the best
    scoredTopics.sort((a, b) => b.score - a.score);

    if (scoredTopics.length === 0) {
        console.log('[Discovery] No scored topics');
        return null;
    }

    const best = scoredTopics[0];
    const primaryItem = best.items[0];

    const result: DiscoveredTopic = {
        topic: primaryItem.title,
        angle: generateAngle(primaryItem.title, best.category),
        why_now: `Trending in the last 24h across ${best.items.length} source(s)`,
        category: best.category,
        sources: best.items.map(item => ({
            title: item.title,
            url: item.link,
            published: new Date(item.pubDate || Date.now()),
        })),
        score: best.score,
    };

    console.log(`[Discovery] Selected: "${result.topic}" (${result.category}, score: ${result.score})`);

    return result;
}

/**
 * Get multiple topic suggestions (for admin dashboard)
 */
export async function discoverMultipleTopics(count: number = 5): Promise<DiscoveredTopic[]> {
    console.log('[Discovery] Fetching RSS feeds...');
    const allItems = await fetchAllFeeds();

    const categorizedItems = allItems
        .map(item => ({ ...item, category: categorizeItem(item) }))
        .filter(item => item.category !== null);

    const groups = deduplicateTopics(categorizedItems);
    const scoredTopics: Array<{ items: FeedItem[]; score: number; category: string }> = [];

    for (const [, items] of groups) {
        const primaryItem = items[0];
        const category = categorizeItem(primaryItem);
        if (!category) continue;

        const score = scoreItem(primaryItem, items.length);
        scoredTopics.push({ items, score, category });
    }

    scoredTopics.sort((a, b) => b.score - a.score);

    return scoredTopics.slice(0, count).map(({ items, score, category }) => {
        const primaryItem = items[0];
        return {
            topic: primaryItem.title,
            angle: generateAngle(primaryItem.title, category),
            why_now: `Trending across ${items.length} source(s)`,
            category,
            sources: items.map(item => ({
                title: item.title,
                url: item.link,
                published: new Date(item.pubDate || Date.now()),
            })),
            score,
        };
    });
}
