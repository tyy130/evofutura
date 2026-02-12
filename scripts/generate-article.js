const fs = require('fs');
const path = require('path');

const pillars = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/pillars.json'), 'utf8'));

async function generateArticle() {
  const categories = Object.keys(pillars);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const pillar = pillars[category][Math.floor(Math.random() * pillars[category].length)];

  console.log(`Generating article for Category: ${category}, Pillar: ${pillar}...`);

  // Prompt construction
  const prompt = `Write a technical blog post for evofutura.com.
Category: ${category}
Topic: ${pillar}
Target Audience: Developers, Architects, Tech Leaders.
Tone: Expert, forward-looking, concise.

Return the content in MDX format with frontmatter like this:
---
title: "[Catchy SEO Title]"
date: "${new Date().toISOString().split('T')[0]}"
excerpt: "[Brief summary]"
category: "${category}"
author: "EvoBot"
---
# [Title]
[Content with Markdown headers, lists, and code blocks]
`;

  // For this prototype, we'll log the prompt. 
  // In a real scenario, you'd call OpenAI/Anthropic here.
  console.log("PROMPT PREPARED:");
  console.log(prompt);
  
  // MOCK GENERATION for now - I will generate one real one manually to show it works
  const slug = pillar.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filePath = path.join(__dirname, `../content/posts/${slug}.mdx`);
  
  console.log(`Article would be saved to: ${filePath}`);
}

generateArticle();
