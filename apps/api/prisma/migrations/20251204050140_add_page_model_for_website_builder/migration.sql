-- CreateTable
CREATE TABLE "page" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL DEFAULT '{"content":[],"root":{}}',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "generatedFileId" TEXT,

    CONSTRAINT "page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_projectId_idx" ON "page"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "page_projectId_slug_key" ON "page"("projectId", "slug");

-- AddForeignKey
ALTER TABLE "page" ADD CONSTRAINT "page_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page" ADD CONSTRAINT "page_generatedFileId_fkey" FOREIGN KEY ("generatedFileId") REFERENCES "project_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;
