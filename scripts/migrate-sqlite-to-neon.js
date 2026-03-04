/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const backupPath = path.join(process.cwd(), 'prisma', 'sqlite-backup.json');
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  const raw = fs.readFileSync(backupPath, 'utf8');
  const backup = JSON.parse(raw);

  const prisma = new PrismaClient();

  const posts = (backup.posts || []).map(post => ({
    ...post,
    date: new Date(post.date),
    createdAt: new Date(post.createdAt),
    updatedAt: new Date(post.updatedAt),
  }));

  const revisions = (backup.postRevisions || []).map(revision => ({
    ...revision,
    createdAt: new Date(revision.createdAt),
  }));

  const subscribers = (backup.subscribers || []).map(subscriber => ({
    ...subscriber,
    createdAt: new Date(subscriber.createdAt),
  }));

  const postViews = (backup.postViews || []).map(view => ({
    ...view,
    createdAt: new Date(view.createdAt),
  }));

  const issues = (backup.newsletterIssues || []).map(issue => ({
    ...issue,
    createdAt: new Date(issue.createdAt),
    sentAt: issue.sentAt ? new Date(issue.sentAt) : null,
  }));

  const deliveries = (backup.newsletterDeliveries || []).map(delivery => ({
    ...delivery,
    createdAt: new Date(delivery.createdAt),
    sentAt: delivery.sentAt ? new Date(delivery.sentAt) : null,
  }));

  console.log('Import counts', {
    posts: posts.length,
    revisions: revisions.length,
    subscribers: subscribers.length,
    postViews: postViews.length,
    issues: issues.length,
    deliveries: deliveries.length,
  });

  if (posts.length > 0) {
    await prisma.post.createMany({ data: posts, skipDuplicates: true });
  }

  if (revisions.length > 0) {
    await prisma.postRevision.createMany({ data: revisions, skipDuplicates: true });
  }

  if (subscribers.length > 0) {
    await prisma.subscriber.createMany({ data: subscribers, skipDuplicates: true });
  }

  if (issues.length > 0) {
    await prisma.newsletterIssue.createMany({ data: issues, skipDuplicates: true });
  }

  if (deliveries.length > 0) {
    await prisma.newsletterDelivery.createMany({ data: deliveries, skipDuplicates: true });
  }

  if (postViews.length > 0) {
    await prisma.postView.createMany({ data: postViews, skipDuplicates: true });
  }

  const postCount = await prisma.post.count();
  console.log(`Neon import complete. Post count: ${postCount}`);

  await prisma.$disconnect();
}

main().catch(async error => {
  console.error(error);
  process.exit(1);
});
