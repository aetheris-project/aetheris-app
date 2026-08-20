-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SftpUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "homePath" TEXT NOT NULL DEFAULT '/home/container',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SftpUser_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SftpUser" ("createdAt", "enabled", "homePath", "id", "serverId", "updatedAt", "username") SELECT "createdAt", "enabled", "homePath", "id", "serverId", "updatedAt", "username" FROM "SftpUser";
DROP TABLE "SftpUser";
ALTER TABLE "new_SftpUser" RENAME TO "SftpUser";
CREATE INDEX "SftpUser_serverId_idx" ON "SftpUser"("serverId");
CREATE UNIQUE INDEX "SftpUser_serverId_username_key" ON "SftpUser"("serverId", "username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
