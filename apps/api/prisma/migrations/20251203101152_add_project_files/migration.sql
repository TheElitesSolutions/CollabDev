-- CreateTable
CREATE TABLE "project_file" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isFolder" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT,
    "mimeType" TEXT,
    "parentId" TEXT,
    "projectId" TEXT NOT NULL,
    "lastEditedByUserId" TEXT,

    CONSTRAINT "project_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_file_projectId_path_key" ON "project_file"("projectId", "path");

-- AddForeignKey
ALTER TABLE "project_file" ADD CONSTRAINT "project_file_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "project_file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_file" ADD CONSTRAINT "project_file_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_file" ADD CONSTRAINT "project_file_lastEditedByUserId_fkey" FOREIGN KEY ("lastEditedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
