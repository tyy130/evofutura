const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log("Checking DB connection...");
    const count = await prisma.post.count();
    console.log(`Connection successful. Post count: ${count}`);
    const onePost = await prisma.post.findFirst();
    console.log("Sample post ID:", onePost?.id);
  } catch (e) {
    console.error("DB Connection FAILED:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
