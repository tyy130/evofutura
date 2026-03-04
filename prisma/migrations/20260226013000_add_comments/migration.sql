-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "status" TEXT NOT NULL DEFAULT 'approved',
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Comment"
ADD CONSTRAINT "Comment_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Comment_postId_status_createdAt_idx" ON "Comment"("postId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_ipHash_createdAt_idx" ON "Comment"("ipHash", "createdAt");
