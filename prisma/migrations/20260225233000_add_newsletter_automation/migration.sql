-- CreateTable
CREATE TABLE "PostView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsletterIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekKey" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "exclusiveTitle" TEXT,
    "exclusiveContent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME
);

-- CreateTable
CREATE TABLE "NewsletterDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsletterDelivery_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "NewsletterIssue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NewsletterDelivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PostView_postId_createdAt_idx" ON "PostView"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PostView_createdAt_idx" ON "PostView"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterIssue_weekKey_key" ON "NewsletterIssue"("weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterDelivery_issueId_subscriberId_key" ON "NewsletterDelivery"("issueId", "subscriberId");

-- CreateIndex
CREATE INDEX "NewsletterDelivery_issueId_status_idx" ON "NewsletterDelivery"("issueId", "status");
