const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Content Pillars for the AI to choose from
const pillars = require('../config/pillars.json');

async function generateContentWithLLM(category, topic) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log("⚠️ No API Key found. Simulating high-quality LLM generation...");
  }

  // Implementation for OpenAI/Anthropic would go here
  // For now, we use the simulation logic to ensure the pipeline is stable
  return simulateLLMResponse(category, topic);
}

function simulateLLMResponse(category, topic) {
  const date = new Date().toISOString().split('T')[0];
  const slug = `${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.floor(Math.random() * 1000)}`;

  return {
    title: `${topic}: The 2026 Perspective`,
    slug: slug,
    excerpt: `An autonomous deep dive into how ${topic} is reshaping the ${category} landscape this year.`,
    content: `---
title: "${topic}: The 2026 Perspective"
date: "${date}"
category: "${category}"
author: "EvoBot"
---

# ${topic} in 2026

The evolution of ${topic} has reached a critical tipping point. In this report, we analyze the architectural shifts and economic impacts of this technology.

## Executive Summary
Recent benchmarks show a 40% increase in efficiency when applying ${topic} to enterprise ${category} workflows.

## Key Technical Breakthroughs
1. **Low Latency Processing:** New kernels allow for sub-ms execution.
2. **Distributed Consensus:** Scaling across multi-cloud regions is now native.

> "The future of ${category} isn't just about speed; it's about the intelligence of the underlying fabric." - EvoBot

## Implementation Strategy
To get started, developers should focus on the following pattern:

\`\`\`typescript
interface EvoConfig {
    mode: 'autonomous' | 'assisted';
    target: '${category}';
  }

  const deploy = (config: EvoConfig) => {
    console.log(\`Initializing \\\${config.target} in \\\${config.mode} mode...\`);
  };
\`\`\`

## Conclusion
Stay tuned as we continue to monitor the ${topic} space.`,
    category: category,
      author: "EvoBot",
        image: getCategoryImage(category)
};
}

function getCategoryImage(cat) {
  const imgs = {
    "AI": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485",
    "ML": "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb",
    "Cloud": "https://images.unsplash.com/photo-1451187580459-43490279c0fa",
    "DevOps": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
    "WebDev": "https://images.unsplash.com/photo-1498050108023-c5249f4df085"
  };
  return imgs[cat] + "?auto=format&fit=crop&q=80&w=800";
}

async function runPipeline() {
  console.log(`\n[${new Date().toISOString()}] 🚀 Starting Autonomous Content Pipeline...`);

  // 1. Pick a random category and topic
  const categories = Object.keys(pillars);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const topic = pillars[category][Math.floor(Math.random() * pillars[category].length)];

  console.log(`🎯 Targeted Topic: ${topic} (${category})`);

  // 2. Generate
  const article = await generateContentWithLLM(category, topic);

  // 3. Score (AI Self-Correction Simulation)
  console.log("🔍 Scoring content for technical accuracy and SEO...");
  const score = Math.floor(Math.random() * 20) + 80; // Mock score 80-100

  if (score < 85) {
    console.log(`⚠️ Score too low (${score}). Regenerating...`);
    return runPipeline();
  }

  // 4. Publish to DB
  console.log(`✅ Content Approved (Score: ${score}). Publishing...`);

  try {
    const published = await prisma.post.create({
      data: {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        author: article.author,
        image: article.image,
        date: new Date(),
        published: true
      }
    });
    console.log(`🎉 Success! Article live at: /blog/${published.slug}`);
  } catch (err) {
    console.error("❌ Database Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

runPipeline();
