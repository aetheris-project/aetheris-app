-- CreateTable
CREATE TABLE "CronJob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schedule" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CronJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SftpUser" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "homePath" TEXT NOT NULL DEFAULT '/home/container',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SftpUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SftpUser_serverId_idx" ON "SftpUser"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "SftpUser_serverId_username_key" ON "SftpUser"("serverId", "username");

-- AddForeignKey
ALTER TABLE "SftpUser" ADD CONSTRAINT "SftpUser_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

