const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

const categoryTypes = {
  AI: 'Deep Dive',
  ML: 'Explainer',
  Cloud: 'Build Guide',
  DevOps: 'Build Guide',
  WebDev: 'Explainer',
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, '')
    .trim()
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-');
}

function serializeTags(tags) {
  const clean = Array.from(
    new Set(
      tags
        .map(slugify)
        .filter(Boolean)
    )
  );
  if (clean.length === 0) return '';
  return `|${clean.join('|')}|`;
}

// Verified Unsplash Image IDs
const images = {
  "AI": [
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800", // Neural network art
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800", // AI chip
    "https://images.unsplash.com/photo-1655720406100-395ddfa954f2?auto=format&fit=crop&q=80&w=800", // Abstract digital brain
    "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&q=80&w=800", // Robot hand
  ],
  "ML": [
    "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=800", // Code on screen
    "https://images.unsplash.com/photo-1527474305487-b87b222841cc?auto=format&fit=crop&q=80&w=800", // Motherboard
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", // Data visualization
    "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&q=80&w=800", // Matrix lines
  ],
  "Cloud": [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800", // Earth network
    "https://images.unsplash.com/photo-1544197150-b99a580bbcbf?auto=format&fit=crop&q=80&w=800", // Server room
    "https://images.unsplash.com/photo-1607799275518-d750cc6867a8?auto=format&fit=crop&q=80&w=800", // Cloud storage concept
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800", // Digital lock/security
  ],
  "DevOps": [
    "https://images.unsplash.com/photo-1618401471353-b98aadebc25b?auto=format&fit=crop&q=80&w=800", // Abstract tech
    "https://images.unsplash.com/photo-1667372393119-3866372c964c?auto=format&fit=crop&q=80&w=800", // Gradient mesh
    "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800", // Data center
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800", // Servers
  ],
  "WebDev": [
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800", // Coding laptop
    "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&q=80&w=800", // Code snippet
    "https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&q=80&w=800", // Programming setup
    "https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&q=80&w=800", // Javascript code
  ]
};

const pillars = {
  "AI": ["Neuro-symbolic AI", "Agentic Workflows", "Edge AI", "AI Ethics", "Multimodal Systems"],
  "ML": ["Feature Engineering", "MLOps Best Practices", "Transfer Learning", "Explainable AI", "Time Series Transformers"],
  "Cloud": ["Serverless 2.0", "Multi-cloud Strategy", "Cloud FinOps", "Kubernetes Security", "Edge Computing"],
  "DevOps": ["IaC Evolution", "CI/CD 2026", "Platform Engineering", "Observability", "DevSecOps"],
  "WebDev": ["Next.js 15", "WebAssembly (WASM)", "Modern CSS", "Core Web Vitals", "PWA Evolution"]
};

async function main() {
  console.log('Start re-seeding with varied verified images...');
  await prisma.post.deleteMany({});
  
  for (const [category, topics] of Object.entries(pillars)) {
    let imgIndex = 0;
    for (const title of topics) {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));

      // Rotate through images for this category
      const imgUrl = images[category][imgIndex % images[category].length];
      imgIndex++;

      await prisma.post.create({
        data: {
          title: title + " in 2026",
          slug: slug,
          excerpt: `A comprehensive guide to ${title} and its impact on the modern technology landscape.`,
          content: `# ${title}\n\nThis is a deep dive into ${title}.\n\n![Header](${imgUrl})\n\n## Future Outlook\nThe industry is moving towards...`,
          category: category,
          type: categoryTypes[category] || 'Deep Dive',
          tags: serializeTags([category, title, 'future-tech', 'engineering']),
          author: "EvoBot",
          image: imgUrl,
          date: date,
        },
      });
    }
  }
  console.log('Seeding finished.');
}

main().then(async () => { await prisma.$disconnect(); }).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
