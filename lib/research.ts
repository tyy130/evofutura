import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ResearchClaim {
    text: string;
    source_url: string;
    source_title: string;
}

export interface ResearchResult {
    topic: string;
    claims: ResearchClaim[];
    primary_sources: string[];
    sufficient: boolean; // true if >= 3 sources
}

/**
 * Fetch and extract readable content from a URL
 */
async function fetchAndExtract(url: string): Promise<{ title: string; content: string } | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EvoFuturaBot/1.0; +https://evofutura.com)',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.warn(`[Research] Failed to fetch ${url}: ${response.status}`);
            return null;
        }

        const html = await response.text();
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article) {
            console.warn(`[Research] Could not parse ${url}`);
            return null;
        }

        return {
            title: article.title || 'Untitled',
            content: (article.textContent || '').slice(0, 5000), // Limit to 5k chars
        };
    } catch (err) {
        console.warn(`[Research] Error fetching ${url}: ${err}`);
        return null;
    }
}

/**
 * Extract key claims from content using simple heuristics
 * In a full implementation, this would use an LLM
 */
function extractClaimsSimple(content: string, sourceUrl: string, sourceTitle: string): ResearchClaim[] {
    const claims: ResearchClaim[] = [];

    // Split into sentences
    const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 50 && s.length < 300);

    // Look for sentences with factual indicators
    const factualIndicators = [
        'announced', 'released', 'launched', 'introduced',
        'percent', '%', 'million', 'billion',
        'according to', 'reported', 'confirmed',
        'will', 'is expected', 'plans to',
    ];

    for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        if (factualIndicators.some(indicator => lower.includes(indicator))) {
            claims.push({
                text: sentence,
                source_url: sourceUrl,
                source_title: sourceTitle,
            });

            if (claims.length >= 5) break; // Limit claims per source
        }
    }

    return claims;
}

/**
 * Research a topic by fetching and analyzing source URLs
 */
export async function researchTopic(
    topic: string,
    sourceUrls: string[]
): Promise<ResearchResult> {
    console.log(`[Research] Researching "${topic}" with ${sourceUrls.length} sources`);

    const claims: ResearchClaim[] = [];
    const successfulSources: string[] = [];

    // Fetch all sources in parallel
    const fetchPromises = sourceUrls.slice(0, 5).map(async (url) => {
        const extracted = await fetchAndExtract(url);
        if (extracted) {
            successfulSources.push(url);
            const sourceClaims = extractClaimsSimple(
                extracted.content,
                url,
                extracted.title
            );
            claims.push(...sourceClaims);
        }
    });

    await Promise.all(fetchPromises);

    console.log(`[Research] Extracted ${claims.length} claims from ${successfulSources.length} sources`);

    return {
        topic,
        claims,
        primary_sources: successfulSources,
        sufficient: successfulSources.length >= 3,
    };
}

/**
 * Format research results for LLM prompt injection
 */
export function formatResearchForPrompt(research: ResearchResult): string {
    if (research.claims.length === 0) {
        return '';
    }

    let prompt = `
## RESEARCH NOTES (Use these facts with inline citations)

`;

    research.claims.forEach((claim, i) => {
        prompt += `[${i + 1}] "${claim.text}" — ${claim.source_title}\n`;
    });

    prompt += `
## SOURCES (Append to article as footnotes)
`;

    research.primary_sources.forEach((url, i) => {
        prompt += `[^${i + 1}]: ${url}\n`;
    });

    return prompt;
}
